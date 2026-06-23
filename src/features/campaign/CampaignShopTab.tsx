import type { CampaignState, EquipmentSlot } from '../../game/types'
import { ShopHubLayout } from '../shop/hub'

type CampaignShopTabProps = {
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

export function CampaignShopTab(props: CampaignShopTabProps) {
  return (
    <div role="tabpanel" style={{ width: '100%' }}>
      <ShopHubLayout {...props} />
    </div>
  )
}
