import type { TavernCandidate } from './tavern/generateCandidates'
import type { BaseStats } from './config/baseStats'
import type { UnitStatusEffect } from './battle/unitStatus'
import type { RaceId } from './content/enemyRaces'

export type { BaseStats, StatId } from './config/baseStats'

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory'

export type ModOffer = {
  modIds: [string, string, string] | [string, string, string, string]
  rollSeed: number
}

export type ModSlotState =
  | { status: 'empty'; offer: ModOffer | null }
  | { status: 'filled'; templateId: string; lm: number }

export type ItemInstance = {
  id: string
  templateId: string
  itemLevel: number
  modSlots: ModSlotState[]
}

export type Side = 'player' | 'enemy'

export type IconAccentId =
  | 'default'
  | 'green'
  | 'gray'
  | 'blue'
  | 'red'
  | 'gold'
  | 'purple'
  | 'teal'

export type IconSkinToneId = 'default' | 'light' | 'medium' | 'dark'

export type Unit = {
  id: string
  side: Side
  x: number
  y: number
  hp: number
  maxHp: number
  unitLevel: number
  archetypeId?: string
  raceId?: RaceId
  /** Effective initiative at spawn (base stat scaled + gear). */
  initiativeBase?: number
  /** Base stats snapshot for UI tooltips. */
  baseStats?: BaseStats
  displayName?: string
  iconEmoji?: string
  iconAccent?: IconAccentId
  iconSkinTone?: IconSkinToneId
  statusEffects?: readonly UnitStatusEffect[]
}


export type CardInstance = {
  id: string
  templateId: string
  global_level: number
  uses_count: number
  modSlots: ModSlotState[]
}

export type PassiveInstance = {
  id: string
  templateId: string
  global_level: number
  uses_count: number
  modSlots: ModSlotState[]
}

export type PassiveEquipLoadout = [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
]

/** Поля карточки, участвующие в прогрессе за использование. */
export type CardProgressSlice = Pick<CardInstance, 'global_level' | 'uses_count'>

/** Карта в бою: прогресс + перезарядка (не сохраняется в кампании). */
export type BattlePlayerCard = CardInstance & { cooldownRemaining: number }

export type BattleLoadout = [string | null, string | null, string | null, string | null]

export type ShopOffer =
  | { kind: 'item'; templateId: string }
  | { kind: 'skill'; templateId: string }
  | { kind: 'passive'; templateId: string }

export type CampaignChest = {
  items: ItemInstance[]
  unboundCards: CardInstance[]
  unboundPassives: PassiveInstance[]
}

export type HubNotice =
  | { kind: 'skill_drop'; templateId: string }
  | { kind: 'passive_drop'; templateId: string }
  | { kind: 'dual_drop'; skillTemplateId: string; passiveTemplateId: string }
  | { kind: 'specialization_reveal'; specializationId: string }

export type CharacterMetaStatus = 'active' | 'downed'

export type Character = {
  id: string
  name: string
  classId: string
  unitLevel: number
  baseStats: BaseStats
  baseStatRating: number
  specializationId: string | null
  equipment: Record<EquipmentSlot, string | null>
  items: ItemInstance[]
  cards: CardInstance[]
  passives: PassiveInstance[]
  passiveEquip: PassiveEquipLoadout
  battleLoadout: BattleLoadout
  iconEmoji: string
  iconAccent: IconAccentId
  iconSkinTone: IconSkinToneId
}

export type CharacterBattleSnapshot = {
  characterId: string
  equipment: Record<EquipmentSlot, string | null>
  battleLoadout: BattleLoadout
  metaStatus: CharacterMetaStatus
}

export type Expedition = {
  scenarioChainId: string
  generationSeed: number
  partySize: number
  squadSnapshot: (CharacterBattleSnapshot | null)[]
  battleIndex: number
  battleCount: number
  shopLocked: true
  interBattleReviveAllDowned?: boolean
}

export type BattlePhase = 'ongoing' | 'victory' | 'defeat'

/** Card mod context passed into battle actions for proc / on-use effects. */
export type BattleModContext = {
  modSlots: readonly ModSlotState[]
  /** Returns 1–100; invoked once per independent proc roll. */
  rng: () => number
}

export type BattleLogEntry =
  | {
      type: 'move'
      unitId: string
      fromX: number
      fromY: number
      toX: number
      toY: number
    }
  | {
      type: 'strike'
      attackerId: string
      targetId: string
      damage: number
      attackKind: 'melee' | 'ranged' | 'aoe'
      targetKilled: boolean
      absorbedDamage?: number
      fromCard?: { cardId: string; templateId: string }
    }
  | {
      type: 'card_level_up'
      cardId: string
      templateId: string
      fromLevel: number
      toLevel: number
      roll: number
    }
  | {
      type: 'heal'
      healerId: string
      targetId: string
      amount: number
      fromCard?: { cardId: string; templateId: string }
    }
  | {
      type: 'mod_proc'
      modTemplateId: string
      label: string
      unitId: string
    }
  | {
      type: 'passive_proc'
      templateId: string
      procSuccess: boolean
      unitId: string
      targetId?: string
    }
  | {
      type: 'status_applied'
      unitId: string
      statusKind: string
      sourceTemplateId?: string
    }
  | {
      type: 'status_tick'
      unitId: string
      dotDamage?: number
      regenHeal?: number
    }
  | {
      type: 'resurrect'
      healerId: string
      targetId: string
      hp: number
      fromCard?: { cardId: string; templateId: string }
    }
  | {
      type: 'world_power_gain'
      amount: number
      atUnitId: string
    }

