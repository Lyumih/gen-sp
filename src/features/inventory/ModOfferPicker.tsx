import { Card, Modal, Space, Typography } from 'antd'
import { getModTemplate } from '../../game/content/modTemplates'
import { getPassiveModTemplate } from '../../game/content/passiveModTemplates'
import type { ModOffer } from '../../game/types'

type ModOfferPickerProps = {
  open: boolean
  offer: ModOffer | null
  onPick: (modTemplateId: string) => void
  onCancel: () => void
}

function resolveModTemplate(modId: string) {
  return getModTemplate(modId) ?? getPassiveModTemplate(modId)
}

export function ModOfferPicker({ open, offer, onPick, onCancel }: ModOfferPickerProps) {
  return (
    <Modal
      open={open}
      title="Выберите модификатор"
      footer={null}
      onCancel={onCancel}
      destroyOnHidden
    >
      {offer ? (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          {offer.modIds.map((modId) => {
            const tmpl = resolveModTemplate(modId)
            return (
              <Card
                key={modId}
                size="small"
                hoverable
                className="inv-mod-offer-card"
                onClick={() => onPick(modId)}
              >
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {tmpl?.emoji ? `${tmpl.emoji} ` : ''}
                  {tmpl?.label ?? modId}
                </Typography.Text>
                {tmpl ? (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                    {tmpl.descriptionLines.map((line, idx) => (
                      <li key={idx}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {line}
                        </Typography.Text>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            )
          })}
        </Space>
      ) : null}
    </Modal>
  )
}
