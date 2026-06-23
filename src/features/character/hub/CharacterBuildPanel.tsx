import { Typography } from 'antd'
import { getCharacter } from '../../../game/character/selectors'
import { getCharacterClass } from '../../../game/content/characterClasses'
import { getCharacterDisplay } from '../../../game/character/display'
import type { CampaignState } from '../../../game/types'
import { UI_LEVEL } from '../../../game/ui/labels'
import { SpecializationLine } from '../../specialization/SpecializationLine'
import { StatStrip } from '../../stats/StatStrip'
import { computeEffectiveStats, computeGearStatBonuses } from '../../../game/stats/effectiveStats'
import { aggregatePassiveSkillStatBonuses } from '../../../game/passives/passiveStatBonuses'
import { getItemTemplate } from '../../../game/content/itemTemplates'
import { EquipDeltaStrip } from './EquipDeltaStrip'
import type { LoadoutFocus } from './types'

type CharacterBuildPanelProps = {
  campaign: CampaignState
  characterId: string
  focus: LoadoutFocus
  previewItemId: string | null
}

export function CharacterBuildPanel({
  campaign,
  characterId,
  focus,
  previewItemId,
}: CharacterBuildPanelProps) {
  const hero = getCharacter(campaign, characterId)
  if (!hero) return null
  const cls = getCharacterClass(hero.classId)
  const display = getCharacterDisplay(hero)
  const gearBonuses = computeGearStatBonuses(hero.items, hero.equipment, getItemTemplate)
  const passiveBonuses = aggregatePassiveSkillStatBonuses(
    hero.passives,
    hero.passiveEquip,
    hero.baseStats,
  )
  const effective = computeEffectiveStats(
    hero.baseStats,
    hero.unitLevel,
    campaign.worldPower,
    gearBonuses,
    passiveBonuses,
  )

  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {display.emoji} {hero.name} · {cls?.label ?? hero.classId} {UI_LEVEL}
        {hero.unitLevel}
      </Typography.Text>
      <StatStrip
        baseStats={hero.baseStats}
        effectiveStats={effective}
        baseStatRating={hero.baseStatRating}
        showRating
      />
      <EquipDeltaStrip
        campaign={campaign}
        characterId={characterId}
        focus={focus}
        previewItemId={previewItemId}
      />
      <SpecializationLine campaign={campaign} character={hero} />
    </div>
  )
}
