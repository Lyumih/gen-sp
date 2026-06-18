import { applyAction, getCurrentActorId } from '../battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { cellKey, inBounds, wallSet } from '../battle/grid'
import { canCastAoEAt } from '../battle/rangeOverlay'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import {
  codexEntryId,
  discoverCodexEntry,
  markCodexSeen,
  mergeBattleCodexDiscoveries,
} from '../codex/discovery'
import { DEFAULT_MOD_KILL_TEMPLATE_ID } from '../content/modTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import {
  EMPTY_EQUIPMENT,
  EQUIPMENT_ROLL_ORDER,
  occupiedEquipmentSlotsInOrder,
} from '../equipment/equipmentOrder'
import {
  buildItemsWithStashOrder,
  isItemEquipped,
  sellPriceForItem,
} from '../equipment/stashOrder'
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
  | {
      type: 'USE_CARD_AOE'
      cardId: string
      targetX: number
      targetY: number
      randomInt1to100: number
    }
  | { type: 'RETRY_CURRENT_BATTLE' }
  | { type: 'ABANDON_BATTLE' }
  | { type: 'FINALIZE_VICTORY'; itemLevelRolls: number[]; playerUnitLevelRoll: number }
  | { type: 'BUY_ITEM'; templateId: string }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: EquipmentSlot }
  | { type: 'UNEQUIP_ITEM'; slot: EquipmentSlot }
  | { type: 'REORDER_CARDS'; cardIds: string[] }
  | { type: 'SET_MOD_KILL_TARGET'; cardId: string | null }
  | { type: 'SELL_ITEM'; itemId: string }
  | { type: 'REORDER_STASH'; itemIds: string[] }
  | { type: 'MARK_CODEX_SEEN' }

export { cloneCards, cloneItems }

function inHub(state: CampaignState): boolean {
  return state.battle === null
}

function newItemId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function withCodexDiscoveries(state: CampaignState, ids: readonly string[]): CampaignState {
  let codexDiscovered = state.codexDiscovered
  for (const id of ids) {
    codexDiscovered = discoverCodexEntry(codexDiscovered, id)
  }
  if (codexDiscovered === state.codexDiscovered) return state
  return { ...state, codexDiscovered }
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

function applyBattleOutcome(
  state: CampaignState,
  prevBattle: BattleState,
  nextBattle: BattleState,
): CampaignState {
  const nextState = withCodexDiscoveries(state, [
    ...mergeBattleCodexDiscoveries(prevBattle, nextBattle, state.codexDiscovered),
  ].filter((id) => !state.codexDiscovered.includes(id)))
  if (nextBattle.phase === 'victory') {
    return { ...nextState, battle: nextBattle, phase: 'victory' }
  }
  if (nextBattle.phase === 'defeat') {
    return { ...nextState, battle: nextBattle, phase: 'defeat' }
  }
  return { ...nextState, battle: nextBattle, phase: 'battle' }
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
  const walls = wallSet(b.walls)
  if (tmpl.kind === 'ranged' && !canRangedAttack(hero, target, tmpl.maxRange, walls)) {
    return state
  }
  if (tmpl.kind === 'aoe') return state

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
  return applyBattleOutcome(state, b, nextBattle)
}

function tryUseCardAoE(
  state: CampaignState,
  action: Extract<RunAction, { type: 'USE_CARD_AOE' }>,
): CampaignState {
  if (!state.battle || state.battle.phase !== 'ongoing') return state
  const b = state.battle
  if (getCurrentActorId(b) !== 'hero') return state

  const hero = b.units.find((u) => u.id === 'hero' && u.hp > 0)
  if (!hero) return state

  const card = b.playerCards.find((c) => c.id === action.cardId)
  if (!card) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || tmpl.kind !== 'aoe' || tmpl.aoeSize === undefined) return state

  const { targetX, targetY } = action
  if (!inBounds(targetX, targetY, b.width, b.height)) return state
  const walls = wallSet(b.walls)
  if (walls.has(cellKey(targetX, targetY))) return state
  if (!canCastAoEAt(hero, targetX, targetY, tmpl.maxRange, walls)) return state

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
  let nextBattle = applyAction(bWithCards, {
    type: 'aoe_strike',
    attackerId: 'hero',
    centerX: targetX,
    centerY: targetY,
    damage,
    aoeSize: tmpl.aoeSize,
    fromCard,
  })
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
  return applyBattleOutcome(state, b, nextBattle)
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
      const prevBattle = state.battle
      const nextBattle = applyAction(prevBattle, action.battleAction)
      return applyBattleOutcome(state, prevBattle, nextBattle)
    }
    case 'USE_CARD_ATTACK':
      return tryUseCardAttack(state, action)
    case 'USE_CARD_AOE':
      return tryUseCardAoE(state, action)
    case 'BUY_ITEM': {
      const tmpl = getItemTemplate(action.templateId)
      if (!tmpl) return state
      if (state.gold < tmpl.shopPrice) return state
      const inst: ItemInstance = {
        id: newItemId(),
        templateId: action.templateId,
        itemLevel: 1,
      }
      return withCodexDiscoveries(
        {
        ...state,
        gold: state.gold - tmpl.shopPrice,
        items: [...state.items, inst],
        },
        [codexEntryId('item', action.templateId)],
      )
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
    case 'REORDER_CARDS': {
      if (!inHub(state)) return state
      const currentIds = state.cards.map((c) => c.id)
      if (action.cardIds.length !== currentIds.length) return state
      const currentSet = new Set(currentIds)
      for (const id of action.cardIds) {
        if (!currentSet.has(id)) return state
      }
      const byId = new Map(state.cards.map((c) => [c.id, c]))
      const reordered = action.cardIds.map((id) => byId.get(id)!)
      return { ...state, cards: reordered }
    }
    case 'SET_MOD_KILL_TARGET': {
      if (!inHub(state)) return state
      if (action.cardId !== null && !state.cards.some((c) => c.id === action.cardId)) {
        return state
      }
      return { ...state, modKillTargetCardId: action.cardId }
    }
    case 'SELL_ITEM': {
      if (!inHub(state)) return state
      const item = state.items.find((i) => i.id === action.itemId)
      if (!item) return state
      if (isItemEquipped(action.itemId, state.equipment)) return state
      const price = sellPriceForItem(item, getItemTemplate)
      if (price <= 0) return state
      return {
        ...state,
        gold: state.gold + price,
        items: state.items.filter((i) => i.id !== action.itemId),
      }
    }
    case 'REORDER_STASH': {
      if (!inHub(state)) return state
      const nextItems = buildItemsWithStashOrder(
        state.items,
        state.equipment,
        action.itemIds,
      )
      if (nextItems === null) return state
      return { ...state, items: nextItems }
    }
    case 'MARK_CODEX_SEEN':
      return markCodexSeen(state)
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
    modifications: [{ templateId: DEFAULT_MOD_KILL_TEMPLATE_ID, level: 0 }],
  },
  {
    id: 'c2',
    templateId: 'fireball',
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
    codexDiscovered: [],
    codexSeenEntryIds: [],
  }
}
