import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  AimOutlined,
  CheckCircleOutlined,
  DragOutlined,
  IdcardOutlined,
  LogoutOutlined,
  RedoOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Alert, App, Badge, Button, Radio, Space, Switch, Tooltip, Typography } from 'antd'
import { getCardAttackTemplate, isHealKind, usesCardBuffDispatch } from '../../game/content/cardTemplates'
import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_MAX_RANGE,
  HERO_MOVE_RANGE,
} from '../../game/battle/combat'
import { getHeroRangedCooldown } from '../../game/battle/heroRangedCooldown'
import { unitCombatMiniStats } from '../../game/battle/unitCombatStats'
import { UI_CELL, UI_DAMAGE, UI_GOLD, UI_WORLD_POWER } from '../../game/ui/labels'
import { computeVictoryGoldGain } from '../../game/campaign/victoryRewards'
import { battleGridScale } from './battleCellLayout'
import { worldPowerTooltip } from '../campaign/resourceTooltips'
import { GamePanel } from '../layout/GamePanel'
import '../layout/game-layout.css'
import { computeEffectiveStats, computeGearStatBonuses } from '../../game/stats/effectiveStats'
import { aggregatePassiveSkillStatBonuses } from '../../game/passives/passiveStatBonuses'
import { computePassiveRangedRangeBonus } from '../../game/passives/passiveEngine'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { BattleSkillCell } from './BattleSkillCell'
import { BattleUnitTooltip } from './BattleUnitTooltip'
import { UnitToken } from './UnitToken'
import { HeroProfileModal } from '../profile/HeroProfileModal'
import type { CampaignState, Unit } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { BattleAnimationLayer } from './animation/BattleAnimationLayer'
import { useBattleAnimationQueue } from './animation/useBattleAnimationQueue'
import { getUnitDisplay } from '../../game/character/display'
import { turnBadgeLabel } from '../../game/battle/turnBadge'
import { BattleLogLine } from './BattleLogLine'
import { getCurrentActorId } from '../../game/battle/reducer'
import { getActorPlayerCards } from '../../game/battle/playerCards'
import { cellKey, wallSet } from '../../game/battle/grid'
import { hasCompletedStep } from '../../game/onboarding/onboardingState'
import { isGuidedTutorialActive } from '../../game/onboarding/selectors'
import {
  GuidedBattleOverlay,
  isGuidedModeAllowed,
} from '../onboarding/GuidedBattleOverlay'
import { PostBattleDebriefModal } from '../onboarding/PostBattleDebriefModal'
import {
  aggregateEnemyThreatCells,
  attackRangeCells,
  canCastAoEAt,
  castRangeCells,
  cellsInAoE,
  cellsInManhattanRange,
  enemyThreatCells,
  reachableMoveCells,
  validHealTargetCells,
  validSingleTargetCells,
  validAllyBuffTargetCells,
} from '../../game/battle/rangeOverlay'
import { occupiedEquipmentSlotsInOrder } from '../../game/equipment/equipmentOrder'
import { getCharacter, getPrimaryCharacter } from '../../game/campaign/selectors'
import { randomInt1to100 } from '../../game/rng'
import { cellBackgroundStyle, OVERLAY_LEGEND } from './cellOverlayStyle'
import { ActorPassivesPanel } from './ActorPassivesPanel'
import { TurnOrderStrip } from './TurnOrderStrip'
import { pickEnemyAiAction } from './enemyAi'
import { pickPlayerAiAction } from './playerAi'
import './battle.css'

type ActionMode = 'move' | 'melee' | 'ranged' | 'card'

const CELL_PX = 58
const HERO_AI_DELAY_MS = 2000

function BattleUnitCell({
  unit,
  campaign,
  worldPower,
  turnOrder,
  currentTurnIndex,
  highlighted,
  isCurrentActor,
  onHighlight,
  cellClassName,
  cellStyle,
  onCellClick,
  onCellMouseEnter,
  hiddenByAnimation,
}: {
  unit: Unit
  campaign: CampaignState
  worldPower: number
  turnOrder: readonly string[]
  currentTurnIndex: number
  highlighted?: boolean
  isCurrentActor?: boolean
  onHighlight?: (unitId: string | null) => void
  cellClassName: string
  cellStyle: CSSProperties
  onCellClick: () => void
  onCellMouseEnter: () => void
  hiddenByAnimation?: boolean
}) {
  const display = getUnitDisplay(unit, campaign)
  const combatStats = unitCombatMiniStats(unit, campaign, worldPower)
  const isAlive = (id: string) => {
    const u = campaign.battle?.units.find((x) => x.id === id)
    return u !== undefined && u.hp > 0
  }
  const badge = turnBadgeLabel(unit.id, turnOrder, currentTurnIndex, isAlive)

  const button = (
    <button
      type="button"
      className={cellClassName}
      onClick={onCellClick}
      onMouseEnter={onCellMouseEnter}
      style={{ ...cellStyle, position: 'relative' }}
    >
      {badge ? (
        <Badge count={badge} color="#1677ff" className="battle-cell__turn-badge" />
      ) : null}
      <UnitToken
        display={display}
        variant="grid"
        unitLevel={unit.unitLevel}
        combatStats={combatStats}
        hp={unit.hp}
        maxHp={unit.maxHp}
        highlighted={highlighted}
        isCurrentActor={isCurrentActor}
        isDead={unit.hp <= 0}
        hiddenByAnimation={hiddenByAnimation}
        onMouseEnter={() => onHighlight?.(unit.id)}
        onMouseLeave={() => onHighlight?.(null)}
      />
    </button>
  )

  if (!unit.baseStats) return button

  const character = campaign.characters.find((c) => c.id === unit.id)
  const gearBonuses = character
    ? computeGearStatBonuses(character.items, character.equipment, getItemTemplate)
    : {}
  const passiveBonuses = character
    ? aggregatePassiveSkillStatBonuses(character.passives, character.passiveEquip, unit.baseStats)
    : {}
  const effective = computeEffectiveStats(
    unit.baseStats,
    unit.unitLevel,
    worldPower,
    gearBonuses,
    passiveBonuses,
  )
  effective.health = unit.maxHp
  effective.initiative = unit.initiativeBase ?? effective.initiative

  return (
    <BattleUnitTooltip
      display={display}
      baseStats={unit.baseStats}
      effectiveStats={effective}
      hp={unit.hp}
      maxHp={unit.maxHp}
      raceId={unit.raceId}
    >
      {button}
    </BattleUnitTooltip>
  )
}

