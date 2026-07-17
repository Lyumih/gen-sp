import { Badge, Typography } from 'antd'
import { getUnitDisplay } from '../../game/character/display'
import { unitCombatMiniStats } from '../../game/battle/unitCombatStats'
import { turnBadgeLabel } from '../../game/battle/turnBadge'
import { computeEffectiveStats, computeGearStatBonuses } from '../../game/stats/effectiveStats'
import { aggregatePassiveSkillStatBonuses } from '../../game/passives/passiveStatBonuses'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, Unit } from '../../game/types'
import { GameScrollX } from '../layout/GameScrollX'
import { BattleUnitTooltip } from './BattleUnitTooltip'
import { UnitToken } from './UnitToken'

export function TurnOrderStrip({
  turnOrder,
  currentTurnIndex,
  units,
  campaign,
  worldPower,
  highlightedUnitId,
  onHighlight,
}: {
  turnOrder: readonly string[]
  currentTurnIndex: number
  units: readonly Unit[]
  campaign: CampaignState
  worldPower: number
  highlightedUnitId?: string | null
  onHighlight?: (unitId: string | null) => void
}) {
  if (turnOrder.length === 0) {
    return <Typography.Text type="secondary">Очередь пуста</Typography.Text>
  }

  const isAlive = (id: string) => {
    const u = units.find((x) => x.id === id)
    return u !== undefined && u.hp > 0
  }

  return (
    <GameScrollX>
      <div
        role="list"
        aria-label="Очерёдность хода"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 6,
          alignItems: 'center',
        }}
      >
        {turnOrder.map((unitId, index) => {
          const unit = units.find((u) => u.id === unitId)
          const isCurrent = unitId === turnOrder[currentTurnIndex % turnOrder.length]
          const isDead = unit !== undefined && unit.hp <= 0
          const display = unit
            ? getUnitDisplay(unit, campaign)
            : { name: unitId, emoji: '❓', accent: 'default' as const }
          const badge = unit ? turnBadgeLabel(unit.id, turnOrder, currentTurnIndex, isAlive) : null
          const combatStats = unit ? unitCombatMiniStats(unit, campaign, worldPower) : null

          const chip = (
            <span style={{ position: 'relative', display: 'inline-block' }}>
              {badge ? (
                <Badge count={badge} color="#1677ff" className="battle-cell__turn-badge" />
              ) : null}
              <UnitToken
                variant="initiative"
                display={display}
                combatStats={combatStats}
                hp={unit?.hp}
                maxHp={unit?.maxHp}
                isCurrentActor={isCurrent}
                isDead={isDead}
                highlighted={highlightedUnitId === unitId}
                onMouseEnter={() => onHighlight?.(unitId)}
                onMouseLeave={() => onHighlight?.(null)}
              />
            </span>
          )

          let tooltipWrappedChip = chip
          if (unit?.baseStats) {
            const character = campaign.characters.find((c) => c.id === unit.id)
            const gearBonuses = character
              ? computeGearStatBonuses(character.items, character.equipment, getItemTemplate)
              : {}
            const passiveBonuses = character
              ? aggregatePassiveSkillStatBonuses(
                  character.passives,
                  character.passiveEquip,
                  unit.baseStats,
                )
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

            tooltipWrappedChip = (
              <BattleUnitTooltip
                display={display}
                baseStats={unit.baseStats}
                effectiveStats={effective}
                hp={unit.hp}
                maxHp={unit.maxHp}
                raceId={unit.raceId}
              >
                {chip}
              </BattleUnitTooltip>
            )
          }

          return (
            <span key={`${unitId}-${index}`} role="listitem" style={{ flex: '0 0 auto' }}>
              {tooltipWrappedChip}
              {index < turnOrder.length - 1 ? (
                <Typography.Text type="secondary" style={{ margin: '0 2px', fontSize: 11 }}>
                  →
                </Typography.Text>
              ) : null}
            </span>
          )
        })}
      </div>
    </GameScrollX>
  )
}
