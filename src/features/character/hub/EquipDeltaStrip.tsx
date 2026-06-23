import { Typography } from 'antd'
import { getItemTemplate } from '../../../game/content/itemTemplates'
import { getCharacter } from '../../../game/character/selectors'
import { previewEquipDelta } from '../../inventory/previewEquipDelta'
import { computeCharacterMaxHp } from '../../../game/stats/effectiveStats'
import { UI_HEART } from '../../../game/ui/labels'
import type { CampaignState } from '../../../game/types'
import type { LoadoutFocus } from './types'

type EquipDeltaStripProps = {
  campaign: CampaignState
  characterId: string
  focus: LoadoutFocus
  previewItemId: string | null
}

export function EquipDeltaStrip({
  campaign,
  characterId,
  focus,
  previewItemId,
}: EquipDeltaStripProps) {
  if (focus?.kind !== 'equip' || previewItemId === null) return null
  const delta = previewEquipDelta(
    campaign,
    characterId,
    previewItemId,
    focus.slot,
    getItemTemplate,
  )
  if (!delta) return null
  const hero = getCharacter(campaign, characterId)
  if (!hero) return null
  const beforeHp = computeCharacterMaxHp(hero, campaign.worldPower, getItemTemplate)
  const afterHp = beforeHp + delta.deltaMaxHp
  if (delta.deltaMaxHp === 0) return null

  return (
    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
      {UI_HEART} → {afterHp} ({delta.deltaMaxHp >= 0 ? '+' : ''}
      {delta.deltaMaxHp})
    </Typography.Text>
  )
}
