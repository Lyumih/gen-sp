import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Alert, App, Button, Card, Radio, Space, Typography } from 'antd'
import { useGameStore } from '../../store/gameStore'
import { formatBattleLogEntry } from '../../game/battle/battleLog'
import { getCurrentActorId } from '../../game/battle/reducer'
import { cellKey } from '../../game/battle/grid'
import { randomInt1to100 } from '../../game/rng'
import { pickEnemyAiAction } from './enemyAi'

type ActionMode = 'move' | 'melee' | 'ranged' | 'card'

const CELL_PX = 48

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
      title="Бой"
      extra={
        <Button type="default" danger onClick={confirmAbandon}>
          Выйти из боя
        </Button>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {battle.phase === 'defeat' && (
          <Alert
            type="error"
            message="Поражение"
            description="Начните бой заново — мета-прогресс без дюпа наград за прошлую попытку."
            action={
              <Button
                type="primary"
                danger
                onClick={() => dispatchRun({ type: 'RETRY_CURRENT_BATTLE' })}
              >
                Начать новый бой
              </Button>
            }
          />
        )}
        <Typography.Text>
          Ход:{' '}
          <strong>
            {current?.side === 'player' ? 'Герой' : current?.id ?? '—'}
          </strong>
          {' · '}worldPower (бой): {battle.worldPower}
        </Typography.Text>
        <div>
          <Typography.Text type="secondary">Действие героя: </Typography.Text>
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={battle.phase !== 'ongoing' || currentId !== hero?.id}
          >
            <Radio.Button value="move">Ход</Radio.Button>
            <Radio.Button value="melee">Удар (1 кл.)</Radio.Button>
            <Radio.Button value="ranged">Выстрел (≤6)</Radio.Button>
            <Radio.Button value="card">Карта (strike, %%)</Radio.Button>
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
              if (wall) inner = '█'
              else if (u?.id === 'hero') inner = '@'
              else if (u?.side === 'enemy') {
                inner = (
                  <span
                    style={{
                      fontSize: 9,
                      lineHeight: 1.15,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    <span>L{u.unitLevel}</span>
                    <span>
                      {u.hp}/{u.maxHp}
                    </span>
                  </span>
                )
              }
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onCellClick(x, y)}
                  style={{
                    width: CELL_PX,
                    height: CELL_PX,
                    padding: wall ? 0 : 2,
                    fontSize: wall ? 14 : 12,
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
