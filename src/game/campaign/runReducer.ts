import { applyAction, getCurrentActorId } from '../battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import {
  EMPTY_EQUIPMENT,
  EQUIPMENT_ROLL_ORDER,
  occupiedEquipmentSlotsInOrder,
} from '../equipment/equipmentOrder'
import { applyCardUse } from '../memento/cardProgress'
import { rollMementoLevelUp } from '../memento/rollMementoLevelUp'
import type {
  BattleAction,
  BattleState,
  CampaignState,
  CardInstance,
  EquipmentSlot,
  ItemInstance,
} from '../types'
import {
  buildBattleAttemptSnapshot,
  cloneCards,
  cloneItems,
  copyBattleAttemptSnapshot,
} from './battleSnapshot'
import { goldForScenarioVictory } from './scenarioRewards'
import { SCENARIOS, battleStateFromScenario } from './scenarios'

export type RunAction =
  | { type: 'START_OR_CONTINUE_BATTLE' }
  | { type: 'START_REPLAY_BATTLE'; scenarioSlotIndex: number }
  | { type: 'BATTLE_DISPATCH'; battleAction: BattleAction }
  | {
      type: 'USE_CARD_ATTACK'
      cardId: string
      targetId: string
      randomInt1to100: number
    }
  | { type: 'RETRY_CURRENT_BATTLE' }
  | { type: 'ABANDON_BATTLE' }
  | { type: 'FINALIZE_VICTORY'; itemLevelRolls: number[]; playerUnitLevelRoll: number }
  | { type: 'BUY_ITEM'; templateId: string }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: EquipmentSlot }
  | { type: 'UNEQUIP_ITEM'; slot: EquipmentSlot }

export { cloneCards, cloneItems }

function newItemId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function startBattleFromScenario(state: CampaignState): CampaignState {
  const scenario = SCENARIOS[state.scenarioIndex]
  if (!scenario) return state

  const snapshot = buildBattleAttemptSnapshot(state, state.scenarioIndex)
  const battle = battleStateFromScenario(scenario, snapshot)

  return {
    ...state,
    phase: 'battle',
    battle,
    battleAttemptSnapshot: snapshot,
    battleAttemptId: state.battleAttemptId + 1,
  }
}

function finalizeVictory(
  state: CampaignState,
  itemLevelRolls: number[],
  playerUnitLevelRoll: number,
): CampaignState {
  if (!state.battle || state.battle.phase !== 'victory') return state

  const expected = occupiedEquipmentSlotsInOrder(state.equipment).length
  if (itemLevelRolls.length !== expected) return state

  const b = state.battle
  const ordered = occupiedEquipmentSlotsInOrder(state.equipment)
  let items = cloneItems(state.items)
  for (let i = 0; i < ordered.length; i++) {
    const { itemId } = ordered[i]!
    const roll = itemLevelRolls[i]!
    const idx = items.findIndex((x) => x.id === itemId)
    if (idx < 0) continue
    const inst = items[idx]!
    if (rollMementoLevelUp(inst.itemLevel, roll)) {
      const nextInst = { ...inst, itemLevel: inst.itemLevel + 1 }
      items = items.map((x, j) => (j === idx ? nextInst : x))
    }
  }

  let playerUnitLevel = state.playerUnitLevel
  if (rollMementoLevelUp(playerUnitLevel, playerUnitLevelRoll)) {
    playerUnitLevel += 1
  }

  const scenarioSlot =
    state.battleAttemptSnapshot?.scenarioSlotIndex ?? state.scenarioIndex
  const goldGain = goldForScenarioVictory(scenarioSlot)
  const nextScenarioIndex =
    state.scenarioIndex >= SCENARIOS.length ? state.scenarioIndex : state.scenarioIndex + 1

  return {
    ...state,
    worldPower: b.worldPower,
    cards: cloneCards(b.playerCards),
    scenarioIndex: nextScenarioIndex,
    battle: null,
    phase: 'hub',
    battleAttemptSnapshot: null,
    items,
    gold: state.gold + goldGain,
    playerUnitLevel,
  }
}

function applyBattleOutcome(state: CampaignState, nextBattle: BattleState): CampaignState {
  if (nextBattle.phase === 'victory') {
    return { ...state, battle: nextBattle, phase: 'victory' }
  }
  if (nextBattle.phase === 'defeat') {
    return { ...state, battle: nextBattle, phase: 'defeat' }
  }
  return { ...state, battle: nextBattle, phase: 'battle' }
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

  const used = applyCardUse(card, action.randomInt1to100)
  const nextCard: CardInstance = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modifications: used.modifications,
  }
  const levelForDamage = card.global_level + b.gearCardLevelBonus
  const damage = computeCardAttackDamage(tmpl, levelForDamage)
  const playerCards = b.playerCards.map((c) => (c.id === card.id ? nextCard : c))
  const bWithCards = { ...b, playerCards }

  const fromCard = { cardId: card.id, templateId: card.templateId }
  const battleAction: BattleAction =
    tmpl.kind === 'melee'
      ? {
          type: 'attack',
          attackerId: 'hero',
          targetId: target.id,
          damage,
          kind: 'melee',
          fromCard,
        }
      : {
          type: 'attack',
          attackerId: 'hero',
          targetId: target.id,
          damage,
          kind: 'ranged',
          maxRange: tmpl.maxRange,
          fromCard,
        }

  let nextBattle = applyAction(bWithCards, battleAction)
  if (used.leveledUp) {
    nextBattle = {
      ...nextBattle,
      battleLog: [
        ...nextBattle.battleLog,
        {
          type: 'card_level_up',
          cardId: card.id,
          templateId: card.templateId,
          fromLevel: card.global_level,
          toLevel: used.global_level,
          roll: action.randomInt1to100,
        },
      ],
    }
  }
  return applyBattleOutcome(state, nextBattle)
}

