import { useEffect, useState } from 'react'
import { Button, Space, Tabs, Typography } from 'antd'
import { SKILL_ACQUISITION } from '../../../game/config/skillAcquisition'
import { getActiveCharacter, getCharacter } from '../../../game/character/selectors'
import { stashItemsFromCampaign } from '../../../game/equipment/stashOrder'
import type { CampaignState, EquipmentSlot } from '../../../game/types'
import { CharacterRail } from '../../character/hub/CharacterRail'
import { SHOP_OFFERS_SECTION_HELP } from '../../campaign/sectionTooltips'
import { ChestInventoryView } from '../../inventory/ChestInventoryView'
import { ShopOffersGrid } from '../../inventory/ShopOffersGrid'
import { SectionHelp } from '../../layout/SectionHelp'
import { shopTabAriaLabel, shopTabLabel } from '../../layout/tabLabels'
import { useNarrowViewport } from '../../layout/useNarrowViewport'
import { ShopBuildPanel } from './ShopBuildPanel'
import { ShopSellPanel } from './ShopSellPanel'
import type { ShopTabKey } from './types'
import '../../layout/game-layout.css'

export type ShopHubLayoutProps = {
  campaign: CampaignState
  inBattle: boolean
  onRefreshShop: (free?: boolean) => void
  onBuyOffer: (
    offerIndex: number,
    destination?: 'chest' | 'character',
    characterId?: string,
  ) => void
  onInsufficientGold: () => void
  onSellChestItem: (itemId: string) => void
  onSellChestCard: (cardId: string) => void
  onSellChestPassive: (passiveId: string) => void
  onSellItem: (characterId: string, itemId: string) => void
  onBindChestCard: (cardId: string, characterId: string) => void
  onBindChestPassive: (passiveId: string, characterId: string) => void
  onMoveChestItemToCharacter?: (itemId: string, characterId: string) => void
  onUnequip: (characterId: string, slot: EquipmentSlot) => void
}

export function ShopHubLayout({
  campaign,
  inBattle,
  onRefreshShop,
  onBuyOffer,
  onInsufficientGold,
  onSellChestItem,
  onSellChestCard,
  onSellChestPassive,
  onSellItem,
  onBindChestCard,
  onBindChestPassive,
  onMoveChestItemToCharacter,
  onUnequip,
}: ShopHubLayoutProps) {
  const expeditionActive = campaign.expedition !== null
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => getActiveCharacter(campaign).id,
  )
  const [activeTab, setActiveTab] = useState<ShopTabKey>('offers')

  const activeCharacterId =
    getCharacter(campaign, selectedCharacterId)?.id ?? getActiveCharacter(campaign).id

  useEffect(() => {
    if (campaign.shopOffers === null && !inBattle && !expeditionActive) {
      onRefreshShop(true)
    }
  }, [campaign.shopOffers, inBattle, expeditionActive, onRefreshShop])

  const hero = getCharacter(campaign, activeCharacterId) ?? getActiveCharacter(campaign)
  const stash = stashItemsFromCampaign(hero.items, hero.equipment)
  const chestCount =
    campaign.chest.items.length +
    campaign.chest.unboundCards.length +
    campaign.chest.unboundPassives.length

  const narrow = useNarrowViewport()

  const shopTabLabelNode = (tab: 'offers' | 'sell' | 'chest', count: number | null) => (
    <span aria-label={shopTabAriaLabel(tab, count)}>
      {shopTabLabel(tab, count, narrow)}
    </span>
  )

  const offersPanel = (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
        <Typography.Text strong>
          Ассортимент <SectionHelp content={SHOP_OFFERS_SECTION_HELP} />
        </Typography.Text>
        <Button
          size="small"
          disabled={inBattle || expeditionActive}
          onClick={() => onRefreshShop(false)}
        >
          Обновить ({SKILL_ACQUISITION.shopRefreshCost} 💰)
        </Button>
      </Space>
      <ShopOffersGrid
        offers={campaign.shopOffers ?? []}
        gold={campaign.gold}
        inBattle={inBattle}
        selectedCharacterName={hero.name}
        selectedCharacterId={hero.id}
        onBuy={onBuyOffer}
        onInsufficientGold={onInsufficientGold}
      />
    </div>
  )

  return (
    <div className="game-character-hub">
      <CharacterRail
        campaign={campaign}
        selectedCharacterId={activeCharacterId}
        transferDisabled
        onSelectCharacter={setSelectedCharacterId}
      />
      <ShopBuildPanel
        campaign={campaign}
        characterId={activeCharacterId}
        inBattle={inBattle}
        onUnequip={(slot) => onUnequip(activeCharacterId, slot)}
      />
      <Tabs
        className="game-tabs--scroll"
        size="small"
        tabBarGutter={8}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ShopTabKey)}
        items={[
          { key: 'offers', label: shopTabLabelNode('offers', null), children: offersPanel },
          {
            key: 'sell',
            label: shopTabLabelNode('sell', null),
            children: (
              <ShopSellPanel
                stash={stash}
                inBattle={inBattle}
                onSellItem={(itemId) => onSellItem(activeCharacterId, itemId)}
              />
            ),
          },
          {
            key: 'chest',
            label: shopTabLabelNode('chest', chestCount),
            children: (
              <ChestInventoryView
                campaign={campaign}
                inBattle={inBattle}
                inventoryLocked={expeditionActive}
                bindCharacterId={activeCharacterId}
                bindCharacterName={hero.name}
                showIntro={false}
                dndEnabled={false}
                onSellChestItem={onSellChestItem}
                onSellChestCard={onSellChestCard}
                onSellChestPassive={onSellChestPassive}
                onBindCard={(cardId) => onBindChestCard(cardId, activeCharacterId)}
                onBindPassive={(passiveId) =>
                  onBindChestPassive(passiveId, activeCharacterId)
                }
                onAssignItemToCharacter={
                  onMoveChestItemToCharacter
                    ? (itemId) => onMoveChestItemToCharacter(itemId, activeCharacterId)
                    : undefined
                }
              />
            ),
          },
        ]}
      />
    </div>
  )
}
