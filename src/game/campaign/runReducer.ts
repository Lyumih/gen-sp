import { applyAction, getCurrentActorId } from '../battle/reducer'
import { heroTurnAdvanced, tickHeroCardCooldowns } from '../battle/cardCooldown'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { cellKey, inBounds, wallSet } from '../battle/grid'
import { canCastAoEAt, canHealTarget } from '../battle/rangeOverlay'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { computeCardHealAmount } from '../content/cardHealAmount'
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
  BattleLoadout,
  BattlePlayerCard,
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
import { mergeBattleCardsIntoCollection } from './mergeBattleCards'
import { goldForScenarioVictory } from './scenarioRewards'
import { SCENARIOS, battleStateFromScenario } from './scenarios'
import { getPrimaryCharacter, updatePrimaryCharacter } from './selectors'
import { DEFAULT_SQUAD_SLOTS, LEGACY_HERO_CHARACTER_ID } from '../character/constants'

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
  | {
      type: 'USE_CARD_HEAL'
      cardId: string
      targetId: string
      randomInt1to100: number
    }
  | { type: 'SET_BATTLE_LOADOUT'; slotIndex: 0 | 1; cardId: string | null }
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

  const hero = getPrimaryCharacter(state)
  const expected = occupiedEquipmentSlotsInOrder(hero.equipment).length
  if (itemLevelRolls.length !== expected) return state

  const b = state.battle
  const ordered = occupiedEquipmentSlotsInOrder(hero.equipment)
  let items = cloneItems(hero.items)
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

  let unitLevel = hero.unitLevel
  if (rollMementoLevelUp(unitLevel, playerUnitLevelRoll)) {
    unitLevel += 1
  }

  const scenarioSlot =
    state.battleAttemptSnapshot?.scenarioSlotIndex ?? state.scenarioIndex
  const goldGain = goldForScenarioVictory(scenarioSlot)
  const nextScenarioIndex =
    state.scenarioIndex >= SCENARIOS.length ? state.scenarioIndex : state.scenarioIndex + 1

  return updatePrimaryCharacter(
    {
      ...state,
      worldPower: b.worldPower,
      scenarioIndex: nextScenarioIndex,
      battle: null,
      phase: 'hub',
      battleAttemptSnapshot: null,
      gold: state.gold + goldGain,
    },
    (c) => ({
      ...c,
      unitLevel,
      items,
      cards: mergeBattleCardsIntoCollection(c.cards, b.playerCards),
    }),
  )
}

function applyBattleOutcome(
  state: CampaignState,
  prevBattle: BattleState,
  nextBattle: BattleState,
): CampaignState {
  let battle = nextBattle
  if (heroTurnAdvanced(prevBattle, nextBattle)) {
    battle = tickHeroCardCooldowns(battle)
  }
  const nextState = withCodexDiscoveries(state, [
    ...mergeBattleCodexDiscoveries(prevBattle, battle, state.codexDiscovered),
  ].filter((id) => !state.codexDiscovered.includes(id)))
  if (battle.phase === 'victory') {
    return { ...nextState, battle, phase: 'victory' }
  }
  if (battle.phase === 'defeat') {
    return { ...nextState, battle, phase: 'defeat' }
  }
  return { ...nextState, battle, phase: 'battle' }
}

function appendCardLevelUpLog(
  battle: BattleState,
  card: BattlePlayerCard,
  used: CardInstance,
  roll: number,
): BattleState {
  return {
    ...battle,
    battleLog: [
      ...battle.battleLog,
      {
        type: 'card_level_up',
        cardId: card.id,
        templateId: card.templateId,
        fromLevel: card.global_level,
        toLevel: used.global_level,
        roll,
      },
    ],
  }
}

function withCardCooldownSkip(battle: BattleState, cooldownTurns: number): BattleState {
  if (cooldownTurns <= 0) return battle
  return { ...battle, skipHeroCooldownTick: true }
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
  if ((card.cooldownRemaining ?? 0) > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return state

  if (tmpl.kind === 'melee' && !canMeleeAttack(hero, target)) return state
  const walls = wallSet(b.walls)
  if (tmpl.kind === 'ranged' && !canRangedAttack(hero, target, tmpl.maxRange, walls)) {
    return state
  }
  if (tmpl.kind === 'aoe' || tmpl.kind === 'heal') return state

  const used = applyCardUse(card, action.randomInt1to100)
  const cd = tmpl.cooldownTurns ?? 0
  const nextCard: BattlePlayerCard = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modifications: used.modifications,
    cooldownRemaining: cd,
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
    nextBattle = appendCardLevelUpLog(nextBattle, card, used, action.randomInt1to100)
  }
  nextBattle = withCardCooldownSkip(nextBattle, cd)
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
  if ((card.cooldownRemaining ?? 0) > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || tmpl.kind !== 'aoe' || tmpl.aoeSize === undefined) return state

  const { targetX, targetY } = action
  if (!inBounds(targetX, targetY, b.width, b.height)) return state
  const walls = wallSet(b.walls)
  if (walls.has(cellKey(targetX, targetY))) return state
  if (!canCastAoEAt(hero, targetX, targetY, tmpl.maxRange, walls)) return state

  const used = applyCardUse(card, action.randomInt1to100)
  const cd = tmpl.cooldownTurns ?? 0
  const nextCard: BattlePlayerCard = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modifications: used.modifications,
    cooldownRemaining: cd,
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
    nextBattle = appendCardLevelUpLog(nextBattle, card, used, action.randomInt1to100)
  }
  nextBattle = withCardCooldownSkip(nextBattle, cd)
  return applyBattleOutcome(state, b, nextBattle)
}

