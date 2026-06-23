const SKILL_SCALE_TOKEN_RE = /^(\d+)%%$/u

/** Extracts P from a plain skill scale token such as `'40%%'`. */
export function parseSkillScalePercent(token: string): number | null {
  const m = token.trim().match(SKILL_SCALE_TOKEN_RE)
  if (!m) return null
  return Number(m[1])
}

/** +P% to core at card level 100; multiplier 1.0 at L=0. */
export function skillLevelMult(cardLevel: number, scalePercent: number): number {
  return 1 + (scalePercent / 100) * (Math.min(cardLevel, 100) / 100)
}
