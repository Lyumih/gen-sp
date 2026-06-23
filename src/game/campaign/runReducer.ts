import { applyAction, getCurrentActorId } from '../battle/reducer'
import { syncDownedAfterBattle } from '../battle/outcomes'
import { heroTurnAdvanced, tickHeroCardCooldowns } from '../battle/cardCooldown'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { cellKey, inBounds, wallSet } from '../battle/grid'
import { canCastAoEAt, canHealTarget } from '../battle/rangeOverlay'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { computeCardHealAmount } from '../content/cardHealAmount'
import { CARD_ATTACK_TEMPLATES, getCardAttackTemplate } from '../content/cardTemplates'
import {
  codexEntryId,
  discoverCodexEntry,
  markCodexSeen,
  mergeBattleCodexDiscoveries,
} from '../codex/discovery'
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
import {
  resolveStrikeWeaponChannel,
  type StrikeWeaponChannel,
} from '../equipment/virtualFists'
import { applyCardUse } from '../memento/cardProgress'
import { afterCarrierLevelChange, modOfferSeed, occupiedModTemplateIds } from '../memento/carrierLevelChange'
import { applyItemUseRoll } from '../memento/itemProgress'
import { generateOffer } from '../memento/modOffers'
import { rollbackCarrierLevel } from '../memento/modSlots'
import { resolveCarrierTags } from '../mods/carrierTags'
import {
  applyAoeSizeMods,
  applyCooldownMods,
  applyDamageMods,
  applyHealMods,
  applyRangeMods,
  type ModCombatContext,
} from '../mods/modPipeline'
import { MOD_OFFER_POOL, getModTemplate } from '../content/modTemplates'
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
import { applyVictoryModRollsToPartyBattle } from './applyVictoryModRolls'
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
import {
  pickRandomSkillTemplateId,
  rollBattleSkillDrop,
  SKILL_ACQUISITION,
} from '../config/skillAcquisition'
import { computeBaseStatRating } from '../stats/computeRating'
import { generateShopOffers } from '../shop/generateShopOffers'
import { createCardInstance, createStrikeCardForHero } from './cardFactory'
import { EMPTY_CHEST } from './chestDefaults'
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
  | {
      type: 'PICK_MOD_OFFER'
      characterId: string
      carrierKind: 'card' | 'item'
      carrierId: string
      slotIndex: number
      modTemplateId: string
    }
  | {
      type: 'REMOVE_MOD'
      characterId: string
      carrierKind: 'card' | 'item'
      carrierId: string
      slotIndex: number
    }
  | { type: 'REFRESH_SHOP'; seed?: number; free?: boolean }
  | {
      type: 'BUY_SHOP_OFFER'
      offerIndex: number
      destination?: 'chest' | 'character'
      characterId?: string
    }
  | { type: 'MOVE_CHEST_ITEM_TO_CHARACTER'; itemId: string; characterId: string }
  | { type: 'MOVE_CHARACTER_ITEM_TO_CHEST'; itemId: string; characterId: string }
  | { type: 'BIND_CHEST_CARD'; cardId: string; characterId: string }
  | { type: 'SELL_CHEST_ITEM'; itemId: string }
  | { type: 'MARK_HUB_NOTICE_SEEN' }

export { afterCarrierLevelChange }

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
      const nextLevel = inst.itemLevel + 1
      const nextInst = afterCarrierLevelChange(
        { ...inst, itemLevel: nextLevel },
        'item',
        inst.templateId,
        nextLevel,
        modOfferSeed(itemId, 0, nextLevel),
      )
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

  const dropRng = seededRng(state.battleAttemptId * 9973 + 13)
  let chest = state.chest ?? EMPTY_CHEST
  let pendingHubNotice = state.pendingHubNotice
  if (rollBattleSkillDrop(dropRng())) {
    const templateId = pickRandomSkillTemplateId(dropRng)
    const dropped = createCardInstance(templateId)
    chest = { ...chest, unboundCards: [...chest.unboundCards, dropped] }
    pendingHubNotice = { kind: 'skill_drop', templateId }
  }

  const base: CampaignState = {
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
    chest,
    pendingHubNotice,
  }
  if (pendingHubNotice?.kind === 'skill_drop') {
    return withCodexDiscoveries(base, [
      codexEntryId('card', pendingHubNotice.templateId),
    ])
  }
  return base
}

