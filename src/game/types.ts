export type Side = 'player' | 'enemy'

export type Unit = {
  id: string
  side: Side
  x: number
  y: number
  hp: number
  maxHp: number
  unitLevel: number
}

export type ModificationInstance = {
  level: number
}

export type CardInstance = {
  id: string
  templateId: string
  global_level: number
  uses_count: number
  modifications: ModificationInstance[]
}

/** Поля карточки, участвующие в прогрессе за использование. */
export type CardProgressSlice = Pick<CardInstance, 'global_level' | 'uses_count'>

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
      attackKind: 'melee' | 'ranged'
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
  phase: BattlePhase
  /** Сила мира кампании; в бою может расти при смерти врага (§6). */
  worldPower: number
  /** Карты героя на поле боя — для начисления модификаций за kill (MVP). */
  playerCards: readonly CardInstance[]
  /** id карточки, на которую копятся очки за убийство врага в этом бою. */
  modKillTargetCardId: string | null
  /** События текущего боя; не влияют на геймплей, только отображение. */
  battleLog: readonly BattleLogEntry[]
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

export type RunPhase = 'hub' | 'battle' | 'victory' | 'defeat'

/** Снимок мета-состояния на начало попытки боя (retry откатывает сюда). */
export type BattleAttemptSnapshot = {
  worldPower: number
  cards: CardInstance[]
  playerUnitLevel: number
  modKillTargetCardId: string | null
  /** Индекс в `SCENARIOS` для этой попытки (нужен для retry после финала кампании). */
  scenarioSlotIndex: number
}

/** Снимок кампании: цепочка сценариев и мета-прогресс. */
export type CampaignState = {
  scenarioIndex: number
  worldPower: number
  playerUnitLevel: number
  cards: CardInstance[]
  modKillTargetCardId: string | null
  phase: RunPhase
  /** Активный бой; null в хабе после победы / до старта. */
  battle: BattleState | null
  /** Монотонный счётчик попыток боя — сброс сценария при поражении не дублирует награды. */
  battleAttemptId: number
  /** Заполняется при входе в бой; поражение + retry восстанавливает мету из снимка. */
  battleAttemptSnapshot: BattleAttemptSnapshot | null
}
