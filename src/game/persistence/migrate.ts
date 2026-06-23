import type { SaveEnvelopeV1 } from './schema'
import type {
  BattleAttemptSnapshot,
  BattleLoadout,
  BattlePlayerCard,
  BattleState,
  CampaignState,
  CardInstance,
  Character,
  EquipmentSlot,
  ItemInstance,
  ModSlotState,
  PartyMemberBattleSnapshot,
} from '../types'
import { cloneModSlots } from '../memento/modSlotsClone'
import { MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'
import { playerCardsByUnitFromParty } from '../battle/playerCards'
import { playerCardsFromLoadout } from '../campaign/playerCardsFromLoadout'
import { getPrimaryCharacter } from '../campaign/selectors'
import { discoverCodexEntry } from '../codex/discovery'
import { codexEntryId } from '../codex/registry'
import { withDefaultChestFields } from '../campaign/chestDefaults'
import { createCardInstance, createStrikeCardForHero } from '../campaign/cardFactory'
import { pickRandomSkillTemplateId } from '../config/skillAcquisition'
import { seededRng } from '../tavern/generateCandidates'
import { SCENARIOS } from '../campaign/scenarios'
import { createCharacter } from '../character/createCharacter'
import { defaultIconEmojiForClass, isValidIconAccent, isValidIconEmoji } from '../character/iconCatalog'
import { DEFAULT_SQUAD_SLOTS, LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import { computeBaseStatRating } from '../stats/computeRating'
import { rollBaseStatsDeterministic } from '../stats/rollBaseStats'
import {
  EMPTY_EQUIPMENT,
  EQUIPMENT_ROLL_ORDER,
} from '../equipment/equipmentOrder'

/** v2 campaign with flat hero fields before Character roster migration. */
export type LegacyCampaignStateV2 = Omit<
  CampaignState,
  'characters' | 'squad' | 'expedition'
> & {
  playerUnitLevel?: number
  cards?: CardInstance[]
  items?: ItemInstance[]
  equipment?: Record<EquipmentSlot, string | null>
  battleLoadout?: BattleLoadout
}

function isItemInstance(x: unknown): x is ItemInstance {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.templateId === 'string' &&
    typeof o.itemLevel === 'number' &&
    Number.isFinite(o.itemLevel)
  )
}

type LegacyModificationRaw = { templateId?: string; level?: number }

const LEGACY_KILL_REWARD_TEMPLATE_ID = 'kill_reward'
const MIGRATED_DAMAGE_MOD_TEMPLATE_ID = 'mod-damage-up'
const LEGACY_CODEX_KILL_ENTRY = 'mod:kill_reward'
const MIGRATED_CODEX_DAMAGE_ENTRY = 'mod:mod-damage-up'

function legacyModificationsToModSlots(mods: unknown[]): ModSlotState[] {
  return mods.map((mod) => {
    const m = mod as LegacyModificationRaw
    const templateId =
      typeof m?.templateId === 'string' ? m.templateId : LEGACY_KILL_REWARD_TEMPLATE_ID
    const lm = typeof m?.level === 'number' && Number.isFinite(m.level) ? m.level : 0
    return { status: 'filled' as const, templateId, lm }
  })
}

function migrateCardKillRewardSlots(
  card: CardInstance,
  carrierLevel: number = card.global_level,
): CardInstance {
  const threshold = MOD_SLOT_MILESTONES.firstThreshold
  let modSlots = cloneModSlots(card.modSlots ?? [])

  modSlots = modSlots
    .map((slot) => {
      if (slot.status === 'filled' && slot.templateId === LEGACY_KILL_REWARD_TEMPLATE_ID) {
        if (carrierLevel >= threshold) {
          return {
            status: 'filled' as const,
            templateId: MIGRATED_DAMAGE_MOD_TEMPLATE_ID,
            lm: slot.lm,
          }
        }
        return null
      }
      return slot
    })
    .filter((slot): slot is ModSlotState => slot !== null)

  if (carrierLevel < threshold) {
    modSlots = []
  }

  return { ...card, modSlots }
}

function modSlotsFromRaw(o: Record<string, unknown>): ModSlotState[] {
  if (Array.isArray(o.modSlots)) {
    return cloneModSlots(o.modSlots as ModSlotState[])
  }
  if (Array.isArray(o.modifications)) {
    return legacyModificationsToModSlots(o.modifications)
  }
  return []
}

function parseCardInstance(raw: unknown): CardInstance {
  if (!raw || typeof raw !== 'object') {
    return { id: '', templateId: '', global_level: 1, uses_count: 0, modSlots: [] }
  }
  const o = raw as Record<string, unknown>
  return {
    id: typeof o.id === 'string' ? o.id : '',
    templateId: typeof o.templateId === 'string' ? o.templateId : '',
    global_level:
      typeof o.global_level === 'number' && Number.isFinite(o.global_level) ? o.global_level : 1,
    uses_count:
      typeof o.uses_count === 'number' && Number.isFinite(o.uses_count) ? o.uses_count : 0,
    modSlots: modSlotsFromRaw(o),
  }
}

function normalizeItemInstance(raw: unknown): ItemInstance {
  if (!isItemInstance(raw)) {
    return { id: '', templateId: '', itemLevel: 1, modSlots: [] }
  }
  const o = raw as Record<string, unknown>
  return {
    id: raw.id,
    templateId: raw.templateId,
    itemLevel: raw.itemLevel,
    modSlots: modSlotsFromRaw(o),
  }
}

function normalizeEquipmentRecord(
  equipment: unknown,
  items: ItemInstance[],
): Record<EquipmentSlot, string | null> {
  const base: Record<EquipmentSlot, string | null> = { ...EMPTY_EQUIPMENT }
  if (!equipment || typeof equipment !== 'object') return base
  const rec = equipment as Record<string, unknown>
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const v = rec[slot]
    if (typeof v !== 'string') {
      base[slot] = null
      continue
    }
    base[slot] = items.some((i) => i.id === v) ? v : null
  }
  return base
}

