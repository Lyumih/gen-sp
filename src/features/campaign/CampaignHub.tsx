import { useEffect, useMemo, useState } from 'react'
import { App, Drawer, Space } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { getSpecializationTemplate } from '../../game/specialization/specializationTemplates'
import { getCharacter } from '../../game/character/selectors'
import { coachMarkById } from '../../game/onboarding/coachMarks'
import { hasCompletedStep } from '../../game/onboarding/onboardingState'
import { shouldShowCoachMarks } from '../../game/onboarding/selectors'
import type { EquipmentSlot } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { OnboardingChecklist } from '../onboarding/OnboardingChecklist'
import { MilestoneChecklist } from '../onboarding/MilestoneChecklist'
import { OnboardingCoachModal } from '../onboarding/OnboardingCoachModal'
import { PostBattleDebriefModal } from '../onboarding/PostBattleDebriefModal'
import { TutorialCompleteModal } from './TutorialCompleteModal'
import { WelcomeModal } from '../onboarding/WelcomeModal'
import { CampaignBattleTab } from './CampaignBattleTab'
import { CampaignCharacterTab } from './CampaignCharacterTab'
import { CampaignCodexTab } from '../codex/CampaignCodexTab'
import { CampaignHelpTab } from '../help/CampaignHelpTab'
import type { CampaignHubTab } from './campaignHubShared'
import { GameHeader } from './GameHeader'
import { GameShell } from '../layout/GameShell'
import { CampaignShopTab } from './CampaignShopTab'
import { CampaignTavernTab } from './CampaignTavernTab'

