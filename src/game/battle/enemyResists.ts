import { getCardAttackTemplate } from "../content/cardTemplates";
import { getRaceDefinition, type RaceId } from "../content/enemyRaces";
import { getSemanticEmoji } from "../ui/semanticEmoji";
import type { Unit } from "../types";
import { unitStatuses } from "./unitStatus";
import type { ShiftingResistTag } from "./elementalResist";

const ELEMENTAL_TEMPLATE_BY_TAG: Record<ShiftingResistTag, readonly string[]> = {
  fire: ["fireball"],
  ice: ["frost_nova"],
  poison: ["poison_blade", "monster_plague_cloud", "corruption"],
};

/** Card template tags plus semantic theme tag for race resist/vulnerable lookup. */
export function resolveCardDamageTags(templateId: string): readonly string[] {
  const tmpl = getCardAttackTemplate(templateId);
  if (!tmpl) return [];
  const tags = new Set(tmpl.tags);
  const themeTag = getSemanticEmoji(tmpl.semanticEmojiId)?.themeTag;
  if (themeTag) tags.add(themeTag);
  return [...tags];
}

export function resolveElementalDamageTags(templateId: string): readonly ShiftingResistTag[] {
  const out: ShiftingResistTag[] = [];
  for (const tag of ["fire", "ice", "poison"] as const) {
    if (ELEMENTAL_TEMPLATE_BY_TAG[tag].includes(templateId)) out.push(tag);
  }
  const cardTags = resolveCardDamageTags(templateId);
  if (cardTags.includes("fire")) out.push("fire");
  if (cardTags.includes("poison")) out.push("poison");
  return [...new Set(out)];
}

export function applyElementalResistModifiers(
  damage: number,
  templateId: string | undefined,
  target: Unit,
): number {
  if (damage <= 0) return damage;
  const ward = unitStatuses(target).find(
    (s) => s.kind === "elemental_resist" && s.remainingTurns > 0,
  );
  if (!ward?.sourceTemplateId) return damage;

  const activeTag = ward.sourceTemplateId as ShiftingResistTag;
  const elementalTags = templateId ? resolveElementalDamageTags(templateId) : [];
  if (!elementalTags.includes(activeTag)) return damage;

  const mult = 1 - ward.magnitude / 100;
  return Math.max(0, Math.round(damage * mult));
}

export function applyRaceDamageModifiers(
  damage: number,
  tags: readonly string[],
  raceId: RaceId | undefined,
): number {
  if (!raceId || damage <= 0) return damage;
  const race = getRaceDefinition(raceId);
  let mult = 1;
  for (const tag of tags) {
    const r = race.resists[tag as keyof typeof race.resists];
    if (r !== undefined) mult *= 1 - r;
    const v = race.vulnerables[tag as keyof typeof race.vulnerables];
    if (v !== undefined) mult *= 1 + v;
  }
  return Math.max(0, Math.round(damage * mult));
}