function normalizeBattleLoadout(
  raw: unknown,
  fallback: BattleLoadout = ['c1', 'c2'],
): BattleLoadout {
  if (
    Array.isArray(raw) &&
    raw.length === 2 &&
    (raw[0] === null || typeof raw[0] === 'string') &&
    (raw[1] === null || typeof raw[1] === 'string')
  ) {
    return [raw[0], raw[1]]
  }
  return fallback
}

function normalizeCharacter(char: Character): Character {
  const items = (Array.isArray(char.items) ? char.items : [])
    .filter(isItemInstance)
    .map((i) => normalizeItemInstance(i))
  const equipment = normalizeEquipmentRecord(char.equipment, items)
  const cards = Array.isArray(char.cards) ? char.cards.map((c) => parseCardInstance(c)) : []
  const battleLoadout = normalizeBattleLoadout(char.battleLoadout, [
    cards[0]?.id ?? null,
    cards[1]?.id ?? null,
  ])
  const unitLevel =
    typeof char.unitLevel === 'number' && Number.isFinite(char.unitLevel) ? char.unitLevel : 1
  return {
    ...char,
    unitLevel,
    items,
    equipment,
    cards,
    battleLoadout,
    iconEmoji:
      typeof char.iconEmoji === 'string' && isValidIconEmoji(char.iconEmoji)
        ? char.iconEmoji
        : defaultIconEmojiForClass(char.classId ?? 'warrior'),
    iconAccent:
      typeof char.iconAccent === 'string' && isValidIconAccent(char.iconAccent)
        ? char.iconAccent
        : 'default',
    iconSkinTone:
      char.iconSkinTone === 'light' ||
      char.iconSkinTone === 'medium' ||
      char.iconSkinTone === 'dark'
        ? char.iconSkinTone
        : 'default',
  }
}

