import type { BattleState, CampaignState } from '../../game/types'

export type HeroProfileModalProps = {
  open: boolean
  onClose: () => void
  mode: 'hub' | 'battle'
  campaign: CampaignState
  /** В режиме `battle` передать текущий бой. */
  battle: BattleState | null
}
