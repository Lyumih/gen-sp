import { describe, expect, it } from 'vitest'
import { getDevChains, getTrainingChain, getTrialChains } from './chainSections'

describe('chainSections', () => {
  it('getTrialChains excludes campaign-main', () => {
    expect(getTrialChains().every((c) => c.id !== 'campaign-main')).toBe(true)
    expect(getTrialChains()).toHaveLength(5)
  })

  it('getTrainingChain returns campaign-main', () => {
    expect(getTrainingChain()?.id).toBe('campaign-main')
  })

  it('getDevChains hides test mode by default', () => {
    expect(getDevChains(false)).toHaveLength(0)
    expect(getDevChains(true)[0]?.id).toBe('test-single-battle')
  })
})
