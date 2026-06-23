import type { CampaignState, Character } from "../types";
import { getCharacter, getSquadCharacters } from "../character/selectors";
import { rollCardLevelUp } from "../memento/rollCardLevelUp";
import {
  getSpecializationTemplate,
  type SpecializationEffectKind,
} from "./specializationTemplates";

type CharacterWithSpecialization = Character & {
  specializationId?: string | null;
};

function getSpecializationId(character: Character): string | null {
  return (character as CharacterWithSpecialization).specializationId ?? null;
}

function activePartyCharacterIds(campaign: CampaignState): string[] {
  const ids = new Set<string>();

  for (const character of getSquadCharacters(campaign)) {
    ids.add(character.id);
  }

  for (const slot of campaign.expedition?.squadSnapshot ?? []) {
    if (slot?.characterId) {
      ids.add(slot.characterId);
    }
  }

  return [...ids];
}

function activePartyCharacters(campaign: CampaignState): Character[] {
  return activePartyCharacterIds(campaign)
    .map((id) => getCharacter(campaign, id))
    .filter((c): c is Character => c !== undefined);
}

export function isSpecializationActive(
  campaign: CampaignState,
  characterId: string,
): boolean {
  if (campaign.squad.includes(characterId)) {
    return true;
  }

  return (
    campaign.expedition?.squadSnapshot.some(
      (slot) => slot?.characterId === characterId,
    ) ?? false
  );
}

export function characterHasEffect(
  campaign: CampaignState,
  characterId: string,
  kind: SpecializationEffectKind,
): boolean {
  if (!isSpecializationActive(campaign, characterId)) {
    return false;
  }

  const character = getCharacter(campaign, characterId);
  if (!character) {
    return false;
  }

  const specId = getSpecializationId(character);
  if (!specId) {
    return false;
  }

  const template = getSpecializationTemplate(specId);
  return template?.effectKind === kind;
}

export function partyMetaMultiplier(
  campaign: CampaignState,
  kind: "meta_drop_skill" | "meta_drop_passive",
): number {
  let best = 1;

  for (const character of activePartyCharacters(campaign)) {
    if (!isSpecializationActive(campaign, character.id)) {
      continue;
    }

    const specId = getSpecializationId(character);
    if (!specId) {
      continue;
    }

    const template = getSpecializationTemplate(specId);
    if (template?.effectKind !== kind) {
      continue;
    }

    const multiplier = template.params.multiplier;
    if (multiplier !== undefined && multiplier > best) {
      best = multiplier;
    }
  }

  return best;
}

export function partyMetaBonusFraction(
  campaign: CampaignState,
  kind: "meta_shop_refresh" | "meta_sell_bonus",
): number {
  let best = 0;

  for (const character of activePartyCharacters(campaign)) {
    if (!isSpecializationActive(campaign, character.id)) {
      continue;
    }

    const specId = getSpecializationId(character);
    if (!specId) {
      continue;
    }

    const template = getSpecializationTemplate(specId);
    if (template?.effectKind !== kind) {
      continue;
    }

    const fraction = template.params.fraction;
    if (fraction !== undefined && fraction > best) {
      best = fraction;
    }
  }

  return best;
}

export function rollWithLuckyRetry(
  currentLevel: number,
  randomInt1to100: () => number,
  lucky: boolean,
): boolean {
  if (rollCardLevelUp(currentLevel, randomInt1to100())) {
    return true;
  }

  if (lucky) {
    return rollCardLevelUp(currentLevel, randomInt1to100());
  }

  return false;
}

export function softRollbackCarrierLevel(
  carrierLevel: number,
  slotIndex: number,
  milestoneThresholdFn: (slotIndex: number) => number,
): number {
  const milestonePrev =
    slotIndex <= 0 ? 0 : milestoneThresholdFn(slotIndex - 1);
  const delta = carrierLevel - milestonePrev;
  const lNew = carrierLevel - Math.ceil(delta * 0.2);
  return Math.max(lNew, milestonePrev);
}
