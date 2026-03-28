import { Collapse, Divider, Modal, Typography } from 'antd'
import { buildBattleAttemptSnapshot } from '../../game/campaign/battleSnapshot'
import { computeHeroMaxHpForScenario } from '../../game/campaign/heroMaxHp'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import {
  equipmentSlotLabelRu,
  itemInstanceDescriptionLinesFromInstance,
} from '../../game/descriptions/itemText'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { aggregateGearCardLevelBonus, aggregateGearHpBonus } from '../../game/equipment/aggregates'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import type { BattleState, CampaignState } from '../../game/types'

export type HeroProfileModalProps = {
  open: boolean
  onClose: () => void
  mode: 'hub' | 'battle'
  campaign: CampaignState
  /** В режиме `battle` передать текущий бой. */
  battle: BattleState | null
}

export function HeroProfileModal({
  open,
  onClose,
  mode,
  campaign,
  battle,
}: HeroProfileModalProps) {
  const hubSnapshot = buildBattleAttemptSnapshot(campaign, campaign.scenarioIndex)
  const hubScenario = SCENARIOS[campaign.scenarioIndex]

  const gearHpHub = aggregateGearHpBonus(campaign.items, campaign.equipment, getItemTemplate)
  const gearCardHub = aggregateGearCardLevelBonus(
    campaign.items,
    campaign.equipment,
    getItemTemplate,
  )

  const heroUnit = battle?.units.find((u) => u.side === 'player')
  const gearCardBattle = battle?.gearCardLevelBonus ?? 0

  const expectedMaxHpHub =
    hubScenario !== undefined
      ? computeHeroMaxHpForScenario(hubSnapshot, hubScenario)
      : null

  return (
    <Modal
      title="Профиль героя"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        Уровень героя: <strong>{campaign.playerUnitLevel}</strong>
        <br />
        worldPower: <strong>{campaign.worldPower}</strong>
        <br />
        Золото: <strong>{campaign.gold}</strong>
      </Typography.Paragraph>

      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        Бонусы экипировки: +{gearHpHub} к max HP, +{gearCardHub} к уровню для урона карт
        {mode === 'battle' && battle ? (
          <>
            <br />
            <span>
              (в этом бою снимок бонуса к урону карт: <strong>{gearCardBattle}</strong>)
            </span>
          </>
        ) : null}
      </Typography.Paragraph>

      {mode === 'battle' && heroUnit ? (
        <Typography.Paragraph>
          HP в бою:{' '}
          <strong>
            {heroUnit.hp}/{heroUnit.maxHp}
          </strong>
        </Typography.Paragraph>
      ) : null}

      {mode === 'hub' && expectedMaxHpHub !== null ? (
        <Typography.Paragraph>
          Ожидаемый max HP в следующем бою: <strong>{expectedMaxHpHub}</strong>
        </Typography.Paragraph>
      ) : null}

      {mode === 'hub' && hubScenario === undefined ? (
        <Typography.Paragraph type="secondary">Сценариев для отображения ожидаемого HP нет.</Typography.Paragraph>
      ) : null}

      <Divider plain>Экипировка</Divider>
      <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
        {EQUIPMENT_ROLL_ORDER.map((slot) => {
          const itemId = campaign.equipment[slot]
          if (itemId === null) {
            return (
              <li key={slot}>
                {equipmentSlotLabelRu(slot)}: <Typography.Text type="secondary">пусто</Typography.Text>
              </li>
            )
          }
          const inst = campaign.items.find((i) => i.id === itemId)
          if (!inst) {
            return (
              <li key={slot}>
                {equipmentSlotLabelRu(slot)}: битая ссылка ({itemId})
              </li>
            )
          }
          const lines = itemInstanceDescriptionLinesFromInstance(inst, getItemTemplate)
          return (
            <li key={slot} style={{ marginBottom: 8 }}>
              <Typography.Text strong>{equipmentSlotLabelRu(slot)}</Typography.Text>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {lines.map((line, i) => (
                  <li key={i}>
                    <Typography.Text style={{ fontSize: 13 }}>{line}</Typography.Text>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      <Divider plain>Карты</Divider>
      <Collapse
        size="small"
        items={campaign.cards.map((c) => {
          const gear =
            mode === 'battle' && battle ? battle.gearCardLevelBonus : gearCardHub
          const desc = describeCardCombatStats(c, gear)
          return {
            key: c.id,
            label: (
              <span>
                {getCardDisplayLabel(c.templateId)} — глоб. ур. {c.global_level}, использ.{' '}
                {c.uses_count}
              </span>
            ),
            children: (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {desc.lines.map((line, i) => (
                  <li key={i}>
                    <Typography.Text style={{ fontSize: 13 }}>{line}</Typography.Text>
                  </li>
                ))}
              </ul>
            ),
          }
        })}
      />
    </Modal>
  )
}
