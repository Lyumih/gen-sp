import { PlayCircleOutlined, RocketOutlined } from '@ant-design/icons'
import { Alert, Button, Divider, Select, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { SCENARIOS } from '../../game/campaign/scenarios'
import {
  EXPEDITION_CHAINS,
  getChainMaxParty,
  getExpeditionChainById,
} from '../../game/expedition/config'
import {
  countOccupiedSquadSlots,
  resolveExpeditionParty,
} from '../../game/expedition/resolveExpeditionParty'
import type { CampaignState } from '../../game/types'
import { ExpeditionModeList } from './ExpeditionModeList'
import { ExpeditionSquadStrip } from './ExpeditionSquadStrip'

type CampaignBattleTabProps = {
  campaign: CampaignState
  done: boolean
  inBattle: boolean
  scenarioIndex: number
  scenarioId: string | undefined
  replaySlot: number
  onReplaySlotChange: (slot: number) => void
  onStartOrContinue: () => void
  onStartReplay: () => void
  onStartExpedition: (chainId: string, selectedCharacterIds: string[]) => void
}

export function CampaignBattleTab({
  campaign,
  done,
  inBattle,
  scenarioIndex,
  scenarioId,
  replaySlot,
  onReplaySlotChange,
  onStartOrContinue,
  onStartReplay,
  onStartExpedition,
}: CampaignBattleTabProps) {
  const [selectedChainId, setSelectedChainId] = useState(
    () => EXPEDITION_CHAINS[0]?.id ?? 'campaign-main',
  )
  const [markedIds, setMarkedIds] = useState<string[]>([])

  const selectedChain = getExpeditionChainById(selectedChainId) ?? EXPEDITION_CHAINS[0]!

  const selectedCharacterIds = useMemo(
    () =>
      resolveExpeditionParty({
        squad: campaign.squad,
        markedIds,
        maxParty: getChainMaxParty(selectedChain),
      }),
    [campaign.squad, markedIds, selectedChain],
  )

  const expeditionActive = campaign.expedition !== null
  const expeditionDisabled = inBattle || expeditionActive
  const occupied = countOccupiedSquadSlots(campaign.squad)
  const squadOk = occupied >= selectedChain.partyMin
  const hasFighters = selectedCharacterIds.length >= 1
  const canStartExpedition = !expeditionDisabled && squadOk && hasFighters

  const handleToggleMark = (characterId: string) => {
    setMarkedIds((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId],
    )
  }

  const handleStartExpedition = () => {
    const chain = getExpeditionChainById(selectedChainId) ?? EXPEDITION_CHAINS[0]!
    const maxParty = getChainMaxParty(chain)
    const party = resolveExpeditionParty({
      squad: campaign.squad,
      markedIds,
      maxParty,
    })
    onStartExpedition(selectedChainId, party)
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      {done ? (
        <>
          <Typography.Text type="secondary">
            Цепочка сценариев пройдена. Можно снова сыграть любой сценарий с текущим прогрессом.
          </Typography.Text>
          <Space wrap style={{ width: '100%' }}>
            <Select
              aria-label="Сценарий для повтора"
              style={{ minWidth: 200 }}
              value={replaySlot}
              onChange={onReplaySlotChange}
              options={SCENARIOS.map((s, i) => ({
                value: i,
                label: s.id,
              }))}
            />
            <Button
              type="primary"
              disabled={inBattle}
              icon={<PlayCircleOutlined />}
              onClick={onStartReplay}
            >
              Играть сценарий
            </Button>
          </Space>
        </>
      ) : (
        <Button
          type="primary"
          disabled={inBattle}
          icon={<PlayCircleOutlined />}
          onClick={onStartOrContinue}
        >
          Начать / продолжить бой
        </Button>
      )}

      <Typography.Text>
        Сценарий:{' '}
        {done ? 'пройдено' : `${scenarioIndex + 1} / ${SCENARIOS.length}`}
        {scenarioId ? ` — ${scenarioId}` : ''}
      </Typography.Text>

      <Divider style={{ margin: '8px 0' }} />

      <ExpeditionSquadStrip
        campaign={campaign}
        markedIds={markedIds}
        disabled={expeditionDisabled}
        onToggleMark={handleToggleMark}
      />

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Экспедиция
      </Typography.Title>

      {expeditionActive ? (
        <>
          <Alert
            type="info"
            showIcon
            message="Недоступно во время экспедиции"
          />
          <Typography.Text type="secondary">
            Экспедиция активна: {campaign.expedition!.scenarioChainId}, бой{' '}
            {campaign.expedition!.battleIndex + 1} / {campaign.expedition!.battleCount}
          </Typography.Text>
        </>
      ) : null}

      <ExpeditionModeList
        chains={EXPEDITION_CHAINS}
        selectedChainId={selectedChainId}
        disabled={expeditionDisabled}
        onSelect={setSelectedChainId}
      />

      <Button
        type="primary"
        disabled={!canStartExpedition}
        icon={<RocketOutlined />}
        onClick={handleStartExpedition}
      >
        Начать экспедицию
      </Button>
    </Space>
  )
}
