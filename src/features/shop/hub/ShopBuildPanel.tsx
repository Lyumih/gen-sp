import { Typography } from 'antd'
import { getCharacter } from '../../../game/character/selectors'
import { getCharacterClass } from '../../../game/content/characterClasses'
import { getCharacterDisplay } from '../../../game/character/display'
import { getItemTemplate } from '../../../game/content/itemTemplates'
import { aggregatePassiveSkillStatBonuses } from '../../../game/passives/passiveStatBonuses'
import { computeEffectiveStats, computeGearStatBonuses } from '../../../game/stats/effectiveStats'
import type { CampaignState, EquipmentSlot } from '../../../game/types'
import { UI_LEVEL } from '../../../game/ui/labels'
import { SHOP_RAIL_SECTION_HELP } from '../../campaign/sectionTooltips'
import { EquipmentSlotRow } from '../../inventory/EquipmentSlotRow'
import { SectionHelp } from '../../layout/SectionHelp'
import { SpecializationLine } from '../../specialization/SpecializationLine'
import { StatStrip } from '../../stats/StatStrip'

type ShopBuildPanelProps = {
  campaign: CampaignState
  characterId: string
  inBattle: boolean
  onUnequip: (slot: EquipmentSlot) => void
}

export function ShopBuildPanel({
  campaign,
  characterId,
  inBattle,
  onUnequip,
}: ShopBuildPanelProps) {
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
        {hero.unitLevel} <SectionHelp content={SHOP_RAIL_SECTION_HELP} />
      </Typography.Text>
      <StatStrip
        baseStats={hero.baseStats}
        effectiveStats={effective}
        baseStatRating={hero.baseStatRating}
        showRating
      />
      <SpecializationLine campaign={campaign} character={hero} />
      <Typography.Text strong style={{ display: 'block', fontSize: 12, marginTop: 8, marginBottom: 4 }}>
        Экипировка
      </Typography.Text>
      <EquipmentSlotRow character={hero} inBattle={inBattle} onUnequip={onUnequip} />
    </div>
  )
}