function normalizePartyMember(
  member: Omit<PartyMemberBattleSnapshot, 'baseStats'> & {
    baseStats?: PartyMemberBattleSnapshot['baseStats']
    initiativeBase?: number
  },
): PartyMemberBattleSnapshot {
  const items = (Array.isArray(member.items) ? member.items : [])
    .filter(isItemInstance)
    .map((i) => normalizeItemInstance(i))
  const equipment = normalizeEquipmentRecord(member.equipment, items)
  const cards = Array.isArray(member.cards) ? member.cards.map((c) => parseCardInstance(c)) : []
  const battleLoadout = normalizeBattleLoadout(member.battleLoadout, [
    cards[0]?.id ?? null,
    cards[1]?.id ?? null,
  ])
  const unitLevel =
    typeof member.unitLevel === 'number' && Number.isFinite(member.unitLevel) ? member.unitLevel : 1
  let baseStats = member.baseStats
  if (!baseStats) {
    baseStats = rollBaseStatsDeterministic('warrior', member.characterId)
    if (typeof member.initiativeBase === 'number') {
      baseStats = { ...baseStats, initiative: member.initiativeBase }
    }
  }
  return {
    characterId: member.characterId,
    unitLevel,
    baseStats,
    items,
    equipment,
    cards,
    battleLoadout,
    metaStatus: member.metaStatus === 'downed' ? 'downed' : 'active',
    spawnIndex: typeof member.spawnIndex === 'number' ? member.spawnIndex : 0,
  }
}

function normalizeBattleAttemptSnapshot(
  snap: BattleAttemptSnapshot | Record<string, unknown>,
  characterId: string = LEGACY_HERO_CHARACTER_ID,
): BattleAttemptSnapshot {
  const raw = snap as Record<string, unknown>
  if (Array.isArray(raw.party) && raw.party.length > 0) {
    const sg = typeof raw.gold === 'number' && Number.isFinite(raw.gold) ? raw.gold : 0
    return {
      worldPower: typeof raw.worldPower === 'number' ? raw.worldPower : 0,
      scenarioSlotIndex: typeof raw.scenarioSlotIndex === 'number' ? raw.scenarioSlotIndex : 0,
      gold: sg,
      party: (raw.party as PartyMemberBattleSnapshot[]).map(normalizePartyMember),
    }
  }

  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter(isItemInstance)
    .map((i) => normalizeItemInstance(i))
  const equipment = normalizeEquipmentRecord(raw.equipment, items)
  const cards = Array.isArray(raw.cards)
    ? (raw.cards as unknown[]).map((c) => parseCardInstance(c))
    : []
  const battleLoadout = normalizeBattleLoadout(raw.battleLoadout, [
    cards[0]?.id ?? null,
    cards[1]?.id ?? null,
  ])
  const unitLevel =
    typeof raw.playerUnitLevel === 'number' && Number.isFinite(raw.playerUnitLevel)
      ? raw.playerUnitLevel
      : 1

  return {
    worldPower: typeof raw.worldPower === 'number' ? raw.worldPower : 0,
    scenarioSlotIndex: typeof raw.scenarioSlotIndex === 'number' ? raw.scenarioSlotIndex : 0,
    gold: typeof raw.gold === 'number' && Number.isFinite(raw.gold) ? raw.gold : 0,
    party: [
      normalizePartyMember({
        characterId,
        unitLevel,
        items,
        equipment,
        cards,
        battleLoadout,
        metaStatus: 'active',
        spawnIndex: 0,
        initiativeBase:
          typeof raw.initiativeBase === 'number' ? raw.initiativeBase : undefined,
      }),
    ],
  }
}

function normalizeCampaignEconomy(c: CampaignState): CampaignState {
  const gold = typeof c.gold === 'number' && Number.isFinite(c.gold) ? c.gold : 0
  const characters = c.characters.map(normalizeCharacter)

  let snap: BattleAttemptSnapshot | null = c.battleAttemptSnapshot
  if (snap) {
    snap = normalizeBattleAttemptSnapshot(snap as BattleAttemptSnapshot | Record<string, unknown>)
  }

  const battle =
    c.battle !== null
      ? {
          ...c.battle,
          roundNumber:
            typeof c.battle.roundNumber === 'number' && Number.isFinite(c.battle.roundNumber)
              ? c.battle.roundNumber
              : 1,
          gearCardLevelBonus:
            typeof c.battle.gearCardLevelBonus === 'number' &&
            Number.isFinite(c.battle.gearCardLevelBonus)
              ? c.battle.gearCardLevelBonus
              : 0,
        }
      : null

  return { ...c, gold, characters, battleAttemptSnapshot: snap, battle }
}

