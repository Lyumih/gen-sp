import { SAVE_VERSION } from './schema'
import type { SaveEnvelopeV1 } from './schema'
import type { CampaignState } from '../types'

/** Старые сохранения без `battle.battleLog` — подставляем пустой массив. */
export function normalizeLoadedCampaign(c: CampaignState): CampaignState {
  if (!c.battle) return c
  if (Array.isArray(c.battle.battleLog)) return c
  return {
    ...c,
    battle: { ...c.battle, battleLog: [] },
  }
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
