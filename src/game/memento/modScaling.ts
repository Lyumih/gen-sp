/** Scales mod op base value by modifier level Lm: effective = base × (1 + lm/100). */
export function scaleModValue(
  base: number,
  lm: number,
  _scaleMode: 'percent' | 'flat',
): number {
  return base * (1 + lm / 100)
}