function withDefaultScenarioSlotIndex(c: CampaignState): CampaignState {
  const snap = c.battleAttemptSnapshot
  if (!snap || typeof snap.scenarioSlotIndex === 'number') return c
  const scenarioSlotIndex =
    c.scenarioIndex >= 0 && c.scenarioIndex < SCENARIOS.length
      ? Math.min(c.scenarioIndex, SCENARIOS.length - 1)
      : 0
  return {
    ...c,
    battleAttemptSnapshot: { ...snap, scenarioSlotIndex },
  }
}

function rebuildBattleLoadoutFromCards(cards: readonly CardInstance[]): BattleLoadout {
  return [cards[0]?.id ?? null, cards[1]?.id ?? null]
}

export function migrateV6CampaignToV7(c: CampaignState): CampaignState {
  let unbound: CardInstance[] = [...(c.chest?.unboundCards ?? [])]

  const characters = c.characters.map((char) => {
    if (char.id === LEGACY_HERO_CHARACTER_ID) {
      const strikeExisting = char.cards.find((card) => card.templateId === 'strike')
      const extras = char.cards.filter((card) => card.templateId !== 'strike')
      unbound = [...unbound, ...extras]
      const strike = strikeExisting ?? createStrikeCardForHero(char.id)
      return {
        ...char,
        cards: [strike],
        battleLoadout: rebuildBattleLoadoutFromCards([strike]),
      }
    }
    unbound = [...unbound, ...char.cards]
    const templateId = pickRandomSkillTemplateId(seededRng(char.id.length * 17 + 3))
    const skill = createCardInstance(templateId)
    return {
      ...char,
      cards: [skill],
      battleLoadout: rebuildBattleLoadoutFromCards([skill]),
    }
  })

  return {
    ...c,
    characters,
    chest: { items: c.chest?.items ?? [], unboundCards: unbound },
    shopOffers: c.shopOffers ?? null,
    shopRefreshSeed: typeof c.shopRefreshSeed === 'number' ? c.shopRefreshSeed : 0,
    pendingHubNotice: null,
  }
}

function withDefaultBattleLoadout(c: CampaignState): CampaignState {
  const characters = c.characters.map((char) => ({
    ...char,
    battleLoadout: normalizeBattleLoadout(char.battleLoadout, [
      char.cards[0]?.id ?? null,
      char.cards[1]?.id ?? null,
    ]),
  }))
  const changed = characters.some((char, i) => char !== c.characters[i])
  if (!changed) return c
  return { ...c, characters }
}

type LegacyBattleState = BattleState & { playerCards?: readonly BattlePlayerCard[] }

function normalizeBattleCard(card: BattlePlayerCard): BattlePlayerCard {
  const parsed = parseCardInstance(card)
  return {
    ...parsed,
    cooldownRemaining:
      typeof card.cooldownRemaining === 'number' ? card.cooldownRemaining : 0,
  }
}

function migrateLegacyPlayerCards(battle: LegacyBattleState): BattleState {
  const legacyCards = battle.playerCards
  if (battle.playerCardsByUnitId && !legacyCards) {
    let changed = false
    const playerCardsByUnitId: Record<string, BattlePlayerCard[]> = {}
    for (const [unitId, cards] of Object.entries(battle.playerCardsByUnitId)) {
      const normalized = cards.map(normalizeBattleCard)
      playerCardsByUnitId[unitId] = normalized
      if (normalized.some((card, i) => card !== cards[i])) changed = true
    }
    if (!changed && battle.playerCardsByUnitId === playerCardsByUnitId) return battle
    return { ...battle, playerCardsByUnitId }
  }

  const playerUnit =
    battle.units.find((u) => u.side === 'player')?.id ?? LEGACY_HERO_CHARACTER_ID
  const cardsSource = legacyCards ?? []
  const { playerCards: _legacy, ...rest } = battle
  return {
    ...rest,
    playerCardsByUnitId: {
      [playerUnit]: cardsSource.map(normalizeBattleCard),
    },
  }
}