export function BattleScreen() {
  const { message, modal } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const setHubActiveTab = useGameStore((s) => s.setHubActiveTab)
  const dispatchBattle = useGameStore((s) => s.dispatchBattle)
  const autoBattleEnabled = useGameStore((s) => s.autoBattleEnabled)
  const setAutoBattleEnabled = useGameStore((s) => s.setAutoBattleEnabled)
  const guidedBattleStep = useGameStore((s) => s.onboardingUi.guidedBattleStep)
  const setGuidedBattleStep = useGameStore((s) => s.setGuidedBattleStep)
  const resetGuidedBattleStep = useGameStore((s) => s.resetGuidedBattleStep)
  const battle = campaign.battle
  const guidedActive = isGuidedTutorialActive(campaign)
  const [mode, setMode] = useState<ActionMode>('move')
  const [profileOpen, setProfileOpen] = useState(false)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null)
  const [selectedCardPickId, setSelectedCardPickId] = useState<string | null>(null)
  const [pendingAoeCell, setPendingAoeCell] = useState<{ x: number; y: number } | null>(null)
  const [explosionCells, setExplosionCells] = useState<Set<string>>(new Set())
  const [playerUnitPickId, setPlayerUnitPickId] = useState<string | null>(null)
  const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [trackedTurnId, setTrackedTurnId] = useState<string | undefined>(undefined)
  const [defeatDebriefOpen, setDefeatDebriefOpen] = useState(false)

  const battleAnim = useBattleAnimationQueue(
    battle?.battleLog ?? [],
    battle?.units ?? [],
    Boolean(battle),
    battle ? campaign.battleAttemptId : null,
  )
  const animationPlaying =
    battleAnim.activeStep !== null || battleAnim.queueLength > 0

  useEffect(() => {
    if (!guidedActive || !battle) return
    if (battle.phase === 'victory') {
      dispatchRun({ type: 'SET_GUIDED_TUTORIAL_DONE' })
      return
    }
    if (battle.phase === 'defeat') {
      resetGuidedBattleStep()
      if (
        !campaign.onboarding.skipMode &&
        !hasCompletedStep(campaign.onboarding, 'memento_defeat_debrief')
      ) {
        setDefeatDebriefOpen(true)
      }
    }
  }, [battle?.phase, guidedActive, campaign.onboarding, dispatchRun, resetGuidedBattleStep])

  useEffect(() => {
    if (!guidedActive || !battle || battle.phase !== 'ongoing') return
    const player = battle.units.find((u) => u.side === 'player' && u.hp > 0)
    const enemy = battle.units.find((u) => u.side === 'enemy' && u.hp > 0)
    if (!player || !enemy) return

    if (guidedBattleStep === 1 && player.x > 0) {
      setGuidedBattleStep(2)
    }
    if (
      guidedBattleStep === 2 &&
      Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y) <= 1
    ) {
      setGuidedBattleStep(3)
    }
    const lastLog = battle.battleLog[battle.battleLog.length - 1]
    if (
      guidedBattleStep === 3 &&
      lastLog &&
      lastLog.type === 'strike' &&
      lastLog.attackerId === player.id
    ) {
      setGuidedBattleStep(4)
    }
  }, [
    battle,
    guidedActive,
    guidedBattleStep,
    setGuidedBattleStep,
  ])

  const currentId = battle ? getCurrentActorId(battle) : undefined
  const currentTurnIndex =
    battle && currentId ? Math.max(0, battle.turnOrder.indexOf(currentId)) : 0

  const unitLogLookup = useMemo(() => {
    if (!battle) return undefined
    return (unitId: string) => {
      const unit = battle.units.find((u) => u.id === unitId)
      return unit ? getUnitDisplay(unit, campaign) : undefined
    }
  }, [battle, campaign])

  const unitSideLookup = useMemo(() => {
    if (!battle) return () => undefined
    return (unitId: string) => battle.units.find((u) => u.id === unitId)?.side
  }, [battle])

  const excludedNames = useMemo(() => {
    const ids = battle?.excludedCharacterIds ?? []
    return ids
      .map((id) => getCharacter(campaign, id)?.name ?? id)
      .filter(Boolean)
  }, [battle?.excludedCharacterIds, campaign])
  const current = battle?.units.find((u) => u.id === currentId)
  const actor = current?.side === 'player' && current.hp > 0 ? current : undefined
  const passiveRangedRangeBonus = useMemo(() => {
    if (!battle || !actor) return 0
    const passives = battle.passivesByUnitId?.[actor.id] ?? []
    return computePassiveRangedRangeBonus(passives, actor, battle)
  }, [battle, actor])
  const effectiveRangedRange = HERO_BASIC_RANGED_MAX_RANGE + passiveRangedRangeBonus
  const heroRangedCooldown = battle && actor ? getHeroRangedCooldown(battle, actor.id) : 0
  const heroRangedOnCd = heroRangedCooldown > 0
  const actorCards = useMemo(
    () => (battle && currentId ? getActorPlayerCards(battle, currentId) : []),
    [battle, currentId],
  )

  if (currentId !== trackedTurnId) {
    setTrackedTurnId(currentId)
    if (playerUnitPickId !== null) setPlayerUnitPickId(null)
  }

  const selectedPlayerUnitId =
    current?.side === 'player' ? (playerUnitPickId ?? currentId ?? null) : playerUnitPickId

  const selectedCardId = useMemo(() => {
    if (!battle || actorCards.length === 0) return null
    if (selectedCardPickId && actorCards.some((c) => c.id === selectedCardPickId)) {
      return selectedCardPickId
    }
    return actorCards[0]!.id
  }, [battle, actorCards, selectedCardPickId])

  const aoeResetKey = `${mode}:${selectedCardId ?? ''}:${currentId ?? ''}`
  const [storedAoeResetKey, setStoredAoeResetKey] = useState(aoeResetKey)
  if (aoeResetKey !== storedAoeResetKey) {
    setStoredAoeResetKey(aoeResetKey)
    if (pendingAoeCell !== null) setPendingAoeCell(null)
  }

  useEffect(() => {
    if (!battle || battle.phase !== 'ongoing' || !currentId) return
    if (animationPlaying) return
    const actor = battle.units.find((u) => u.id === currentId)
    if (!actor || actor.side !== 'enemy' || actor.hp <= 0) return

    let cancelled = false
    const runEnemyAi = (attempt = 0) => {
      if (cancelled || attempt > 3) return
      const store = useGameStore.getState()
      const b = store.campaign.battle
      if (!b || b.phase !== 'ongoing') return
      const liveActorId = getCurrentActorId(b)
      const liveActor = liveActorId ? b.units.find((u) => u.id === liveActorId) : undefined
      if (!liveActor || liveActor.side !== 'enemy' || liveActor.hp <= 0) return

      const sigBefore = `${liveActorId}:${b.currentTurnIndex}:${b.roundNumber}:${b.battleLog.length}`
      const act = pickEnemyAiAction(b)
      if (!act) return
      store.dispatchBattle(act)
      if (cancelled) return
      const after = useGameStore.getState().campaign.battle
      if (!after || after.phase !== 'ongoing') return
      const sigAfter = `${getCurrentActorId(after)}:${after.currentTurnIndex}:${after.roundNumber}:${after.battleLog.length}`
      if (sigAfter === sigBefore) {
        window.setTimeout(() => runEnemyAi(attempt + 1), 120)
      }
    }

    const t = window.setTimeout(() => runEnemyAi(), 350)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [battle, currentId, battle?.currentTurnIndex, battle?.roundNumber, battle?.battleLog.length, animationPlaying])

  useEffect(() => {
    if (!autoBattleEnabled || !battle || battle.phase !== 'ongoing') return
    if (animationPlaying) return
    const actor = battle.units.find((u) => u.id === getCurrentActorId(battle))
    if (!actor || actor.side !== 'player') return
    const t = window.setTimeout(() => {
      const store = useGameStore.getState()
      const b = store.campaign.battle
      if (!b || b.phase !== 'ongoing' || !store.autoBattleEnabled) return
      const decision = pickPlayerAiAction(b, store.campaign)
      if (!decision) return
      if (decision.kind === 'battle') {
        store.dispatchBattle(decision.action)
      } else if (decision.kind === 'card_heal') {
        store.dispatchRun({
          type: 'USE_CARD_HEAL',
          cardId: decision.cardId,
          targetId: decision.targetId,
          randomInt1to100: randomInt1to100(),
        })
      } else if (decision.kind === 'card_buff') {
        store.dispatchRun({
          type: 'USE_CARD_BUFF',
          cardId: decision.cardId,
          targetId: decision.targetId,
          randomInt1to100: randomInt1to100(),
        })
      } else if (decision.kind === 'card_aoe') {
        store.dispatchRun({
          type: 'USE_CARD_AOE',
          cardId: decision.cardId,
          targetX: decision.targetX,
          targetY: decision.targetY,
          randomInt1to100: randomInt1to100(),
        })
      } else {
        store.dispatchRun({
          type: 'USE_CARD_ATTACK',
          cardId: decision.cardId,
          targetId: decision.targetId,
          randomInt1to100: randomInt1to100(),
        })
      }
    }, HERO_AI_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [battle, autoBattleEnabled, animationPlaying])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [battle?.battleLog.length])

  const overlayActive = Boolean(
    battle &&
      battle.phase === 'ongoing' &&
      !autoBattleEnabled &&
      actor &&
      currentId === actor.id,
  )

  const overlaySets = useMemo(() => {
    const selectedCard = actorCards.find((c) => c.id === selectedCardId)
    const selectedCardTemplate = selectedCard
      ? getCardAttackTemplate(selectedCard.templateId)
      : undefined
    if (!battle || !actor || !overlayActive) {
      return {
        threatBase: new Set<string>(),
        threatFocus: new Set<string>(),
        moveCells: new Set<string>(),
        actionRangeCells: new Set<string>(),
        aoePreviewCells: new Set<string>(),
        validTargetCells: new Set<string>(),
      }
    }

    const threatBase = aggregateEnemyThreatCells(battle)
    const threatFocus =
      hoveredEnemyId !== null ? enemyThreatCells(battle, hoveredEnemyId) : new Set<string>()

    let moveCells = new Set<string>()
    let actionRangeCells = new Set<string>()
    let validTargetCells = new Set<string>()

    if (mode === 'move') {
      moveCells = reachableMoveCells(battle, actor.id)
    } else if (mode === 'melee') {
      actionRangeCells = cellsInManhattanRange(
        actor.x,
        actor.y,
        1,
        1,
        battle.width,
        battle.height,
      )
      validTargetCells = validSingleTargetCells(battle, actor.x, actor.y, 'melee', 1)
    } else if (mode === 'ranged' && !heroRangedOnCd) {
      actionRangeCells = attackRangeCells(battle, actor.x, actor.y, effectiveRangedRange)
      validTargetCells = validSingleTargetCells(
        battle,
        actor.x,
        actor.y,
        'ranged',
        effectiveRangedRange,
      )
      } else if (mode === 'card' && selectedCardTemplate) {
      if (selectedCardTemplate.kind === 'aoe' || (selectedCardTemplate.kind === 'utility' && selectedCardTemplate.aoeSize !== undefined)) {
        actionRangeCells = castRangeCells(battle, actor.x, actor.y, selectedCardTemplate.maxRange)
      } else if (isHealKind(selectedCardTemplate.kind)) {
        actionRangeCells = castRangeCells(battle, actor.x, actor.y, selectedCardTemplate.maxRange)
        validTargetCells = validHealTargetCells(
          battle,
          actor,
          selectedCardTemplate.maxRange,
          selectedCardTemplate.kind === 'regen'
            ? 'regen'
            : selectedCardTemplate.kind === 'resurrect'
              ? 'resurrect'
              : 'heal',
        )
      } else if (usesCardBuffDispatch(selectedCardTemplate.kind)) {
        actionRangeCells = castRangeCells(battle, actor.x, actor.y, selectedCardTemplate.maxRange)
        validTargetCells = validAllyBuffTargetCells(battle, actor, selectedCardTemplate.maxRange)
      } else if (selectedCardTemplate.kind === 'melee' || selectedCardTemplate.kind === 'dot') {
        actionRangeCells = cellsInManhattanRange(
          actor.x,
          actor.y,
          1,
          1,
          battle.width,
          battle.height,
        )
        validTargetCells = validSingleTargetCells(battle, actor.x, actor.y, 'melee', 1)
      } else {
        actionRangeCells = attackRangeCells(battle, actor.x, actor.y, selectedCardTemplate.maxRange)
        validTargetCells = validSingleTargetCells(
          battle,
          actor.x,
          actor.y,
          'ranged',
          selectedCardTemplate.maxRange,
        )
      }
    }

    const walls = wallSet(battle.walls)
    let aoePreviewCells = new Set<string>()
    let previewCenter: { x: number; y: number } | null = null
    if (mode === 'card' && selectedCardTemplate?.kind === 'aoe') {
      previewCenter = pendingAoeCell ?? hoverCell
    }
    if (
      mode === 'card' &&
      selectedCardTemplate?.kind === 'aoe' &&
      selectedCardTemplate.aoeSize !== undefined &&
      previewCenter !== null &&
      canCastAoEAt(
        actor,
        previewCenter.x,
        previewCenter.y,
        selectedCardTemplate.maxRange,
        walls,
      )
    ) {
      aoePreviewCells = cellsInAoE(
        previewCenter.x,
        previewCenter.y,
        selectedCardTemplate.aoeSize,
        battle.width,
        battle.height,
      )
    }

    return {
      threatBase,
      threatFocus,
      moveCells,
      actionRangeCells,
      aoePreviewCells,
      validTargetCells,
    }
  }, [
    battle,
    actor,
    actorCards,
    overlayActive,
    mode,
    hoveredEnemyId,
    hoverCell,
    selectedCardId,
    pendingAoeCell,
    heroRangedOnCd,
    effectiveRangedRange,
  ])

  const gridCells = useMemo(() => {
    if (!battle) return []
    const rows: { x: number; y: number }[][] = []
    for (let y = 0; y < battle.height; y++) {
      const row: { x: number; y: number }[] = []
      for (let x = 0; x < battle.width; x++) row.push({ x, y })
      rows.push(row)
    }
    return rows
  }, [battle])

  if (!battle) return null

  const hero = getPrimaryCharacter(campaign)
  const actorCharacter =
    actor !== undefined ? (getCharacter(campaign, actor.id) ?? hero) : hero

  const walls = new Set(battle.walls)
  const unitAt = (x: number, y: number) =>
    battle.units.find((u) => u.hp > 0 && u.x === x && u.y === y)

  const actionsDisabled =
    battle.phase !== 'ongoing' ||
    !actor ||
    currentId !== actor.id ||
    autoBattleEnabled ||
    (guidedActive && guidedBattleStep === 0)
  const guidedModeBlocked = (candidate: ActionMode) =>
    guidedActive && !isGuidedModeAllowed(guidedBattleStep, candidate)
  const basicMode: ActionMode | undefined =
    mode === 'move' || mode === 'melee' || mode === 'ranged' ? mode : undefined

  const finalizeVictoryToHub = () => {
    const hero = getPrimaryCharacter(campaign)
    const n = occupiedEquipmentSlotsInOrder(hero.equipment).length
    const rolls = Array.from({ length: n }, () => randomInt1to100())
    dispatchRun({
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: rolls,
      playerUnitLevelRoll: randomInt1to100(),
    })
  }

  const expedition = campaign.expedition
  const inExpedition = expedition !== null

  const confirmAbandon = () => {
    if (inExpedition) {
      modal.confirm({
        title: 'Отступить в лагерь?',
        content:
          'Текущий бой не засчитается. Мета-прогресс вернётся к состоянию на начало попытки. В лагере можно попробовать снова или завершить экспедицию.',
        okText: 'В лагерь',
        cancelText: 'Отмена',
        okButtonProps: { danger: true },
        onOk: () => {
          setHubActiveTab('battle')
          dispatchRun({ type: 'ABANDON_BATTLE' })
        },
      })
      return
    }

    modal.confirm({
      title: 'Выйти из боя?',
      content:
        'Прогресс этого боя будет потерян. Мета-прогресс вернётся к состоянию на начало попытки; награды за незавершённый бой не начислятся.',
      okText: 'Выйти',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => {
        setHubActiveTab('battle')
        dispatchRun({ type: 'ABANDON_BATTLE' })
      },
    })
  }

  const triggerExplosion = (cx: number, cy: number, aoeSize: number) => {
    const cells = cellsInAoE(cx, cy, aoeSize, battle.width, battle.height)
    setExplosionCells(cells)
    window.setTimeout(() => setExplosionCells(new Set()), 600)
  }

  const onCellClick = (x: number, y: number) => {
    if (battle.phase !== 'ongoing') return
    if (autoBattleEnabled) return
    const target = unitAt(x, y)
    if (target?.side === 'player' && current?.side === 'player') {
      setPlayerUnitPickId(target.id)
      if (target.id !== currentId) {
        message.info('Сейчас ход другого бойца')
        return
      }
    }
    if (!actor || currentId !== actor.id) {
      message.info('Сейчас ход противника')
      return
    }
    if (mode === 'move') {
      if (target) {
        message.warning('Клетка занята')
        return
      }
      if (!overlaySets.moveCells.has(cellKey(x, y))) {
        message.warning('Недоступная клетка')
        return
      }
      dispatchBattle({ type: 'move', unitId: actor.id, toX: x, toY: y })
      return
    }
    if (mode === 'card') {
      const card = actorCards.find((c) => c.id === selectedCardId)
      if (!card) {
        message.warning('Нет карт в бою')
        return
      }
      const tmpl = getCardAttackTemplate(card.templateId)
      if (!tmpl) return
      if (tmpl.kind === 'aoe' || (tmpl.kind === 'utility' && tmpl.aoeSize !== undefined)) {
        const walls = wallSet(battle.walls)
        if (!canCastAoEAt(actor, x, y, tmpl.maxRange, walls)) {
          message.warning('Вне дальности или нет прямой видимости')
          return
        }
        if (pendingAoeCell?.x === x && pendingAoeCell.y === y) {
          setPendingAoeCell(null)
          triggerExplosion(x, y, tmpl.aoeSize ?? 3)
          dispatchRun({
            type: 'USE_CARD_AOE',
            cardId: card.id,
            targetX: x,
            targetY: y,
            randomInt1to100: randomInt1to100(),
          })
          return
        }
        setPendingAoeCell({ x, y })
        message.info('Нажмите ещё раз для подтверждения')
        return
      }
      if (isHealKind(tmpl.kind)) {
        if (!target || target.side !== 'player') {
          message.warning('Выберите союзника')
          return
        }
        if (!overlaySets.validTargetCells.has(cellKey(x, y))) {
          message.warning('Цель недоступна')
          return
        }
        if (card.cooldownRemaining > 0) {
          message.warning('Умение на перезарядке')
          return
        }
        dispatchRun({
          type: 'USE_CARD_HEAL',
          cardId: card.id,
          targetId: target.id,
          randomInt1to100: randomInt1to100(),
        })
        return
      }
      if (usesCardBuffDispatch(tmpl.kind)) {
        if (!target || target.side !== 'player' || target.hp <= 0) {
          message.warning('Выберите союзника')
          return
        }
        if (!overlaySets.validTargetCells.has(cellKey(x, y))) {
          message.warning('Цель недоступна')
          return
        }
        if (card.cooldownRemaining > 0) {
          message.warning('Умение на перезарядке')
          return
        }
        dispatchRun({
          type: 'USE_CARD_BUFF',
          cardId: card.id,
          targetId: target.id,
          randomInt1to100: randomInt1to100(),
        })
        return
      }
      if (!target || target.side !== 'enemy') {
        message.warning('Выберите врага')
        return
      }
      if (!overlaySets.validTargetCells.has(cellKey(x, y))) {
        message.warning('Вне дальности')
        return
      }
      dispatchRun({
        type: 'USE_CARD_ATTACK',
        cardId: card.id,
        targetId: target.id,
        randomInt1to100: randomInt1to100(),
      })
      return
    }
    if (!target || target.side !== 'enemy') {
      message.warning('Выберите врага')
      return
    }
    if (mode === 'melee') {
      if (!overlaySets.validTargetCells.has(cellKey(x, y))) {
        message.warning('Вне дальности')
        return
      }
      dispatchBattle({
        type: 'attack',
        attackerId: actor.id,
        targetId: target.id,
        damage: HERO_BASIC_MELEE_DAMAGE,
        kind: 'melee',
      })
      return
    }
    if (!overlaySets.validTargetCells.has(cellKey(x, y))) {
      message.warning('Вне дальности')
      return
    }
    if (heroRangedOnCd) {
      message.warning('Выстрел на перезарядке')
      return
    }
    dispatchBattle({
      type: 'attack',
      attackerId: actor.id,
      targetId: target.id,
      damage: HERO_BASIC_RANGED_DAMAGE,
      kind: 'ranged',
      maxRange: effectiveRangedRange,
    })
  }

  const handleCellMouseEnter = (x: number, y: number) => {
    setHoverCell({ x, y })
    const u = unitAt(x, y)
    if (u?.side === 'enemy') setHoveredEnemyId(u.id)
    else setHoveredEnemyId(null)
  }

  const handleGridMouseLeave = () => {
    setHoverCell(null)
    setHoveredEnemyId(null)
  }

  const wpBefore = campaign.battleAttemptSnapshot?.worldPower ?? campaign.worldPower
  const wpAfter = battle.worldPower
  const wpDelta = wpAfter - wpBefore
  const scenarioSlot =
    campaign.battleAttemptSnapshot?.scenarioSlotIndex ?? campaign.scenarioIndex
  const goldGain = computeVictoryGoldGain(campaign, scenarioSlot)
  const gridScale = battleGridScale(battle.width, battle.height)

  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <PostBattleDebriefModal
        kind="first_defeat"
        open={defeatDebriefOpen}
        onClose={() => {
          setDefeatDebriefOpen(false)
          dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'memento_defeat_debrief' })
        }}
      />
      {battle.phase === 'defeat' && (
        <Alert
          type="error"
          title="Поражение"
          description="Начните бой заново — мета-прогресс без дюпа наград за прошлую попытку."
          action={
            <Button
              type="primary"
              danger
              icon={<RedoOutlined />}
              onClick={() => dispatchRun({ type: 'RETRY_CURRENT_BATTLE' })}
            >
              Начать новый бой
            </Button>
          }
        />
      )}
      {excludedNames.length > 0 && (
        <Alert
          type="warning"
          showIcon
          closable
          title="Не хватило места спавна"
          description={`${excludedNames.join(', ')} не участвуют в этом бою`}
        />
      )}
      {battle.phase === 'victory' && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          title="Победа"
          description={
            <>
              Просмотрите журнал и поле боя. Награды кампании и переход дальше произойдут только после вашего выбора.
              <br />
              Сила мира: {wpBefore} → {wpAfter} (+{wpDelta} за бой)
              <br />
              {UI_GOLD} +{goldGain} золота
              {!campaign.completedMilestones.includes('milestone_first_trial_win') &&
              campaign.expedition !== null ? (
                <>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Совет: загляните в магазин и наденьте экипировку из сундука перед следующим боем.
                  </Typography.Text>
                </>
              ) : null}
            </>
          }
          action={
            <Button type="primary" onClick={finalizeVictoryToHub}>
              Продолжить в хаб
            </Button>
          }
        />
      )}

      <div className="game-battle-layout">
        <div className="game-battle-field">
          <div className="game-battle-turn-order">
            <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
              Очерёдность хода
            </Typography.Text>
            <TurnOrderStrip
              turnOrder={battle.turnOrder}
              currentTurnIndex={battle.currentTurnIndex}
              currentActorId={currentId}
              units={battle.units}
              campaign={campaign}
              worldPower={battle.worldPower}
              highlightedUnitId={highlightedUnitId}
              onHighlight={setHighlightedUnitId}
            />
          </div>

          <div
            className={`game-battle-field-scroll${gridScale > 1 ? ' game-battle-field-scroll--compact' : ''}`}
          >
            <div
              className="battle-field-root"
              style={
                gridScale > 1
                  ? { transform: `scale(${gridScale})`, transformOrigin: 'center' }
                  : undefined
              }
            >
            <div
              onMouseLeave={handleGridMouseLeave}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${battle.width}, ${CELL_PX}px)`,
                gap: 4,
                width: 'max-content',
              }}
            >
          {gridCells.flatMap((row) =>
            row.map(({ x, y }) => {
              const k = cellKey(x, y)
              const u = unitAt(x, y)
              const wall = walls.has(k)
              const inThreatFocus = overlaySets.threatFocus.has(k)
              const inThreatBase = overlaySets.threatBase.has(k)
              const showValidTarget =
                overlayActive &&
                hoverCell?.x === x &&
                hoverCell.y === y &&
                overlaySets.validTargetCells.has(k)
              const isPendingAoe =
                pendingAoeCell?.x === x && pendingAoeCell.y === y && mode === 'card'
              const isExploding = explosionCells.has(k)
              const isCurrentActor = u?.id === currentId
              const isSelectedPlayer =
                u?.side === 'player' && u.id === selectedPlayerUnitId && !isCurrentActor
              const isUnitHighlighted = u?.id === highlightedUnitId
              const cellStyle = cellBackgroundStyle({
                isWall: wall,
                threatBase: overlayActive && inThreatBase && !inThreatFocus,
                threatFocus: overlayActive && inThreatFocus,
                dimThreat:
                  overlayActive &&
                  hoveredEnemyId !== null &&
                  inThreatBase &&
                  !inThreatFocus,
                move: overlayActive && overlaySets.moveCells.has(k),
                actionRange: overlayActive && overlaySets.actionRangeCells.has(k),
                aoe: overlayActive && overlaySets.aoePreviewCells.has(k),
                validTarget: showValidTarget,
              })
              const isGuidedMove =
                guidedActive &&
                mode === 'move' &&
                overlayActive &&
                overlaySets.moveCells.has(k)
              const cellClassName = `${isExploding ? 'battle-cell-explosion' : ''}${isPendingAoe ? ' battle-cell-aoe-pending' : ''}${isUnitHighlighted && u ? ' battle-cell-unit-highlight' : ''}${isGuidedMove ? ' battle-cell--guided-move' : ''}`
              const sharedButtonStyle: CSSProperties = {
                width: CELL_PX,
                height: CELL_PX,
                padding: wall ? 0 : 2,
                fontSize: wall ? undefined : 12,
                cursor: wall ? 'default' : 'pointer',
                border: isCurrentActor
                  ? '2px solid #1677ff'
                  : isSelectedPlayer
                    ? '2px solid #52c41a'
                    : '1px solid #ccc',
                boxShadow: isCurrentActor ? '0 0 0 1px #1677ff' : undefined,
                ...cellStyle,
              }

              if (u?.side === 'player' || u?.side === 'enemy') {
                return (
                  <BattleUnitCell
                    key={k}
                    unit={u}
                    campaign={campaign}
                    worldPower={battle.worldPower}
                    turnOrder={battle.turnOrder}
                    currentTurnIndex={currentTurnIndex}
                    highlighted={isUnitHighlighted}
                    isCurrentActor={isCurrentActor}
                    onHighlight={setHighlightedUnitId}
                    cellClassName={cellClassName}
                    cellStyle={sharedButtonStyle}
                    onCellClick={() => onCellClick(x, y)}
                    onCellMouseEnter={() => handleCellMouseEnter(x, y)}
                    hiddenByAnimation={battleAnim.hiddenUnitIds.has(u.id)}
                  />
                )
              }

              let inner: ReactNode = '·'
              if (wall)
                inner = (
                  <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>
                    🧱
                  </span>
                )

              return (
                <button
                  key={k}
                  type="button"
                  className={cellClassName}
                  aria-label={
                    isGuidedMove
                      ? `Ход: клетка (${x + 1}, ${y + 1})`
                      : `Пустая клетка (${x + 1}, ${y + 1})`
                  }
                  onClick={() => onCellClick(x, y)}
                  onMouseEnter={() => handleCellMouseEnter(x, y)}
                  style={sharedButtonStyle}
                >
                  {inner}
                </button>
              )
            }),
          )}
            </div>
            <BattleAnimationLayer
              activeStep={battleAnim.activeStep}
              units={battle.units}
              getUnitDisplay={(unitId) => unitLogLookup?.(unitId)}
            />
            </div>
          </div>

          {overlayActive && (
            <Space wrap size="small" style={{ marginTop: 8 }}>
              {OVERLAY_LEGEND.map((item) => (
                <Typography.Text key={item.label} style={{ fontSize: 12 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      marginRight: 6,
                      verticalAlign: '-2px',
                      borderRadius: 2,
                      border: '1px solid #ccc',
                      background: item.color,
                    }}
                    aria-hidden
                  />
                  {item.label}
                </Typography.Text>
              ))}
            </Space>
          )}
        </div>

        <GamePanel
          title={
            actor
              ? `Действия: ${getCharacter(campaign, actor.id)?.name ?? actor.id}`
              : 'Действия'
          }
          extra={
            <Space wrap size="small">
              <Button
                size="small"
                icon={<IdcardOutlined aria-hidden />}
                aria-label="Профиль героя"
                onClick={() => setProfileOpen(true)}
              >
                Профиль
              </Button>
              {battle.phase === 'ongoing' || battle.phase === 'defeat' ? (
                <Tooltip
                  title={
                    inExpedition
                      ? 'Текущий бой не засчитается. Можно попробовать снова или завершить экспедицию в лагере.'
                      : 'Прогресс боя будет потерян. Награды за незавершённый бой не начислятся.'
                  }
                  mouseEnterDelay={0.3}
                >
                  <Button
                    size="small"
                    danger
                    icon={<LogoutOutlined aria-hidden />}
                    aria-label={inExpedition ? 'Отступить в лагерь' : 'Выйти из боя'}
                    onClick={confirmAbandon}
                  >
                    {inExpedition ? 'В лагерь' : 'Выйти из боя'}
                  </Button>
                </Tooltip>
              ) : null}
            </Space>
          }
        >
          {guidedActive ? (
            <GuidedBattleOverlay
              stepIndex={guidedBattleStep}
              onAck={() => setGuidedBattleStep(1)}
            />
          ) : null}
          <Typography.Text style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            {battle.phase === 'victory' ? (
              <>Победа — пролистайте журнал.</>
            ) : (
              <>
                Ход:{' '}
                <strong>
                  {current
                    ? `${getUnitDisplay(current, campaign).emoji} ${getUnitDisplay(current, campaign).name}`
                    : '—'}
                </strong>
                {' · '}Раунд {battle.roundNumber}
              </>
            )}
            {' · '}
            <Tooltip title={worldPowerTooltip(battle.worldPower)} mouseEnterDelay={0.3}>
              <span>
                <span className="game-header__resource-emoji" aria-hidden>
                  {UI_WORLD_POWER}
                </span>{' '}
                {battle.worldPower}
              </span>
            </Tooltip>
          </Typography.Text>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ marginBottom: 4 }}>
              <Space align="center">
                <Switch
                  checked={autoBattleEnabled}
                  onChange={setAutoBattleEnabled}
                  disabled={battle.phase !== 'ongoing' || guidedActive}
                />
                <Typography.Text>
                  <RobotOutlined aria-hidden /> Автобой
                </Typography.Text>
              </Space>
            </div>
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Перемещение и базовая атака
              </Typography.Text>
              <Radio.Group
                value={basicMode}
                onChange={(e) => setMode(e.target.value as ActionMode)}
                disabled={actionsDisabled}
              >
                <Space wrap>
                  <Radio.Button value="move" disabled={actionsDisabled || guidedModeBlocked('move')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <DragOutlined aria-hidden />
                      {`Ход (≤${HERO_MOVE_RANGE}${UI_CELL})`}
                    </span>
                  </Radio.Button>
                  <Radio.Button value="melee" disabled={actionsDisabled || guidedModeBlocked('melee')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ThunderboltOutlined aria-hidden />
                      {`Удар (1${UI_CELL}) — ${HERO_BASIC_MELEE_DAMAGE}${UI_DAMAGE}`}
                    </span>
                  </Radio.Button>
                  <Radio.Button value="ranged" disabled={actionsDisabled || heroRangedOnCd || guidedModeBlocked('ranged')}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        ...(heroRangedOnCd ? { opacity: 0.5 } : undefined),
                      }}
                    >
                      <AimOutlined aria-hidden />
                      {`Выстрел (≤${effectiveRangedRange}${UI_CELL}) — ${HERO_BASIC_RANGED_DAMAGE}${UI_DAMAGE}${heroRangedOnCd ? ` · CD ${heroRangedCooldown}` : ''}`}
                    </span>
                  </Radio.Button>
                </Space>
              </Radio.Group>
              {actor && !autoBattleEnabled ? (
                <Button
                  style={{ marginTop: 8 }}
                  disabled={actionsDisabled || animationPlaying}
                  onClick={() => {
                    dispatchBattle({ type: 'end_turn' })
                    if (guidedActive && guidedBattleStep === 4) {
                      setGuidedBattleStep(5)
                    }
                  }}
                >
                  Завершить ход
                </Button>
              ) : null}
            </div>
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Умения
              </Typography.Text>
              {actorCards.length > 0 ? (
                <div className="battle-skill-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {actorCards.map((c) => (
                    <BattleSkillCell
                      key={c.id}
                      card={c}
                      character={actorCharacter!}
                      campaign={campaign}
                      actor={actor}
                      selected={mode === 'card' && selectedCardId === c.id}
                      disabled={actionsDisabled || guidedModeBlocked('card')}
                      onSelect={() => {
                        setMode('card')
                        setSelectedCardPickId(c.id)
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <ActorPassivesPanel
              passives={battle.passivesByUnitId?.[currentId ?? ''] ?? []}
              character={actorCharacter}
              campaign={campaign}
            />
          </Space>

          <div style={{ marginTop: 8 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              Журнал боя
            </Typography.Text>
            <div
              style={{
                marginTop: 8,
                maxHeight: 200,
                overflowY: 'auto',
                padding: 8,
                background: '#fafafa',
                border: '1px solid #eee',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              {battle.battleLog.length === 0 ? (
                <Typography.Text type="secondary">Пока пусто</Typography.Text>
              ) : (
                battle.battleLog.map((entry, i) => (
                  <BattleLogLine
                    key={i}
                    entry={entry}
                    unitSideLookup={unitSideLookup}
                    unitLogLookup={unitLogLookup}
                  />
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </GamePanel>
      </div>

      <HeroProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        mode="battle"
        campaign={campaign}
        battle={battle}
      />
    </Space>
  )
}
