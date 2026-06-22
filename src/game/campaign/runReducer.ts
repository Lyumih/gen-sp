import { applyAction, getCurrentActorId } from '../battle/reducer'
import { syncDownedAfterBattle } from '../battle/outcomes'
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
import { getCharacterClass } from '../content/characterClasses'
import { getItemTemplate } from '../content/itemTemplates'
import {
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
  BattleAttemptSnapshot,
  BattleLoadout,
  BattlePlayerCard,
  BattleState,
  CampaignState,
  CardInstance,
  EquipmentSlot,
  IconAccentId,
  IconSkinToneId,
  ItemInstance,
} from '../types'
import {
  buildBattleAttemptSnapshot,
  buildExpeditionBattleSnapshot,
  cloneCards,
  cloneItems,
  copyBattleAttemptSnapshot,
  getExpeditionBattleCharacterId,
} from './battleSnapshot'
import { mergeBattleCardsToParty, updateActorPlayerCards } from '../battle/playerCards'
import { goldForScenarioVictory } from './scenarioRewards'
import { getScenarioById, getScenarioIndexById, SCENARIOS, battleStateFromScenario } from './scenarios'
import {
  getCharacter,
  getPrimaryCharacter,
  updateCharacter,
} from '../character/selectors'
import { createCharacter } from '../character/createCharacter'
import { DEFAULT_SQUAD_SLOTS, LEGACY_HERO_CHARACTER_ID, MAX_ROSTER_SIZE } from '../character/constants'
import {
  isValidIconAccent,
  isValidIconEmoji,
} from '../character/iconCatalog'
import { assertHubActionAllowed } from '../expedition/freeze'
import { buildExpeditionSnapshot } from '../expedition/snapshot'
import { getExpeditionChainById, resolvePartySize } from '../expedition/config'
import {
  generateTavernCandidates,
  seededRng,
  TAVERN_REFRESH_COST,
} from '../tavern/generateCandidates'
import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import { computeBaseStatRating } from '../stats/computeRating'
import type { Expedition } from '../types'

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
  | { type: 'SET_BATTLE_LOADOUT'; characterId: string; slotIndex: 0 | 1; cardId: string | null }
  | { type: 'RETRY_CURRENT_BATTLE' }
  | { type: 'ABANDON_BATTLE' }
  | { type: 'FINALIZE_VICTORY'; itemLevelRolls: number[]; playerUnitLevelRoll: number }
  | { type: 'BUY_ITEM'; characterId: string; templateId: string }
  | { type: 'EQUIP_ITEM'; characterId: string; itemId: string; slot: EquipmentSlot }
  | { type: 'UNEQUIP_ITEM'; characterId: string; slot: EquipmentSlot }
  | { type: 'REORDER_CARDS'; characterId: string; cardIds: string[] }
  | { type: 'SET_MOD_KILL_TARGET'; cardId: string | null }
  | { type: 'SELL_ITEM'; characterId: string; itemId: string }
  | { type: 'REORDER_STASH'; characterId: string; itemIds: string[] }
  | { type: 'SET_SQUAD_SLOT'; slotIndex: number; characterId: string | null }
  | { type: 'SWAP_SQUAD_SLOTS'; from: number; to: number }
  | {
      type: 'TRANSFER_ITEM'
      itemId: string
      fromCharacterId: string
      toCharacterId: string
    }
  | { type: 'MARK_CODEX_SEEN' }
  | { type: 'START_EXPEDITION'; chainId: string; selectedCharacterIds: readonly string[] }
  | { type: 'ADVANCE_EXPEDITION_BATTLE' }
  | { type: 'INTER_BATTLE_REVIVE_ALL' }
  | { type: 'FINISH_EXPEDITION' }
  | { type: 'REFRESH_TAVERN'; seed?: number }
  | { type: 'HIRE_TAVERN_CANDIDATE'; candidateId: string }
  | { type: 'RENAME_CHARACTER'; characterId: string; name: string }
  | {
      type: 'SET_CHARACTER_APPEARANCE'
      characterId: string
      iconEmoji: string
      iconAccent?: IconAccentId
      iconSkinTone?: IconSkinToneId
    }

