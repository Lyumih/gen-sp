import { ReloadOutlined, UserAddOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Tooltip, Typography } from 'antd'
import { MAX_ROSTER_SIZE } from '../../game/character/constants'
import { getCharacterClass } from '../../game/content/characterClasses'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState } from '../../game/types'
import {
  TAVERN_CANDIDATE_COUNT,
  TAVERN_REFRESH_COST,
} from '../../game/tavern/generateCandidates'
import { previewCandidateEffectiveStats } from '../../game/stats/previewCandidateStats'
import { StatStrip } from '../stats/StatStrip'
import { classAffinityTooltipLines } from '../stats/statTooltipText'
import { GamePanel } from '../layout/GamePanel'
import '../layout/game-layout.css'
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
    <Space orientation="vertical" size="small" style={{ width: '100%' }} role="tabpanel">
      <GamePanel
        title="Таверна"
        extra={
          <Space wrap size="small">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              disabled={actionsDisabled}
              onClick={handleRefresh}
            >
              Обновить ({TAVERN_REFRESH_COST} золота)
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Кандидатов: {candidates.length} / {TAVERN_CANDIDATE_COUNT}
            </Typography.Text>
          </Space>
        }
      >
      {expeditionLocked ? (
        <Alert type="warning" showIcon message="Таверна недоступна во время экспедиции" />
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

      {candidates.length === 0 ? (
        <Typography.Text type="secondary">
          Нажмите «Обновить», чтобы получить кандидатов для найма.
        </Typography.Text>
      ) : (
        <div className="game-tavern-grid">
          {candidates.map((candidate) => {
            const cls = getCharacterClass(candidate.classId)
            const hireDisabled = actionsDisabled || rosterFull || campaign.gold < candidate.price

            return (
              <Card key={candidate.candidateId} size="small">
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                  <Tooltip title={classAffinityTooltipLines(candidate.classId).join('\n')}>
                    <Typography.Text strong>
                      {cls?.label ?? candidate.classId} — {candidate.price} золота
                    </Typography.Text>
                  </Tooltip>
                  <StatStrip
                    baseStats={candidate.baseStats}
                    effectiveStats={previewCandidateEffectiveStats(
                      candidate.baseStats,
                      campaign.worldPower,
                      candidate.previewGear,
                    )}
                    baseStatRating={candidate.baseStatRating}
                    showRating
                  />
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
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    Наведите на имя класса — бонусы и роль.
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
        </div>
      )}
      </GamePanel>
    </Space>
  )
}
