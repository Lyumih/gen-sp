import type { Character } from "../types";
import { getSpecializationTemplate } from "./specializationTemplates";

type CharacterWithSpecialization = Character & {
  specializationId?: string | null;
};

export const BASE_SKILL_LOADOUT_SLOTS = 3;
export const BASE_PASSIVE_EQUIP_SLOTS = 4;
export const BASE_MAX_PASSIVES = 4;

function getSpecializationId(character: Character): string | null {
  return (character as CharacterWithSpecialization).specializationId ?? null;
}

function bonusFromEffect(
  character: Character,
  effectKind: "slot_skill_plus" | "slot_passive_plus",
  param: "bonusSlots" | "bonusOwnership",
): number {
  const specId = getSpecializationId(character);
  if (!specId) {
    return 0;
  }

  const template = getSpecializationTemplate(specId);
  if (template?.effectKind !== effectKind) {
    return 0;
  }

  return template.params[param] ?? 0;
}

export function maxSkillLoadoutSlots(character: Character): number {
  return (
    BASE_SKILL_LOADOUT_SLOTS +
    bonusFromEffect(character, "slot_skill_plus", "bonusSlots")
  );
}

export function maxPassiveEquipSlots(character: Character): number {
  return (
    BASE_PASSIVE_EQUIP_SLOTS +
    bonusFromEffect(character, "slot_passive_plus", "bonusSlots")
  );
}

export function maxPassivesOwned(character: Character): number {
  return (
    BASE_MAX_PASSIVES +
    bonusFromEffect(character, "slot_passive_plus", "bonusOwnership")
  );
}

export function isSkillLoadoutSlotIndexValid(
  character: Character,
  slotIndex: number,
): boolean {
  return slotIndex >= 0 && slotIndex < maxSkillLoadoutSlots(character);
}

export function isPassiveEquipSlotIndexValid(
  character: Character,
  slotIndex: number,
): boolean {
  return slotIndex >= 0 && slotIndex < maxPassiveEquipSlots(character);
}
