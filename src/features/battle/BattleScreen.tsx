import { useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Radio, Space, Typography } from 'antd'
import { useGameStore } from '../../store/gameStore'
import { getCurrentActorId } from '../../game/battle/reducer'
import { cellKey } from '../../game/battle/grid'
import { pickEnemyAiAction } from './enemyAi'

type ActionMode = 'move' | 'melee' | 'ranged'

export function BattleScreen() {
  const { message } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const dispatchBattle = useGameStore((s) => s.dispatchBattle)
  const battle = campaign.battle
  const [mode, setMode] = useState<ActionMode>('move')

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
    <Card title="Бой">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {battle.phase === 'defeat' && (
          <Alert
            type="error"
            message="Поражение"
            description="Повторите бой — мета-прогресс без дюпа наград за прошлую попытку."
            action={
              <Button
                type="primary"
                danger
                onClick={() => dispatchRun({ type: 'RETRY_CURRENT_BATTLE' })}
              >
                Повторить бой
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
          </Radio.Group>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${battle.width}, 36px)`,
            gap: 4,
          }}
        >
          {gridCells.flatMap((row) =>
            row.map(({ x, y }) => {
              const k = cellKey(x, y)
              const u = unitAt(x, y)
              const wall = walls.has(k)
              let label = '·'
              if (wall) label = '█'
              else if (u?.id === 'hero') label = '@'
              else if (u) label = 'E'
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onCellClick(x, y)}
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    fontSize: 14,
                    cursor: wall ? 'default' : 'pointer',
                    background: wall ? '#333' : '#f5f5f5',
                    color: wall ? '#fff' : '#000',
                    border: '1px solid #ccc',
                  }}
                >
                  {label}
                </button>
              )
            }),
          )}
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
            .map((c) => `${c.templateId} L${c.global_level}`)
            .join(', ') || '—'}
        </Typography.Text>
      </Space>
    </Card>
  )
}
