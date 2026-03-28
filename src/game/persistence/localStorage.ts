import type { CampaignState } from '../types'
import { STORAGE_KEY } from './schema'
import { parseSave, serializeCampaign } from './serialize'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function loadSave(
  storage: StorageLike,
  key: string = STORAGE_KEY,
): CampaignState | null {
  const raw = storage.getItem(key)
  if (raw === null) return null
  return parseSave(raw)
}

export function saveSave(
  storage: StorageLike,
  state: CampaignState,
  key: string = STORAGE_KEY,
): void {
  storage.setItem(key, serializeCampaign(state))
}

/**
 * Возвращает функцию записи с debounce (для подписки Zustand).
 */
export function createDebouncedSave(
  delayMs: number,
  storage: StorageLike,
  key: string = STORAGE_KEY,
): (state: CampaignState) => void {
  let t: ReturnType<typeof setTimeout> | undefined
  return (state: CampaignState) => {
    if (t !== undefined) clearTimeout(t)
    t = setTimeout(() => {
      t = undefined
      saveSave(storage, state, key)
    }, delayMs)
  }
}
