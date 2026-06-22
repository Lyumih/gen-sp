import { Collapse, Divider, Typography } from 'antd'
import { buildBattleAttemptSnapshot } from '../../game/campaign/battleSnapshot'
import { computeCharacterMaxHpForScenario } from '../../game/campaign/heroMaxHp'
import { getCharacter } from '../../game/character/selectors'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import {
  equipmentSlotLabelRu,
  itemInstanceDescriptionLinesFromInstance,
} from '../../game/descriptions/itemText'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { aggregateGearCardLevelBonus, aggregateGearHpBonus } from '../../game/equipment/aggregates'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import { computeEffectiveStats } from '../../game/stats/effectiveStats'
import type { BattleState, CampaignState } from '../../game/types'
import { UI_DAMAGE, UI_HEART, UI_LEVEL } from '../../game/ui/labels'
import { StatStrip } from '../stats/StatStrip'
import { HeroAppearanceEditor } from './HeroAppearanceEditor'

export type HeroProfileContentProps = {
  mode: 'hub' | 'battle'
  campaign: CampaignState
  battle: BattleState | null
  /** Персонаж для отображения; по умолчанию — активный в отряде. */
  characterId?: string
  /** В хабе статы ⭐/🪙/⚡ уже в HUD — не дублировать. */
  includeResourceStats?: boolean
  /** Список надетых предметов (в хабе ниже — селекты экипировки). */
  includeEquipmentReadout?: boolean
  /** Collapse с деталями карт (в хабе — отдельный список карт). */
  includeCardsCollapse?: boolean
}

export function HeroProfileContent({
  mode,
  campaign,
  battle,
  characterId,
  includeResourceStats = true,
  includeEquipmentReadout = true,
  includeCardsCollapse = true,
}: HeroProfileContentProps) {
  const hero =
    (characterId !== undefined ? getCharacter(campaign, characterId) : undefined) ??
    getPrimaryCharacter(campaign)
  const hubSnapshot = buildBattleAttemptSnapshot(campaign, campaign.scenarioIndex)
  const hubScenario = SCENARIOS[campaign.scenarioIndex]

  const gearHpHub = aggregateGearHpBonus(hero.items, hero.equipment, getItemTemplate)
  const gearCardHub = aggregateGearCardLevelBonus(
    hero.items,
    hero.equipment,
    getItemTemplate,
  )

  const heroUnit = battle?.units.find((u) => u.side === 'player')
  const gearCardBattle = battle?.gearCardLevelBonus ?? 0

  const primaryMember = hubSnapshot.party[0]
  const expectedMaxHpHub =
    hubScenario !== undefined && primaryMember
      ? computeCharacterMaxHpForScenario(
          primaryMember,
          hubScenario,
          hubSnapshot.worldPower,
        )
      : null

  const effectiveHub = computeEffectiveStats(
    hero.baseStats,
    hero.unitLevel,
    campaign.worldPower,
    { health: gearHpHub },
  )

  return (
    <>
      <StatStrip
        baseStats={hero.baseStats}
        effectiveStats={mode === 'battle' && battle ? undefined : effectiveHub}
        baseStatRating={hero.baseStatRating}
        showRating
      />

      {mode === 'hub' ? (
        <HeroAppearanceEditor hero={hero} expeditionLocked={campaign.expedition !== null} />
      ) : null}

      {includeResourceStats ? (
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          Герой: {UI_LEVEL}
          <strong>{hero.unitLevel}</strong>
          <br />
          worldPower: <strong>{campaign.worldPower}</strong>
          <br />
          Золото: <strong>{campaign.gold}</strong>
        </Typography.Paragraph>
      ) : null}

      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        Бонусы экипировки: +{gearHpHub} к max {UI_HEART}, +{gearCardHub} к {UI_LEVEL} для {UI_DAMAGE}{' '}
        карт
        {mode === 'battle' && battle ? (
          <>
            <br />
            <span>
              (в этом бою снимок бонуса к {UI_DAMAGE} карт: <strong>{gearCardBattle}</strong>)
            </span>
          </>
        ) : null}
      </Typography.Paragraph>

      {mode === 'battle' && heroUnit ? (
        <Typography.Paragraph>
          {UI_HEART} в бою:{' '}
          <strong>
            {heroUnit.hp}/{heroUnit.maxHp}
          </strong>
        </Typography.Paragraph>
      ) : null}

      {mode === 'hub' && expectedMaxHpHub !== null ? (
        <Typography.Paragraph>
          Ожидаемый max {UI_HEART} в следующем бою: <strong>{expectedMaxHpHub}</strong>
        </Typography.Paragraph>
      ) : null}

      {mode === 'hub' && hubScenario === undefined ? (
        <Typography.Paragraph type="secondary">
          Сценариев для отображения ожидаемого {UI_HEART} нет.
        </Typography.Paragraph>
      ) : null}

      {includeEquipmentReadout ? (
        <>
          <Divider plain>Экипировка</Divider>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            {EQUIPMENT_ROLL_ORDER.map((slot) => {
              const itemId = hero.equipment[slot]
              if (itemId === null) {
                return (
                  <li key={slot}>
                    {equipmentSlotLabelRu(slot)}:{' '}
                    <Typography.Text type="secondary">пусто</Typography.Text>
                  </li>
                )
              }
              const inst = hero.items.find((i) => i.id === itemId)
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
        </>
      ) : null}

      {includeCardsCollapse ? (
        <>
          <Divider plain>Карты</Divider>
          <Collapse
            size="small"
            items={hero.cards.map((c) => {
              const gear =
                mode === 'battle' && battle ? battle.gearCardLevelBonus : gearCardHub
              const desc = describeCardCombatStats(c, gear)
              return {
                key: c.id,
                label: (
                  <span>
                    {getCardDisplayLabel(c.templateId)} — глоб. {UI_LEVEL}
                    {c.global_level}, использ. {c.uses_count}
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
        </>
      ) : null}
    </>
  )
}
