import { describe, expect, it } from 'vitest'
import { getExpeditionChainLabel } from './expeditionLabels'

describe('getExpeditionChainLabel', () => {
  it('returns UI label for known chain', () => {
    expect(getExpeditionChainLabel('small-skirmish')).toBe('Дуэль')
  })

  it('falls back to id for unknown', () => {
    expect(getExpeditionChainLabel('unknown')).toBe('unknown')
  })
})
