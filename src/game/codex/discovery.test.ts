import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { codexEntriesByCategory } from './registry'
import {
  codexEntryId,
  codexProgress,
  discoverCodexEntry,
  markCodexSeen,
  unreadCodexEntryIds,
  visibleCodexEntries,
} from './discovery'

describe('discoverCodexEntry', () => {
  it('is idempotent', () => {
    const id = codexEntryId('item', 'wooden_sword')
    const once = discoverCodexEntry([], id)
    const twice = discoverCodexEntry(once, id)
    expect(twice).toEqual(once)
    expect(once).toEqual([id])
  })
})

describe('visibleCodexEntries', () => {
  it('hides undiscovered when showAll is false', () => {
    const campaign = {
      ...initialCampaignState(),
      codexDiscovered: [codexEntryId('item', 'wooden_sword')],
      codexSeenEntryIds: [],
    }
    const visible = visibleCodexEntries(campaign, 'item', false)
    expect(visible).toHaveLength(1)
    expect(visible[0]?.templateId).toBe('wooden_sword')
  })

  it('shows all catalog entries when showAll is true', () => {
    const campaign = initialCampaignState()
    const visible = visibleCodexEntries(campaign, 'item', true)
    expect(visible.length).toBeGreaterThan(1)
  })
})

describe('codexProgress', () => {
  it('reports 0 opened and full catalog total for empty campaign', () => {
    const campaign = initialCampaignState()
    const { opened, total } = codexProgress(campaign, 'item')
    expect(opened).toBe(0)
    expect(total).toBe(codexEntriesByCategory('item').length)
  })
})

describe('unreadCodexEntryIds', () => {
  it('returns discovered minus seen', () => {
    const id = codexEntryId('card', 'strike')
    const campaign = {
      ...initialCampaignState(),
      codexDiscovered: [id],
      codexSeenEntryIds: [],
    }
    expect(unreadCodexEntryIds(campaign)).toEqual([id])
    const seen = markCodexSeen(campaign)
    expect(unreadCodexEntryIds(seen)).toEqual([])
  })
})
