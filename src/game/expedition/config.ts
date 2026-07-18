export type PartySizeConfig = number | { min: number; max: number }
export type BattleCountConfig = number | { min: number; max: number }

export type ExpeditionChainKind = 'static' | 'procedural'
export type ModeTier = 'featured' | 'soon'

export type ExpeditionChainConfig = {
  id: string
  label: string
  description: string
  paramPreview: string
  tier: ModeTier
  iconEmoji: string
  paramEmojiLine: string
  partySize: PartySizeConfig
  partyMin: number
  battleCount: BattleCountConfig
  interBattleReviveAllDowned?: boolean
} & (
  | { kind: 'static'; battleScenarioIds: readonly string[] }
  | { kind: 'procedural'; generatorId: string }
)

/**
 * Resolves a fixed or ranged config value.
 * Range formula: floor(min + rng * (max - min + 1)), clamped to [min, max].
 * rng is expected in [0, 1).
 */
function resolveRangedConfig(
  config: number | { min: number; max: number },
  rng: () => number,
): number {
  if (typeof config === 'number') return config
  const { min, max } = config
  const span = max - min + 1
  const rolled = Math.floor(min + rng() * span)
  return Math.min(max, Math.max(min, rolled))
}

export function resolvePartySize(config: PartySizeConfig, rng: () => number): number {
  return resolveRangedConfig(config, rng)
}

export function resolveBattleCount(config: BattleCountConfig, rng: () => number): number {
  return resolveRangedConfig(config, rng)
}

/** Human-readable preview for fixed or ranged config (e.g. `3` or `2–4`). */
export function formatConfigPreview(config: number | { min: number; max: number }): string {
  if (typeof config === 'number') return String(config)
  if (config.min === config.max) return String(config.min)
  return `${config.min}–${config.max}`
}

export function getPartySizeSlotCount(config: PartySizeConfig): number {
  return typeof config === 'number' ? config : config.max
}

export function getPartySizeRequiredCount(config: PartySizeConfig): number {
  return typeof config === 'number' ? config : config.min
}

export function getChainMaxParty(config: ExpeditionChainConfig): number {
  return getPartySizeSlotCount(config.partySize)
}

export const EXPEDITION_CHAINS: readonly ExpeditionChainConfig[] = [
  {
    id: 'campaign-main',
    kind: 'static',
    label: 'Компания',
    description: 'Три сценария подряд с воскрешением между боями',
    paramPreview: 'Бойцов: 1 · Боёв: 3',
    tier: 'soon',
    iconEmoji: '📜',
    paramEmojiLine: '👥1  ×3  ♻ между боями',
    partySize: 1,
    partyMin: 1,
    battleCount: 3,
    interBattleReviveAllDowned: true,
    battleScenarioIds: ['tutorial', 'two-front', 'boss-lite'],
  },
  {
    id: 'test-single-battle',
    kind: 'static',
    label: 'Тест: один бой',
    description: 'Один бой tutorial (dev)',
    paramPreview: 'Бойцов: 1 · Боёв: 1',
    tier: 'soon',
    iconEmoji: '🧪',
    paramEmojiLine: '👥1  ×1  🧪 dev',
    partySize: 1,
    partyMin: 1,
    battleCount: 1,
    battleScenarioIds: ['tutorial'],
  },
  {
    id: 'chaotic-map',
    kind: 'procedural',
    generatorId: 'chaotic-map',
    label: 'Хаос',
    description: 'Полный хаос: поле, враги, препятствия',
    paramPreview: 'Отряд 1–4 · Враги 1–20 · Поле 1×2–20×20 · Боёв 1–3',
    tier: 'featured',
    iconEmoji: '🌀',
    paramEmojiLine: '👥1–4  👹1–20  ⬜1×2–20×20  ×1–3',
    partySize: { min: 1, max: 4 },
    partyMin: 1,
    battleCount: { min: 1, max: 3 },
  },
  {
    id: 'tunnel',
    kind: 'procedural',
    generatorId: 'tunnel',
    label: 'Туннель',
    description: 'Узкий коридор, два боя',
    paramPreview: 'Отряд ≤2 · Поле 1×10 · Бой 2: герой-NPC или босс',
    tier: 'featured',
    iconEmoji: '🕳',
    paramEmojiLine: '👥≤2  ⬜1×10  ×2',
    partySize: { min: 1, max: 2 },
    partyMin: 1,
    battleCount: 2,
  },
  {
    id: 'big-arena',
    kind: 'procedural',
    generatorId: 'big-arena',
    label: 'Большая арена',
    description: 'Массовое сражение на широком поле',
    paramPreview: 'Отряд ≤4 · 8–12 врагов + 1–3 босса · 10×20',
    tier: 'featured',
    iconEmoji: '🏟',
    paramEmojiLine: '👥≤4  👹8–12+👑1–3  ⬜10×20  ×1',
    partySize: { min: 1, max: 4 },
    partyMin: 1,
    battleCount: 1,
  },
  {
    id: 'small-skirmish',
    kind: 'procedural',
    generatorId: 'small-skirmish',
    label: 'Дуэль',
    description: 'Дуэль на крошечном поле',
    paramPreview: '1 герой · 1 враг · поле 1×2',
    tier: 'featured',
    iconEmoji: '⚔',
    paramEmojiLine: '👥1  👹1  ⬜1×2  ×1',
    partySize: 1,
    partyMin: 1,
    battleCount: 1,
  },
  {
    id: 'ambush',
    kind: 'procedural',
    generatorId: 'ambush',
    label: 'Засада',
    description: 'Окружение с флангов',
    paramPreview: 'Отряд ≤4 · ≤8 врагов · 10×10',
    tier: 'featured',
    iconEmoji: '🌲',
    paramEmojiLine: '👥≤4  👹≤8  ⬜10×10  ×1',
    partySize: { min: 1, max: 4 },
    partyMin: 1,
    battleCount: 1,
  },
]

export function getExpeditionChainById(id: string): ExpeditionChainConfig | undefined {
  return EXPEDITION_CHAINS.find((chain) => chain.id === id)
}

export function getExpeditionChainsByTier(tier: ModeTier): readonly ExpeditionChainConfig[] {
  return EXPEDITION_CHAINS.filter((chain) => chain.tier === tier)
}
