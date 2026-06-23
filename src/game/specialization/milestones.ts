import type { Character } from "../types";
import { getSpecializationTemplate } from "./specializationTemplates";

type CharacterWithSpecialization = Character & {
  specializationId?: string | null;
};

function getSpecializationId(character: Character | null): string | null {
  if (!character) {
    return null;
  }
  return (character as CharacterWithSpecialization).specializationId ?? null;
}

function earlySlotThreshold(specId: string): number | null {
  const template = getSpecializationTemplate(specId);
  if (template?.effectKind !== "mod_early_slot") {
    return null;
  }

  if (import.meta.env.DEV) {
    return template.params.firstThresholdDev ?? null;
  }

  return template.params.firstThresholdProd ?? null;
}

export function effectiveMilestoneThreshold(
  character: Character | null,
  slotIndex: number,
  baseThreshold: (slotIndex: number) => number,
): number {
  if (slotIndex === 0) {
    const specId = getSpecializationId(character);
    if (specId) {
      const early = earlySlotThreshold(specId);
      if (early !== null) {
        return early;
      }
    }
  }

  return baseThreshold(slotIndex);
}

export function unlockedSlotCountForCharacter(
  character: Character | null,
  carrierLevel: number,
  baseThreshold: (slotIndex: number) => number,
): number {
  const firstThreshold = effectiveMilestoneThreshold(character, 0, baseThreshold);
  if (carrierLevel < firstThreshold) {
    return 0;
  }

  let count = 0;
  while (
    carrierLevel >= effectiveMilestoneThreshold(character, count, baseThreshold)
  ) {
    count++;
  }
  return count;
}
