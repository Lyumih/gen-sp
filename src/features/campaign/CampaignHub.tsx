import { useState } from 'react'
import { FlagOutlined } from '@ant-design/icons'
import { App, Card, Divider, Space } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { findFirstEmptySquadSlotIndex, findSquadSlotIndex, getActiveCharacter } from '../../game/character/selectors'
import { isItemEquipped } from '../../game/equipment/stashOrder'
import type { EquipmentSlot } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { CampaignBattleTab } from './CampaignBattleTab'
import { CampaignCharacterTab } from './CampaignCharacterTab'
import { CampaignCodexTab } from '../codex/CampaignCodexTab'
import { CampaignHelpTab } from '../help/CampaignHelpTab'
import type { CampaignHubTab } from './campaignHubShared'
import { isBattleContextActive } from './campaignHubShared'
import { CampaignHubHud } from './CampaignHubHud'
import { CampaignHubNav } from './CampaignHubNav'
import { CampaignShopTab } from './CampaignShopTab'
import { CampaignTavernTab } from './CampaignTavernTab'

export function CampaignHub() {
  const { message } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const [replaySlot, setReplaySlot] = useState(0)
  const [activeTab, setActiveTab] = useState<CampaignHubTab>('battle')
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const inBattle = campaign.battle !== null
  const expeditionActive = campaign.expedition !== null
  const unreadCodexCount = unreadCodexEntryIds(campaign).length

  const handleTabChange = (tab: CampaignHubTab) => {
    if (tab === activeTab) return
    if (tab === 'codex') {
      dispatchRun({ type: 'MARK_CODEX_SEEN' })
    }
    setActiveTab(tab)
  }

  const activeCharacterId = getActiveCharacter(campaign).id

  const buy = (templateId: string) => {
    const t = getItemTemplate(templateId)
    if (!t) return
    if (campaign.gold < t.shopPrice) {
      message.warning('Недостаточно золота')
      return
    }
    dispatchRun({ type: 'BUY_ITEM', characterId: activeCharacterId, templateId })
  }

  const equip = (characterId: string, itemId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'EQUIP_ITEM', characterId, itemId, slot })
  }

  const unequip = (characterId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'UNEQUIP_ITEM', characterId, slot })
  }

  const sellItem = (itemId: string) => {
    const hero = getActiveCharacter(campaign)
    if (isItemEquipped(itemId, hero.equipment)) {
      message.warning('Сначала снимите предмет')
      return
    }
    dispatchRun({ type: 'SELL_ITEM', characterId: activeCharacterId, itemId })
  }

  const reorderStash = (characterId: string, itemIds: string[]) => {
    dispatchRun({ type: 'REORDER_STASH', characterId, itemIds })
  }

  const reorderCards = (characterId: string, cardIds: string[]) => {
    dispatchRun({ type: 'REORDER_CARDS', characterId, cardIds })
  }

  const setBattleLoadout = (characterId: string, slotIndex: 0 | 1, cardId: string | null) => {
    dispatchRun({
      type: 'SET_BATTLE_LOADOUT',
      characterId,
      slotIndex,
      cardId,
    })
  }

  const transferItem = (itemId: string, fromCharacterId: string, toCharacterId: string) => {
    dispatchRun({ type: 'TRANSFER_ITEM', itemId, fromCharacterId, toCharacterId })
  }

  const setSquadSlot = (slotIndex: number, characterId: string | null) => {
    dispatchRun({ type: 'SET_SQUAD_SLOT', slotIndex, characterId })
  }

  const swapSquadSlots = (from: number, to: number) => {
    dispatchRun({ type: 'SWAP_SQUAD_SLOTS', from, to })
  }

  const pickModOffer = (
    characterId: string,
    carrierKind: 'card' | 'item',
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => {
    dispatchRun({
      type: 'PICK_MOD_OFFER',
      characterId,
      carrierKind,
      carrierId,
      slotIndex,
      modTemplateId,
    })
  }

  const removeMod = (
    characterId: string,
    carrierKind: 'card' | 'item',
    carrierId: string,
    slotIndex: number,
  ) => {
    dispatchRun({
      type: 'REMOVE_MOD',
      characterId,
      carrierKind,
      carrierId,
      slotIndex,
    })
  }

  const assignToSquad = (characterId: string) => {
    const slotIndex = findFirstEmptySquadSlotIndex(campaign.squad)
    if (slotIndex === null) {
      message.warning('Все слоты отряда заняты')
      return
    }
    dispatchRun({ type: 'SET_SQUAD_SLOT', slotIndex, characterId })
  }

  const removeFromSquad = (characterId: string) => {
    const slotIndex = findSquadSlotIndex(campaign.squad, characterId)
    if (slotIndex === null) return
    dispatchRun({ type: 'SET_SQUAD_SLOT', slotIndex, characterId: null })
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
        <CampaignHubNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCodexCount={unreadCodexCount}
          codexDisabled={inBattle}
          shopDisabled={expeditionActive}
          tavernDisabled={expeditionActive}
          battleTabHighlighted={isBattleContextActive(campaign)}
        />

        {activeTab === 'battle' ? (
          <CampaignBattleTab
            campaign={campaign}
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
            onStartExpedition={(chainId, selectedCharacterIds) =>
              dispatchRun({ type: 'START_EXPEDITION', chainId, selectedCharacterIds })
            }
          />
        ) : null}

        {activeTab === 'character' ? (
          <CampaignCharacterTab
            campaign={campaign}
            inBattle={inBattle}
            expeditionActive={expeditionActive}
            onEquip={equip}
            onUnequip={unequip}
            onReorderStash={reorderStash}
            onReorderCards={reorderCards}
            onSetBattleLoadout={setBattleLoadout}
            onTransferItem={transferItem}
            onSetSquadSlot={setSquadSlot}
            onSwapSquadSlots={swapSquadSlots}
            onAssignToSquad={assignToSquad}
            onRemoveFromSquad={removeFromSquad}
            onPickModOffer={pickModOffer}
            onRemoveMod={removeMod}
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

        {activeTab === 'tavern' ? (
          <CampaignTavernTab
            campaign={campaign}
            inBattle={inBattle}
            onRefresh={() => dispatchRun({ type: 'REFRESH_TAVERN' })}
            onHire={(candidateId) =>
              dispatchRun({ type: 'HIRE_TAVERN_CANDIDATE', candidateId })
            }
            onInsufficientGold={() => message.warning('Недостаточно золота')}
          />
        ) : null}

        {activeTab === 'codex' ? <CampaignCodexTab campaign={campaign} /> : null}

        {activeTab === 'help' ? <CampaignHelpTab /> : null}
      </Space>
    </Card>
  )
}