function normalizeBattlePlayerCards(c: CampaignState): CampaignState {
  if (!c.battle) return c
  const battle = migrateLegacyPlayerCards(c.battle as LegacyBattleState)
  if (battle === c.battle) return c
  return { ...c, battle }
}

function normalizeBattleFromLoadout(c: CampaignState): CampaignState {
  if (!c.battle) return c
  const battle = migrateLegacyPlayerCards(c.battle as LegacyBattleState)
  const snap = c.battleAttemptSnapshot
  if (snap?.party.length) {
    const fromParty = playerCardsByUnitFromParty(snap.party)
    const same =
      Object.keys(fromParty).length === Object.keys(battle.playerCardsByUnitId).length &&
      Object.entries(fromParty).every(([unitId, cards]) => {
        const existing = battle.playerCardsByUnitId[unitId]
        if (!existing || existing.length !== cards.length) return false
        return cards.every(
          (card, i) =>
            card.id === existing[i]?.id &&
            card.cooldownRemaining === (existing[i]?.cooldownRemaining ?? 0),
        )
      })
    if (same) return { ...c, battle }
    return { ...c, battle: { ...battle, playerCardsByUnitId: fromParty } }
  }

  const hero = getPrimaryCharacter(c)
  const playerUnit =
    battle.units.find((u) => u.side === 'player')?.id ?? hero.id
  const playerCards = playerCardsFromLoadout(hero.cards, hero.battleLoadout)
  const existing = battle.playerCardsByUnitId[playerUnit] ?? []
  const same =
    playerCards.length === existing.length &&
    playerCards.every(
      (card, i) =>
        card.id === existing[i]?.id &&
        card.cooldownRemaining === (existing[i]?.cooldownRemaining ?? 0),
    )
  if (same) return { ...c, battle }
  return {
    ...c,
    battle: {
      ...battle,
      playerCardsByUnitId: { ...battle.playerCardsByUnitId, [playerUnit]: playerCards },
    },
  }
}

function withNormalizedBattleAttemptSnapshot(c: CampaignState): CampaignState {
  if (!c.battleAttemptSnapshot) return c
  const snap = normalizeBattleAttemptSnapshot(
    c.battleAttemptSnapshot as BattleAttemptSnapshot | Record<string, unknown>,
  )
  if (snap === c.battleAttemptSnapshot) return c
  return { ...c, battleAttemptSnapshot: snap }
}

function withSnapshotBattleLoadout(c: CampaignState): CampaignState {
  const snap = c.battleAttemptSnapshot
  if (!snap) return c
  let changed = false
  const party = snap.party.map((member) => {
    const raw = member.battleLoadout as unknown
    if (
      Array.isArray(raw) &&
      raw.length === 2 &&
      (raw[0] === null || typeof raw[0] === 'string') &&
      (raw[1] === null || typeof raw[1] === 'string')
    ) {
      return member
    }
    changed = true
    return { ...member, battleLoadout: ['c1', 'c2'] as BattleLoadout }
  })
  if (!changed) return c
  return {
    ...c,
    battleAttemptSnapshot: { ...snap, party },
  }
}

function normalizeCardModSlots(card: CardInstance): CardInstance {
  const raw = card as CardInstance & { modifications?: unknown[] }
  if (Array.isArray(raw.modifications) && raw.modSlots === undefined) {
    return {
      id: card.id,
      templateId: card.templateId,
      global_level: card.global_level,
      uses_count: card.uses_count,
      modSlots: legacyModificationsToModSlots(raw.modifications),
    }
  }
  return { ...card, modSlots: cloneModSlots(card.modSlots ?? []) }
}

