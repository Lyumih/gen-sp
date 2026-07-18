import { Alert, App, Space } from 'antd'
import { useEffect, useState } from 'react'
import { SCENARIOS } from '../../game/campaign/scenarios'
import {
  getChainMaxParty,
  getExpeditionChainById,
} from '../../game/expedition/config'
import {
  getDevChains,
  getTrainingChain,
  getTrialChains,
} from '../../game/expedition/chainSections'
import {
  countOccupiedSquadSlots,
  resolveExpeditionParty,
} from '../../game/expedition/resolveExpeditionParty'
import { getExpeditionChainLabel } from '../../game/expedition/expeditionLabels'
import { shouldOpenPartyPickModal } from '../../game/expedition/partyPick'
import { getPlaceholderModesBySection } from '../../game/modes/placeholders'
import type { CampaignState } from '../../game/types'
import { hasCompletedStep } from '../../game/onboarding/onboardingState'
import {
  isDevTestModeVisible,
  isFeaturedBattleModesVisible,
} from '../../game/onboarding/selectors'
import { GamePanel } from '../layout/GamePanel'
import { SquadAssemblyDnd } from '../character/SquadAssemblyDnd'
import { BattleModeGrid } from './BattleModeGrid'
import { BattleModePlaceholderGrid } from './BattleModePlaceholderGrid'
import { CampaignReplayModal } from './CampaignReplayModal'
import { ExpeditionOrphanPanel } from './ExpeditionOrphanPanel'
import { ExpeditionPartyPickModal } from './ExpeditionPartyPickModal'
import { useGameStore } from '../../store/gameStore'

function trainingBadge(campaign: CampaignState, done: boolean): string | undefined {
  if (done) return 'Пройдено · повторить'
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const label = scenario?.id ?? '…'
  return `Бой ${campaign.scenarioIndex + 1} / ${SCENARIOS.length} — ${label}`
}

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
  const hubBattleFocusSection = useGameStore((s) => s.hubBattleFocusSection)
  const setHubBattleFocusSection = useGameStore((s) => s.setHubBattleFocusSection)
  const [partyPickOpen, setPartyPickOpen] = useState(false)
  const [partyPickChainId, setPartyPickChainId] = useState<string | null>(null)
  const [replayOpen, setReplayOpen] = useState(false)

  const expeditionActive = campaign.expedition !== null
  const expeditionOrphan =
    expeditionActive && campaign.phase === 'hub' && !inBattle
  const modeDisabled = inBattle || expeditionActive
  const showFeaturedModes = isFeaturedBattleModesVisible(campaign)
  const showDevTestMode = isDevTestModeVisible(campaign)
  const training = getTrainingChain()
  const partyPickChain = partyPickChainId ? getExpeditionChainById(partyPickChainId) : undefined

  useEffect(() => {
    if (hubBattleFocusSection !== 'trials') return
    document.getElementById('hub-battle-section-trials')?.scrollIntoView({ behavior: 'smooth' })
    setHubBattleFocusSection(null)
  }, [hubBattleFocusSection, setHubBattleFocusSection])

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
      const soloTutorial =
        campaign.scenarioIndex === 0 &&
        !hasCompletedStep(campaign.onboarding, 'first_battle_won') &&
        !campaign.onboarding.skipMode
      if (soloTutorial) {
        onStartOrContinue()
        return
      }
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
            title="Испытания"
            sectionId="hub-battle-section-trials"
            chains={getTrialChains()}
            disabled={modeDisabled}
            onSelect={handleModeSelect}
          />
        ) : null}

        <BattleModeGrid
          title="Обучение"
          chains={training ? [training] : []}
          disabled={modeDisabled}
          getBadge={() => trainingBadge(campaign, done)}
          onSelect={handleModeSelect}
        />

        <BattleModePlaceholderGrid
          title="Roguelike"
          modes={getPlaceholderModesBySection('roguelike')}
        />

        <BattleModePlaceholderGrid
          title="PvP"
          modes={getPlaceholderModesBySection('pvp')}
        />

        {showDevTestMode ? (
          <BattleModeGrid
            title="Разработка"
            chains={getDevChains(true)}
            disabled={modeDisabled}
            onSelect={handleModeSelect}
          />
        ) : null}

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