const GEAR_HIT_SLOTS: readonly EquipmentSlot[] = ['armor', 'accessory']

function updateCharacterItem(
  state: CampaignState,
  characterId: string,
  itemId: string,
  nextItem: ItemInstance,
): CampaignState {
  return updateCharacter(state, characterId, (c) => ({
    ...c,
    items: c.items.map((i) => (i.id === itemId ? nextItem : i)),
  }))
}

function itemHitRollSeed(
  state: CampaignState,
  characterId: string,
  itemId: string,
  logIndex: number,
): number {
  return (modOfferSeed(`${state.battleAttemptId}:${characterId}:${itemId}:${logIndex}`, 0, 0) % 100) + 1
}

function applyGearHitItemRolls(
  state: CampaignState,
  characterId: string,
  rollForItem: (itemId: string) => number,
): CampaignState {
  let next = state
  for (const slot of GEAR_HIT_SLOTS) {
    const char = getCharacter(next, characterId)
    if (!char) return next
    const itemId = char.equipment[slot]
    if (itemId === null) continue
    const item = char.items.find((i) => i.id === itemId)
    if (!item) continue
    const rolled = applyItemUseRoll(item, rollForItem(itemId))
    const { leveledUp: _leveledUp, ...nextItem } = rolled
    next = updateCharacterItem(next, characterId, itemId, nextItem)
  }
  return next
}

function applyWeaponStrikeItemProgress(
  state: CampaignState,
  characterId: string,
  randomInt1to100: number,
): CampaignState {
  const char = getCharacter(state, characterId)
  if (!char) return state
  const weaponId = char.equipment.weapon
  if (weaponId === null) return state

  const item = char.items.find((i) => i.id === weaponId)
  if (!item) return state

  const rolled = applyItemUseRoll(item, randomInt1to100)
  const { leveledUp: _leveledUp, ...nextItem } = rolled
  return updateCharacterItem(state, characterId, weaponId, nextItem)
}

function applyPlayerHitItemProgressFromBattleLog(
  state: CampaignState,
  prevBattle: BattleState,
  nextBattle: BattleState,
): CampaignState {
  const prevLen = prevBattle.battleLog.length
  const newEntries = nextBattle.battleLog.slice(prevLen)
  let next = state

  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i]!
    if (entry.type !== 'strike') continue

    const target = nextBattle.units.find((u) => u.id === entry.targetId)
    const attacker = nextBattle.units.find((u) => u.id === entry.attackerId)
    if (!target || target.side !== 'player') continue
    if (!attacker || attacker.side !== 'enemy') continue
    if (entry.damage <= 0) continue

    const logIndex = prevLen + i
    next = applyGearHitItemRolls(next, entry.targetId, (itemId) =>
      itemHitRollSeed(state, entry.targetId, itemId, logIndex),
    )
  }
  return next
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

  let rollState = applyPlayerHitItemProgressFromBattleLog(state, prevBattle, battle)
  if (prevBattle.phase !== 'victory' && battle.phase === 'victory') {
    const rolled = applyVictoryModRollsToPartyBattle(
      rollState.characters,
      battle,
      rollState.battleAttemptId,
    )
    rollState = { ...rollState, characters: rolled.characters }
    battle = rolled.battle
  }

  const nextState = withCodexDiscoveries(rollState, [
    ...mergeBattleCodexDiscoveries(prevBattle, battle, rollState.codexDiscovered),
  ].filter((id) => !rollState.codexDiscovered.includes(id)))
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