export { cloneCards, cloneItems }

function inHub(state: CampaignState): boolean {
  return state.battle === null
}

function isValidSquadSlotIndex(state: CampaignState, slotIndex: number): boolean {
  return slotIndex >= 0 && slotIndex < state.squad.length
}

function newItemId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function newCharacterId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function withCodexDiscoveries(state: CampaignState, ids: readonly string[]): CampaignState {
  let codexDiscovered = state.codexDiscovered
  for (const id of ids) {
    codexDiscovered = discoverCodexEntry(codexDiscovered, id)
  }
  if (codexDiscovered === state.codexDiscovered) return state
  return { ...state, codexDiscovered }
}

function expeditionRng(): () => number {
  return () => 0
}

function mementoDeathRoll(): number {
  return Math.floor(Math.random() * 100) + 1
}

export function applyMementoDeathRollsForDowned(
  state: CampaignState,
  battle: BattleState,
  rollForCharacter: (characterId: string) => number = () => mementoDeathRoll(),
): CampaignState {
  let next = state
  for (const unit of battle.units) {
    if (unit.side !== 'player' || unit.hp > 0) continue
    const char = getCharacter(next, unit.id)
    if (!char) continue
    if (rollMementoLevelUp(char.unitLevel, rollForCharacter(unit.id))) {
      next = updateCharacter(next, unit.id, (c) => ({ ...c, unitLevel: c.unitLevel + 1 }))
    }
  }
  return next
}

function withExpeditionDownedSync(state: CampaignState, battle: BattleState): CampaignState {
  if (!state.expedition) return state
  return {
    ...state,
    expedition: {
      ...state.expedition,
      squadSnapshot: [...syncDownedAfterBattle(state.expedition, battle)],
    },
  }
}

function applyBattleEndDownedSync(state: CampaignState, battle: BattleState): CampaignState {
  if (battle.phase !== 'victory' && battle.phase !== 'defeat') return state
  let next = applyMementoDeathRollsForDowned(state, battle)
  next = withExpeditionDownedSync(next, battle)
  return next
}

function isLivingPlayerActor(b: BattleState, unitId: string | undefined): boolean {
  if (!unitId) return false
  const unit = b.units.find((u) => u.id === unitId)
  return unit?.side === 'player' && unit.hp > 0
}

function restorePartyFromSnapshot(
  state: CampaignState,
  snap: BattleAttemptSnapshot,
): CampaignState {
  let next = state
  for (const member of snap.party) {
    next = updateCharacter(next, member.characterId, (c) => ({
      ...c,
      cards: cloneCards(member.cards),
      battleLoadout: [...member.battleLoadout] as BattleLoadout,
      unitLevel: member.unitLevel,
      items: cloneItems(member.items),
      equipment: { ...member.equipment },
    }))
  }
  return next
}

function applyInterBattleCampRevive(expedition: Expedition): Expedition {
  if (!expedition.interBattleReviveAllDowned) return expedition
  return {
    ...expedition,
    squadSnapshot: expedition.squadSnapshot.map((slot) =>
      slot && slot.metaStatus === 'downed' ? { ...slot, metaStatus: 'active' } : slot,
    ),
  }
}

function mergeExpeditionBattleProgress(state: CampaignState, battle: BattleState): CampaignState {
  return {
    ...state,
    characters: mergeBattleCardsToParty(state.characters, battle),
  }
}

