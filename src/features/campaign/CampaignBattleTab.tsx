import { PlayCircleOutlined, RocketOutlined } from '@ant-design/icons'
import { Button, Divider, Select, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { SCENARIOS } from '../../game/campaign/scenarios'
import {
  EXPEDITION_CHAINS,
  formatConfigPreview,
  getExpeditionChainById,
  getPartySizeRequiredCount,
  getPartySizeSlotCount,
} from '../../game/expedition/config'
import type { CampaignState } from '../../game/types'
import { SquadPicker } from './SquadPicker'

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

function emptySlots(count: number): (string | null)[] {
  return Array.from({ length: count }, () => null)
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
  const selectedChain = getExpeditionChainById(selectedChainId) ?? EXPEDITION_CHAINS[0]!
  const slotCount = getPartySizeSlotCount(selectedChain.partySize)
  const requiredCount = getPartySizeRequiredCount(selectedChain.partySize)

  const [pickedIds, setPickedIds] = useState<(string | null)[]>(() => emptySlots(slotCount))

  useEffect(() => {
    setPickedIds(emptySlots(getPartySizeSlotCount(selectedChain.partySize)))
  }, [selectedChainId, selectedChain.partySize])

  const selectedCharacterIds = useMemo(
    () => pickedIds.filter((id): id is string => id !== null),
    [pickedIds],
  )

  const expeditionActive = campaign.expedition !== null
  const rosterOk = campaign.characters.length >= requiredCount
  const squadReady =
    rosterOk &&
    selectedCharacterIds.length === requiredCount &&
    new Set(selectedCharacterIds).size === selectedCharacterIds.length
  const canStartExpedition = !inBattle && !expeditionActive && squadReady

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

      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Expedition
      </Typography.Title>

      {expeditionActive ? (
        <Typography.Text type="secondary">
          Expedition активна: {campaign.expedition!.scenarioChainId}, бой{' '}
          {campaign.expedition!.battleIndex + 1} / {campaign.expedition!.battleCount}
        </Typography.Text>
      ) : (
        <>
          <Space wrap style={{ width: '100%' }}>
            <Select
              aria-label="Цепочка expedition"
              style={{ minWidth: 220 }}
              value={selectedChainId}
              onChange={setSelectedChainId}
              options={EXPEDITION_CHAINS.map((chain) => ({
                value: chain.id,
                label: chain.id,
              }))}
            />
            <Typography.Text type="secondary">
              Бойцов: {formatConfigPreview(selectedChain.partySize)} · Боёв:{' '}
              {formatConfigPreview(selectedChain.battleCount)}
            </Typography.Text>
          </Space>

          <SquadPicker
            campaign={campaign}
            slotCount={slotCount}
            requiredCount={requiredCount}
            selectedIds={pickedIds}
            disabled={inBattle}
            onChange={setPickedIds}
          />

          <Button
            type="primary"
            disabled={!canStartExpedition}
            icon={<RocketOutlined />}
            onClick={() => onStartExpedition(selectedChainId, selectedCharacterIds)}
          >
            Начать expedition
          </Button>
        </>
      )}
    </Space>
  )
}
