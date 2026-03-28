import { applyAction } from '../battle/reducer'
import type {
  BattleAction,
  BattleAttemptSnapshot,
  CampaignState,
  CardInstance,
} from '../types'
import { SCENARIOS, battleStateFromScenario } from './scenarios'

export type RunAction =
  | { type: 'START_OR_CONTINUE_BATTLE' }
  | { type: 'BATTLE_DISPATCH'; battleAction: BattleAction }
  | { type: 'RETRY_CURRENT_BATTLE' }

export function cloneCards(cards: readonly CardInstance[]): CardInstance[] {
  return cards.map((c) => ({
    ...c,
    modifications: c.modifications.map((m) => ({ ...m })),
  }))
}

function snapshotFromCampaign(state: CampaignState): BattleAttemptSnapshot {
  return {
    worldPower: state.worldPower,
    cards: cloneCards(state.cards),
    playerUnitLevel: state.playerUnitLevel,
    modKillTargetCardId: state.modKillTargetCardId,
  }
}

function startBattleFromScenario(state: CampaignState): CampaignState {
  const scenario = SCENARIOS[state.scenarioIndex]
  if (!scenario) return state

  const snapshot = snapshotFromCampaign(state)
  const battle = battleStateFromScenario(scenario, snapshot)

  return {
    ...state,
    phase: 'battle',
    battle,
    battleAttemptSnapshot: snapshot,
    battleAttemptId: state.battleAttemptId + 1,
  }
}

function finalizeVictory(state: CampaignState): CampaignState {
  if (!state.battle) return state
  const b = state.battle
  return {
    ...state,
    worldPower: b.worldPower,
    cards: cloneCards(b.playerCards),
    scenarioIndex: state.scenarioIndex + 1,
    battle: null,
    phase: 'hub',
    battleAttemptSnapshot: null,
  }
}

export function applyRunAction(state: CampaignState, action: RunAction): CampaignState {
  switch (action.type) {
    case 'START_OR_CONTINUE_BATTLE': {
      if (state.battle !== null) return state
      if (state.scenarioIndex >= SCENARIOS.length) return state
      return startBattleFromScenario(state)
    }
    case 'BATTLE_DISPATCH': {
      if (!state.battle || state.battle.phase !== 'ongoing') return state
      const nextBattle = applyAction(state.battle, action.battleAction)
      if (nextBattle.phase === 'victory') {
        return finalizeVictory({ ...state, battle: nextBattle })
      }
      if (nextBattle.phase === 'defeat') {
        return { ...state, battle: nextBattle, phase: 'defeat' }
      }
      return { ...state, battle: nextBattle, phase: 'battle' }
    }
    case 'RETRY_CURRENT_BATTLE': {
      const snap = state.battleAttemptSnapshot
      const scenario = SCENARIOS[state.scenarioIndex]
      if (!snap || !scenario) return state

      const restored: CampaignState = {
        ...state,
        worldPower: snap.worldPower,
        cards: cloneCards(snap.cards),
        playerUnitLevel: snap.playerUnitLevel,
        modKillTargetCardId: snap.modKillTargetCardId,
        phase: 'battle',
        battle: battleStateFromScenario(scenario, snap),
        battleAttemptId: state.battleAttemptId + 1,
        battleAttemptSnapshot: {
          worldPower: snap.worldPower,
          cards: cloneCards(snap.cards),
          playerUnitLevel: snap.playerUnitLevel,
          modKillTargetCardId: snap.modKillTargetCardId,
        },
      }
      return restored
    }
  }
}

export const STARTER_CARDS: CardInstance[] = [
  {
    id: 'c1',
    templateId: 'strike',
    global_level: 1,
    uses_count: 0,
    modifications: [],
  },
]

export function initialCampaignState(): CampaignState {
  return {
    scenarioIndex: 0,
    worldPower: 0,
    playerUnitLevel: 1,
    cards: cloneCards(STARTER_CARDS),
    modKillTargetCardId: 'c1',
    phase: 'hub',
    battle: null,
    battleAttemptId: 0,
    battleAttemptSnapshot: null,
  }
}
