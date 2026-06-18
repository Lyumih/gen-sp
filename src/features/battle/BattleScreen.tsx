import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  AimOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DragOutlined,
  IdcardOutlined,
  LogoutOutlined,
  RedoOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Alert, App, Button, Card, Collapse, Radio, Space, Switch, Typography } from 'antd'
import { computeCardAttackDamage } from '../../game/content/cardAttackDamage'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_MAX_RANGE,
  HERO_MOVE_RANGE,
} from '../../game/battle/combat'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import { UI_CELL, UI_DAMAGE, UI_HEART, UI_LEVEL } from '../../game/ui/labels'
import { HeroProfileModal } from '../profile/HeroProfileModal'
import type { Unit } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { formatBattleLogEntry } from '../../game/battle/battleLog'
import { getCurrentActorId } from '../../game/battle/reducer'
import { cellKey, wallSet } from '../../game/battle/grid'
import {
  aggregateEnemyThreatCells,
  attackRangeCells,
  canCastAoEAt,
  castRangeCells,
  cellsInAoE,
  cellsInManhattanRange,
  enemyThreatCells,
  reachableMoveCells,
  validSingleTargetCells,
} from '../../game/battle/rangeOverlay'
import { occupiedEquipmentSlotsInOrder } from '../../game/equipment/equipmentOrder'
import { randomInt1to100 } from '../../game/rng'
import { cellBackgroundStyle, OVERLAY_LEGEND } from './cellOverlayStyle'
import { pickEnemyAiAction } from './enemyAi'
import { pickHeroAiAction } from './heroAi'
import './battle.css'

type ActionMode = 'move' | 'melee' | 'ranged' | 'card'

const CELL_PX = 58
const HERO_AI_DELAY_MS = 2000

const unitCellWrapStyle: CSSProperties = {
  fontSize: 10,
  lineHeight: 1.12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  width: '100%',
}

const unitCellEmojiStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1,
}

function BattleUnitCell({ unit, role }: { unit: Unit; role: 'player' | 'enemy' }) {
  const glyph = role === 'player' ? '🛡️' : '👾'
  return (
    <span style={unitCellWrapStyle}>
      <span style={unitCellEmojiStyle} aria-hidden>
        {glyph}
      </span>
      <span>
        {UI_LEVEL}
        {unit.unitLevel}
      </span>
      <span>
        {UI_HEART}
        {unit.hp}/{unit.maxHp}
      </span>
    </span>
  )
}

