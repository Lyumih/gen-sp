export const GOLD_TOOLTIP =
  'Золото — валюта кампании. Тратится в магазине и таверне; получаете за продажу предметов и умений.'

export function worldPowerTooltip(n: number): string {
  return `Сила мира — ${n} (+${n}% к базовым статам врагов)\nМир помнит каждую победу...`
}
