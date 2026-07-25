import type { CampaignState, Character, PassiveInstance } from '../../game/types'
import { BattlePassivesRow } from './BattlePassivesRow'

export function ActorPassivesPanel(props: {
  passives: readonly PassiveInstance[]
  character: Character | undefined
  campaign: CampaignState
}) {
  const { passives, character, campaign } = props
  if (!character || passives.length === 0) return null
  return (
    <BattlePassivesRow passives={passives} carrier={character} campaign={campaign} />
  )
}
