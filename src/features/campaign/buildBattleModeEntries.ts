import { SCENARIOS } from '../../game/campaign/scenarios'
import {
  getDevChains,
  getTrainingChain,
  getTrialChains,
} from '../../game/expedition/chainSections'
import { getPlaceholderModesBySection } from '../../game/modes/placeholders'
import type { ExpeditionChainConfig } from '../../game/expedition/config'
import type { PlaceholderModeDef } from '../../game/modes/placeholders'
import type { CampaignState } from '../../game/types'
import { BATTLE_MODE_CATEGORY } from './battleModeCategories'

export type BattleModeListEntry =
  | {
      kind: 'chain'
      chain: ExpeditionChainConfig
      categoryLabel: string
      badge?: string
      scrollTargetId?: string
    }
  | {
      kind: 'placeholder'
      mode: PlaceholderModeDef
      categoryLabel: string
    }

function trainingBadge(campaign: CampaignState, done: boolean): string | undefined {
  if (done) return 'Пройдено · повторить'
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const label = scenario?.id ?? '…'
  return `Бой ${campaign.scenarioIndex + 1} / ${SCENARIOS.length} — ${label}`
}

export function buildBattleModeEntries(input: {
  campaign: CampaignState
  done: boolean
  showFeaturedModes: boolean
  showDevTestMode: boolean
}): readonly BattleModeListEntry[] {
  const { campaign, done, showFeaturedModes, showDevTestMode } = input
  const entries: BattleModeListEntry[] = []

  if (showFeaturedModes) {
    getTrialChains().forEach((chain, index) => {
      entries.push({
        kind: 'chain',
        chain,
        categoryLabel: BATTLE_MODE_CATEGORY.trial,
        ...(index === 0 ? { scrollTargetId: 'hub-battle-mode-trials' } : {}),
      })
    })
  }

  const training = getTrainingChain()
  if (training) {
    entries.push({
      kind: 'chain',
      chain: training,
      categoryLabel: BATTLE_MODE_CATEGORY.training,
      badge: trainingBadge(campaign, done),
    })
  }

  if (showFeaturedModes) {
    for (const mode of getPlaceholderModesBySection('roguelike')) {
      entries.push({
        kind: 'placeholder',
        mode,
        categoryLabel: BATTLE_MODE_CATEGORY.roguelike,
      })
    }

    for (const mode of getPlaceholderModesBySection('pvp')) {
      entries.push({
        kind: 'placeholder',
        mode,
        categoryLabel: BATTLE_MODE_CATEGORY.pvp,
      })
    }
  }

  if (showDevTestMode) {
    for (const chain of getDevChains(true)) {
      entries.push({
        kind: 'chain',
        chain,
        categoryLabel: BATTLE_MODE_CATEGORY.dev,
      })
    }
  }

  return entries
}