function withLegacyCardModTemplateIds(c: CampaignState): CampaignState {
  let changed = false
  const characters = c.characters.map((char) => {
    const cards = char.cards.map(normalizeCardModSlots)
    if (cards.every((card, i) => card === char.cards[i])) return char
    changed = true
    return { ...char, cards }
  })

  let battle = c.battle ? migrateLegacyPlayerCards(c.battle as LegacyBattleState) : null
  if (c.battle) {
    let battleCardsChanged = battle !== c.battle
    const playerCardsByUnitId = { ...battle!.playerCardsByUnitId }
    for (const [unitId, cards] of Object.entries(playerCardsByUnitId)) {
      const normalized = cards.map((card) => ({
        ...normalizeCardModSlots(card),
        cooldownRemaining: card.cooldownRemaining ?? 0,
      }))
      if (normalized.some((card, i) => card !== cards[i])) {
        playerCardsByUnitId[unitId] = normalized
        battleCardsChanged = true
      }
    }
    if (battleCardsChanged) {
      battle = { ...battle!, playerCardsByUnitId }
      changed = true
    }
  }

  let battleAttemptSnapshot = c.battleAttemptSnapshot
  if (c.battleAttemptSnapshot) {
    const party = c.battleAttemptSnapshot.party.map((member) => {
      const snapCards = member.cards.map(normalizeCardModSlots)
      const snapChanged = snapCards.some((card, i) => card !== member.cards[i])
      if (!snapChanged) return member
      changed = true
      return { ...member, cards: snapCards }
    })
    if (changed) {
      battleAttemptSnapshot = { ...c.battleAttemptSnapshot, party }
    }
  }

  if (!changed) return c
  return { ...c, characters, battle, battleAttemptSnapshot }
}

function discoverClassesFromRoster(c: CampaignState): CampaignState {
  let codexDiscovered = c.codexDiscovered
  for (const character of c.characters) {
    const classId = character.classId ?? 'warrior'
    codexDiscovered = discoverCodexEntry(codexDiscovered, codexEntryId('class', classId))
  }
  if (codexDiscovered === c.codexDiscovered) return c
  return { ...c, codexDiscovered }
}

function withLegacyCodexFields(c: CampaignState): CampaignState {
  const codexDiscovered = Array.isArray(c.codexDiscovered) ? c.codexDiscovered : []
  const codexSeenEntryIds = Array.isArray(c.codexSeenEntryIds) ? c.codexSeenEntryIds : []
  if (codexDiscovered === c.codexDiscovered && codexSeenEntryIds === c.codexSeenEntryIds) {
    return c
  }
  return { ...c, codexDiscovered, codexSeenEntryIds }
}

function withDefaultSquad(c: CampaignState): CampaignState {
  const squad = Array.isArray(c.squad) ? [...c.squad] : []
  while (squad.length < DEFAULT_SQUAD_SLOTS) squad.push(null)
  if (squad.length > DEFAULT_SQUAD_SLOTS) squad.length = DEFAULT_SQUAD_SLOTS
  if (squad === c.squad) return c
  return { ...c, squad }
}

function withDefaultExpedition(c: CampaignState): CampaignState {
  if (c.expedition === undefined) return { ...c, expedition: null }
  return c
}

function withDefaultTavernCandidates(c: CampaignState): CampaignState {
  if (c.tavernCandidates === undefined) return { ...c, tavernCandidates: null }
  return c
}

/** Старые сохранения без `battle.battleLog` — подставляем пустой массив. */
export function normalizeLoadedCampaign(c: CampaignState): CampaignState {
  let out: CampaignState
  if (!c.battle) {
    out = c
  } else if (Array.isArray(c.battle.battleLog)) {
    out = c
  } else {
    out = {
      ...c,
      battle: { ...c.battle, battleLog: [] },
    }
  }
  out = withDefaultExpedition(out)
  out = withDefaultTavernCandidates(out)
  out = withDefaultSquad(out)
  out = withDefaultScenarioSlotIndex(out)
  out = withNormalizedBattleAttemptSnapshot(out)
  out = withDefaultBattleLoadout(out)
  out = withSnapshotBattleLoadout(out)
  out = normalizeCampaignEconomy(out)
  out = withDefaultChestFields(out)
  out = normalizeBattleFromLoadout(out)
  out = normalizeBattlePlayerCards(out)
  out = withLegacyCodexFields(out)
  out = discoverClassesFromRoster(out)
  out = withLegacyCardModTemplateIds(out)
  return out
}

