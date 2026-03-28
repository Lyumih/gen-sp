import { useState } from 'react'
import { FlagOutlined, IdcardOutlined, PlayCircleOutlined, ShoppingOutlined } from '@ant-design/icons'
import { App, Button, Card, Divider, Popover, Select, Space, Typography } from 'antd'
import { HeroProfileModal } from '../profile/HeroProfileModal'
import { SCENARIOS } from '../../game/campaign/scenarios'
import {
  equipmentSlotLabelRu,
  itemInstanceDescriptionLinesFromInstance,
  itemPerLevelBonusesLines,
  itemSelectShortLabel,
} from '../../game/descriptions/itemText'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import { ITEM_TEMPLATES, SHOP_TEMPLATE_IDS, getItemTemplate } from '../../game/content/itemTemplates'
import { aggregateGearCardLevelBonus } from '../../game/equipment/aggregates'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import type { CampaignState, EquipmentSlot, ItemInstance } from '../../game/types'
import { useGameStore } from '../../store/gameStore'

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
}

function itemsSelectableForSlot(
  campaign: CampaignState,
  slot: EquipmentSlot,
): ItemInstance[] {
  return campaign.items.filter((i) => {
    const t = getItemTemplate(i.templateId)
    if (!t || t.slot !== slot) return false
    for (const s of EQUIPMENT_ROLL_ORDER) {
      if (campaign.equipment[s] === i.id && s !== slot) return false
    }
    return true
  })
}

export function CampaignHub() {
  const { message } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const [replaySlot, setReplaySlot] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const inBattle = campaign.battle !== null

  const equippedIds = new Set(
    EQUIPMENT_ROLL_ORDER.map((s) => campaign.equipment[s]).filter(
      (id): id is string => id !== null,
    ),
  )
  const stash = campaign.items.filter((i) => !equippedIds.has(i.id))
  const gearCardPreview = aggregateGearCardLevelBonus(
    campaign.items,
    campaign.equipment,
    getItemTemplate,
  )

  const buy = (templateId: string) => {
    const t = getItemTemplate(templateId)
    if (!t) return
    if (campaign.gold < t.shopPrice) {
      message.warning('Недостаточно золота')
      return
    }
    dispatchRun({ type: 'BUY_ITEM', templateId })
  }

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FlagOutlined aria-hidden />
          Gen — кампания
        </span>
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text>
          Сценарий:{' '}
          {done
            ? 'пройдено'
            : `${campaign.scenarioIndex + 1} / ${SCENARIOS.length}`}
          {scenario ? ` — ${scenario.id}` : ''}
        </Typography.Text>
        <Typography.Text>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            ⚡
          </span>{' '}
          worldPower: {campaign.worldPower}
        </Typography.Text>
        <Typography.Text>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            🪙
          </span>{' '}
          Золото: {campaign.gold}
        </Typography.Text>
        <Typography.Text>Уровень героя: {campaign.playerUnitLevel}</Typography.Text>
        <div>
          <Button
            type="default"
            icon={<IdcardOutlined aria-hidden />}
            aria-label="Профиль героя"
            onClick={() => setProfileOpen(true)}
          >
            Профиль героя
          </Button>
        </div>

        <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShoppingOutlined aria-hidden />
            Магазин
          </span>
        </Typography.Title>
        <Divider style={{ margin: '8px 0 16px' }} />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
          Новый предмет стартует с уровня 1; уровень может расти после побед в сценарии (Memento).
        </Typography.Paragraph>
        <Space wrap size="middle">
          {SHOP_TEMPLATE_IDS.map((tid) => {
            const t = ITEM_TEMPLATES[tid]!
            const can = campaign.gold >= t.shopPrice && !inBattle
            return (
              <Card key={tid} size="small" style={{ maxWidth: 280 }}>
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                  <Typography.Text strong>{t.label}</Typography.Text>
                  <Typography.Text type="secondary">
                    {equipmentSlotLabelRu(t.slot)} · {t.shopPrice} зол.
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>
                    На ур. 1:{' '}
                    {itemPerLevelBonusesLines(t)
                      .filter((line) => !line.startsWith('Нет бонусов'))
                      .join(' · ') || 'нет бонусов'}
                  </Typography.Text>
                  <Button type="primary" disabled={!can} block onClick={() => buy(tid)}>
                    Купить
                  </Button>
                </Space>
              </Card>
            )
          })}
        </Space>

        <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 0 }}>
          Инвентарь и экипировка
        </Typography.Title>
        <Divider style={{ margin: '8px 0 16px' }} />
        <Typography.Text type="secondary">
          В рюкзаке:{' '}
          {stash.length === 0
            ? 'пусто'
            : stash
                .map((i) => {
                  const tmpl = getItemTemplate(i.templateId)
                  if (!tmpl) return `${i.templateId} (ур. ${i.itemLevel})`
                  return itemSelectShortLabel(tmpl, i.itemLevel)
                })
                .join(' · ')}
        </Typography.Text>
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
                      : `${i.templateId} (ур. ${i.itemLevel})`
                    return { value: i.id, label }
                  })}
                  onChange={(v) => {
                    if (v == null || v === '') {
                      dispatchRun({ type: 'UNEQUIP_ITEM', slot })
                    } else {
                      dispatchRun({ type: 'EQUIP_ITEM', itemId: String(v), slot })
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
                {getCardDisplayLabel(c.templateId)} — глоб. ур. {c.global_level}, использований{' '}
                {c.uses_count}
                {c.modifications.length > 0
                  ? `, мод1: ${c.modifications[0]?.level ?? 0}`
                  : ''}
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  Урон в следующем бою: эфф. ур. для урона ≈ {c.global_level + gearCardPreview} (карта +
                  экипировка)
                </Typography.Text>
              </li>
            ))}
          </ul>
        </div>
        {done ? (
          <>
            <Typography.Text type="secondary">
              Цепочка сценариев пройдена. Можно снова сыграть любой сценарий с текущим прогрессом.
            </Typography.Text>
            <Space wrap style={{ width: '100%' }}>
              <Select
                aria-label="Сценарий для повтора"
                style={{ minWidth: 200 }}
                value={replaySlot}
                onChange={setReplaySlot}
                options={SCENARIOS.map((s, i) => ({
                  value: i,
                  label: s.id,
                }))}
              />
              <Button
                type="primary"
                disabled={inBattle}
                icon={<PlayCircleOutlined />}
                onClick={() =>
                  dispatchRun({
                    type: 'START_REPLAY_BATTLE',
                    scenarioSlotIndex: replaySlot,
                  })
                }
              >
                Играть сценарий
              </Button>
            </Space>
          </>
        ) : (
          <Button
            type="primary"
            disabled={inBattle}
            icon={<PlayCircleOutlined />}
            onClick={() => dispatchRun({ type: 'START_OR_CONTINUE_BATTLE' })}
          >
            Начать / продолжить бой
          </Button>
        )}
      </Space>
      <HeroProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        mode="hub"
        campaign={campaign}
        battle={null}
      />
    </Card>
  )
}
