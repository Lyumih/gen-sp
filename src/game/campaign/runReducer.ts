import { applyAction, getCurrentActorId } from '../battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { applyCardUse } from '../memento/cardProgress'
import type {
  BattleAction,
  BattleAttemptSnapshot,
  BattleState,
  CampaignState,
  CardInstance,
} from '../types'
import { SCENARIOS, battleStateFromScenario } from './scenarios'

export type RunAction =
  | { type: 'START_OR_CONTINUE_BATTLE' }
  | { type: 'BATTLE_DISPATCH'; battleAction: BattleAction }
  | {
      type: 'USE_CARD_ATTACK'
      cardId: string
      targetId: string
      randomInt1to100: number
    }
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

function applyBattleOutcome(state: CampaignState, nextBattle: BattleState): CampaignState {
  if (nextBattle.phase === 'victory') {
    return finalizeVictory({ ...state, battle: nextBattle })
  }
  if (nextBattle.phase === 'defeat') {
    return { ...state, battle: nextBattle, phase: 'defeat' }
  }
  return { ...state, battle: nextBattle, phase: 'battle' }
}

function cardAfterUse(card: CardInstance, randomInt1to100: number): CardInstance {
  const used = applyCardUse(card, randomInt1to100)
  return {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modifications: used.modifications,
  }
}

function tryUseCardAttack(
  state: CampaignState,
  action: Extract<RunAction, { type: 'USE_CARD_ATTACK' }>,
): CampaignState {
  if (!state.battle || state.battle.phase !== 'ongoing') return state
  const b = state.battle
  if (getCurrentActorId(b) !== 'hero') return state

  const hero = b.units.find((u) => u.id === 'hero' && u.hp > 0)
  const target = b.units.find(
    (u) => u.id === action.targetId && u.side === 'enemy' && u.hp > 0,
  )
  if (!hero || !target) return state

  const card = b.playerCards.find((c) => c.id === action.cardId)
  if (!card) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return state

  if (tmpl.kind === 'melee' && !canMeleeAttack(hero, target)) return state
  if (tmpl.kind === 'ranged' && !canRangedAttack(hero, target, tmpl.maxRange)) {
    return state
  }

  const damage = computeCardAttackDamage(tmpl, card.global_level)
  const nextCard = cardAfterUse(card, action.randomInt1to100)
  const playerCards = b.playerCards.map((c) => (c.id === card.id ? nextCard : c))
  const bWithCards = { ...b, playerCards }

  const battleAction: BattleAction =
    tmpl.kind === 'melee'
      ? {
          type: 'attack',
          attackerId: 'hero',
          targetId: target.id,
          damage,
          kind: 'melee',
        }
      : {
          type: 'attack',
          attackerId: 'hero',
          targetId: target.id,
          damage,
          kind: 'ranged',
          maxRange: tmpl.maxRange,
        }

  const nextBattle = applyAction(bWithCards, battleAction)
  return applyBattleOutcome(state, nextBattle)
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
      return applyBattleOutcome(state, nextBattle)
    }
    case 'USE_CARD_ATTACK':
      return tryUseCardAttack(state, action)
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
