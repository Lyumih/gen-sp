import { getCardAttackTemplate } from "../content/cardTemplates";
import { getRaceDefinition, type RaceId } from "../content/enemyRaces";
import { getSemanticEmoji } from "../ui/semanticEmoji";

/** Card template tags plus semantic theme tag for race resist/vulnerable lookup. */
export function resolveCardDamageTags(templateId: string): readonly string[] {
  const tmpl = getCardAttackTemplate(templateId);
  if (!tmpl) return [];
  const tags = new Set(tmpl.tags);
  const themeTag = getSemanticEmoji(tmpl.semanticEmojiId)?.themeTag;
  if (themeTag) tags.add(themeTag);
  return [...tags];
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