function cardModCombatContext(
  state: CampaignState,
  actorId: string,
  card: BattlePlayerCard,
  cardLevelRoll: number,
): ModCombatContext {
  let procIndex = 0
  return {
    carrierTags: resolveCarrierTags('card', card.templateId),
    modSlots: card.modSlots,
    rng: () => {
      procIndex += 1
      return (
        (modOfferSeed(
          `${state.battleAttemptId}:${actorId}:${card.id}:${cardLevelRoll}:proc${procIndex}`,
          0,
          0,
        ) %
          100) +
        1
      )
    },
  }
}

function battleModContext(ctx: ModCombatContext): { modSlots: typeof ctx.modSlots; rng: typeof ctx.rng } {
  return { modSlots: ctx.modSlots, rng: ctx.rng }
}

function weaponStrikeModCombatContext(
  state: CampaignState,
  actorId: string,
  card: BattlePlayerCard,
  weaponChannel: StrikeWeaponChannel,
  cardLevelRoll: number,
): ModCombatContext {
  let procIndex = 0
  return {
    carrierTags: resolveCarrierTags('item', weaponChannel.templateId),
    modSlots: weaponChannel.modSlots,
    rng: () => {
      procIndex += 1
      return (
        (modOfferSeed(
          `${state.battleAttemptId}:${actorId}:${card.id}:${weaponChannel.itemId ?? 'fists'}:${cardLevelRoll}:proc${procIndex}`,
          0,
          0,
        ) %
          100) +
        1
      )
    },
  }
}

function applyStrikeChannelUse(
  card: BattlePlayerCard,
): BattlePlayerCard & { leveledUp: false } {
  return {
    ...card,
    uses_count: card.uses_count + 1,
    modSlots: [],
    leveledUp: false,
  }
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
  const isStrike = card.templateId === 'strike'
  const actorChar = getCharacter(state, actorId!)
  const weaponChannel =
    isStrike && actorChar
      ? resolveStrikeWeaponChannel(actorChar.equipment.weapon, actorChar.items)
      : null
  const modCtx =
    isStrike && weaponChannel
      ? weaponStrikeModCombatContext(
          state,
          actorId!,
          card,
          weaponChannel,
          action.randomInt1to100,
        )
      : cardModCombatContext(state, actorId!, card, action.randomInt1to100)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  if (tmpl.kind === 'ranged' && !canRangedAttack(actor, target, effectiveRange, walls)) {
    return state
  }
  if (tmpl.kind === 'aoe' || tmpl.kind === 'heal') return state

  const used = isStrike
    ? applyStrikeChannelUse(card)
    : applyCardUse(card, action.randomInt1to100)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modSlots: used.modSlots,
    cooldownRemaining: cd,
  }
  const levelForDamage =
    isStrike && weaponChannel ? weaponChannel.itemLevel : card.global_level
  const gearMult =
    isStrike && weaponChannel ? b.gearStrikeDamageMult : b.gearDamageMult
  const baseDamage = computeCardAttackDamage(tmpl, levelForDamage)
  const damage = applyDamageMods(Math.round(baseDamage * gearMult), modCtx)
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
          modCtx: battleModContext(modCtx),
        }
      : {
          type: 'attack',
          attackerId: actorId!,
          targetId: target.id,
          damage,
          kind: 'ranged',
          maxRange: effectiveRange,
          fromCard,
          modCtx: battleModContext(modCtx),
        }

  let nextBattle = applyAction(bWithCards, battleAction)
  if (used.leveledUp) {
    nextBattle = appendCardLevelUpLog(nextBattle, card, used, action.randomInt1to100)
  }
  nextBattle = withCardCooldownSkip(nextBattle, cd)
  let nextState = state
  if (card.templateId === 'strike') {
    nextState = applyWeaponStrikeItemProgress(state, actorId!, action.randomInt1to100)
  }
  return applyBattleOutcome(nextState, b, nextBattle)
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
  const modCtx = cardModCombatContext(state, actorId!, card, action.randomInt1to100)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  if (!canCastAoEAt(actor, targetX, targetY, effectiveRange, walls)) return state

  const used = applyCardUse(card, action.randomInt1to100)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modSlots: used.modSlots,
    cooldownRemaining: cd,
  }
  const baseDamage = computeCardAttackDamage(tmpl, card.global_level)
  const damage = applyDamageMods(
    Math.round(baseDamage * b.gearDamageMult),
    modCtx,
  )
  const aoeSize = applyAoeSizeMods(tmpl.aoeSize, modCtx)
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
    aoeSize,
    fromCard,
    modCtx: battleModContext(modCtx),
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
  const modCtx = cardModCombatContext(state, actorId!, card, action.randomInt1to100)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  if (!canHealTarget(actor, target, effectiveRange, walls)) return state

  const used = applyCardUse(card, action.randomInt1to100)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = {
    id: used.id,
    templateId: used.templateId,
    global_level: used.global_level,
    uses_count: used.uses_count,
    modSlots: used.modSlots,
    cooldownRemaining: cd,
  }
  const baseHeal = computeCardHealAmount(tmpl, card.global_level)
  const amount = applyHealMods(Math.round(baseHeal * b.gearDamageMult), modCtx)
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
    modCtx: battleModContext(modCtx),
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