export function applyRunAction(state: CampaignState, action: RunAction): CampaignState {
  switch (action.type) {
    case 'START_OR_CONTINUE_BATTLE': {
      if (state.battle !== null) return state
      if (state.scenarioIndex >= SCENARIOS.length) return state
      return startBattleFromScenario(state)
    }
    case 'START_REPLAY_BATTLE': {
      if (state.battle !== null) return state
      if (state.scenarioIndex < SCENARIOS.length) return state
      const slot = action.scenarioSlotIndex
      if (slot < 0 || slot >= SCENARIOS.length) return state
      const scenario = SCENARIOS[slot]
      if (!scenario) return state
      const snapshot = buildBattleAttemptSnapshot(state, slot)
      const battle = battleStateFromScenario(scenario, snapshot)
      return {
        ...state,
        phase: 'battle',
        battle,
        battleAttemptSnapshot: snapshot,
        battleAttemptId: state.battleAttemptId + 1,
      }
    }
    case 'BATTLE_DISPATCH': {
      if (!state.battle || state.battle.phase !== 'ongoing') return state
      const nextBattle = applyAction(state.battle, action.battleAction)
      return applyBattleOutcome(state, nextBattle)
    }
    case 'USE_CARD_ATTACK':
      return tryUseCardAttack(state, action)
    case 'BUY_ITEM': {
      const tmpl = getItemTemplate(action.templateId)
      if (!tmpl) return state
      if (state.gold < tmpl.shopPrice) return state
      const inst: ItemInstance = {
        id: newItemId(),
        templateId: action.templateId,
        itemLevel: 1,
      }
      return {
        ...state,
        gold: state.gold - tmpl.shopPrice,
        items: [...state.items, inst],
      }
    }
    case 'EQUIP_ITEM': {
      const { itemId, slot } = action
      const item = state.items.find((i) => i.id === itemId)
      if (!item) return state
      const tmpl = getItemTemplate(item.templateId)
      if (!tmpl || tmpl.slot !== slot) return state
      if (state.equipment[slot] === itemId) return state
      for (const s of EQUIPMENT_ROLL_ORDER) {
        if (s !== slot && state.equipment[s] === itemId) return state
      }
      return {
        ...state,
        equipment: { ...state.equipment, [slot]: itemId },
      }
    }
    case 'UNEQUIP_ITEM': {
      return {
        ...state,
        equipment: { ...state.equipment, [action.slot]: null },
      }
    }
    case 'RETRY_CURRENT_BATTLE': {
      const snap = state.battleAttemptSnapshot
      if (!snap) return state
      const scenario = SCENARIOS[snap.scenarioSlotIndex]
      if (!scenario) return state

      const snapCopy = copyBattleAttemptSnapshot(snap)
      const restored: CampaignState = {
        ...state,
        worldPower: snap.worldPower,
        cards: cloneCards(snap.cards),
        playerUnitLevel: snap.playerUnitLevel,
        modKillTargetCardId: snap.modKillTargetCardId,
        gold: snap.gold,
        items: cloneItems(snap.items),
        equipment: { ...snap.equipment },
        phase: 'battle',
        battle: battleStateFromScenario(scenario, snapCopy),
        battleAttemptId: state.battleAttemptId + 1,
        battleAttemptSnapshot: snapCopy,
      }
      return restored
    }
    case 'ABANDON_BATTLE': {
      const snap = state.battleAttemptSnapshot
      if (!state.battle || !snap) return state
      return {
        ...state,
        worldPower: snap.worldPower,
        cards: cloneCards(snap.cards),
        playerUnitLevel: snap.playerUnitLevel,
        modKillTargetCardId: snap.modKillTargetCardId,
        gold: snap.gold,
        items: cloneItems(snap.items),
        equipment: { ...snap.equipment },
        battle: null,
        phase: 'hub',
        battleAttemptSnapshot: null,
      }
    }
    case 'FINALIZE_VICTORY': {
      if (!state.battle || state.battle.phase !== 'victory') return state
      return finalizeVictory(state, action.itemLevelRolls, action.playerUnitLevelRoll)
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
    gold: 0,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    phase: 'hub',
    battle: null,
    battleAttemptId: 0,
    battleAttemptSnapshot: null,
  }
}
