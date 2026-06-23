import { getRaceDefinition, type RaceId } from "../content/enemyRaces";

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
