import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { getPrimaryCharacter } from '../campaign/selectors'
import { migrateFromUnknown } from './migrate'
import { parseSave, serializeCampaign } from './serialize'
import { loadSave, saveSave, createDebouncedSave } from './localStorage'
describe('serialize / parse round-trip', () => {
  it('round-trips initial campaign state', () => {
    const s = initialCampaignState()
    const json = serializeCampaign(s)
    const back = parseSave(json)
    expect(back).not.toBeNull()
    expect(back!.scenarioIndex).toBe(s.scenarioIndex)
    expect(back!.worldPower).toBe(s.worldPower)
    expect(getPrimaryCharacter(back!).cards).toEqual(getPrimaryCharacter(s).cards)
    expect(back!.battleAttemptSnapshot).toBeNull()
    expect(back!.tower).toBeNull()
    expect(back!.onboarding.dismissedCoachMarkIds).toEqual([])
  })

  it('round-trips dismissed coach mark ids', () => {
    let s = initialCampaignState()
    s = {
      ...s,
      onboarding: {
        ...s.onboarding,
        dismissedCoachMarkIds: ['trials-intro'],
      },
    }
    const back = parseSave(serializeCampaign(s))
    expect(back!.onboarding.dismissedCoachMarkIds).toEqual(['trials-intro'])
  })
})

describe('unknown save version', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null and warns on unknown version', () => {
    const raw = JSON.stringify({
      version: 999,
      campaign: initialCampaignState(),
    })
    const result = parseSave(raw)
    expect(result).toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })

  it('migrateFromUnknown warns for wrong version', () => {
    const r = migrateFromUnknown({ version: 0, campaign: {} })
    expect(r).toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })
})

describe('loadSave / saveSave with injected storage', () => {
  it('writes and reads back', () => {
    const mem = new Map<string, string>()
    const storage: Storage = {
      get length() {
        return mem.size
      },
      clear: () => mem.clear(),
      getItem: (k) => mem.get(k) ?? null,
      key: (i) => [...mem.keys()][i] ?? null,
      removeItem: (k) => {
        mem.delete(k)
      },
      setItem: (k, v) => {
        mem.set(k, v)
      },
    }
    const s = initialCampaignState()
    saveSave(storage, s, 'k')
    const loaded = loadSave(storage, 'k')
    expect(loaded).not.toBeNull()
    expect(loaded!.phase).toBe(s.phase)
  })
})

describe('createDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flushes after delay', () => {
    const mem = new Map<string, string>()
    const storage: Storage = {
      get length() {
        return mem.size
      },
      clear: () => mem.clear(),
      getItem: (k) => mem.get(k) ?? null,
      key: (i) => [...mem.keys()][i] ?? null,
      removeItem: (k) => mem.delete(k),
      setItem: (k, v) => mem.set(k, v),
    }
    const debounced = createDebouncedSave(300, storage, 'k')
    const s = initialCampaignState()
    debounced(s)
    expect(mem.size).toBe(0)
    vi.advanceTimersByTime(300)
    const raw = mem.get('k')
    expect(raw).toBeDefined()
    const parsed = parseSave(raw!)
    expect(parsed?.scenarioIndex).toBe(0)
  })
})
