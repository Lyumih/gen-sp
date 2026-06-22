export type PartySizeConfig = number | { min: number; max: number }
export type BattleCountConfig = number | { min: number; max: number }

export type ExpeditionChainConfig = {
  id: string
  partySize: PartySizeConfig
  battleCount: BattleCountConfig
  interBattleReviveAllDowned?: boolean
  /** Scenario ids per battle in chain (see SCENARIOS). */
  battleScenarioIds: readonly string[]
}

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

export const EXPEDITION_CHAINS: readonly ExpeditionChainConfig[] = [
  {
    id: 'campaign-main',
    partySize: 1,
    battleCount: 3,
    interBattleReviveAllDowned: true,
    battleScenarioIds: ['tutorial', 'two-front', 'boss-lite'],
  },
  {
    id: 'test-single-battle',
    partySize: 1,
    battleCount: 1,
    battleScenarioIds: ['tutorial'],
  },
]

export function getExpeditionChainById(id: string): ExpeditionChainConfig | undefined {
  return EXPEDITION_CHAINS.find((chain) => chain.id === id)
}
