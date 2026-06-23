import { useEffect, useState } from 'react'
import { FlagOutlined } from '@ant-design/icons'
import { App, Card, Divider, Space } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { findFirstEmptySquadSlotIndex, findSquadSlotIndex } from '../../game/character/selectors'
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
  const [activeTab, setActiveTab] = useState<CampaignHubTab>('shop')
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const inBattle = campaign.battle !== null
  const expeditionActive = campaign.expedition !== null
  const unreadCodexCount = unreadCodexEntryIds(campaign).length

  useEffect(() => {
    const notice = campaign.pendingHubNotice
    if (!notice) return
    if (notice.kind === 'skill_drop') {
      message.success(`В сундук попало умение: ${getCardDisplayLabel(notice.templateId)}`)
    } else if (notice.kind === 'passive_drop') {
      const label = getPassiveTemplate(notice.templateId)?.label ?? notice.templateId
      message.success(`В сундук попал навык: ${label}`)
    } else if (notice.kind === 'dual_drop') {
      const skillLabel = getCardDisplayLabel(notice.skillTemplateId)
      const passiveLabel =
        getPassiveTemplate(notice.passiveTemplateId)?.label ?? notice.passiveTemplateId
      message.success(`В сундук попали: умение ${skillLabel} и навык ${passiveLabel}`)
    }
    dispatchRun({ type: 'MARK_HUB_NOTICE_SEEN' })
  }, [campaign.pendingHubNotice, dispatchRun, message])

  const handleTabChange = (tab: CampaignHubTab) => {
    if (tab === activeTab) return
    if (tab === 'codex') {
      dispatchRun({ type: 'MARK_CODEX_SEEN' })
    }
    setActiveTab(tab)
  }

  const refreshShop = (free?: boolean) => {
    dispatchRun({ type: 'REFRESH_SHOP', seed: Date.now(), free })
  }

  const buyOffer = (
    offerIndex: number,
    destination?: 'chest' | 'character',
    characterId?: string,
  ) => {
    dispatchRun({ type: 'BUY_SHOP_OFFER', offerIndex, destination, characterId })
  }

  const sellChestItem = (itemId: string) => {
    dispatchRun({ type: 'SELL_CHEST_ITEM', itemId })
  }

  const sellItem = (characterId: string, itemId: string) => {
    dispatchRun({ type: 'SELL_ITEM', characterId, itemId })
  }

  const sellCard = (characterId: string, cardId: string) => {
    dispatchRun({ type: 'SELL_CARD', characterId, cardId })
  }

  const sellChestCard = (cardId: string) => {
    dispatchRun({ type: 'SELL_CHEST_CARD', cardId })
  }

  const sellChestPassive = (passiveId: string) => {
    dispatchRun({ type: 'SELL_UNBOUND_PASSIVE', passiveId })
  }

  const bindChestCard = (cardId: string, characterId: string) => {
    dispatchRun({ type: 'BIND_CHEST_CARD', cardId, characterId })
  }

  const bindChestPassive = (passiveId: string, characterId: string) => {
    dispatchRun({ type: 'BIND_PASSIVE_TO_CHARACTER', passiveId, characterId })
  }

  const moveChestItemToCharacter = (itemId: string, characterId: string) => {
    dispatchRun({ type: 'MOVE_CHEST_ITEM_TO_CHARACTER', itemId, characterId })
  }

  const moveCharacterItemToChest = (itemId: string, characterId: string) => {
    dispatchRun({ type: 'MOVE_CHARACTER_ITEM_TO_CHEST', itemId, characterId })
  }

  const equip = (characterId: string, itemId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'EQUIP_ITEM', characterId, itemId, slot })
  }

  const unequip = (characterId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'UNEQUIP_ITEM', characterId, slot })
  }

  const reorderStash = (characterId: string, itemIds: string[]) => {
    dispatchRun({ type: 'REORDER_STASH', characterId, itemIds })
  }

  const reorderCards = (characterId: string, cardIds: string[]) => {
    dispatchRun({ type: 'REORDER_CARDS', characterId, cardIds })
  }

  const setBattleLoadout = (characterId: string, slotIndex: 0 | 1 | 2 | 3, cardId: string | null) => {
    dispatchRun({
      type: 'SET_BATTLE_LOADOUT',
      characterId,
      slotIndex,
      cardId,
    })
  }

  const setPassiveEquip = (
    characterId: string,
    slotIndex: 0 | 1 | 2 | 3 | 4,
    passiveId: string | null,
  ) => {
    dispatchRun({
      type: 'SET_PASSIVE_EQUIP',
      characterId,
      slotIndex,
      passiveId,
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
    carrierKind: 'card' | 'item' | 'passive',
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
    carrierKind: 'card' | 'item' | 'passive',
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
            onSellChestItem={sellChestItem}
            onSellChestCard={sellChestCard}
            onSellItem={sellItem}
            onSellCard={sellCard}
            onBindChestCard={bindChestCard}
            onBindChestPassive={bindChestPassive}
            onSellChestPassive={sellChestPassive}
            onMoveChestItemToCharacter={moveChestItemToCharacter}
            onMoveCharacterItemToChest={moveCharacterItemToChest}
            onSetSquadSlot={setSquadSlot}
            onSwapSquadSlots={swapSquadSlots}
            onAssignToSquad={assignToSquad}
            onRemoveFromSquad={removeFromSquad}
            onSetPassiveEquip={setPassiveEquip}
            onPickModOffer={pickModOffer}
            onRemoveMod={removeMod}
            onInvalidSlot={() => message.warning('Не подходит к этому слоту')}
          />
        ) : null}

        {activeTab === 'shop' ? (
          <CampaignShopTab
            campaign={campaign}
            inBattle={inBattle}
            onRefreshShop={refreshShop}
            onBuyOffer={buyOffer}
            onInsufficientGold={() => message.warning('Недостаточно золота')}
            onSellChestItem={sellChestItem}
            onSellChestCard={sellChestCard}
            onSellChestPassive={sellChestPassive}
            onSellItem={sellItem}
            onBindChestCard={bindChestCard}
            onBindChestPassive={bindChestPassive}
            onMoveChestItemToCharacter={moveChestItemToCharacter}
            onUnequip={unequip}
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
