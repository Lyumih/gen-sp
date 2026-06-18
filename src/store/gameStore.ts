import { create } from 'zustand'
import type { BattleAction, CampaignState } from '../game/types'
import {
  applyRunAction,
  initialCampaignState,
  type RunAction,
} from '../game/campaign/runReducer'
import { createDebouncedSave, loadSave } from '../game/persistence/localStorage'
import { STORAGE_KEY } from '../game/persistence/schema'

export type GameStoreState = {
  campaign: CampaignState
  autoBattleEnabled: boolean
  setAutoBattleEnabled: (enabled: boolean) => void
  dispatchRun: (action: RunAction) => void
  dispatchBattle: (action: BattleAction) => void
  hydrateFromStorage: () => void
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function readInitialCampaign(): CampaignState {
  const st = browserStorage()
  if (!st) return initialCampaignState()
  return loadSave(st, STORAGE_KEY) ?? initialCampaignState()
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  campaign: readInitialCampaign(),
  autoBattleEnabled: false,
  setAutoBattleEnabled: (enabled) => set({ autoBattleEnabled: enabled }),
  dispatchRun: (action) => {
    set((s) => ({ campaign: applyRunAction(s.campaign, action) }))
  },
  dispatchBattle: (battleAction) => {
    get().dispatchRun({ type: 'BATTLE_DISPATCH', battleAction })
  },
  hydrateFromStorage: () => {
    const st = browserStorage()
    if (!st) return
    const loaded = loadSave(st, STORAGE_KEY)
    if (loaded) set({ campaign: loaded })
  },
}))

if (typeof window !== 'undefined') {
  const st = window.localStorage
  const debounced = createDebouncedSave(300, st, STORAGE_KEY)
  useGameStore.subscribe((state) => debounced(state.campaign))
}
