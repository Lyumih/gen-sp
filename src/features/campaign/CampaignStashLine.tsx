import { Typography } from 'antd'
import { itemSelectShortLabel } from '../../game/descriptions/itemText'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { ItemInstance } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'

type CampaignStashLineProps = {
  stash: ItemInstance[]
}

export function CampaignStashLine({ stash }: CampaignStashLineProps) {
  return (
    <Typography.Text type="secondary">
      В рюкзаке:{' '}
      {stash.length === 0
        ? 'пусто'
        : stash
            .map((i) => {
              const tmpl = getItemTemplate(i.templateId)
              if (!tmpl) return `${i.templateId} (${UI_LEVEL}${i.itemLevel})`
              return itemSelectShortLabel(tmpl, i.itemLevel)
            })
            .join(' · ')}
    </Typography.Text>
  )
}
