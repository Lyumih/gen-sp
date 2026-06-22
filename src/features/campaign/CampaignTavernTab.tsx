import { ReloadOutlined, UserAddOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Typography } from 'antd'
import { MAX_ROSTER_SIZE } from '../../game/character/constants'
import { getCharacterClass } from '../../game/content/characterClasses'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState } from '../../game/types'
import {
  TAVERN_CANDIDATE_COUNT,
  TAVERN_REFRESH_COST,
} from '../../game/tavern/generateCandidates'
import { SLOT_LABEL } from './campaignHubShared'

const ROSTER_SOFT_WARN_SIZE = 90

type CampaignTavernTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onRefresh: () => void
  onHire: (candidateId: string) => void
  onInsufficientGold: () => void
}

export function CampaignTavernTab({
  campaign,
  inBattle,
  onRefresh,
  onHire,
  onInsufficientGold,
}: CampaignTavernTabProps) {
  const expeditionLocked = campaign.expedition !== null
  const rosterFull = campaign.characters.length >= MAX_ROSTER_SIZE
  const rosterNearFull = campaign.characters.length >= ROSTER_SOFT_WARN_SIZE
  const actionsDisabled = inBattle || expeditionLocked
  const candidates = campaign.tavernCandidates ?? []

  const handleRefresh = () => {
    if (campaign.gold < TAVERN_REFRESH_COST) {
      onInsufficientGold()
      return
    }
    onRefresh()
  }

  const handleHire = (candidateId: string, price: number) => {
    if (rosterFull) return
    if (campaign.gold < price) {
      onInsufficientGold()
      return
    }
    onHire(candidateId)
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Таверна
      </Typography.Title>

      {expeditionLocked ? (
        <Alert type="warning" showIcon message="Таверна недоступна во время expedition" />
      ) : null}

      {rosterFull ? (
        <Alert
          type="error"
          showIcon
          message={`Roster заполнен (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE}). Найм недоступен.`}
        />
      ) : rosterNearFull ? (
        <Alert
          type="warning"
          showIcon
          message={`Roster почти заполнен: ${campaign.characters.length}/${MAX_ROSTER_SIZE}`}
        />
      ) : null}

      <Space wrap>
        <Button
          icon={<ReloadOutlined />}
          disabled={actionsDisabled}
          onClick={handleRefresh}
        >
          Обновить ({TAVERN_REFRESH_COST} золота)
        </Button>
        <Typography.Text type="secondary">
          Кандидатов: {candidates.length} / {TAVERN_CANDIDATE_COUNT}
        </Typography.Text>
      </Space>

      {candidates.length === 0 ? (
        <Typography.Text type="secondary">
          Нажмите «Обновить», чтобы получить кандидатов для найма.
        </Typography.Text>
      ) : (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {candidates.map((candidate) => {
            const cls = getCharacterClass(candidate.classId)
            const hireDisabled = actionsDisabled || rosterFull || campaign.gold < candidate.price

            return (
              <Card key={candidate.candidateId} size="small">
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                  <Typography.Text strong>
                    {cls?.label ?? candidate.classId} — {candidate.price} золота
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Стартовая экипировка:{' '}
                    {Object.entries(candidate.previewGear).length > 0
                      ? Object.entries(candidate.previewGear)
                          .map(([slot, templateId]) => {
                            const tmpl = getItemTemplate(templateId)
                            const slotLabel = SLOT_LABEL[slot as keyof typeof SLOT_LABEL] ?? slot
                            return `${slotLabel}: ${tmpl?.label ?? templateId}`
                          })
                          .join('; ')
                      : 'нет'}
                  </Typography.Text>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    disabled={hireDisabled}
                    onClick={() => handleHire(candidate.candidateId, candidate.price)}
                  >
                    Нанять
                  </Button>
                </Space>
              </Card>
            )
          })}
        </Space>
      )}
    </Space>
  )
}
