export type SpecializationEffectKind =
  | "meta_drop_skill"
  | "meta_drop_passive"
  | "meta_shop_refresh"
  | "meta_sell_bonus"
  | "lucky_unit"
  | "lucky_card_l"
  | "lucky_passive_l"
  | "lucky_mod_lm"
  | "mod_offer_plus"
  | "mod_soft_rollback"
  | "mod_early_slot"
  | "mod_offer_preview"
  | "mod_extra_lm_roll"
  | "slot_skill_plus"
  | "slot_passive_plus";

export type SpecializationTemplate = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  effectKind: SpecializationEffectKind;
  params: Record<string, number>;
};

const SPECIALIZATION_ENTRIES: Record<string, SpecializationTemplate> = {
  meta_drop_skill: {
    id: "meta_drop_skill",
    label: "Собиратель умений",
    emoji: "🃏",
    description: "Шанс дропа умения после победы ×1.5 для всей команды (лучший бонус в отряде).",
    effectKind: "meta_drop_skill",
    params: { multiplier: 1.5 },
  },
  meta_drop_passive: {
    id: "meta_drop_passive",
    label: "Собиратель навыков",
    emoji: "📖",
    description: "Шанс дропа пассива после победы ×1.5 для всей команды (лучший бонус в отряде).",
    effectKind: "meta_drop_passive",
    params: { multiplier: 1.5 },
  },
  meta_shop_refresh: {
    id: "meta_shop_refresh",
    label: "Торговец",
    emoji: "🏪",
    description: "Обновление магазина стоит на 25% меньше золота (лучший бонус в отряде).",
    effectKind: "meta_shop_refresh",
    params: { fraction: 0.25 },
  },
  meta_sell_bonus: {
    id: "meta_sell_bonus",
    label: "Скупщик",
    emoji: "💰",
    description: "Продажа камня из сундука даёт на 25% больше золота (лучший бонус в отряде).",
    effectKind: "meta_sell_bonus",
    params: { fraction: 0.25 },
  },
  lucky_unit: {
    id: "lucky_unit",
    label: "Судьбоносный",
    emoji: "🍀",
    description: "При провале прокачки unitLevel — один повторный бросок.",
    effectKind: "lucky_unit",
    params: {},
  },
  lucky_card_l: {
    id: "lucky_card_l",
    label: "Ученик умений",
    emoji: "🎓",
    description: "При провале прокачки global_level карты — один повторный бросок.",
    effectKind: "lucky_card_l",
    params: {},
  },
  lucky_passive_l: {
    id: "lucky_passive_l",
    label: "Ученик навыков",
    emoji: "📚",
    description: "При провале прокачки global_level пассива — один повторный бросок.",
    effectKind: "lucky_passive_l",
    params: {},
  },
  lucky_mod_lm: {
    id: "lucky_mod_lm",
    label: "Кователь модов",
    emoji: "🔨",
    description: "При провале броска Lm на мод — один повторный бросок.",
    effectKind: "lucky_mod_lm",
    params: {},
  },
  mod_offer_plus: {
    id: "mod_offer_plus",
    label: "Искатель модов",
    emoji: "🔍",
    description: "При открытии слота мода — 4 варианта вместо 3.",
    effectKind: "mod_offer_plus",
    params: { offerCount: 4 },
  },
  mod_soft_rollback: {
    id: "mod_soft_rollback",
    label: "Осторожный мастер",
    emoji: "↩️",
    description: "При снятии мода теряется 20% прогресса внутри вехи, а не полный откат.",
    effectKind: "mod_soft_rollback",
    params: { rollbackFraction: 0.2 },
  },
  mod_early_slot: {
    id: "mod_early_slot",
    label: "Ранний дебют",
    emoji: "🚀",
    description: "Первый слот мода открывается раньше: L ≥ 60 (prod) / L ≥ 4 (dev).",
    effectKind: "mod_early_slot",
    params: { firstThresholdProd: 60, firstThresholdDev: 4 },
  },
  mod_offer_preview: {
    id: "mod_offer_preview",
    label: "Провидец",
    emoji: "👁️",
    description: "В инвентаре носителя — превью оффера следующего закрытого слота мода.",
    effectKind: "mod_offer_preview",
    params: {},
  },
  mod_extra_lm_roll: {
    id: "mod_extra_lm_roll",
    label: "Усердный",
    emoji: "💪",
    description: "При победе — +1 бросок Lm на каждый заполненный слот мода.",
    effectKind: "mod_extra_lm_roll",
    params: { extraLmRolls: 1 },
  },
  slot_skill_plus: {
    id: "slot_skill_plus",
    label: "Тактик",
    emoji: "🎯",
    description: "+1 слот активного умения в боевом лоадауте (3 → 4).",
    effectKind: "slot_skill_plus",
    params: { bonusSlots: 1 },
  },
  slot_passive_plus: {
    id: "slot_passive_plus",
    label: "Собиратель знаний",
    emoji: "🧠",
    description: "+1 слот пассива (4 → 5) и лимит владения пассивами до 5.",
    effectKind: "slot_passive_plus",
    params: { bonusSlots: 1, bonusOwnership: 1 },
  },
};

export const SPECIALIZATION_TEMPLATES: Readonly<
  Record<string, SpecializationTemplate>
> = SPECIALIZATION_ENTRIES;

export const SPECIALIZATION_IDS: readonly string[] = Object.keys(SPECIALIZATION_ENTRIES);

export function getSpecializationTemplate(id: string): SpecializationTemplate | undefined {
  return SPECIALIZATION_TEMPLATES[id];
}