export function migrateV2CampaignToV3(c: LegacyCampaignStateV2): CampaignState {
  const raw = c as Record<string, unknown>
  const heroBaseStats = { ...STARTER_HERO_BASE_STATS }
  const hero = createCharacter({
    id: LEGACY_HERO_CHARACTER_ID,
    name: 'Герой',
    classId: 'warrior',
    baseStats: heroBaseStats,
    baseStatRating: computeBaseStatRating(heroBaseStats),
    unitLevel: typeof raw.playerUnitLevel === 'number' ? raw.playerUnitLevel : 1,
  })
  hero.cards = Array.isArray(raw.cards)
    ? (raw.cards as unknown[]).map((x) => parseCardInstance(x))
    : hero.cards
  hero.items = Array.isArray(raw.items)
    ? (raw.items as unknown[]).map((x) => normalizeItemInstance(x))
    : []
  hero.equipment = normalizeEquipmentRecord(raw.equipment, hero.items)
  hero.battleLoadout = normalizeBattleLoadout(raw.battleLoadout, [
    hero.cards[0]?.id ?? null,
    hero.cards[1]?.id ?? null,
  ])

  const {
    playerUnitLevel: _playerUnitLevel,
    cards: _cards,
    items: _items,
    equipment: _equipment,
    battleLoadout: _battleLoadout,
    ...rest
  } = c as LegacyCampaignStateV2 & Record<string, unknown>

  const squad: (string | null)[] = [LEGACY_HERO_CHARACTER_ID]
  while (squad.length < DEFAULT_SQUAD_SLOTS) squad.push(null)

  return normalizeLoadedCampaign({
    ...(rest as CampaignState),
    characters: [hero],
    squad,
    expedition: null,
    tavernCandidates: null,
  })
}

type LegacyCharacterV3 = Character & { initiativeBase?: number }

function migrateCharacterToV4(char: LegacyCharacterV3): Character {
  if (char.baseStats !== undefined && typeof char.baseStatRating === 'number') {
    const { initiativeBase: _removed, ...rest } = char
    return rest as Character
  }
  const classId = char.classId ?? 'warrior'
  let baseStats = rollBaseStatsDeterministic(classId, char.id)
  if (typeof char.initiativeBase === 'number') {
    baseStats = { ...baseStats, initiative: char.initiativeBase }
  }
  const { initiativeBase: _removed, ...rest } = char
  return {
    ...rest,
    baseStats,
    baseStatRating: computeBaseStatRating(baseStats),
  }
}

export function migrateV3CampaignToV4(c: CampaignState): CampaignState {
  return normalizeLoadedCampaign({
    ...c,
    characters: c.characters.map((ch) => migrateCharacterToV4(ch as LegacyCharacterV3)),
    tavernCandidates: null,
  })
}

export function migrateV4CampaignToV5(c: CampaignState): CampaignState {
  return normalizeLoadedCampaign({
    ...c,
    characters: c.characters.map((ch) => normalizeCharacter(ch)),
  })
}

function migrateCodexKillReward(ids: readonly string[]): readonly string[] {
  const out = new Set<string>()
  for (const id of ids) {
    out.add(id === LEGACY_CODEX_KILL_ENTRY ? MIGRATED_CODEX_DAMAGE_ENTRY : id)
  }
  return [...out]
}

type LegacyCampaignWithKillTarget = CampaignState & {
  modKillTargetCardId?: string | null
}

type LegacyBattleWithKillTarget = BattleState & {
  modKillTargetCardId?: string | null
}

type LegacySnapshotWithKillTarget = BattleAttemptSnapshot & {
  modKillTargetCardId?: string | null
}

function stripLegacyModKillTarget(c: LegacyCampaignWithKillTarget): CampaignState {
  const { modKillTargetCardId: _target, ...rest } = c
  let battle = rest.battle
  if (battle && 'modKillTargetCardId' in battle) {
    const { modKillTargetCardId: _b, ...battleRest } = battle as LegacyBattleWithKillTarget
    battle = battleRest as BattleState
  }
  let battleAttemptSnapshot = rest.battleAttemptSnapshot
  if (battleAttemptSnapshot && 'modKillTargetCardId' in battleAttemptSnapshot) {
    const { modKillTargetCardId: _s, ...snapRest } =
      battleAttemptSnapshot as LegacySnapshotWithKillTarget
    battleAttemptSnapshot = snapRest as BattleAttemptSnapshot
  }
  return { ...rest, battle, battleAttemptSnapshot }
}