function updateCarrierModSlots(
  state: CampaignState,
  characterId: string,
  carrierKind: 'card' | 'item',
  carrierId: string,
  update: (
    carrier: CardInstance | ItemInstance,
    templateId: string,
  ) => CardInstance | ItemInstance | null,
): CampaignState {
  const hero = getCharacter(state, characterId)
  if (!hero) return state

  if (carrierKind === 'card') {
    const card = hero.cards.find((c) => c.id === carrierId)
    if (!card) return state
    const next = update(card, card.templateId)
    if (!next) return state
    return updateCharacter(state, characterId, (c) => ({
      ...c,
      cards: c.cards.map((entry) => (entry.id === carrierId ? (next as CardInstance) : entry)),
    }))
  }

  const item = hero.items.find((i) => i.id === carrierId)
  if (!item) return state
  const next = update(item, item.templateId)
  if (!next) return state
  return updateCharacter(state, characterId, (c) => ({
    ...c,
    items: c.items.map((entry) => (entry.id === carrierId ? (next as ItemInstance) : entry)),
  }))
}

function tryPickModOffer(
  state: CampaignState,
  action: Extract<RunAction, { type: 'PICK_MOD_OFFER' }>,
): CampaignState {
  if (!inHub(state)) return state
  if (!assertHubActionAllowed(state, 'equip')) return state
  if (!getModTemplate(action.modTemplateId)) return state

  return updateCarrierModSlots(
    state,
    action.characterId,
    action.carrierKind,
    action.carrierId,
    (carrier, _templateId) => {
      const slot = carrier.modSlots[action.slotIndex]
      if (slot?.status !== 'empty' || !slot.offer) return null
      if (!slot.offer.modIds.includes(action.modTemplateId)) return null

      const modSlots = [...carrier.modSlots]
      modSlots[action.slotIndex] = {
        status: 'filled',
        templateId: action.modTemplateId,
        lm: 0,
      }
      return { ...carrier, modSlots }
    },
  )
}

