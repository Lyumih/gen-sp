import { Typography } from 'antd'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import { getUnitDisplay } from '../../game/character/display'
import type { BattleState, CampaignState, Unit } from '../../game/types'
import { UI_HEART, UI_LEVEL, UI_MANA } from '../../game/ui/labels'
import { StatStrip } from '../stats/StatStrip'
import { unitBattleEffectiveStats } from '../../game/battle/unitBattleEffectiveStats'

export function BattleActorBar(props: {
  campaign: CampaignState
  battle: BattleState
  actorUnit: Unit | undefined
  showEnemyTurnHint: boolean
}) {
  const { campaign, battle, actorUnit, showEnemyTurnHint } = props
  const fallbackId = getPrimaryCharacter(campaign).id
  const unit =
    actorUnit ??
    battle.units.find((u) => u.id === fallbackId && u.side === 'player') ??
    battle.units.find((u) => u.side === 'player' && u.hp > 0)
  if (!unit?.baseStats) return null
  const stats = unitBattleEffectiveStats(battle, unit, campaign)
  if (!stats) return null
  const display = getUnitDisplay(unit, campaign)

  return (
    <div className="battle-actor-bar" style={{ marginBottom: 8 }}>
      <Typography.Text style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        {display.emoji} <strong>{display.name}</strong>
        {' · '}
        {UI_LEVEL}
        {unit.unitLevel}
        {' · '}
        {UI_HEART}
        {unit.hp}/{unit.maxHp}
        {unit.mana !== undefined && unit.maxMana !== undefined ? (
          <>
            {' · '}
            {UI_MANA}
            {unit.mana}/{unit.maxMana}
          </>
        ) : null}
        {showEnemyTurnHint ? (
          <Typography.Text type="secondary"> · ход противника</Typography.Text>
        ) : null}
      </Typography.Text>
      <StatStrip baseStats={stats.base} effectiveStats={stats.effective} />
    </div>
  )
}
