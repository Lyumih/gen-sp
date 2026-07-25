import { Button, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { describeRaceResistLines } from '../../game/descriptions/enemyText'
import type { CampaignState } from '../../game/types'
import { UI_HEART, UI_MANA } from '../../game/ui/labels'
import { GameScrollX } from '../layout/GameScrollX'
import { StatStrip } from '../stats/StatStrip'
import type { BattleUnitInspectModel } from './battleInspectModel'
import { BattlePassivesRow } from './BattlePassivesRow'
import { BattleSkillCell } from './BattleSkillCell'

export function BattleInspectPanel(props: {
  model: BattleUnitInspectModel
  campaign: CampaignState
  onClose: () => void
}) {
  const { model, campaign, onClose } = props
  const { unit, display, baseStats, effectiveStats, cards, passives, syntheticCarrier } = model
  const raceResistLines = unit.raceId ? describeRaceResistLines(unit.raceId) : []
  const bg = unit.side === 'enemy' ? '#fff1f0' : '#e6f4ff'

  return (
    <div
      className="battle-inspect-panel"
      style={{
        marginBottom: 8,
        padding: '8px 10px',
        borderRadius: 6,
        borderLeft: `3px solid ${unit.side === 'enemy' ? '#cf1322' : '#1677ff'}`,
        background: bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          Осмотр: {display.emoji} {display.name}
        </Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined aria-hidden />}
          aria-label="Закрыть осмотр"
          onClick={onClose}
        />
      </div>
      <div style={{ marginTop: 6 }}>
        <StatStrip baseStats={baseStats} effectiveStats={effectiveStats} />
      </div>
      {raceResistLines.length > 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          {raceResistLines.join(' · ')}
        </Typography.Text>
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
        {UI_HEART} в бою: {unit.hp}/{unit.maxHp}
        {unit.mana !== undefined && unit.maxMana !== undefined
          ? ` · ${UI_MANA}${unit.mana}/${unit.maxMana}`
          : ''}
      </Typography.Text>
      {unit.statusEffects && unit.statusEffects.length > 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          Статусы:{' '}
          {unit.statusEffects
            .map((s) => `${s.kind}${s.remainingTurns !== undefined ? ` (${s.remainingTurns})` : ''}`)
            .join(', ')}
        </Typography.Text>
      ) : null}
      {cards.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
            Умения
          </Typography.Text>
          <GameScrollX>
            <div className="battle-skill-row" style={{ display: 'flex', flexWrap: 'nowrap', gap: 4 }}>
              {cards.map((c) => (
                <BattleSkillCell
                  key={c.id}
                  card={c}
                  character={syntheticCarrier}
                  campaign={campaign}
                  actor={unit}
                  selected={false}
                  disabled
                  readOnly
                />
              ))}
            </div>
          </GameScrollX>
        </div>
      ) : null}
      <BattlePassivesRow
        passives={passives}
        carrier={syntheticCarrier}
        campaign={campaign}
        sectionLabel="Пассивные навыки"
      />
    </div>
  )
}