function tryRemoveMod(
  state: CampaignState,
  action: Extract<RunAction, { type: 'REMOVE_MOD' }>,
): CampaignState {
  if (!inHub(state)) return state
  if (!assertHubActionAllowed(state, 'equip')) return state

  return updateCarrierModSlots(
    state,
    action.characterId,
    action.carrierKind,
    action.carrierId,
    (carrier, templateId) => {
      const slot = carrier.modSlots[action.slotIndex]
      if (slot?.status !== 'filled') return null

      const occupied = occupiedModTemplateIds(carrier.modSlots).filter(
        (id) => id !== slot.templateId,
      )
      const tags = resolveCarrierTags(action.carrierKind, templateId)
      const offer = generateOffer(
        MOD_OFFER_POOL,
        tags,
        occupied,
        action.slotIndex,
        modOfferSeed(action.carrierId, action.slotIndex, Date.now()),
      )

      const modSlots = [...carrier.modSlots]
      modSlots[action.slotIndex] = { status: 'empty', offer }
      const newLevel = rollbackCarrierLevel(action.slotIndex)

      if (action.carrierKind === 'card') {
        return {
          ...(carrier as CardInstance),
          global_level: newLevel,
          modSlots,
        }
      }
      return {
        ...(carrier as ItemInstance),
        itemLevel: newLevel,
        modSlots,
      }
    },
  )
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
        if (cardId !== null) {
          const card = c.cards.find((x) => x.id === cardId)
          if (!card) return c
          const tmpl = CARD_ATTACK_TEMPLATES[card.templateId]
          if (tmpl?.enabled === false) return c
        }
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
        modSlots: [],
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
        const inst: ItemInstance = { id: newItemId(), templateId, itemLevel: 1, modSlots: [] }
        items.push(inst)
        equipment[slot] = inst.id
      }
      const skillTemplateId = pickRandomSkillTemplateId(
        seededRng(state.characters.length * 31 + candidate.classId.length),
      )
      const skillCard = createCardInstance(skillTemplateId)
      character = {
        ...character,
        items,
        equipment,
        cards: [skillCard],
        battleLoadout: [skillCard.id, null],
      }

      return withCodexDiscoveries(
        {
          ...state,
          gold: state.gold - candidate.price,
          characters: [...state.characters, character],
          tavernCandidates: state.tavernCandidates.filter(
            (c) => c.candidateId !== action.candidateId,
          ),
        },
        [codexEntryId('class', candidate.classId), codexEntryId('card', skillTemplateId)],
      )
    }
    case 'REFRESH_SHOP': {
      if (!assertHubActionAllowed(state, 'shop')) return state
      const free = action.free === true && state.shopOffers === null
      if (!free && state.gold < SKILL_ACQUISITION.shopRefreshCost) return state
      const rng = action.seed !== undefined ? seededRng(action.seed) : () => Math.random()
      return {
        ...state,
        gold: free ? state.gold : state.gold - SKILL_ACQUISITION.shopRefreshCost,
        shopOffers: generateShopOffers(rng),
        shopRefreshSeed: action.seed ?? state.shopRefreshSeed + 1,
      }
    }
    case 'BUY_SHOP_OFFER': {
      if (!assertHubActionAllowed(state, 'shop')) return state
      const offer = state.shopOffers?.[action.offerIndex]
      if (!offer) return state
      if (offer.kind === 'skill') {
        if (state.gold < SKILL_ACQUISITION.shopSkillPrice) return state
        const card = createCardInstance(offer.templateId)
        return withCodexDiscoveries(
          {
            ...state,
            gold: state.gold - SKILL_ACQUISITION.shopSkillPrice,
            chest: {
              ...state.chest,
              unboundCards: [...state.chest.unboundCards, card],
            },
            shopOffers: state.shopOffers!.filter((_, i) => i !== action.offerIndex),
          },
          [codexEntryId('card', offer.templateId)],
        )
      }
      const tmpl = getItemTemplate(offer.templateId)
      if (!tmpl || state.gold < tmpl.shopPrice) return state
      const inst: ItemInstance = {
        id: newItemId(),
        templateId: offer.templateId,
        itemLevel: 1,
        modSlots: [],
      }
      const dest = action.destination ?? 'chest'
      const nextOffers = state.shopOffers!.filter((_, i) => i !== action.offerIndex)
      const base = {
        ...state,
        gold: state.gold - tmpl.shopPrice,
        shopOffers: nextOffers,
      }
      if (dest === 'character') {
        const characterId = action.characterId
        if (!characterId || !getCharacter(state, characterId)) return state
        return withCodexDiscoveries(
          updateCharacter(base, characterId, (c) => ({
            ...c,
            items: [...c.items, inst],
          })),
          [codexEntryId('item', offer.templateId)],
        )
      }
      return withCodexDiscoveries(
        {
          ...base,
          chest: { ...state.chest, items: [...state.chest.items, inst] },
        },
        [codexEntryId('item', offer.templateId)],
      )
    }
    case 'MOVE_CHEST_ITEM_TO_CHARACTER': {
      if (!assertHubActionAllowed(state, 'transfer')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const idx = state.chest.items.findIndex((i) => i.id === action.itemId)
      if (idx < 0) return state
      const item = state.chest.items[idx]!
      return {
        ...state,
        chest: {
          ...state.chest,
          items: state.chest.items.filter((i) => i.id !== action.itemId),
        },
        characters: state.characters.map((c) =>
          c.id === action.characterId ? { ...c, items: [...c.items, item] } : c,
        ),
      }
    }
    case 'MOVE_CHARACTER_ITEM_TO_CHEST': {
      if (!assertHubActionAllowed(state, 'transfer')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const item = hero.items.find((i) => i.id === action.itemId)
      if (!item || isItemEquipped(action.itemId, hero.equipment)) return state
      return {
        ...state,
        chest: { ...state.chest, items: [...state.chest.items, item] },
        characters: state.characters.map((c) =>
          c.id === action.characterId
            ? { ...c, items: c.items.filter((i) => i.id !== action.itemId) }
            : c,
        ),
      }
    }
    case 'BIND_CHEST_CARD': {
      if (!assertHubActionAllowed(state, 'equip')) return state
      const hero = getCharacter(state, action.characterId)
      if (!hero) return state
      const card = state.chest.unboundCards.find((c) => c.id === action.cardId)
      if (!card) return state
      return {
        ...state,
        chest: {
          ...state.chest,
          unboundCards: state.chest.unboundCards.filter((c) => c.id !== action.cardId),
        },
        characters: state.characters.map((c) =>
          c.id === action.characterId ? { ...c, cards: [...c.cards, card] } : c,
        ),
      }
    }
    case 'SELL_CHEST_ITEM': {
      if (!inHub(state)) return state
      if (!assertHubActionAllowed(state, 'shop')) return state
      const item = state.chest.items.find((i) => i.id === action.itemId)
      if (!item) return state
      const price = sellPriceForItem(item, getItemTemplate)
      if (price <= 0) return state
      return {
        ...state,
        gold: state.gold + price,
        chest: {
          ...state.chest,
          items: state.chest.items.filter((i) => i.id !== action.itemId),
        },
      }
    }
    case 'MARK_HUB_NOTICE_SEEN':
      return state.pendingHubNotice === null
        ? state
        : { ...state, pendingHubNotice: null }
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
    case 'PICK_MOD_OFFER':
      return tryPickModOffer(state, action)
    case 'REMOVE_MOD':
      return tryRemoveMod(state, action)
  }
}

export function initialCampaignState(): CampaignState {
  const hero = createCharacter({
    id: LEGACY_HERO_CHARACTER_ID,
    name: 'Герой',
    classId: 'warrior',
    baseStats: STARTER_HERO_BASE_STATS,
    baseStatRating: computeBaseStatRating(STARTER_HERO_BASE_STATS),
  })
  const strike = createStrikeCardForHero(hero.id)
  hero.cards = [strike]
  hero.battleLoadout = [strike.id, null]
  const squad: (string | null)[] = [LEGACY_HERO_CHARACTER_ID]
  while (squad.length < DEFAULT_SQUAD_SLOTS) squad.push(null)

  return {
    scenarioIndex: 0,
    worldPower: 0,
    gold: 0,
    phase: 'hub',
    battle: null,
    battleAttemptId: 0,
    battleAttemptSnapshot: null,
    codexDiscovered: [codexEntryId('class', 'warrior')],
    codexSeenEntryIds: [],
    characters: [hero],
    squad,
    expedition: null,
    tavernCandidates: null,
    chest: { ...EMPTY_CHEST },
    shopOffers: null,
    shopRefreshSeed: 0,
    pendingHubNotice: null,
  }
}
