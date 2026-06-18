import { SAVE_VERSION } from './schema'
import type { SaveEnvelopeV1 } from './schema'
import type {
  BattleAttemptSnapshot,
  CampaignState,
  CardInstance,
  EquipmentSlot,
  ItemInstance,
} from '../types'
import { cloneCards } from '../campaign/battleSnapshot'
import { STARTER_CARDS } from '../campaign/runReducer'
import { SCENARIOS } from '../campaign/scenarios'
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

/** Старые сохранения без новых стартовых карт — дополняем из STARTER_CARDS. */
function withMissingStarterCards(c: CampaignState): CampaignState {
  const cards = mergeMissingStarterCards(c.cards)
  const cardsChanged = cards.length !== c.cards.length

  let battle = c.battle
  if (c.battle) {
    const playerCards = mergeMissingStarterCards(c.battle.playerCards)
    if (playerCards.length !== c.battle.playerCards.length) {
      battle = { ...c.battle, playerCards }
    }
  }

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
  out = normalizeCampaignEconomy(out)
  out = withMissingStarterCards(out)
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
  if (version !== SAVE_VERSION) {
    console.warn(
      `[gen-sp] save: unsupported version ${String(version)}, expected ${SAVE_VERSION}`,
    )
    return null
  }
  const campaign = raw.campaign
  if (!isRecord(campaign)) {
    console.warn('[gen-sp] save: missing campaign object')
    return null
  }
  return normalizeLoadedCampaign(campaign as unknown as CampaignState)
}

export function assertEnvelopeV1(e: SaveEnvelopeV1): CampaignState {
  return e.campaign
}
