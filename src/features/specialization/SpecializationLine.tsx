import { Tag, Tooltip, Typography } from 'antd'
import { getSpecializationTemplate } from '../../game/specialization/specializationTemplates'
import { isSpecializationActive } from '../../game/specialization/resolve'
import type { CampaignState, Character } from '../../game/types'

type SpecializationLineProps = {
  campaign: CampaignState
  character: Character
}

export function SpecializationLine({ campaign, character }: SpecializationLineProps) {
  const specId = character.specializationId
  if (!specId) {
    return null
  }

  const tmpl = getSpecializationTemplate(specId)
  if (!tmpl) {
    console.warn(`Unknown specializationId: ${specId}`)
    return null
  }

  const active = isSpecializationActive(campaign, character.id)

  return (
    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
      <Tooltip title={tmpl.description} mouseEnterDelay={0.3}>
        <span style={{ cursor: 'default' }}>
          {tmpl.emoji} {tmpl.label}
        </span>
      </Tooltip>{' '}
      <Tag color={active ? 'green' : 'default'} style={{ marginInlineStart: 4 }}>
        {active ? 'активна' : 'неактивна'}
      </Tag>
    </Typography.Text>
  )
}