function migrateCampaignKillRewardMods(c: CampaignState): CampaignState {
  const characters = c.characters.map((char) => ({
    ...char,
    cards: char.cards.map((card) => migrateCardKillRewardSlots(card)),
  }))

  let battle = c.battle
  if (c.battle) {
    const playerCardsByUnitId: Record<string, BattlePlayerCard[]> = {}
    for (const [unitId, cards] of Object.entries(c.battle.playerCardsByUnitId)) {
      playerCardsByUnitId[unitId] = cards.map((card) => ({
        ...migrateCardKillRewardSlots(card),
        cooldownRemaining: card.cooldownRemaining ?? 0,
      }))
    }
    battle = { ...c.battle, playerCardsByUnitId }
  }

  const battleAttemptSnapshot = c.battleAttemptSnapshot
    ? {
        ...c.battleAttemptSnapshot,
        party: c.battleAttemptSnapshot.party.map((member) => ({
          ...member,
          cards: member.cards.map((card) => migrateCardKillRewardSlots(card)),
        })),
      }
    : null

  return {
    ...c,
    characters,
    battle,
    battleAttemptSnapshot,
    codexDiscovered: migrateCodexKillReward(c.codexDiscovered),
    codexSeenEntryIds: migrateCodexKillReward(c.codexSeenEntryIds),
  }
}

export function migrateV5CampaignToV6(c: CampaignState): CampaignState {
  return stripLegacyModKillTarget(
    migrateCampaignKillRewardMods(normalizeLoadedCampaign(c)),
  )
}

export function migrateV7CampaignFromV6(c: CampaignState): CampaignState {
  return migrateV6CampaignToV7(c)
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isLegacyFlatCampaign(raw: Record<string, unknown>): boolean {
  return (
    !Array.isArray(raw.characters) &&
    (typeof raw.playerUnitLevel === 'number' ||
      Array.isArray(raw.cards) ||
      Array.isArray(raw.items))
  )
}

function campaignFromRaw(raw: Record<string, unknown>): CampaignState {
  if (isLegacyFlatCampaign(raw)) {
    return migrateV2CampaignToV3(raw as LegacyCampaignStateV2)
  }
  return normalizeLoadedCampaign({
    ...(raw as unknown as CampaignState),
    codexDiscovered: Array.isArray(raw.codexDiscovered) ? raw.codexDiscovered : [],
    codexSeenEntryIds: Array.isArray(raw.codexSeenEntryIds) ? raw.codexSeenEntryIds : [],
    characters: Array.isArray(raw.characters) ? (raw.characters as Character[]) : [],
    squad: Array.isArray(raw.squad) ? (raw.squad as (string | null)[]) : [],
    expedition: raw.expedition === undefined ? null : (raw.expedition as CampaignState['expedition']),
  })
}

/**
 * Разбор сырого JSON сохранения.
 * Неизвестная или неподдерживаемая `version` → `null` и `console.warn` (см. тесты).
 */
export function migrateFromUnknown(raw: unknown): CampaignState | null {
  if (!isRecord(raw)) {
    console.warn('[gen-sp] save: root is not an object')
    return null
  }
  const version = raw.version
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6 && version !== 7) {
    console.warn(
      `[gen-sp] save: unsupported version ${String(version)}, expected 1, 2, 3, 4, 5, 6, or 7`,
    )
    return null
  }
  const campaignRaw = raw.campaign
  if (!isRecord(campaignRaw)) {
    console.warn('[gen-sp] save: missing campaign object')
    return null
  }
  let campaign = campaignFromRaw(campaignRaw)
  if (version <= 3) {
    campaign = migrateV3CampaignToV4(campaign)
  }
  if (version <= 4) {
    campaign = migrateV4CampaignToV5(campaign)
  }
  campaign = migrateV5CampaignToV6(campaign)
  if (version <= 6) {
    campaign = migrateV6CampaignToV7(campaign)
  }
  return campaign
}

export function assertEnvelopeV1(e: SaveEnvelopeV1): CampaignState {
  return e.campaign
}
