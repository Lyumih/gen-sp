import type { SaveEnvelopeV1 } from './schema'
import type {
  BattleAttemptSnapshot,
  BattleLoadout,
  BattlePlayerCard,
  CampaignState,
  CardInstance,
  Character,
  EquipmentSlot,
  ItemInstance,
  ModificationInstance,
  PartyMemberBattleSnapshot,
} from '../types'
import { cloneCards } from '../campaign/battleSnapshot'
import { playerCardsFromLoadout } from '../campaign/playerCardsFromLoadout'
import { getPrimaryCharacter } from '../campaign/selectors'
import { STARTER_CARDS } from '../campaign/runReducer'
import { SCENARIOS } from '../campaign/scenarios'
import { createCharacter } from '../character/createCharacter'
import { DEFAULT_SQUAD_SLOTS, LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { DEFAULT_MOD_KILL_TEMPLATE_ID } from '../content/modTemplates'
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
    .map((i) => ({ ...i }))
  const equipment = normalizeEquipmentRecord(char.equipment, items)
  const cards = Array.isArray(char.cards)
    ? char.cards.map((c) => ({ ...c, modifications: c.modifications.map((m) => ({ ...m })) }))
    : []
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
  }
}

function normalizePartyMember(member: PartyMemberBattleSnapshot): PartyMemberBattleSnapshot {
  const items = (Array.isArray(member.items) ? member.items : [])
    .filter(isItemInstance)
    .map((i) => ({ ...i }))
  const equipment = normalizeEquipmentRecord(member.equipment, items)
  const cards = Array.isArray(member.cards)
    ? member.cards.map((c) => ({
        ...c,
        modifications: c.modifications.map((m) => ({ ...m })),
      }))
    : []
  const battleLoadout = normalizeBattleLoadout(member.battleLoadout, [
    cards[0]?.id ?? null,
    cards[1]?.id ?? null,
  ])
  const unitLevel =
    typeof member.unitLevel === 'number' && Number.isFinite(member.unitLevel) ? member.unitLevel : 1
  return {
    characterId: member.characterId,
    unitLevel,
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
      modKillTargetCardId:
        typeof raw.modKillTargetCardId === 'string' ? raw.modKillTargetCardId : null,
      scenarioSlotIndex: typeof raw.scenarioSlotIndex === 'number' ? raw.scenarioSlotIndex : 0,
      gold: sg,
      party: (raw.party as PartyMemberBattleSnapshot[]).map(normalizePartyMember),
    }
  }

  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter(isItemInstance)
    .map((i) => ({ ...i }))
  const equipment = normalizeEquipmentRecord(raw.equipment, items)
  const cards = Array.isArray(raw.cards)
    ? (raw.cards as CardInstance[]).map((c) => ({
        ...c,
        modifications: c.modifications.map((m) => ({ ...m })),
      }))
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
    modKillTargetCardId:
      typeof raw.modKillTargetCardId === 'string' ? raw.modKillTargetCardId : null,
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

