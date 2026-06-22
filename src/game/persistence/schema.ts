import type { CampaignState } from '../types'

/** Версия схемы сохранения; при изменении структуры — миграция в migrate.ts */
export const SAVE_VERSION = 4

/** Ключ в localStorage */
export const STORAGE_KEY = 'gen-sp-save-v1'

export type SaveEnvelopeV1 = {
  version: typeof SAVE_VERSION
  campaign: CampaignState
}
