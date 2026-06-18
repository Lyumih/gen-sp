import { Button, Divider, Popover, Select, Space, Typography } from 'antd'
import { HeroProfileContent } from '../profile/HeroProfileContent'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemSelectShortLabel,
} from '../../game/descriptions/itemText'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { aggregateGearCardLevelBonus } from '../../game/equipment/aggregates'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { UI_DAMAGE, UI_LEVEL } from '../../game/ui/labels'
import { getStashItems, itemsSelectableForSlot, SLOT_LABEL } from './campaignHubShared'
import { CampaignStashLine } from './CampaignStashLine'

type CampaignCharacterTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onEquip: (itemId: string, slot: EquipmentSlot) => void
  onUnequip: (slot: EquipmentSlot) => void
}

export function CampaignCharacterTab({
  campaign,
  inBattle,
  onEquip,
  onUnequip,
}: CampaignCharacterTabProps) {
  const stash = getStashItems(campaign)
  const gearCardPreview = aggregateGearCardLevelBonus(
    campaign.items,
    campaign.equipment,
    getItemTemplate,
  )

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <HeroProfileContent
        mode="hub"
        campaign={campaign}
        battle={null}
        includeResourceStats={false}
        includeEquipmentReadout={false}
        includeCardsCollapse={false}
      />

      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Инвентарь и экипировка
      </Typography.Title>
      <Divider style={{ margin: '8px 0 16px' }} />
      <CampaignStashLine stash={stash} />
      <Space orientation="vertical" style={{ width: '100%' }} size="small">
        {EQUIPMENT_ROLL_ORDER.map((slot) => {
          const choices = itemsSelectableForSlot(campaign, slot)
          const equippedId = campaign.equipment[slot]
          const equippedInst =
            equippedId !== null ? campaign.items.find((x) => x.id === equippedId) : undefined
          const equippedTmpl =
            equippedInst !== undefined ? getItemTemplate(equippedInst.templateId) : undefined
          const popoverContent =
            equippedInst && equippedTmpl ? (
              <ul style={{ margin: 0, paddingLeft: 16, maxWidth: 320 }}>
                {itemInstanceDescriptionLinesFromInstance(equippedInst, getItemTemplate).map(
                  (line, idx) => (
                    <li key={idx}>
                      <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
                    </li>
                  ),
                )}
              </ul>
            ) : null

          return (
            <div key={slot}>
              <Typography.Text style={{ marginRight: 8 }}>{SLOT_LABEL[slot]}:</Typography.Text>
              <Select
                aria-label={`Экипировка: ${SLOT_LABEL[slot]}`}
                style={{ minWidth: 260 }}
                disabled={inBattle}
                allowClear
                placeholder="—"
                value={campaign.equipment[slot] ?? undefined}
                options={choices.map((i) => {
                  const tmpl = getItemTemplate(i.templateId)
                  const label = tmpl
                    ? itemSelectShortLabel(tmpl, i.itemLevel)
                    : `${i.templateId} (${UI_LEVEL}${i.itemLevel})`
                  return { value: i.id, label }
                })}
                onChange={(v) => {
                  if (v == null || v === '') {
                    onUnequip(slot)
                  } else {
                    onEquip(String(v), slot)
                  }
                }}
              />
              {popoverContent ? (
                <Popover title="Предмет в слоте" content={popoverContent}>
                  <Button type="link" size="small" style={{ paddingLeft: 8 }}>
                    Подробнее
                  </Button>
                </Popover>
              ) : null}
            </div>
          )
        })}
      </Space>

      <div>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            🃏
          </span>{' '}
          Карточки
        </Typography.Text>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {campaign.cards.map((c) => (
            <li key={c.id}>
              {getCardDisplayLabel(c.templateId)} — глоб. {UI_LEVEL}
              {c.global_level}, использований {c.uses_count}
              {c.modifications.length > 0 ? `, мод1: ${c.modifications[0]?.level ?? 0}` : ''}
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {UI_DAMAGE} в следующем бою: эфф. {UI_LEVEL} для {UI_DAMAGE} ≈{' '}
                {c.global_level + gearCardPreview} (карта + экипировка)
              </Typography.Text>
            </li>
          ))}
        </ul>
      </div>
    </Space>
  )
}
