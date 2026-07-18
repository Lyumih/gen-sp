import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { completeStep, DEFAULT_ONBOARDING } from '../../game/onboarding/onboardingState'
import { buildBattleModeEntries } from './buildBattleModeEntries'

describe('buildBattleModeEntries', () => {
  it('before first win only includes training chain', () => {
    const entries = buildBattleModeEntries({
      campaign: initialCampaignState(),
      done: false,
      showFeaturedModes: false,
      showDevTestMode: false,
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]?.kind).toBe('chain')
    if (entries[0]?.kind === 'chain') {
      expect(entries[0].chain.id).toBe('campaign-main')
      expect(entries[0].categoryLabel).toBe('Обучение')
    }
  })

  it('after first win puts trials first with scroll target on first trial', () => {
    const onboarding = completeStep(DEFAULT_ONBOARDING, 'first_battle_won')
    const entries = buildBattleModeEntries({
      campaign: { ...initialCampaignState(), onboarding },
      done: false,
      showFeaturedModes: true,
      showDevTestMode: false,
    })
    expect(entries[0]?.kind).toBe('chain')
    if (entries[0]?.kind === 'chain') {
      expect(entries[0].scrollTargetId).toBe('hub-battle-mode-trials')
      expect(entries[0].categoryLabel).toBe('Испытание')
    }
    expect(entries.some((e) => e.kind === 'chain' && e.chain.id === 'campaign-main')).toBe(true)
    expect(entries.some((e) => e.kind === 'placeholder')).toBe(true)
  })
})
