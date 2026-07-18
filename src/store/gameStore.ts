import { create } from 'zustand'
import type { CampaignHubTab } from '../features/campaign/campaignHubShared'
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
  hubActiveTab: CampaignHubTab
  hubBattleFocusSection: 'trials' | null
  autoBattleEnabled: boolean
  onboardingUi: {
    checklistExpanded: boolean
    activeCoachMarkId: string | null
    guidedBattleStep: number
    dismissedCoachMarkIds: string[]
  }
  setHubActiveTab: (tab: CampaignHubTab) => void
  setHubBattleFocusSection: (section: 'trials' | null) => void
  setAutoBattleEnabled: (enabled: boolean) => void
  setChecklistExpanded: (expanded: boolean) => void
  setActiveCoachMarkId: (id: string | null) => void
  setGuidedBattleStep: (step: number) => void
  resetGuidedBattleStep: () => void
  dismissCoachMark: (id: string) => void
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
  hubActiveTab: 'character',
  hubBattleFocusSection: null,
  autoBattleEnabled: false,
  onboardingUi: {
    checklistExpanded: true,
    activeCoachMarkId: null,
    guidedBattleStep: 0,
    dismissedCoachMarkIds: [],
  },
  setHubActiveTab: (tab) => set({ hubActiveTab: tab }),
  setHubBattleFocusSection: (hubBattleFocusSection) => set({ hubBattleFocusSection }),
  setAutoBattleEnabled: (enabled) => set({ autoBattleEnabled: enabled }),
  setChecklistExpanded: (checklistExpanded) =>
    set((s) => ({ onboardingUi: { ...s.onboardingUi, checklistExpanded } })),
  setActiveCoachMarkId: (activeCoachMarkId) =>
    set((s) => ({ onboardingUi: { ...s.onboardingUi, activeCoachMarkId } })),
  setGuidedBattleStep: (guidedBattleStep) =>
    set((s) => ({ onboardingUi: { ...s.onboardingUi, guidedBattleStep } })),
  resetGuidedBattleStep: () =>
    set((s) => ({ onboardingUi: { ...s.onboardingUi, guidedBattleStep: 0 } })),
  dismissCoachMark: (id) =>
    set((s) => ({
      onboardingUi: {
        ...s.onboardingUi,
        dismissedCoachMarkIds: [...s.onboardingUi.dismissedCoachMarkIds, id],
        activeCoachMarkId: null,
      },
    })),
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
