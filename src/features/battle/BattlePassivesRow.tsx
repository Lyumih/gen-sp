import { Typography } from 'antd'
import { describePassiveStats } from '../../game/descriptions/passiveText'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import type { CampaignState, Character, PassiveInstance } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { resolvePassiveEmoji } from '../inventory/inventoryEmoji'
import { InventoryCell } from '../inventory/InventoryCell'

export function BattlePassivesRow(props: {
  passives: readonly PassiveInstance[]
  carrier: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>
  campaign: CampaignState
  sectionLabel?: string
  /** Ячейки без обёртки секции (в общей полосе command dock). */
  inline?: boolean
}) {
  const { passives, carrier, campaign, sectionLabel = 'Пассивные навыки', inline = false } = props
  if (passives.length === 0) return null

  const cellNodes = passives.map((p) => {
    const stats = describePassiveStats(p, carrier, campaign)
    const tmpl = getPassiveTemplate(p.templateId)
    const popover = (
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {stats.lines.map((line, i) => (
          <li key={i}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
    )
    return (
      <InventoryCell
        key={p.id}
        emoji={resolvePassiveEmoji(tmpl)}
        levelBadge={`${UI_LEVEL}${p.global_level}`}
        state="filled"
        popoverTitle={stats.displayLabel}
        popoverContent={popover}
        popoverTrigger={['hover', 'click']}
        ariaLabel={`${stats.displayLabel}, ${UI_LEVEL}${p.global_level}`}
      />
    )
  })

  if (inline) {
    return <>{cellNodes}</>
  }

  return (
    <div>
      {sectionLabel ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
          {sectionLabel}
        </Typography.Text>
      ) : null}
      <div className="battle-passive-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {cellNodes}
      </div>
    </div>
  )
}