export function BattleScreen() {
  const { message, modal } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const modKillTargetCardId = campaign.modKillTargetCardId
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const dispatchBattle = useGameStore((s) => s.dispatchBattle)
  const autoBattleEnabled = useGameStore((s) => s.autoBattleEnabled)
  const setAutoBattleEnabled = useGameStore((s) => s.setAutoBattleEnabled)
  const battle = campaign.battle
  const [mode, setMode] = useState<ActionMode>('move')
  const [profileOpen, setProfileOpen] = useState(false)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [pendingAoeCell, setPendingAoeCell] = useState<{ x: number; y: number } | null>(null)
  const [explosionCells, setExplosionCells] = useState<Set<string>>(new Set())
  const logEndRef = useRef<HTMLDivElement>(null)

  const currentId = battle ? getCurrentActorId(battle) : undefined
  const current = battle?.units.find((u) => u.id === currentId)
  const hero = battle?.units.find((u) => u.side === 'player')

  useEffect(() => {
    if (!battle || battle.phase !== 'ongoing') return
    const actor = battle.units.find((u) => u.id === getCurrentActorId(battle))
    if (!actor || actor.side !== 'enemy') return
    const t = window.setTimeout(() => {
      const b = useGameStore.getState().campaign.battle
      if (!b || b.phase !== 'ongoing') return
      const act = pickEnemyAiAction(b)
      if (act) useGameStore.getState().dispatchBattle(act)
    }, 350)
    return () => window.clearTimeout(t)
  }, [battle])

  useEffect(() => {
    if (!autoBattleEnabled || !battle || battle.phase !== 'ongoing') return
    const actor = battle.units.find((u) => u.id === getCurrentActorId(battle))
    if (!actor || actor.side !== 'player') return
    const t = window.setTimeout(() => {
      const store = useGameStore.getState()
      const b = store.campaign.battle
      if (!b || b.phase !== 'ongoing' || !store.autoBattleEnabled) return
      const decision = pickHeroAiAction(b)
      if (!decision) return
      if (decision.kind === 'battle') {
        store.dispatchBattle(decision.action)
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
  }, [battle, autoBattleEnabled])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [battle?.battleLog.length])

  useEffect(() => {
    if (!battle || battle.playerCards.length === 0) {
      setSelectedCardId(null)
      return
    }
    setSelectedCardId((prev) => {
      if (prev !== null && battle.playerCards.some((c) => c.id === prev)) return prev
      return battle.playerCards[0]!.id
    })
  }, [battle?.playerCards])

  useEffect(() => {
    setPendingAoeCell(null)
  }, [mode, selectedCardId])

  const overlayActive = Boolean(
    battle &&
      battle.phase === 'ongoing' &&
      !autoBattleEnabled &&
      hero &&
      currentId === hero.id,
  )

  const selectedCard = battle?.playerCards.find((c) => c.id === selectedCardId)
  const selectedCardTemplate = selectedCard
    ? getCardAttackTemplate(selectedCard.templateId)
    : undefined

  const overlaySets = useMemo(() => {
    if (!battle || !hero || !overlayActive) {
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
      moveCells = reachableMoveCells(battle, hero.id)
    } else if (mode === 'melee') {
      actionRangeCells = cellsInManhattanRange(
        hero.x,
        hero.y,
        1,
        1,
        battle.width,
        battle.height,
      )
      validTargetCells = validSingleTargetCells(battle, hero.x, hero.y, 'melee', 1)
    } else if (mode === 'ranged') {
      actionRangeCells = attackRangeCells(battle, hero.x, hero.y, HERO_BASIC_RANGED_MAX_RANGE)
      validTargetCells = validSingleTargetCells(
        battle,
        hero.x,
        hero.y,
        'ranged',
        HERO_BASIC_RANGED_MAX_RANGE,
      )
    } else if (mode === 'card' && selectedCardTemplate) {
      if (selectedCardTemplate.kind === 'aoe') {
        actionRangeCells = castRangeCells(battle, hero.x, hero.y, selectedCardTemplate.maxRange)
      } else if (selectedCardTemplate.kind === 'melee') {
        actionRangeCells = cellsInManhattanRange(
          hero.x,
          hero.y,
          1,
          1,
          battle.width,
          battle.height,
        )
        validTargetCells = validSingleTargetCells(battle, hero.x, hero.y, 'melee', 1)
      } else {
        actionRangeCells = attackRangeCells(battle, hero.x, hero.y, selectedCardTemplate.maxRange)
        validTargetCells = validSingleTargetCells(
          battle,
          hero.x,
          hero.y,
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
        hero,
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
    hero,
    overlayActive,
    mode,
    hoveredEnemyId,
    hoverCell,
    selectedCardTemplate,
    pendingAoeCell,
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

  const walls = new Set(battle.walls)
  const unitAt = (x: number, y: number) =>
    battle.units.find((u) => u.hp > 0 && u.x === x && u.y === y)

  const unitsHealthOrder = [...battle.units].sort((a, b) => {
    if (a.side === 'player' && b.side !== 'player') return -1
    if (a.side !== 'player' && b.side === 'player') return 1
    return 0
  })

  const actionsDisabled =
    battle.phase !== 'ongoing' || currentId !== hero?.id || autoBattleEnabled
  const basicMode: ActionMode | undefined =
    mode === 'move' || mode === 'melee' || mode === 'ranged' ? mode : undefined

  const finalizeVictoryToHub = () => {
    const n = occupiedEquipmentSlotsInOrder(campaign.equipment).length
    const rolls = Array.from({ length: n }, () => randomInt1to100())
    dispatchRun({
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: rolls,
      playerUnitLevelRoll: randomInt1to100(),
    })
  }

  const confirmAbandon = () => {
    modal.confirm({
      title: 'Выйти из боя?',
      content:
        'Прогресс этого боя будет потерян. Мета-прогресс вернётся к состоянию на начало попытки; награды за незавершённый бой не начислятся.',
      okText: 'Выйти',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => dispatchRun({ type: 'ABANDON_BATTLE' }),
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
    if (!hero || currentId !== hero.id) {
      message.info('Сейчас ход противника')
      return
    }
    const target = unitAt(x, y)
    if (mode === 'move') {
      if (target) {
        message.warning('Клетка занята')
        return
      }
      if (!overlaySets.moveCells.has(cellKey(x, y))) {
        message.warning('Недоступная клетка')
        return
      }
      dispatchBattle({ type: 'move', unitId: hero.id, toX: x, toY: y })
      return
    }
    if (mode === 'card') {
      const card = battle.playerCards.find((c) => c.id === selectedCardId)
      if (!card) {
        message.warning('Нет карт в бою')
        return
      }
      const tmpl = getCardAttackTemplate(card.templateId)
      if (!tmpl) return
      if (tmpl.kind === 'aoe') {
        const walls = wallSet(battle.walls)
        if (!canCastAoEAt(hero, x, y, tmpl.maxRange, walls)) {
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
        attackerId: hero.id,
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
    dispatchBattle({
      type: 'attack',
      attackerId: hero.id,
      targetId: target.id,
      damage: HERO_BASIC_RANGED_DAMAGE,
      kind: 'ranged',
      maxRange: HERO_BASIC_RANGED_MAX_RANGE,
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

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ThunderboltOutlined aria-hidden />
          Бой
        </span>
      }
      extra={
        <Space wrap>
          <Button
            type="default"
            icon={<IdcardOutlined aria-hidden />}
            aria-label="Профиль героя"
            onClick={() => setProfileOpen(true)}
          >
            Профиль героя
          </Button>
          {battle.phase === 'ongoing' || battle.phase === 'defeat' ? (
            <Button type="default" danger icon={<LogoutOutlined />} onClick={confirmAbandon}>
              Выйти из боя
            </Button>
          ) : null}
        </Space>
      }
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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
        {battle.phase === 'victory' && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            title="Победа"
            description="Просмотрите журнал и поле боя. Награды кампании и переход дальше произойдут только после вашего выбора."
            action={
              <Space>
                <Button type="primary" onClick={finalizeVictoryToHub}>
                  Продолжить
                </Button>
                <Button onClick={finalizeVictoryToHub}>Закончить</Button>
              </Space>
            }
          />
        )}
        <Typography.Text>
          {battle.phase === 'victory' ? (
            <>
              Победа — можно пролистать журнал ниже.
              {' · '}
              <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
                ⚡
              </span>{' '}
              worldPower (бой): {battle.worldPower}
            </>
          ) : (
            <>
              Ход:{' '}
              <strong>
                {current?.side === 'player' ? 'Герой' : current?.id ?? '—'}
              </strong>
              {' · '}
              <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
                ⚡
              </span>{' '}
              worldPower (бой): {battle.worldPower}
            </>
          )}
        </Typography.Text>

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
            Здоровье героя и врагов
          </Typography.Text>
          <Space wrap>
            {unitsHealthOrder.map((u) => (
              <Typography.Text key={u.id}>
                {u.side === 'player' ? 'Герой' : u.id}: {UI_HEART} {u.hp}/{u.maxHp}
              </Typography.Text>
            ))}
          </Space>
        </div>

        <div
          onMouseLeave={handleGridMouseLeave}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${battle.width}, ${CELL_PX}px)`,
            gap: 4,
          }}
        >
          {gridCells.flatMap((row) =>
            row.map(({ x, y }) => {
              const k = cellKey(x, y)
              const u = unitAt(x, y)
              const wall = walls.has(k)
              let inner: ReactNode = '·'
              if (wall)
                inner = (
                  <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>
                    🧱
                  </span>
                )
              else if (u?.side === 'player') inner = <BattleUnitCell unit={u} role="player" />
              else if (u?.side === 'enemy') inner = <BattleUnitCell unit={u} role="enemy" />

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

              return (
                <button
                  key={k}
                  type="button"
                  className={`${isExploding ? 'battle-cell-explosion' : ''}${isPendingAoe ? ' battle-cell-aoe-pending' : ''}`}
                  onClick={() => onCellClick(x, y)}
                  onMouseEnter={() => handleCellMouseEnter(x, y)}
                  style={{
                    width: CELL_PX,
                    height: CELL_PX,
                    padding: wall ? 0 : 2,
                    fontSize: wall ? undefined : 12,
                    cursor: wall ? 'default' : 'pointer',
                    border: '1px solid #ccc',
                    ...cellStyle,
                  }}
                >
                  {inner}
                </button>
              )
            }),
          )}
        </div>

        {overlayActive && (
          <Space wrap size="small">
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

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
            Действия героя
          </Typography.Text>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ marginBottom: 4 }}>
              <Space align="center">
                <Switch
                  checked={autoBattleEnabled}
                  onChange={setAutoBattleEnabled}
                  disabled={battle.phase !== 'ongoing'}
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
                  <Radio.Button value="move">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <DragOutlined aria-hidden />
                      {`Ход (≤${HERO_MOVE_RANGE}${UI_CELL})`}
                    </span>
                  </Radio.Button>
                  <Radio.Button value="melee">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ThunderboltOutlined aria-hidden />
                      {`Удар (1${UI_CELL}) — ${HERO_BASIC_MELEE_DAMAGE}${UI_DAMAGE}`}
                    </span>
                  </Radio.Button>
                  <Radio.Button value="ranged">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <AimOutlined aria-hidden />
                      {`Выстрел (≤${HERO_BASIC_RANGED_MAX_RANGE}${UI_CELL}) — ${HERO_BASIC_RANGED_DAMAGE}${UI_DAMAGE}`}
                    </span>
                  </Radio.Button>
                </Space>
              </Radio.Group>
            </div>
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Умения и карты
              </Typography.Text>
              <Space wrap align="center">
                <Radio.Group
                  value={mode === 'card' ? selectedCardId : undefined}
                  onChange={(e) => {
                    setMode('card')
                    setSelectedCardId(e.target.value)
                  }}
                  disabled={actionsDisabled || battle.playerCards.length === 0}
                >
                  {battle.playerCards.map((c) => {
                    const tmpl = getCardAttackTemplate(c.templateId)
                    const dmg =
                      tmpl !== undefined
                        ? computeCardAttackDamage(
                            tmpl,
                            c.global_level + battle.gearCardLevelBonus,
                          )
                        : null
                    const aoeHint =
                      tmpl?.kind === 'aoe' && tmpl.aoeSize !== undefined
                        ? ` · AoE ${tmpl.aoeSize}×${tmpl.aoeSize}`
                        : ''
                    return (
                      <Radio.Button key={c.id} value={c.id}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <CreditCardOutlined aria-hidden />
                          {`${getCardDisplayLabel(c.templateId)}${dmg !== null ? ` — ${String(dmg)}${UI_DAMAGE}` : ''}${aoeHint}`}
                        </span>
                      </Radio.Button>
                    )
                  })}
                </Radio.Group>
                {battle.playerCards.map((c) => {
                  const tmpl = getCardAttackTemplate(c.templateId)
                  const dmg =
                    tmpl !== undefined
                      ? computeCardAttackDamage(
                          tmpl,
                          c.global_level + battle.gearCardLevelBonus,
                        )
                      : null
                  return (
                    <Typography.Text key={c.id} type="secondary" style={{ fontSize: 12 }}>
                      {getCardDisplayLabel(c.templateId)} {UI_LEVEL}
                      {c.global_level}
                      {dmg !== null ? ` · ${String(dmg)}${UI_DAMAGE}` : ''}
                      {c.id === modKillTargetCardId ? ' 🎯' : ''}
                    </Typography.Text>
                  )
                })}
              </Space>
            </div>
          </Space>
        </div>

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
            <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
              🃏
            </span>{' '}
            Карты
          </Typography.Text>
          {battle.playerCards.length === 0 ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : (
            <Collapse
              size="small"
              items={battle.playerCards.map((c) => {
                const desc = describeCardCombatStats(c, battle.gearCardLevelBonus)
                const tmpl = getCardAttackTemplate(c.templateId)
                const dmg =
                  tmpl !== undefined
                    ? computeCardAttackDamage(
                        tmpl,
                        c.global_level + battle.gearCardLevelBonus,
                      )
                    : null
                return {
                  key: c.id,
                  label: (
                    <span style={{ fontSize: 13 }}>
                      {getCardDisplayLabel(c.templateId)} {UI_LEVEL}
                      {c.global_level} · использ. {c.uses_count}
                      {dmg !== null ? ` · ${String(dmg)}${UI_DAMAGE}` : ''}
                      {c.id === modKillTargetCardId ? ' 🎯' : ''}
                    </span>
                  ),
                  children: (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {desc.lines.map((line, i) => (
                        <li key={i}>
                          <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
                        </li>
                      ))}
                    </ul>
                  ),
                }
              })}
            />
          )}
        </div>

        <div>
          <Typography.Text strong>Журнал боя</Typography.Text>
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
                <div key={i} style={{ marginBottom: 4 }}>
                  {formatBattleLogEntry(entry)}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </Space>
      <HeroProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        mode="battle"
        campaign={campaign}
        battle={battle}
      />
    </Card>
  )
}
