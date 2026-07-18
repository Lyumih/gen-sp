import { Alert, App, Space } from 'antd'
import { useMemo, useState } from 'react'
import {
  getChainMaxParty,
  getExpeditionChainById,
  getExpeditionChainsByTier,
} from '../../game/expedition/config'
import {
  countOccupiedSquadSlots,
  resolveExpeditionParty,
} from '../../game/expedition/resolveExpeditionParty'
import { getExpeditionChainLabel } from '../../game/expedition/expeditionLabels'
import { shouldOpenPartyPickModal } from '../../game/expedition/partyPick'
import type { CampaignState } from '../../game/types'
import { hasCompletedStep } from '../../game/onboarding/onboardingState'
import {
  isDevTestModeVisible,
  isFeaturedBattleModesVisible,
} from '../../game/onboarding/selectors'
import { GamePanel } from '../layout/GamePanel'
import { SquadAssemblyDnd } from '../character/SquadAssemblyDnd'
import { BattleModeGrid } from './BattleModeGrid'
import { CampaignReplayModal } from './CampaignReplayModal'
import { ExpeditionOrphanPanel } from './ExpeditionOrphanPanel'
import { ExpeditionPartyPickModal } from './ExpeditionPartyPickModal'

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
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots: (from: number, to: number) => void
}

export function CampaignBattleTab({
  campaign,
  done,
  inBattle,
  replaySlot,
  onReplaySlotChange,
  onStartOrContinue,
  onStartReplay,
  onStartExpedition,
  onSetSquadSlot,
  onSwapSquadSlots,
}: CampaignBattleTabProps) {
  const { message } = App.useApp()
  const [partyPickOpen, setPartyPickOpen] = useState(false)
  const [partyPickChainId, setPartyPickChainId] = useState<string | null>(null)
  const [replayOpen, setReplayOpen] = useState(false)

  const expeditionActive = campaign.expedition !== null
  const expeditionOrphan =
    expeditionActive && campaign.phase === 'hub' && !inBattle
  const modeDisabled = inBattle || expeditionActive
  const showFeaturedModes = isFeaturedBattleModesVisible(campaign)
  const showDevTestMode = isDevTestModeVisible(campaign)
  const soonChains = useMemo(
    () =>
      getExpeditionChainsByTier('soon').filter(
        (chain) => chain.id !== 'test-single-battle' || showDevTestMode,
      ),
    [showDevTestMode],
  )
  const partyPickChain = partyPickChainId ? getExpeditionChainById(partyPickChainId) : undefined

  const campaignBadge = (chainId: string): string | undefined => {
    if (chainId !== 'campaign-main' || done) return undefined
    return hasCompletedStep(campaign.onboarding, 'first_battle_won')
      ? 'Начать / продолжить бой'
      : 'Начать первый бой'
  }

  const handleModeSelect = (chainId: string) => {
    if (modeDisabled) return
    const chain = getExpeditionChainById(chainId)
    if (!chain) return

    const occupied = countOccupiedSquadSlots(campaign.squad)
    if (occupied < chain.partyMin) {
      message.error('Добавьте хотя бы одного бойца в отряд')
      return
    }

    if (chain.id === 'campaign-main') {
      if (done) {
        setReplayOpen(true)
        return
      }
      onStartOrContinue()
      return
    }

    const maxParty = getChainMaxParty(chain)
    if (shouldOpenPartyPickModal(occupied, maxParty)) {
      setPartyPickChainId(chain.id)
      setPartyPickOpen(true)
      return
    }

    const party = resolveExpeditionParty({ squad: campaign.squad, markedIds: [], maxParty })
    if (party.length < 1) {
      message.error('Добавьте хотя бы одного бойца в отряд')
      return
    }
    onStartExpedition(chain.id, party)
  }

  return (
    <div role="tabpanel">
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <GamePanel title="Отряд">
          <SquadAssemblyDnd
            campaign={campaign}
            disabled={modeDisabled}
            onSetSquadSlot={onSetSquadSlot}
            onSwapSquadSlots={onSwapSquadSlots}
          />
        </GamePanel>

        {expeditionOrphan ? <ExpeditionOrphanPanel campaign={campaign} /> : null}

        {expeditionActive && !expeditionOrphan ? (
          <Alert
            type="info"
            showIcon
            message="Недоступно во время экспедиции"
            description={`Экспедиция активна: ${getExpeditionChainLabel(
              campaign.expedition!.scenarioChainId,
            )}, бой ${campaign.expedition!.battleIndex + 1} / ${campaign.expedition!.battleCount}`}
          />
        ) : null}

        {showFeaturedModes ? (
          <BattleModeGrid
            chains={getExpeditionChainsByTier('featured')}
            disabled={modeDisabled}
            onSelect={handleModeSelect}
          />
        ) : null}

        <BattleModeGrid
          title="Скоро"
          soon
          chains={soonChains}
          disabled={modeDisabled}
          getBadge={(chain) => campaignBadge(chain.id)}
          onSelect={handleModeSelect}
        />

        {partyPickChain ? (
          <ExpeditionPartyPickModal
            open={partyPickOpen}
            chain={partyPickChain}
            campaign={campaign}
            maxParty={getChainMaxParty(partyPickChain)}
            onCancel={() => {
              setPartyPickOpen(false)
              setPartyPickChainId(null)
            }}
            onConfirm={(selectedCharacterIds) => {
              onStartExpedition(partyPickChain.id, selectedCharacterIds)
              setPartyPickOpen(false)
              setPartyPickChainId(null)
            }}
          />
        ) : null}

        <CampaignReplayModal
          open={replayOpen}
          replaySlot={replaySlot}
          onReplaySlotChange={onReplaySlotChange}
          onCancel={() => setReplayOpen(false)}
          onConfirm={() => {
            setReplayOpen(false)
            onStartReplay()
          }}
        />
      </Space>
    </div>
  )
}