function startExpeditionBattle(
  state: CampaignState,
  expedition: Expedition,
): CampaignState {
  const chain = getExpeditionChainById(expedition.scenarioChainId)
  if (!chain) return state

  const scenarioId = chain.battleScenarioIds[expedition.battleIndex]
  if (!scenarioId) return state

  const scenario = getScenarioById(scenarioId)
  const scenarioSlotIndex = getScenarioIndexById(scenarioId)
  if (!scenario || scenarioSlotIndex < 0) return state

  const snapshot = buildExpeditionBattleSnapshot(state, expedition, scenarioSlotIndex)
  if (!snapshot) return state

  const battle = battleStateFromScenario(scenario, snapshot)

  return {
    ...state,
    expedition,
    phase: 'battle',
    battle,
    battleAttemptSnapshot: snapshot,
    battleAttemptId: state.battleAttemptId + 1,
  }
}

function handleExpeditionBattleVictory(state: CampaignState): CampaignState {
  const expedition = state.expedition
  const battle = state.battle
  if (!expedition || !battle || battle.phase !== 'victory') return state

  const isLastBattle = expedition.battleIndex + 1 >= expedition.battleCount

  let nextExpedition = state.expedition!
  nextExpedition = applyInterBattleCampRevive(nextExpedition)
  nextExpedition = { ...nextExpedition, battleIndex: nextExpedition.battleIndex + 1 }

  let nextState = mergeExpeditionBattleProgress(state, battle)
  nextState = { ...nextState, worldPower: battle.worldPower }

  if (isLastBattle) {
    return {
      ...nextState,
      expedition: nextExpedition,
      battle,
      phase: 'victory',
    }
  }

  return {
    ...nextState,
    expedition: nextExpedition,
    battle: null,
    battleAttemptSnapshot: null,
    phase: 'inter_battle',
  }
}

function finishExpedition(state: CampaignState): CampaignState {
  if (!state.expedition) return state
  return {
    ...state,
    expedition: null,
    battle: null,
    battleAttemptSnapshot: null,
    phase: 'hub',
  }
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
    state.expedition !== null
      ? state.scenarioIndex
      : state.scenarioIndex >= SCENARIOS.length
        ? state.scenarioIndex
        : state.scenarioIndex + 1

  const mergedCharacters = mergeBattleCardsToParty(state.characters, b)

  return {
    ...state,
    worldPower: b.worldPower,
    scenarioIndex: nextScenarioIndex,
    battle: null,
    phase: 'hub',
    battleAttemptSnapshot: null,
    expedition: null,
    gold: state.gold + goldGain,
    characters: mergedCharacters.map((c) =>
      c.id === hero.id ? { ...c, unitLevel, items } : c,
    ),
  }
}

