import { SAVE_VERSION } from './schema'
import type { SaveEnvelopeV1 } from './schema'
import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'

function withDefaultScenarioSlotIndex(c: CampaignState): CampaignState {
  const snap = c.battleAttemptSnapshot
  if (!snap || typeof snap.scenarioSlotIndex === 'number') return c
  const scenarioSlotIndex =
    c.scenarioIndex >= 0 && c.scenarioIndex < SCENARIOS.length
      ? Math.min(c.scenarioIndex, SCENARIOS.length - 1)
      : 0
  return {
    ...c,
    battleAttemptSnapshot: { ...snap, scenarioSlotIndex },
  }
}

/** Старые сохранения без `battle.battleLog` — подставляем пустой массив. */
export function normalizeLoadedCampaign(c: CampaignState): CampaignState {
  let out: CampaignState
  if (!c.battle) {
    out = c
  } else if (Array.isArray(c.battle.battleLog)) {
    out = c
  } else {
    out = {
      ...c,
      battle: { ...c.battle, battleLog: [] },
    }
  }
  return withDefaultScenarioSlotIndex(out)
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/**
 * Разбор сырого JSON сохранения.
 * Неизвестная или неподдерживаемая `version` → `null` и `console.warn` (см. тесты).
 */
export function migrateFromUnknown(raw: unknown): CampaignState | null {
  if (!isRecord(raw)) {
    console.warn('[gen-sp] save: root is not an object')
    return null
  }
  const version = raw.version
  if (version !== SAVE_VERSION) {
    console.warn(
      `[gen-sp] save: unsupported version ${String(version)}, expected ${SAVE_VERSION}`,
    )
    return null
  }
  const campaign = raw.campaign
  if (!isRecord(campaign)) {
    console.warn('[gen-sp] save: missing campaign object')
    return null
  }
  return normalizeLoadedCampaign(campaign as unknown as CampaignState)
}

export function assertEnvelopeV1(e: SaveEnvelopeV1): CampaignState {
  return e.campaign
}
