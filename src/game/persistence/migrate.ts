import type { SaveEnvelopeV1 } from './schema'
import type {
  BattleAttemptSnapshot,
  BattleLoadout,
  BattlePlayerCard,
  CampaignState,
  CardInstance,
  EquipmentSlot,
  ItemInstance,
  ModificationInstance,
} from '../types'
import { cloneCards } from '../campaign/battleSnapshot'
import { playerCardsFromLoadout } from '../campaign/playerCardsFromLoadout'
import { STARTER_CARDS } from '../campaign/runReducer'
import { SCENARIOS } from '../campaign/scenarios'
import { DEFAULT_MOD_KILL_TEMPLATE_ID } from '../content/modTemplates'
import {
  EMPTY_EQUIPMENT,
  EQUIPMENT_ROLL_ORDER,
} from '../equipment/equipmentOrder'

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

function normalizeCampaignEconomy(c: CampaignState): CampaignState {
  const gold = typeof c.gold === 'number' && Number.isFinite(c.gold) ? c.gold : 0
  const rawItems = Array.isArray(c.items) ? c.items : []
  const items = rawItems.filter(isItemInstance).map((i) => ({ ...i }))
  const equipment = normalizeEquipmentRecord(c.equipment, items)

  let snap: BattleAttemptSnapshot | null = c.battleAttemptSnapshot
  if (snap) {
    const sg = typeof snap.gold === 'number' && Number.isFinite(snap.gold) ? snap.gold : 0
    const sraw = Array.isArray(snap.items) ? snap.items : []
    const si = sraw.filter(isItemInstance).map((i) => ({ ...i }))
    const se = normalizeEquipmentRecord(snap.equipment, si)
    snap = { ...snap, gold: sg, items: si, equipment: se }
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

  return { ...c, gold, items, equipment, battleAttemptSnapshot: snap, battle }
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
  const raw = c.battleLoadout as unknown
  if (
    Array.isArray(raw) &&
    raw.length === 2 &&
    (raw[0] === null || typeof raw[0] === 'string') &&
    (raw[1] === null || typeof raw[1] === 'string')
  ) {
    return { ...c, battleLoadout: [raw[0], raw[1]] as BattleLoadout }
  }
  return { ...c, battleLoadout: ['c1', 'c2'] }
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

function withSnapshotBattleLoadout(c: CampaignState): CampaignState {
  const snap = c.battleAttemptSnapshot
  if (!snap) return c
  const raw = snap.battleLoadout as unknown
  if (
    Array.isArray(raw) &&
    raw.length === 2 &&
    (raw[0] === null || typeof raw[0] === 'string') &&
    (raw[1] === null || typeof raw[1] === 'string')
  ) {
    return c
  }
  return {
    ...c,
    battleAttemptSnapshot: { ...snap, battleLoadout: ['c1', 'c2'] },
  }
}

function normalizeBattleFromLoadout(c: CampaignState): CampaignState {
  if (!c.battle) return c
  const loadout = c.battleLoadout
  const playerCards = playerCardsFromLoadout(c.cards, loadout)
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

/** Старые сохранения без новых стартовых карт — дополняем из STARTER_CARDS. */
function withMissingStarterCards(c: CampaignState): CampaignState {
  const cards = mergeMissingStarterCards(c.cards)
  const cardsChanged = cards.length !== c.cards.length

  let battle = c.battle
  // playerCards в бою — только loadout; не дополняем коллекционными стартовыми картами.

  let battleAttemptSnapshot = c.battleAttemptSnapshot
  if (c.battleAttemptSnapshot) {
    const snapCards = mergeMissingStarterCards(c.battleAttemptSnapshot.cards)
    if (snapCards.length !== c.battleAttemptSnapshot.cards.length) {
      battleAttemptSnapshot = { ...c.battleAttemptSnapshot, cards: snapCards }
    }
  }

  if (!cardsChanged && battle === c.battle && battleAttemptSnapshot === c.battleAttemptSnapshot) {
    return c
  }
  return { ...c, cards, battle, battleAttemptSnapshot }
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
  const cards = c.cards.map(normalizeCardModifications)
  const cardsChanged = cards.some((card, i) => card !== c.cards[i])

  let battle = c.battle
  if (c.battle) {
    const playerCards: BattlePlayerCard[] = c.battle.playerCards.map((card) => ({
      ...normalizeCardModifications(card),
      cooldownRemaining: card.cooldownRemaining ?? 0,
    }))
    const battleCardsChanged = playerCards.some((card, i) => card !== c.battle!.playerCards[i])
    if (battleCardsChanged) {
      battle = { ...c.battle, playerCards }
    }
  }

  let battleAttemptSnapshot = c.battleAttemptSnapshot
  if (c.battleAttemptSnapshot) {
    const snapCards = c.battleAttemptSnapshot.cards.map(normalizeCardModifications)
    const snapChanged = snapCards.some(
      (card, i) => card !== c.battleAttemptSnapshot!.cards[i],
    )
    if (snapChanged) {
      battleAttemptSnapshot = { ...c.battleAttemptSnapshot, cards: snapCards }
    }
  }

  if (!cardsChanged && battle === c.battle && battleAttemptSnapshot === c.battleAttemptSnapshot) {
    return c
  }
  return { ...c, cards, battle, battleAttemptSnapshot }
}

function withLegacyCodexFields(c: CampaignState): CampaignState {
  const codexDiscovered = Array.isArray(c.codexDiscovered) ? c.codexDiscovered : []
  const codexSeenEntryIds = Array.isArray(c.codexSeenEntryIds) ? c.codexSeenEntryIds : []
  if (codexDiscovered === c.codexDiscovered && codexSeenEntryIds === c.codexSeenEntryIds) {
    return c
  }
  return { ...c, codexDiscovered, codexSeenEntryIds }
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
  out = withDefaultScenarioSlotIndex(out)
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

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
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
  if (version !== 1 && version !== 2) {
    console.warn(
      `[gen-sp] save: unsupported version ${String(version)}, expected 1 or 2`,
    )
    return null
  }
  const campaignRaw = raw.campaign
  if (!isRecord(campaignRaw)) {
    console.warn('[gen-sp] save: missing campaign object')
    return null
  }
  let campaign = campaignRaw as unknown as CampaignState
  campaign = normalizeLoadedCampaign({
    ...campaign,
    codexDiscovered: Array.isArray(campaign.codexDiscovered) ? campaign.codexDiscovered : [],
    codexSeenEntryIds: Array.isArray(campaign.codexSeenEntryIds) ? campaign.codexSeenEntryIds : [],
  })
  return campaign
}

export function assertEnvelopeV1(e: SaveEnvelopeV1): CampaignState {
  return e.campaign
}
