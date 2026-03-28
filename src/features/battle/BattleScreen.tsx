import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  AimOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DragOutlined,
  LogoutOutlined,
  RedoOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Alert, App, Button, Card, Radio, Space, Typography } from 'antd'
import type { Unit } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { formatBattleLogEntry } from '../../game/battle/battleLog'
import { getCurrentActorId } from '../../game/battle/reducer'
import { cellKey } from '../../game/battle/grid'
import { occupiedEquipmentSlotsInOrder } from '../../game/equipment/equipmentOrder'
import { randomInt1to100 } from '../../game/rng'
import { pickEnemyAiAction } from './enemyAi'

type ActionMode = 'move' | 'melee' | 'ranged' | 'card'

const CELL_PX = 58

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
      <span>L{unit.unitLevel}</span>
      <span>
        {unit.hp}/{unit.maxHp}
      </span>
    </span>
  )
}

export function BattleScreen() {
  const { message, modal } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const dispatchBattle = useGameStore((s) => s.dispatchBattle)
  const battle = campaign.battle
  const [mode, setMode] = useState<ActionMode>('move')
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
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [battle?.battleLog.length])

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

  const finalizeVictoryToHub = () => {
    const n = occupiedEquipmentSlotsInOrder(campaign.equipment).length
    const rolls = Array.from({ length: n }, () => randomInt1to100())
    dispatchRun({ type: 'FINALIZE_VICTORY', itemLevelRolls: rolls })
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

  const onCellClick = (x: number, y: number) => {
    if (battle.phase !== 'ongoing') return
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
      dispatchBattle({ type: 'move', unitId: hero.id, toX: x, toY: y })
      return
    }
    if (!target || target.side !== 'enemy') {
      message.warning('Выберите врага')
      return
    }
    if (mode === 'melee') {
      dispatchBattle({
        type: 'attack',
        attackerId: hero.id,
        targetId: target.id,
        damage: 5,
        kind: 'melee',
      })
      return
    }
    if (mode === 'card') {
      const card = battle.playerCards[0]
      if (!card) {
        message.warning('Нет карт в бою')
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
    dispatchBattle({
      type: 'attack',
      attackerId: hero.id,
      targetId: target.id,
      damage: 4,
      kind: 'ranged',
      maxRange: 6,
    })
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
        battle.phase === 'ongoing' || battle.phase === 'defeat' ? (
          <Button type="default" danger icon={<LogoutOutlined />} onClick={confirmAbandon}>
            Выйти из боя
          </Button>
        ) : undefined
      }
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {battle.phase === 'defeat' && (
          <Alert
            type="error"
            message="Поражение"
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
            message="Победа"
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
          <Typography.Text type="secondary">Действие героя: </Typography.Text>
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={battle.phase !== 'ongoing' || currentId !== hero?.id}
          >
            <Radio.Button value="move">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <DragOutlined aria-hidden />
                Ход
              </span>
            </Radio.Button>
            <Radio.Button value="melee">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ThunderboltOutlined aria-hidden />
                Удар (1 кл.)
              </span>
            </Radio.Button>
            <Radio.Button value="ranged">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AimOutlined aria-hidden />
                Выстрел (≤6)
              </span>
            </Radio.Button>
            <Radio.Button value="card">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CreditCardOutlined aria-hidden />
                Карта (strike, %%)
              </span>
            </Radio.Button>
          </Radio.Group>
        </div>
        <div
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
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onCellClick(x, y)}
                  style={{
                    width: CELL_PX,
                    height: CELL_PX,
                    padding: wall ? 0 : 2,
                    fontSize: wall ? undefined : 12,
                    cursor: wall ? 'default' : 'pointer',
                    background: wall ? '#333' : '#f5f5f5',
                    color: wall ? '#fff' : '#000',
                    border: '1px solid #ccc',
                  }}
                >
                  {inner}
                </button>
              )
            }),
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
        <Space wrap>
          {battle.units.map((u) => (
            <Typography.Text key={u.id}>
              {u.id}: HP {u.hp}/{u.maxHp}
            </Typography.Text>
          ))}
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            🃏
          </span>{' '}
          Карты:{' '}
          {battle.playerCards
            .map(
              (c) =>
                `${c.templateId} L${c.global_level} · использ. ${c.uses_count}`,
            )
            .join(', ') || '—'}
        </Typography.Text>
      </Space>
    </Card>
  )
}