export function CampaignHub() {
  const { message, modal } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const activeTab = useGameStore((s) => s.hubActiveTab)
  const setHubActiveTab = useGameStore((s) => s.setHubActiveTab)
  const setHubBattleFocusSection = useGameStore((s) => s.setHubBattleFocusSection)
  const setChecklistExpanded = useGameStore((s) => s.setChecklistExpanded)
  const checklistExpanded = useGameStore((s) => s.onboardingUi.checklistExpanded)
  const dismissedCoachMarkIds = useGameStore((s) => s.onboardingUi.dismissedCoachMarkIds)
  const dismissCoachMark = useGameStore((s) => s.dismissCoachMark)
  const [goalsDrawerOpen, setGoalsDrawerOpen] = useState(false)
  const [replaySlot, setReplaySlot] = useState(0)
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const inBattle = campaign.battle !== null
  const expeditionActive = campaign.expedition !== null
  const unreadCodexCount = unreadCodexEntryIds(campaign).length
  const onboarding = campaign.onboarding

  const showWelcome =
    !onboarding.skipMode &&
    !onboarding.graduated &&
    !hasCompletedStep(onboarding, 'welcome_seen')

  const showVictoryDebrief =
    hasCompletedStep(onboarding, 'first_battle_won') &&
    !hasCompletedStep(onboarding, 'hub_after_first_win')

  const showTutorialComplete =
    done &&
    !onboarding.tutorialCompleteSeen &&
    (onboarding.graduated || onboarding.skipMode)

  const showPostGraduationGoals = onboarding.graduated || onboarding.skipMode

  const activeCoachId = useMemo(() => {
    if (!shouldShowCoachMarks(onboarding)) return null
    if (!hasCompletedStep(onboarding, 'welcome_seen')) return null

    const dismissed = new Set(dismissedCoachMarkIds)
    const pick = (id: string) => (dismissed.has(id) ? null : id)

    if (!hasCompletedStep(onboarding, 'first_battle_started')) {
      return activeTab === 'battle' ? pick('battle-start-solo') : pick('hub-battle-btn')
    }
    if (
      hasCompletedStep(onboarding, 'hub_after_first_win') &&
      !hasCompletedStep(onboarding, 'expedition_started')
    ) {
      if (activeTab === 'battle') {
        return pick('expedition-start') ?? pick('expedition-unlock')
      }
      if (!hasCompletedStep(onboarding, 'shop_visited')) {
        return pick('hub-shop-tab')
      }
      return pick('hub-gold')
    }
    if (
      hasCompletedStep(onboarding, 'first_battle_won') &&
      !hasCompletedStep(onboarding, 'hub_after_first_win')
    ) {
      return pick('hub-gold')
    }
    return null
  }, [activeTab, dismissedCoachMarkIds, onboarding])

  const activeCoach = activeCoachId ? coachMarkById(activeCoachId) : undefined

  useEffect(() => {
    const notice = campaign.pendingHubNotice
    if (!notice) return
    if (notice.kind === 'skill_drop') {
      message.success(`В сундук попало умение: ${getCardDisplayLabel(notice.templateId)}`)
    } else if (notice.kind === 'passive_drop') {
      const label = getPassiveTemplate(notice.templateId)?.label ?? notice.templateId
      message.success(`В сундук попал навык: ${label}`)
    } else if (notice.kind === 'dual_drop') {
      const skillLabel = getCardDisplayLabel(notice.skillTemplateId)
      const passiveLabel =
        getPassiveTemplate(notice.passiveTemplateId)?.label ?? notice.passiveTemplateId
      message.success(`В сундук попали: умение ${skillLabel} и навык ${passiveLabel}`)
    } else if (notice.kind === 'specialization_reveal') {
      const tmpl = getSpecializationTemplate(notice.specializationId)
      message.success(`Открыта склонность: ${tmpl?.emoji} ${tmpl?.label}`)
    }
    dispatchRun({ type: 'MARK_HUB_NOTICE_SEEN' })
  }, [campaign.pendingHubNotice, dispatchRun, message])

  const handleTabChange = (tab: CampaignHubTab) => {
    if (tab === activeTab) return
    if (tab === 'codex') {
      dispatchRun({ type: 'MARK_CODEX_SEEN' })
    }
    if (tab === 'shop') {
      dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'shop_visited' })
    }
    setHubActiveTab(tab)
  }

  const skipOnboarding = () => {
    dispatchRun({ type: 'SET_ONBOARDING_SKIP' })
    dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
    setChecklistExpanded(false)
  }

  const refreshShop = (free?: boolean) => {
    dispatchRun({ type: 'REFRESH_SHOP', seed: Date.now(), free })
  }

  const buyOffer = (
    offerIndex: number,
    destination?: 'chest' | 'character',
    characterId?: string,
  ) => {
    dispatchRun({ type: 'BUY_SHOP_OFFER', offerIndex, destination, characterId })
  }

  const sellChestItem = (itemId: string) => {
    dispatchRun({ type: 'SELL_CHEST_ITEM', itemId })
  }

  const sellItem = (characterId: string, itemId: string) => {
    dispatchRun({ type: 'SELL_ITEM', characterId, itemId })
  }

  const sellCard = (characterId: string, cardId: string) => {
    dispatchRun({ type: 'SELL_CARD', characterId, cardId })
  }

  const sellChestCard = (cardId: string) => {
    dispatchRun({ type: 'SELL_CHEST_CARD', cardId })
  }

  const sellChestPassive = (passiveId: string) => {
    dispatchRun({ type: 'SELL_UNBOUND_PASSIVE', passiveId })
  }

  const bindChestCard = (cardId: string, characterId: string) => {
    dispatchRun({ type: 'BIND_CHEST_CARD', cardId, characterId })
  }

  const bindChestPassive = (passiveId: string, characterId: string) => {
    dispatchRun({ type: 'BIND_PASSIVE_TO_CHARACTER', passiveId, characterId })
  }

  const moveChestItemToCharacter = (itemId: string, characterId: string) => {
    dispatchRun({ type: 'MOVE_CHEST_ITEM_TO_CHARACTER', itemId, characterId })
  }

  const moveCharacterItemToChest = (itemId: string, characterId: string) => {
    dispatchRun({ type: 'MOVE_CHARACTER_ITEM_TO_CHEST', itemId, characterId })
  }

  const equip = (characterId: string, itemId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'EQUIP_ITEM', characterId, itemId, slot })
  }

  const unequip = (characterId: string, slot: EquipmentSlot) => {
    dispatchRun({ type: 'UNEQUIP_ITEM', characterId, slot })
  }

  const reorderStash = (characterId: string, itemIds: string[]) => {
    dispatchRun({ type: 'REORDER_STASH', characterId, itemIds })
  }

  const reorderCards = (characterId: string, cardIds: string[]) => {
    dispatchRun({ type: 'REORDER_CARDS', characterId, cardIds })
  }

  const setBattleLoadout = (characterId: string, slotIndex: 0 | 1 | 2 | 3, cardId: string | null) => {
    dispatchRun({
      type: 'SET_BATTLE_LOADOUT',
      characterId,
      slotIndex,
      cardId,
    })
  }

  const setPassiveEquip = (
    characterId: string,
    slotIndex: 0 | 1 | 2 | 3 | 4,
    passiveId: string | null,
  ) => {
    dispatchRun({
      type: 'SET_PASSIVE_EQUIP',
      characterId,
      slotIndex,
      passiveId,
    })
  }

  const transferItem = (itemId: string, fromCharacterId: string, toCharacterId: string) => {
    dispatchRun({ type: 'TRANSFER_ITEM', itemId, fromCharacterId, toCharacterId })
  }

  const setSquadSlot = (slotIndex: number, characterId: string | null) => {
    dispatchRun({ type: 'SET_SQUAD_SLOT', slotIndex, characterId })
  }

  const swapSquadSlots = (from: number, to: number) => {
    dispatchRun({ type: 'SWAP_SQUAD_SLOTS', from, to })
  }

  const pickModOffer = (
    characterId: string,
    carrierKind: 'card' | 'item' | 'passive',
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => {
    dispatchRun({
      type: 'PICK_MOD_OFFER',
      characterId,
      carrierKind,
      carrierId,
      slotIndex,
      modTemplateId,
    })
  }

  const removeMod = (
    characterId: string,
    carrierKind: 'card' | 'item' | 'passive',
    carrierId: string,
    slotIndex: number,
  ) => {
    dispatchRun({
      type: 'REMOVE_MOD',
      characterId,
      carrierKind,
      carrierId,
      slotIndex,
    })
  }

  const releaseCharacter = (characterId: string) => {
    const character = getCharacter(campaign, characterId)
    if (!character) return
    modal.confirm({
      title: `Отпустить ${character.name}?`,
      content:
        'Все умения (карты и пассивки) будут удалены безвозвратно. Предметы перейдут в сундук.',
      okText: 'Отпустить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: () => {
        dispatchRun({ type: 'RELEASE_CHARACTER', characterId })
        message.success(`${character.name} отпущен`)
      },
    })
  }

  return (
    <GameShell>
      <WelcomeModal
        open={showWelcome}
        onStart={() => {
          dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
          setHubActiveTab('battle')
        }}
        onSkip={skipOnboarding}
      />

      <PostBattleDebriefModal
        kind="first_victory"
        open={showVictoryDebrief}
        onClose={() =>
          dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'hub_after_first_win' })
        }
        onGoShop={() => {
          dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'shop_visited' })
          setHubActiveTab('shop')
        }}
      />

      <TutorialCompleteModal
        open={showTutorialComplete}
        onClose={() => dispatchRun({ type: 'MARK_TUTORIAL_COMPLETE_SEEN' })}
        onGoTrials={() => {
          setHubActiveTab('battle')
          setHubBattleFocusSection('trials')
        }}
      />

      {activeCoach ? (
        <OnboardingCoachModal
          open
          title={activeCoach.title}
          text={activeCoach.text}
          onNext={() => dismissCoachMark(activeCoach.id)}
          onSkipAll={skipOnboarding}
        />
      ) : null}

      <GameHeader
        campaign={campaign}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCodexCount={unreadCodexCount}
        codexDisabled={inBattle}
        shopDisabled={expeditionActive}
        tavernDisabled={expeditionActive}
        onBattleClick={() => handleTabChange('battle')}
        onGoalsClick={() => setGoalsDrawerOpen(true)}
        showGoalsButton={onboarding.graduated || onboarding.skipMode}
      />

      <Drawer
        title="Цели"
        open={goalsDrawerOpen}
        onClose={() => setGoalsDrawerOpen(false)}
        size="small"
      >
        {showPostGraduationGoals ? (
          <MilestoneChecklist campaign={campaign} />
        ) : (
          <OnboardingChecklist campaign={campaign} />
        )}
      </Drawer>

      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {checklistExpanded && !onboarding.skipMode && !onboarding.graduated ? (
          <OnboardingChecklist campaign={campaign} />
        ) : null}
        {activeTab === 'battle' ? (
          <CampaignBattleTab
            campaign={campaign}
            done={done}
            inBattle={inBattle}
            scenarioIndex={campaign.scenarioIndex}
            scenarioId={scenario?.id}
            replaySlot={replaySlot}
            onReplaySlotChange={setReplaySlot}
            onStartOrContinue={() => dispatchRun({ type: 'START_OR_CONTINUE_BATTLE' })}
            onStartReplay={() =>
              dispatchRun({
                type: 'START_REPLAY_BATTLE',
                scenarioSlotIndex: replaySlot,
              })
            }
            onStartExpedition={(chainId, selectedCharacterIds) =>
              dispatchRun({ type: 'START_EXPEDITION', chainId, selectedCharacterIds })
            }
            onSetSquadSlot={setSquadSlot}
            onSwapSquadSlots={swapSquadSlots}
          />
        ) : null}

        {activeTab === 'character' ? (
          <CampaignCharacterTab
            campaign={campaign}
            inBattle={inBattle}
            expeditionActive={expeditionActive}
            onEquip={equip}
            onUnequip={unequip}
            onReorderStash={reorderStash}
            onReorderCards={reorderCards}
            onSetBattleLoadout={setBattleLoadout}
            onTransferItem={transferItem}
            onSellChestItem={sellChestItem}
            onSellChestCard={sellChestCard}
            onSellItem={sellItem}
            onSellCard={sellCard}
            onBindChestCard={bindChestCard}
            onBindChestPassive={bindChestPassive}
            onSellChestPassive={sellChestPassive}
            onMoveChestItemToCharacter={moveChestItemToCharacter}
            onMoveCharacterItemToChest={moveCharacterItemToChest}
            onReleaseCharacter={releaseCharacter}
            onSetPassiveEquip={setPassiveEquip}
            onPickModOffer={pickModOffer}
            onRemoveMod={removeMod}
            onInvalidSlot={() => message.warning('Не подходит к этому слоту')}
          />
        ) : null}

        {activeTab === 'shop' ? (
          <CampaignShopTab
            campaign={campaign}
            inBattle={inBattle}
            onRefreshShop={refreshShop}
            onBuyOffer={buyOffer}
            onInsufficientGold={() => message.warning('Недостаточно золота')}
            onSellChestItem={sellChestItem}
            onSellChestCard={sellChestCard}
            onSellChestPassive={sellChestPassive}
            onSellItem={sellItem}
            onBindChestCard={bindChestCard}
            onBindChestPassive={bindChestPassive}
            onMoveChestItemToCharacter={moveChestItemToCharacter}
            onUnequip={unequip}
          />
        ) : null}

        {activeTab === 'tavern' ? (
          <CampaignTavernTab
            campaign={campaign}
            inBattle={inBattle}
            onRefresh={() => dispatchRun({ type: 'REFRESH_TAVERN' })}
            onHire={(candidateId) =>
              dispatchRun({ type: 'HIRE_TAVERN_CANDIDATE', candidateId })
            }
            onInsufficientGold={() => message.warning('Недостаточно золота')}
          />
        ) : null}

        {activeTab === 'codex' ? <CampaignCodexTab campaign={campaign} /> : null}

        {activeTab === 'help' ? <CampaignHelpTab /> : null}
      </Space>
    </GameShell>
  )
}