function tryUseCardHeal(
  state: CampaignState,
  action: Extract<RunAction, { type: 'USE_CARD_HEAL' }>,
): CampaignState {
  if (!state.battle || state.battle.phase !== 'ongoing') return state
  const b = state.battle
  if (getCurrentActorId(b) !== 'hero') return state

  const hero = b.units.find((u) => u.id === 'hero' && u.hp > 0)
  const target = b.units.find(
    (u) => u.id === action.targetId && u.side === 'player' && u.hp > 0,
  )
  if (!hero || !target) return state

  const card = b.playerCards.find((c) => c.id === action.cardId)
  if (!card) return state
  if ((card.cooldownRemaining ?? 0) > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || tmpl.kind !== 'heal') return state

  const walls = wallSet(b.walls)
  if (!canHealTarget(hero, target, tmpl.maxRange, walls)) return state

  const used = applyCardUse(card, action.randomInt1to100)
  const cd = tmpl.cooldownTurns ?? 0
  const nextCard: BattlePlayerCard = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modifications: used.modifications,
    cooldownRemaining: cd,
  }
  const levelForHeal = card.global_level + b.gearCardLevelBonus
  const amount = computeCardHealAmount(tmpl, levelForHeal)
  const playerCards = b.playerCards.map((c) => (c.id === card.id ? nextCard : c))
  const bWithCards = { ...b, playerCards }
  const fromCard = { cardId: card.id, templateId: card.templateId }

  let nextBattle = applyAction(bWithCards, {
    type: 'heal',
    healerId: 'hero',
    targetId: target.id,
    amount,
    fromCard,
  })
  if (used.leveledUp) {
    nextBattle = appendCardLevelUpLog(nextBattle, card, used, action.randomInt1to100)
  }
  nextBattle = withCardCooldownSkip(nextBattle, cd)
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
    case 'USE_CARD_HEAL':
      return tryUseCardHeal(state, action)
    case 'SET_BATTLE_LOADOUT': {
      if (!inHub(state)) return state
      const { slotIndex, cardId } = action
      if (slotIndex !== 0 && slotIndex !== 1) return state
      return updatePrimaryCharacter(state, (hero) => {
        if (cardId !== null && !hero.cards.some((c) => c.id === cardId)) return hero
        const next: BattleLoadout = [...hero.battleLoadout]
        if (cardId !== null) {
          for (let i = 0; i < 2; i++) {
            if (i !== slotIndex && next[i] === cardId) next[i] = null
          }
        }
        next[slotIndex] = cardId
        return { ...hero, battleLoadout: next }
      })
    }
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
        updatePrimaryCharacter(
          {
            ...state,
            gold: state.gold - tmpl.shopPrice,
          },
          (hero) => ({ ...hero, items: [...hero.items, inst] }),
        ),
        [codexEntryId('item', action.templateId)],
      )
    }
    case 'EQUIP_ITEM': {
      const { itemId, slot } = action
      const hero = getPrimaryCharacter(state)
      const item = hero.items.find((i) => i.id === itemId)
      if (!item) return state
      const tmpl = getItemTemplate(item.templateId)
      if (!tmpl || tmpl.slot !== slot) return state
      if (hero.equipment[slot] === itemId) return state
      for (const s of EQUIPMENT_ROLL_ORDER) {
        if (s !== slot && hero.equipment[s] === itemId) return state
      }
      return updatePrimaryCharacter(state, (c) => ({
        ...c,
        equipment: { ...c.equipment, [slot]: itemId },
      }))
    }
    case 'UNEQUIP_ITEM': {
      return updatePrimaryCharacter(state, (hero) => ({
        ...hero,
        equipment: { ...hero.equipment, [action.slot]: null },
      }))
    }
    case 'REORDER_CARDS': {
      if (!inHub(state)) return state
      const hero = getPrimaryCharacter(state)
      const currentIds = hero.cards.map((c) => c.id)
      if (action.cardIds.length !== currentIds.length) return state
      const currentSet = new Set(currentIds)
      for (const id of action.cardIds) {
        if (!currentSet.has(id)) return state
      }
      const byId = new Map(hero.cards.map((c) => [c.id, c]))
      const reordered = action.cardIds.map((id) => byId.get(id)!)
      return updatePrimaryCharacter(state, (c) => ({ ...c, cards: reordered }))
    }
    case 'SET_MOD_KILL_TARGET': {
      if (!inHub(state)) return state
      const hero = getPrimaryCharacter(state)
      if (action.cardId !== null && !hero.cards.some((c) => c.id === action.cardId)) {
        return state
      }
      return { ...state, modKillTargetCardId: action.cardId }
    }
    case 'SELL_ITEM': {
      if (!inHub(state)) return state
      const hero = getPrimaryCharacter(state)
      const item = hero.items.find((i) => i.id === action.itemId)
      if (!item) return state
      if (isItemEquipped(action.itemId, hero.equipment)) return state
      const price = sellPriceForItem(item, getItemTemplate)
      if (price <= 0) return state
      return updatePrimaryCharacter(
        {
          ...state,
          gold: state.gold + price,
        },
        (c) => ({
          ...c,
          items: c.items.filter((i) => i.id !== action.itemId),
        }),
      )
    }
    case 'REORDER_STASH': {
      if (!inHub(state)) return state
      const hero = getPrimaryCharacter(state)
      const nextItems = buildItemsWithStashOrder(
        hero.items,
        hero.equipment,
        action.itemIds,
      )
      if (nextItems === null) return state
      return updatePrimaryCharacter(state, (c) => ({ ...c, items: nextItems }))
    }
    case 'MARK_CODEX_SEEN':
      return markCodexSeen(state)
    case 'RETRY_CURRENT_BATTLE': {
      const snap = state.battleAttemptSnapshot
      if (!snap) return state
      const scenario = SCENARIOS[snap.scenarioSlotIndex]
      if (!scenario) return state

      const snapCopy = copyBattleAttemptSnapshot(snap)
      return updatePrimaryCharacter(
        {
          ...state,
          worldPower: snap.worldPower,
          modKillTargetCardId: snap.modKillTargetCardId,
          gold: snap.gold,
          phase: 'battle',
          battle: battleStateFromScenario(scenario, snapCopy),
          battleAttemptId: state.battleAttemptId + 1,
          battleAttemptSnapshot: snapCopy,
        },
        (hero) => ({
          ...hero,
          cards: cloneCards(snap.cards),
          battleLoadout: [...snap.battleLoadout],
          unitLevel: snap.playerUnitLevel,
          items: cloneItems(snap.items),
          equipment: { ...snap.equipment },
        }),
      )
    }
    case 'ABANDON_BATTLE': {
      const snap = state.battleAttemptSnapshot
      if (!state.battle || !snap) return state
      return updatePrimaryCharacter(
        {
          ...state,
          worldPower: snap.worldPower,
          modKillTargetCardId: snap.modKillTargetCardId,
          gold: snap.gold,
          battle: null,
          phase: 'hub',
          battleAttemptSnapshot: null,
        },
        (hero) => ({
          ...hero,
          cards: cloneCards(snap.cards),
          unitLevel: snap.playerUnitLevel,
          items: cloneItems(snap.items),
          equipment: { ...snap.equipment },
        }),
      )
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
  {
    id: 'c3',
    templateId: 'heal',
    global_level: 1,
    uses_count: 0,
    modifications: [],
  },
]

export function initialCampaignState(): CampaignState {
  const heroCards = cloneCards(STARTER_CARDS)
  const hero = {
    id: LEGACY_HERO_CHARACTER_ID,
    name: 'Герой',
    classId: 'warrior',
    unitLevel: 1,
    initiativeBase: 10,
    cards: heroCards,
    battleLoadout: ['c1', 'c2'] as BattleLoadout,
    items: [] as ItemInstance[],
    equipment: { ...EMPTY_EQUIPMENT },
  }
  const squad: (string | null)[] = [LEGACY_HERO_CHARACTER_ID]
  while (squad.length < DEFAULT_SQUAD_SLOTS) squad.push(null)

  return {
    scenarioIndex: 0,
    worldPower: 0,
    modKillTargetCardId: 'c1',
    gold: 0,
    phase: 'hub',
    battle: null,
    battleAttemptId: 0,
    battleAttemptSnapshot: null,
    codexDiscovered: [],
    codexSeenEntryIds: [],
    characters: [hero],
    squad,
    expedition: null,
  }
}
