import { useState } from 'react'
import { FlagOutlined } from '@ant-design/icons'
import { App, Card, Divider, Space } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { isItemEquipped } from '../../game/equipment/stashOrder'
import type { EquipmentSlot } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { CampaignBattleTab } from './CampaignBattleTab'
import { CampaignCharacterTab } from './CampaignCharacterTab'
import type { CampaignHubTab } from './campaignHubShared'
import { CampaignHubHud } from './CampaignHubHud'
import { CampaignHubNav } from './CampaignHubNav'
import { CampaignShopTab } from './CampaignShopTab'

export function CampaignHub() {
  const { message } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const [replaySlot, setReplaySlot] = useState(0)
  const [activeTab, setActiveTab] = useState<CampaignHubTab>('battle')
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const inBattle = campaign.battle !== null

  const buy = (templateId: string) => {
    const t = getItemTemplate(templateId)
    if (!t) return
    if (campaign.gold < t.shopPrice) {
      message.warning('Недостаточно золота')
      return
    }
    dispatchRun({ type: 'BUY_ITEM', templateId })
  }

  const equip = (itemId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'EQUIP_ITEM', itemId, slot })
  }

  const unequip = (slot: EquipmentSlot) => {
    dispatchRun({ type: 'UNEQUIP_ITEM', slot })
  }

  const sellItem = (itemId: string) => {
    if (isItemEquipped(itemId, campaign.equipment)) {
      message.warning('Сначала снимите предмет')
      return
    }
    dispatchRun({ type: 'SELL_ITEM', itemId })
  }

  const reorderStash = (itemIds: string[]) => {
    dispatchRun({ type: 'REORDER_STASH', itemIds })
  }

  const reorderCards = (cardIds: string[]) => {
    dispatchRun({ type: 'REORDER_CARDS', cardIds })
  }

  const setModKillTarget = (cardId: string) => {
    dispatchRun({ type: 'SET_MOD_KILL_TARGET', cardId })
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
        <CampaignHubHud campaign={campaign} />
        <Divider style={{ margin: '4px 0 8px' }} />
        <CampaignHubNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'battle' ? (
          <CampaignBattleTab
            done={done}
            inBattle={inBattle}
            scenarioIndex={campaign.scenarioIndex}
            scenarioId={scenario?.id}
            replaySlot={replaySlot}
            onReplaySlotChange={setReplaySlot}
            onStartOrContinue={() => dispatchRun({ type: 'START_OR_CONTINUE_BATTLE' })}
            onStartReplay={() =>
              dispatchRun({
                type: 'START_REPLAY_BATTLE',
                scenarioSlotIndex: replaySlot,
              })
            }
          />
        ) : null}

        {activeTab === 'character' ? (
          <CampaignCharacterTab
            campaign={campaign}
            inBattle={inBattle}
            onEquip={equip}
            onUnequip={unequip}
            onReorderStash={reorderStash}
            onReorderCards={reorderCards}
            onSetModKillTarget={setModKillTarget}
            onInvalidSlot={() => message.warning('Не подходит к этому слоту')}
          />
        ) : null}

        {activeTab === 'shop' ? (
          <CampaignShopTab
            campaign={campaign}
            inBattle={inBattle}
            onBuy={buy}
            onInsufficientGold={() => message.warning('Недостаточно золота')}
            onSell={sellItem}
          />
        ) : null}
      </Space>
    </Card>
  )
}
