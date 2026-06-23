import type { EquipmentSlot } from '../types'

export type CharacterClassTemplate = {
  id: string
  label: string
  hirePrice: number
  gearPool: { slot: EquipmentSlot; templateId: string; weight: number }[]
  tags: readonly string[]
  recommendedCardIds: readonly string[]
  recommendedItemIds: readonly string[]
  descriptionRu: string
  semanticEmojiId: string
}

export const CHARACTER_CLASSES: Readonly<Record<string, CharacterClassTemplate>> = {
  warrior: {
    id: 'warrior',
    label: 'Воин',
    hirePrice: 25,
    gearPool: [
      { slot: 'weapon', templateId: 'warrior_blade', weight: 3 },
      { slot: 'armor', templateId: 'warrior_plate', weight: 2 },
      { slot: 'accessory', templateId: 'warrior_signet', weight: 1 },
    ],
    tags: ['melee', 'attack', 'armor', 'tank', 'defense'],
    recommendedCardIds: ['shield_bash', 'cleave', 'battle_cry'],
    recommendedItemIds: ['warrior_blade', 'warrior_plate', 'warrior_signet'],
    descriptionRu: 'Передовой боец. Высокая живучесть и защита.',
    semanticEmojiId: 'sword-red',
  },
  mage: {
    id: 'mage',
    label: 'Маг',
    hirePrice: 35,
    gearPool: [
      { slot: 'weapon', templateId: 'mage_staff', weight: 3 },
      { slot: 'armor', templateId: 'mage_robe', weight: 2 },
      { slot: 'accessory', templateId: 'mage_crystal', weight: 1 },
    ],
    tags: ['ranged', 'aoe', 'skill', 'magic'],
    recommendedCardIds: ['fireball', 'frost_nova', 'arcane_bolt'],
    recommendedItemIds: ['mage_staff', 'mage_robe', 'mage_crystal'],
    descriptionRu: 'Мастер стихий и арканной магии. Силён на дистанции и по площади.',
    semanticEmojiId: 'orb-purple',
  },
  ranger: {
    id: 'ranger',
    label: 'Лучник',
    hirePrice: 30,
    gearPool: [
      { slot: 'weapon', templateId: 'ranger_bow', weight: 3 },
      { slot: 'armor', templateId: 'ranger_leathers', weight: 2 },
      { slot: 'accessory', templateId: 'ranger_charm', weight: 1 },
    ],
    tags: ['ranged', 'attack', 'mobility', 'crit'],
    recommendedCardIds: ['power_shot', 'multishot', 'snare_trap'],
    recommendedItemIds: ['ranger_bow', 'ranger_leathers', 'ranger_charm'],
    descriptionRu: 'Меткий стрелок. Быстрый, критичный, держит дистанцию.',
    semanticEmojiId: 'bow-teal',
  },
  healer: {
    id: 'healer',
    label: 'Лекарь',
    hirePrice: 32,
    gearPool: [
      { slot: 'weapon', templateId: 'healer_staff', weight: 3 },
      { slot: 'armor', templateId: 'healer_mantle', weight: 2 },
      { slot: 'accessory', templateId: 'healer_ring', weight: 1 },
    ],
    tags: ['heal', 'skill', 'support', 'regen', 'resurrect', 'holy'],
    recommendedCardIds: ['heal', 'regeneration', 'resurrection'],
    recommendedItemIds: ['healer_staff', 'healer_mantle', 'healer_ring'],
    descriptionRu: 'Поддерживает отряд исцелением, регенерацией и воскрешением.',
    semanticEmojiId: 'heart-heal',
  },
  rogue: {
    id: 'rogue',
    label: 'Разбойник',
    hirePrice: 28,
    gearPool: [
      { slot: 'weapon', templateId: 'rogue_dagger', weight: 3 },
      { slot: 'armor', templateId: 'rogue_cloak', weight: 2 },
      { slot: 'accessory', templateId: 'rogue_ring', weight: 1 },
    ],
    tags: ['melee', 'attack', 'crit', 'poison', 'mobility'],
    recommendedCardIds: ['backstab', 'poison_blade', 'smoke_bomb'],
    recommendedItemIds: ['rogue_dagger', 'rogue_cloak', 'rogue_ring'],
    descriptionRu: 'Скрытный убийца. Криты, яд и мобильность в ближнем бою.',
    semanticEmojiId: 'dagger-purple',
  },
  paladin: {
    id: 'paladin',
    label: 'Паладин',
    hirePrice: 38,
    gearPool: [
      { slot: 'weapon', templateId: 'paladin_mace', weight: 3 },
      { slot: 'armor', templateId: 'paladin_aegis', weight: 2 },
      { slot: 'accessory', templateId: 'paladin_reliquary', weight: 1 },
    ],
    tags: ['melee', 'heal', 'armor', 'holy', 'tank', 'support'],
    recommendedCardIds: ['holy_strike', 'lay_on_hands', 'divine_shield'],
    recommendedItemIds: ['paladin_mace', 'paladin_aegis', 'paladin_reliquary'],
    descriptionRu: 'Святой воин. Сочетает ближний бой, исцеление и защиту союзников.',
    semanticEmojiId: 'shield-gold',
  },
  warlock: {
    id: 'warlock',
    label: 'Колдун',
    hirePrice: 34,
    gearPool: [
      { slot: 'weapon', templateId: 'warlock_staff', weight: 3 },
      { slot: 'armor', templateId: 'warlock_shroud', weight: 2 },
      { slot: 'accessory', templateId: 'warlock_soul_gem', weight: 1 },
    ],
    tags: ['ranged', 'skill', 'dark', 'dot', 'lifesteal', 'magic'],
    recommendedCardIds: ['shadow_bolt', 'corruption', 'life_drain'],
    recommendedItemIds: ['warlock_staff', 'warlock_shroud', 'warlock_soul_gem'],
    descriptionRu: 'Тёмный маг. Урон со временем, вампиризм и проклятия.',
    semanticEmojiId: 'orb-purple',
  },
  berserker: {
    id: 'berserker',
    label: 'Берсерк',
    hirePrice: 30,
    gearPool: [
      { slot: 'weapon', templateId: 'berserker_axe', weight: 3 },
      { slot: 'armor', templateId: 'berserker_harness', weight: 2 },
      { slot: 'accessory', templateId: 'berserker_amulet', weight: 1 },
    ],
    tags: ['melee', 'attack', 'crit', 'lifesteal', 'tank'],
    recommendedCardIds: ['frenzy', 'blood_rage', 'whirlwind'],
    recommendedItemIds: ['berserker_axe', 'berserker_harness', 'berserker_amulet'],
    descriptionRu: 'Яростный боец. Высокий урон, вампиризм и живучесть в ближнем бою.',
    semanticEmojiId: 'axe-red',
  },
}

export const CHARACTER_CLASS_IDS: readonly string[] = Object.keys(CHARACTER_CLASSES)

export function getCharacterClass(classId: string): CharacterClassTemplate | undefined {
  return CHARACTER_CLASSES[classId]
}
