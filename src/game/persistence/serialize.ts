import type { CampaignState } from '../types'
import { SAVE_VERSION } from './schema'
import type { SaveEnvelopeV1 } from './schema'
import { migrateFromUnknown } from './migrate'

export function serializeCampaign(state: CampaignState): string {
  const envelope: SaveEnvelopeV1 = {
    version: SAVE_VERSION,
    campaign: state,
  }
  return JSON.stringify(envelope)
}

export function parseSave(json: string): CampaignState | null {
  try {
    const raw: unknown = JSON.parse(json)
    return migrateFromUnknown(raw)
  } catch {
    console.warn('[gen-sp] save: JSON parse failed')
    return null
  }
}
