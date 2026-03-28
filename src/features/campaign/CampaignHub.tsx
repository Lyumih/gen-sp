import { useState } from 'react'
import { FlagOutlined, IdcardOutlined, PlayCircleOutlined, ShoppingOutlined } from '@ant-design/icons'
import { App, Button, Card, Divider, Select, Space, Typography } from 'antd'
import { HeroProfileModal } from '../profile/HeroProfileModal'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { ITEM_TEMPLATES, SHOP_TEMPLATE_IDS, getItemTemplate } from '../../game/content/itemTemplates'
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
        <Space wrap>
          {SHOP_TEMPLATE_IDS.map((tid) => {
            const t = ITEM_TEMPLATES[tid]!
            const can = campaign.gold >= t.shopPrice && !inBattle
            return (
              <Button key={tid} type="default" disabled={!can} onClick={() => buy(tid)}>
                {t.label} — {t.shopPrice} зол.
              </Button>
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
                  const lab = getItemTemplate(i.templateId)?.label ?? i.templateId
                  return `${lab} (ур. ${i.itemLevel})`
                })
                .join(', ')}
        </Typography.Text>
        <Space orientation="vertical" style={{ width: '100%' }} size="small">
          {EQUIPMENT_ROLL_ORDER.map((slot) => {
            const choices = itemsSelectableForSlot(campaign, slot)
            return (
              <div key={slot}>
                <Typography.Text style={{ marginRight: 8 }}>{SLOT_LABEL[slot]}:</Typography.Text>
                <Select
                  aria-label={`Экипировка: ${SLOT_LABEL[slot]}`}
                  style={{ minWidth: 220 }}
                  disabled={inBattle}
                  allowClear
                  placeholder="—"
                  value={campaign.equipment[slot] ?? undefined}
                  options={choices.map((i) => {
                    const lab = getItemTemplate(i.templateId)?.label ?? i.templateId
                    return { value: i.id, label: `${lab} (ур. ${i.itemLevel})` }
                  })}
                  onChange={(v) => {
                    if (v == null || v === '') {
                      dispatchRun({ type: 'UNEQUIP_ITEM', slot })
                    } else {
                      dispatchRun({ type: 'EQUIP_ITEM', itemId: String(v), slot })
                    }
                  }}
                />
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
                {c.templateId} — глоб. ур. {c.global_level}, использований{' '}
                {c.uses_count}
                {c.modifications.length > 0
                  ? `, мод1: ${c.modifications[0]?.level ?? 0}`
                  : ''}
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
