import type { CampaignState, TowerProgress } from '../types'

export function createInitialTowerProgress(runSeed: number): TowerProgress {
  return {
    currentFloor: 1,
    bestFloor: 0,
    runSeed,
    floorsFirstCleared: [],
  }
}

export function resetTowerProgress(prev: TowerProgress, newRunSeed: number): TowerProgress {
  return {
    currentFloor: 1,
    bestFloor: prev.bestFloor,
    runSeed: newRunSeed,
    floorsFirstCleared: [...prev.floorsFirstCleared],
  }
}

export function applyTowerFloorVictory(prev: TowerProgress, clearedFloor: number): TowerProgress {
  return {
    ...prev,
    currentFloor: clearedFloor + 1,
    bestFloor: Math.max(prev.bestFloor, clearedFloor),
  }
}

export function ensureTowerProgress(state: CampaignState, runSeed: number): TowerProgress {
  return state.tower ?? createInitialTowerProgress(runSeed)
}