/**
 * Тактический бой: сетка, стены как ключи "x,y", очередь ходов по id.
 * worldPower и карты игрока используются наградами за убийство (см. reducer / run).
 */
export type BattleState = {
  width: number
  height: number
  /** Ключи клеток со стеной, формат `grid.cellKey(x,y)`. */
  walls: readonly string[]
  units: Unit[]
  turnOrder: readonly string[]
  currentTurnIndex: number
  /** 1-based round counter; turn order is rebuilt at the start of each new round. */
  roundNumber: number
  phase: BattlePhase
  /** Сила мира кампании; в бою может расти при смерти врага (§6). */
  worldPower: number
  /** Карты игрока по id юнита (characterId) на поле боя. */
  playerCardsByUnitId: Readonly<Record<string, readonly BattlePlayerCard[]>>
  /** Карты врага по id юнита (preset skills from archetype). */
  enemyCardsByUnitId?: Readonly<Record<string, readonly BattlePlayerCard[]>>
  /** Equipped passives per player unit id (battle copy with L progress). */
  passivesByUnitId?: Readonly<Record<string, readonly PassiveInstance[]>>
  /** Optional override for passive proc rolls (tests). Returns 0–1. */
  passiveRng?: () => number
  /** Filled gear mod slots (armor + accessory) per player unit id. */
  playerGearModSlotsByUnitId?: Readonly<Record<string, readonly ModSlotState[]>>
  /** Текущий актор владеет UI карт (опционально). */
  activePlayerCardUnitId?: string
  /** Перезарядка базового выстрела по id героя (не сохраняется в кампании). */
  heroRangedCooldownByUnitId?: Readonly<Record<string, number>>
  /** Пропустить тик CD в конце текущего хода героя (ход применения карты с CD). */
  skipHeroCooldownTick?: boolean
  /** Пропустить тик CD в конце текущего хода врага (ход применения карты с CD). */
  skipEnemyCooldownTick?: boolean
  /** События текущего боя; не влияют на геймплей, только отображение. */
  battleLog: readonly BattleLogEntry[]
  /** @deprecated removed in save v9 — gear affects stats only */
  gearDamageMult?: number
  /** @deprecated removed in save v9 */
  gearStrikeDamageMult?: number
  /** Герои без клетки спавна — не участвуют в этом бою. */
  excludedCharacterIds?: readonly string[]
  /** Lucky passive L retry per player unit id (set at battle start). */
  luckyPassiveProgressByUnitId?: Readonly<Record<string, boolean>>
}

export type BattleAction =
  | { type: 'move'; unitId: string; toX: number; toY: number }
  | {
      type: 'attack'
      attackerId: string
      targetId: string
      damage: number
      kind: 'melee'
      fromCard?: { cardId: string; templateId: string }
      modCtx?: BattleModContext
    }
  | {
      type: 'attack'
      attackerId: string
      targetId: string
      damage: number
      kind: 'ranged'
      maxRange: number
      fromCard?: { cardId: string; templateId: string }
      modCtx?: BattleModContext
    }
  | {
      type: 'aoe_strike'
      attackerId: string
      centerX: number
      centerY: number
      damage: number
      aoeSize: number
      fromCard?: { cardId: string; templateId: string }
      modCtx?: BattleModContext
    }
  | {
      type: 'heal'
      healerId: string
      targetId: string
      amount: number
      fromCard?: { cardId: string; templateId: string }
      modCtx?: BattleModContext
    }
  | {
      type: 'card_attack'
      attackerId: string
      cardId: string
      targetId?: string
      targetX?: number
      targetY?: number
    }
  | { type: 'end_turn' }

export type RunPhase = 'hub' | 'battle' | 'victory' | 'defeat' | 'inter_battle'

export type PartyMemberBattleSnapshot = {
  characterId: string
  unitLevel: number
  baseStats: BaseStats
  items: ItemInstance[]
  equipment: Record<EquipmentSlot, string | null>
  cards: CardInstance[]
  passives: PassiveInstance[]
  passiveEquip: PassiveEquipLoadout
  battleLoadout: BattleLoadout
  metaStatus: CharacterMetaStatus
  spawnIndex: number
}

/** Снимок мета-состояния на начало попытки боя (retry откатывает сюда). */
export type BattleAttemptSnapshot = {
  worldPower: number
  /** Индекс в `SCENARIOS` для этой попытки (нужен для retry после финала кампании). */
  scenarioSlotIndex: number
  gold: number
  party: readonly PartyMemberBattleSnapshot[]
}

import type { OnboardingState } from './onboarding/types'
import type { MilestoneId } from './milestones/types'

/** Снимок кампании: цепочка сценариев и мета-прогресс. */
export type CampaignState = {
  scenarioIndex: number
  worldPower: number
  gold: number
  phase: RunPhase
  /** Активный бой; null в хабе после победы / до старта. */
  battle: BattleState | null
  /** Монотонный счётчик попыток боя — сброс сценария при поражении не дублирует награды. */
  battleAttemptId: number
  /** Заполняется при входе в бой; поражение + retry восстанавливает мету из снимка. */
  battleAttemptSnapshot: BattleAttemptSnapshot | null
  codexDiscovered: readonly string[]
  codexSeenEntryIds: readonly string[]
  characters: Character[]
  /** Слоты отряда в хабе; null = пустой слот. */
  squad: (string | null)[]
  expedition: Expedition | null
  /** Hub-only tavern roster; null until first refresh. */
  tavernCandidates: TavernCandidate[] | null
  chest: CampaignChest
  shopOffers: ShopOffer[] | null
  shopRefreshSeed: number
  pendingHubNotice: HubNotice | null
  onboarding: OnboardingState
  completedMilestones: readonly MilestoneId[]
}