function mergeMissingStarterCards(cards: readonly CardInstance[]): CardInstance[] {
  const existingIds = new Set(cards.map((c) => c.id))
  const missing = STARTER_CARDS.filter((sc) => !existingIds.has(sc.id))
  if (missing.length === 0) return [...cards]
  return [...cards, ...cloneCards(missing)]
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

function normalizeBattlePlayerCards(c: CampaignState): CampaignState {
  if (!c.battle) return c
  const playerCards: BattlePlayerCard[] = c.battle.playerCards.map((card) => ({
    ...card,
    modifications: card.modifications.map((m) => ({ ...m })),
    cooldownRemaining:
      typeof (card as BattlePlayerCard).cooldownRemaining === 'number'
        ? (card as BattlePlayerCard).cooldownRemaining
        : 0,
  }))
  const changed =
    playerCards.length !== c.battle.playerCards.length ||
    playerCards.some((card, i) => card !== c.battle!.playerCards[i])
  if (!changed) return c
  return { ...c, battle: { ...c.battle, playerCards } }
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

function normalizeBattleFromLoadout(c: CampaignState): CampaignState {
  if (!c.battle) return c
  const hero = getPrimaryCharacter(c)
  const playerCards = playerCardsFromLoadout(hero.cards, hero.battleLoadout)
  const same =
    playerCards.length === c.battle.playerCards.length &&
    playerCards.every(
      (card, i) =>
        card.id === c.battle!.playerCards[i]?.id &&
        card.cooldownRemaining === (c.battle!.playerCards[i]?.cooldownRemaining ?? 0),
    )
  if (same) return c
  return { ...c, battle: { ...c.battle, playerCards } }
}

function withMissingStarterCards(c: CampaignState): CampaignState {
  let changed = false
  const characters = c.characters.map((char) => {
    const cards = mergeMissingStarterCards(char.cards)
    if (cards.length === char.cards.length) return char
    changed = true
    return { ...char, cards }
  })

  let battleAttemptSnapshot = c.battleAttemptSnapshot
  if (c.battleAttemptSnapshot) {
    const party = c.battleAttemptSnapshot.party.map((member) => {
      const snapCards = mergeMissingStarterCards(member.cards)
      if (snapCards.length === member.cards.length) return member
      changed = true
      return { ...member, cards: snapCards }
    })
    if (changed) {
      battleAttemptSnapshot = { ...c.battleAttemptSnapshot, party }
    }
  }

  if (!changed) return c
  return { ...c, characters, battleAttemptSnapshot }
}

function normalizeCardModifications(card: CardInstance): CardInstance {
  let changed = false
  const modifications = card.modifications.map((mod) => {
    if (
      mod &&
      typeof mod === 'object' &&
      typeof (mod as ModificationInstance).templateId === 'string'
    ) {
      return mod
    }
    changed = true
    const level =
      mod &&
      typeof mod === 'object' &&
      typeof (mod as { level?: unknown }).level === 'number' &&
      Number.isFinite((mod as { level: number }).level)
        ? (mod as { level: number }).level
        : 0
    return { templateId: DEFAULT_MOD_KILL_TEMPLATE_ID, level }
  })
  return changed ? { ...card, modifications } : card
}

function withLegacyCardModTemplateIds(c: CampaignState): CampaignState {
  let changed = false
  const characters = c.characters.map((char) => {
    const cards = char.cards.map(normalizeCardModifications)
    if (cards.every((card, i) => card === char.cards[i])) return char
    changed = true
    return { ...char, cards }
  })

  let battle = c.battle
  if (c.battle) {
    const playerCards: BattlePlayerCard[] = c.battle.playerCards.map((card) => ({
      ...normalizeCardModifications(card),
      cooldownRemaining: card.cooldownRemaining ?? 0,
    }))
    const battleCardsChanged = playerCards.some((card, i) => card !== c.battle!.playerCards[i])
    if (battleCardsChanged) {
      battle = { ...c.battle, playerCards }
      changed = true
    }
  }

  let battleAttemptSnapshot = c.battleAttemptSnapshot
  if (c.battleAttemptSnapshot) {
    const party = c.battleAttemptSnapshot.party.map((member) => {
      const snapCards = member.cards.map(normalizeCardModifications)
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
  out = withDefaultSquad(out)
  out = withDefaultScenarioSlotIndex(out)
  out = withNormalizedBattleAttemptSnapshot(out)
  out = withDefaultBattleLoadout(out)
  out = withSnapshotBattleLoadout(out)
  out = normalizeCampaignEconomy(out)
  out = withMissingStarterCards(out)
  out = normalizeBattleFromLoadout(out)
  out = normalizeBattlePlayerCards(out)
  out = withLegacyCodexFields(out)
  out = withLegacyCardModTemplateIds(out)
  return out
}

export function migrateV2CampaignToV3(c: LegacyCampaignStateV2): CampaignState {
  const raw = c as Record<string, unknown>
  const hero = createCharacter({
    id: LEGACY_HERO_CHARACTER_ID,
    name: 'Герой',
    classId: 'warrior',
    initiativeBase: 10,
    unitLevel: typeof raw.playerUnitLevel === 'number' ? raw.playerUnitLevel : 1,
  })
  hero.cards = Array.isArray(raw.cards)
    ? (raw.cards as CardInstance[]).map((x) => ({
        ...x,
        modifications: x.modifications.map((m) => ({ ...m })),
      }))
    : hero.cards
  hero.items = Array.isArray(raw.items)
    ? (raw.items as ItemInstance[]).map((x) => ({ ...x }))
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
  })
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
  if (version !== 1 && version !== 2 && version !== 3) {
    console.warn(
      `[gen-sp] save: unsupported version ${String(version)}, expected 1, 2, or 3`,
    )
    return null
  }
  const campaignRaw = raw.campaign
  if (!isRecord(campaignRaw)) {
    console.warn('[gen-sp] save: missing campaign object')
    return null
  }
  return campaignFromRaw(campaignRaw)
}

export function assertEnvelopeV1(e: SaveEnvelopeV1): CampaignState {
  return e.campaign
}
