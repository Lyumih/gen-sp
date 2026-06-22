import type { TavernCandidate } from './tavern/generateCandidates'
import type { BaseStats } from './config/baseStats'

export type { BaseStats, StatId } from './config/baseStats'

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory'

export type ItemInstance = {
  id: string
  templateId: string
  itemLevel: number
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
  /** Effective initiative at spawn (base stat scaled + gear). */
  initiativeBase?: number
  /** Base stats snapshot for UI tooltips. */
  baseStats?: BaseStats
  displayName?: string
  iconEmoji?: string
  iconAccent?: IconAccentId
}

export type ModificationInstance = {
  templateId: string
  level: number
}

export type ModOffer = { modIds: [string, string, string]; rollSeed: number }

export type ModSlotState =
  | { status: 'empty'; offer: ModOffer | null }
  | { status: 'filled'; templateId: string; lm: number }

export type CardInstance = {
  id: string
  templateId: string
  global_level: number
  uses_count: number
  modifications: ModificationInstance[]
}

/** Поля карточки, участвующие в прогрессе за использование. */
export type CardProgressSlice = Pick<CardInstance, 'global_level' | 'uses_count'>

/** Карта в бою: прогресс + перезарядка (не сохраняется в кампании). */
export type BattlePlayerCard = CardInstance & { cooldownRemaining: number }

export type BattleLoadout = [string | null, string | null]

export type CharacterMetaStatus = 'active' | 'downed'

export type Character = {
  id: string
  name: string
  classId: string
  unitLevel: number
  baseStats: BaseStats
  baseStatRating: number
  equipment: Record<EquipmentSlot, string | null>
  items: ItemInstance[]
  cards: CardInstance[]
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
  partySize: number
  squadSnapshot: (CharacterBattleSnapshot | null)[]
  battleIndex: number
  battleCount: number
  shopLocked: true
  interBattleReviveAllDowned?: boolean
}

export type BattlePhase = 'ongoing' | 'victory' | 'defeat'

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
  /** Текущий актор владеет UI карт (опционально). */
  activePlayerCardUnitId?: string
  /** Пропустить тик CD в конце текущего хода героя (ход применения карты с CD). */
  skipHeroCooldownTick?: boolean
  /** id карточки, на которую копятся очки за убийство врага в этом бою. */
  modKillTargetCardId: string | null
  /** События текущего боя; не влияют на геймплей, только отображение. */
  battleLog: readonly BattleLogEntry[]
  /** Суммарный бонус уровня карт от экипировки на старт боя (снимок). */
  gearCardLevelBonus: number
  /** Герои без клетки спавна — не участвуют в этом бою. */
  excludedCharacterIds?: readonly string[]
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
    }
  | {
      type: 'attack'
      attackerId: string
      targetId: string
      damage: number
      kind: 'ranged'
      maxRange: number
      fromCard?: { cardId: string; templateId: string }
    }
  | {
      type: 'aoe_strike'
      attackerId: string
      centerX: number
      centerY: number
      damage: number
      aoeSize: number
      fromCard?: { cardId: string; templateId: string }
    }
  | {
      type: 'heal'
      healerId: string
      targetId: string
      amount: number
      fromCard?: { cardId: string; templateId: string }
    }

export type RunPhase = 'hub' | 'battle' | 'victory' | 'defeat' | 'inter_battle'

export type PartyMemberBattleSnapshot = {
  characterId: string
  unitLevel: number
  baseStats: BaseStats
  items: ItemInstance[]
  equipment: Record<EquipmentSlot, string | null>
  cards: CardInstance[]
  battleLoadout: BattleLoadout
  metaStatus: CharacterMetaStatus
  spawnIndex: number
}

/** Снимок мета-состояния на начало попытки боя (retry откатывает сюда). */
export type BattleAttemptSnapshot = {
  worldPower: number
  modKillTargetCardId: string | null
  /** Индекс в `SCENARIOS` для этой попытки (нужен для retry после финала кампании). */
  scenarioSlotIndex: number
  gold: number
  party: readonly PartyMemberBattleSnapshot[]
}

/** Снимок кампании: цепочка сценариев и мета-прогресс. */
export type CampaignState = {
  scenarioIndex: number
  worldPower: number
  modKillTargetCardId: string | null
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
}