function applyBattleOutcome(
  state: CampaignState,
  prevBattle: BattleState,
  nextBattle: BattleState,
): CampaignState {
  let battle = nextBattle
  if (heroTurnAdvanced(prevBattle, nextBattle)) {
    const prevActorId = prevBattle.turnOrder[prevBattle.currentTurnIndex]
    battle = tickHeroCardCooldowns(battle, prevActorId)
  }
  const nextState = withCodexDiscoveries(state, [
    ...mergeBattleCodexDiscoveries(prevBattle, battle, state.codexDiscovered),
  ].filter((id) => !state.codexDiscovered.includes(id)))
  const syncedState = applyBattleEndDownedSync(nextState, battle)
  if (state.expedition) {
    if (battle.phase === 'victory') {
      return handleExpeditionBattleVictory({ ...syncedState, battle })
    }
    if (battle.phase === 'defeat') {
      return { ...syncedState, battle, phase: 'defeat' }
    }
    return { ...syncedState, battle, phase: 'battle' }
  }
  if (battle.phase === 'victory') {
    return { ...syncedState, battle, phase: 'victory' }
  }
  if (battle.phase === 'defeat') {
    return { ...syncedState, battle, phase: 'defeat' }
  }
  return { ...syncedState, battle, phase: 'battle' }
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
  const actorId = getCurrentActorId(b)
  if (!isLivingPlayerActor(b, actorId)) return state

  const actor = b.units.find((u) => u.id === actorId && u.side === 'player' && u.hp > 0)
  const target = b.units.find(
    (u) => u.id === action.targetId && u.side === 'enemy' && u.hp > 0,
  )
  if (!actor || !target) return state

  const actorCards = b.playerCardsByUnitId[actorId!] ?? []
  const card = actorCards.find((c) => c.id === action.cardId)
  if (!card) return state
  if ((card.cooldownRemaining ?? 0) > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return state

  if (tmpl.kind === 'melee' && !canMeleeAttack(actor, target)) return state
  const walls = wallSet(b.walls)
  if (tmpl.kind === 'ranged' && !canRangedAttack(actor, target, tmpl.maxRange, walls)) {
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
  const bWithCards = updateActorPlayerCards(
    b,
    actorId!,
    actorCards.map((c) => (c.id === card.id ? nextCard : c)),
  )

  const fromCard = { cardId: card.id, templateId: card.templateId }
  const battleAction: BattleAction =
    tmpl.kind === 'melee'
      ? {
          type: 'attack',
          attackerId: actorId!,
          targetId: target.id,
          damage,
          kind: 'melee',
          fromCard,
        }
      : {
          type: 'attack',
          attackerId: actorId!,
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
  const actorId = getCurrentActorId(b)
  if (!isLivingPlayerActor(b, actorId)) return state

  const actor = b.units.find((u) => u.id === actorId && u.side === 'player' && u.hp > 0)
  if (!actor) return state

  const actorCards = b.playerCardsByUnitId[actorId!] ?? []
  const card = actorCards.find((c) => c.id === action.cardId)
  if (!card) return state
  if ((card.cooldownRemaining ?? 0) > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || tmpl.kind !== 'aoe' || tmpl.aoeSize === undefined) return state

  const { targetX, targetY } = action
  if (!inBounds(targetX, targetY, b.width, b.height)) return state
  const walls = wallSet(b.walls)
  if (walls.has(cellKey(targetX, targetY))) return state
  if (!canCastAoEAt(actor, targetX, targetY, tmpl.maxRange, walls)) return state

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
  const bWithCards = updateActorPlayerCards(
    b,
    actorId!,
    actorCards.map((c) => (c.id === card.id ? nextCard : c)),
  )

  const fromCard = { cardId: card.id, templateId: card.templateId }
  let nextBattle = applyAction(bWithCards, {
    type: 'aoe_strike',
    attackerId: actorId!,
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
  const actorId = getCurrentActorId(b)
  if (!isLivingPlayerActor(b, actorId)) return state

  const actor = b.units.find((u) => u.id === actorId && u.side === 'player' && u.hp > 0)
  const target = b.units.find(
    (u) => u.id === action.targetId && u.side === 'player' && u.hp > 0,
  )
  if (!actor || !target) return state

  const actorCards = b.playerCardsByUnitId[actorId!] ?? []
  const card = actorCards.find((c) => c.id === action.cardId)
  if (!card) return state
  if ((card.cooldownRemaining ?? 0) > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || tmpl.kind !== 'heal') return state

  const walls = wallSet(b.walls)
  if (!canHealTarget(actor, target, tmpl.maxRange, walls)) return state

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
  const bWithCards = updateActorPlayerCards(
    b,
    actorId!,
    actorCards.map((c) => (c.id === card.id ? nextCard : c)),
  )
  const fromCard = { cardId: card.id, templateId: card.templateId }

  let nextBattle = applyAction(bWithCards, {
    type: 'heal',
    healerId: actorId!,
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

function normalizeCharacterName(raw: string, fallback: string): string {
  const trimmed = raw.trim()
  if (trimmed.length < 1 || trimmed.length > 20) return fallback
  return trimmed
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
      if (!assertHubActionAllowed(state, 'equip')) return state
      const { characterId, slotIndex, cardId } = action
      if (slotIndex !== 0 && slotIndex !== 1) return state
      const hero = getCharacter(state, characterId)
      if (!hero) return state
      return updateCharacter(state, characterId, (c) => {
        if (cardId !== null && !c.cards.some((card) => card.id === cardId)) return c
        const next: BattleLoadout = [...c.battleLoadout]
        if (cardId !== null) {
          for (let i = 0; i < 2; i++) {
            if (i !== slotIndex && next[i] === cardId) next[i] = null
          }
        }
        next[slotIndex] = cardId
        return { ...c, battleLoadout: next }
      })
    }
    case 'BUY_ITEM': {
      if (!assertHubActionAllowed(state, 'shop')) return state
      const { characterId, templateId } = action
      if (!getCharacter(state, characterId)) return state
      const tmpl = getItemTemplate(templateId)
      if (!tmpl) return state
      if (state.gold < tmpl.shopPrice) return state
      const inst: ItemInstance = {
        id: newItemId(),
        templateId,
        itemLevel: 1,
      }
      return withCodexDiscoveries(
        updateCharacter(
          {
            ...state,
            gold: state.gold - tmpl.shopPrice,
          },
          characterId,
          (hero) => ({ ...hero, items: [...hero.items, inst] }),
        ),
        [codexEntryId('item', templateId)],
      )
    }
    case 'EQUIP_ITEM': {
      if (!assertHubActionAllowed(state, 'equip')) return state
      const { characterId, itemId, slot } = action
      const hero = getCharacter(state, characterId)
      if (!hero) return state
      const item = hero.items.find((i) => i.id === itemId)
      if (!item) return state
      const tmpl = getItemTemplate(item.templateId)
      if (!tmpl || tmpl.slot !== slot) return state
      if (hero.equipment[slot] === itemId) return state
      for (const s of EQUIPMENT_ROLL_ORDER) {
        if (s !== slot && hero.equipment[s] === itemId) return state
      }
      return updateCharacter(state, characterId, (c) => ({
        ...c,
        equipment: { ...c.equipment, [slot]: itemId },
      }))
    }
    case 'UNEQUIP_ITEM': {
      if (!assertHubActionAllowed(state, 'equip')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      return updateCharacter(state, action.characterId, (c) => ({
        ...c,
        equipment: { ...c.equipment, [action.slot]: null },
      }))
    }
    case 'REORDER_CARDS': {
      if (!inHub(state)) return state
      if (!assertHubActionAllowed(state, 'equip')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const currentIds = hero.cards.map((c) => c.id)
      if (action.cardIds.length !== currentIds.length) return state
      const currentSet = new Set(currentIds)
      for (const id of action.cardIds) {
        if (!currentSet.has(id)) return state
      }
      const byId = new Map(hero.cards.map((c) => [c.id, c]))
      const reordered = action.cardIds.map((id) => byId.get(id)!)
      return updateCharacter(state, action.characterId, (c) => ({ ...c, cards: reordered }))
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
      if (!assertHubActionAllowed(state, 'shop')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const item = hero.items.find((i) => i.id === action.itemId)
      if (!item) return state
      if (isItemEquipped(action.itemId, hero.equipment)) return state
      const price = sellPriceForItem(item, getItemTemplate)
      if (price <= 0) return state
      return updateCharacter(
        {
          ...state,
          gold: state.gold + price,
        },
        action.characterId,
        (c) => ({
          ...c,
          items: c.items.filter((i) => i.id !== action.itemId),
        }),
      )
    }
    case 'REORDER_STASH': {
      if (!inHub(state)) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const nextItems = buildItemsWithStashOrder(
        hero.items,
        hero.equipment,
        action.itemIds,
      )
      if (nextItems === null) return state
      return updateCharacter(state, action.characterId, (c) => ({ ...c, items: nextItems }))
    }
    case 'SET_SQUAD_SLOT': {
      if (!assertHubActionAllowed(state, 'squad')) return state
      const { slotIndex, characterId } = action
      if (!isValidSquadSlotIndex(state, slotIndex)) return state
      if (characterId !== null && !getCharacter(state, characterId)) return state
      const nextSquad = [...state.squad]
      if (characterId !== null) {
        for (let i = 0; i < nextSquad.length; i++) {
          if (i !== slotIndex && nextSquad[i] === characterId) {
            nextSquad[i] = null
          }
        }
      }
      nextSquad[slotIndex] = characterId
      return { ...state, squad: nextSquad }
    }
    case 'SWAP_SQUAD_SLOTS': {
      if (!assertHubActionAllowed(state, 'squad')) return state
      const { from, to } = action
      if (!isValidSquadSlotIndex(state, from) || !isValidSquadSlotIndex(state, to)) {
        return state
      }
      if (from === to) return state
      const nextSquad = [...state.squad]
      const tmp = nextSquad[from]!
      nextSquad[from] = nextSquad[to]!
      nextSquad[to] = tmp
      return { ...state, squad: nextSquad }
    }
    case 'TRANSFER_ITEM': {
      if (!assertHubActionAllowed(state, 'transfer')) return state
      const { itemId, fromCharacterId, toCharacterId } = action
      if (fromCharacterId === toCharacterId) return state
      const fromHero = getCharacter(state, fromCharacterId)
      const toHero = getCharacter(state, toCharacterId)
      if (!fromHero || !toHero) return state
      const item = fromHero.items.find((i) => i.id === itemId)
      if (!item) return state
      if (isItemEquipped(itemId, fromHero.equipment)) return state
      return updateCharacter(
        updateCharacter(state, fromCharacterId, (c) => ({
          ...c,
          items: c.items.filter((i) => i.id !== itemId),
        })),
        toCharacterId,
        (c) => ({ ...c, items: [...c.items, item] }),
      )
    }
    case 'MARK_CODEX_SEEN':
      return markCodexSeen(state)
    case 'RETRY_CURRENT_BATTLE': {
      const snap = state.battleAttemptSnapshot
      if (!snap) return state
      const scenario = SCENARIOS[snap.scenarioSlotIndex]
      if (!scenario) return state

      const snapCopy = copyBattleAttemptSnapshot(snap)
      return restorePartyFromSnapshot(
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
        snapCopy,
      )
    }
    case 'ABANDON_BATTLE': {
      const snap = state.battleAttemptSnapshot
      if (!state.battle || !snap) return state
      return restorePartyFromSnapshot(
        {
          ...state,
          worldPower: snap.worldPower,
          modKillTargetCardId: snap.modKillTargetCardId,
          gold: snap.gold,
          battle: null,
          phase: 'hub',
          battleAttemptSnapshot: null,
        },
        snap,
      )
    }
    case 'FINALIZE_VICTORY': {
      if (!state.battle || state.battle.phase !== 'victory') return state
      return finalizeVictory(state, action.itemLevelRolls, action.playerUnitLevelRoll)
    }
    case 'START_EXPEDITION': {
      if (state.battle !== null || state.expedition !== null) return state
      if (state.phase !== 'hub') return state

      const chain = getExpeditionChainById(action.chainId)
      if (!chain) return state

      const rng = expeditionRng()
      const partySize = resolvePartySize(chain.partySize, rng)
      if (action.selectedCharacterIds.length !== partySize) return state

      for (const id of action.selectedCharacterIds) {
        if (!getCharacter(state, id)) return state
      }

      const expedition = buildExpeditionSnapshot(
        state,
        chain,
        action.selectedCharacterIds,
        rng,
      )

      return startExpeditionBattle({ ...state, expedition }, expedition)
    }
    case 'ADVANCE_EXPEDITION_BATTLE': {
      if (state.phase !== 'inter_battle' || !state.expedition || state.battle !== null) {
        return state
      }
      if (!getExpeditionBattleCharacterId(state.expedition)) return state
      return startExpeditionBattle(state, state.expedition)
    }
    case 'INTER_BATTLE_REVIVE_ALL': {
      if (state.phase !== 'inter_battle' || !state.expedition) return state
      if (!state.expedition.interBattleReviveAllDowned) return state

      const expedition: Expedition = {
        ...state.expedition,
        squadSnapshot: state.expedition.squadSnapshot.map((slot) =>
          slot && slot.metaStatus === 'downed' ? { ...slot, metaStatus: 'active' } : slot,
        ),
      }
      return { ...state, expedition }
    }
    case 'FINISH_EXPEDITION':
      return finishExpedition(state)
    case 'REFRESH_TAVERN': {
      if (!assertHubActionAllowed(state, 'tavern')) return state
      if (state.gold < TAVERN_REFRESH_COST) return state
      const rng = action.seed !== undefined ? seededRng(action.seed) : () => Math.random()
      return {
        ...state,
        gold: state.gold - TAVERN_REFRESH_COST,
        tavernCandidates: generateTavernCandidates(rng),
      }
    }
    case 'HIRE_TAVERN_CANDIDATE': {
      if (!assertHubActionAllowed(state, 'tavern')) return state
      if (!state.tavernCandidates) return state
      if (state.characters.length >= MAX_ROSTER_SIZE) return state

      const candidate = state.tavernCandidates.find((c) => c.candidateId === action.candidateId)
      if (!candidate) return state
      if (state.gold < candidate.price) return state

      const cls = getCharacterClass(candidate.classId)
      if (!cls) return state

      const charId = newCharacterId()
      let character = createCharacter({
        id: charId,
        name: `${cls.label} ${state.characters.length + 1}`,
        classId: candidate.classId,
        baseStats: candidate.baseStats,
        baseStatRating: candidate.baseStatRating,
      })

      const items = [...character.items]
      const equipment = { ...character.equipment }
      for (const slot of EQUIPMENT_ROLL_ORDER) {
        const templateId = candidate.previewGear[slot]
        if (!templateId) continue
        const tmpl = getItemTemplate(templateId)
        if (!tmpl || tmpl.slot !== slot) continue
        const inst: ItemInstance = { id: newItemId(), templateId, itemLevel: 1 }
        items.push(inst)
        equipment[slot] = inst.id
      }
      character = { ...character, items, equipment }

      return {
        ...state,
        gold: state.gold - candidate.price,
        characters: [...state.characters, character],
        tavernCandidates: state.tavernCandidates.filter(
          (c) => c.candidateId !== action.candidateId,
        ),
      }
    }
    case 'RENAME_CHARACTER': {
      if (!assertHubActionAllowed(state, 'equip')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const name = normalizeCharacterName(action.name, hero.name)
      return updateCharacter(state, action.characterId, (c) => ({ ...c, name }))
    }
    case 'SET_CHARACTER_APPEARANCE': {
      if (!assertHubActionAllowed(state, 'equip')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      if (!isValidIconEmoji(action.iconEmoji)) return state
      const iconAccent =
        action.iconAccent !== undefined && isValidIconAccent(action.iconAccent)
          ? action.iconAccent
          : hero.iconAccent
      const iconSkinTone: IconSkinToneId =
        action.iconSkinTone === 'light' ||
        action.iconSkinTone === 'medium' ||
        action.iconSkinTone === 'dark'
          ? action.iconSkinTone
          : hero.iconSkinTone
      return updateCharacter(state, action.characterId, (c) => ({
        ...c,
        iconEmoji: action.iconEmoji,
        iconAccent,
        iconSkinTone,
      }))
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
  const hero = createCharacter({
    id: LEGACY_HERO_CHARACTER_ID,
    name: 'Герой',
    classId: 'warrior',
    baseStats: STARTER_HERO_BASE_STATS,
    baseStatRating: computeBaseStatRating(STARTER_HERO_BASE_STATS),
  })
  hero.cards = cloneCards(STARTER_CARDS)
  hero.battleLoadout = ['c1', 'c2']
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
    tavernCandidates: null,
  }
}
