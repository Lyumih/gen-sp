import { describe, expect, it } from 'vitest'
import { GOLD_TOOLTIP, WORLD_POWER_TOOLTIP } from './resourceTooltips'

describe('resourceTooltips', () => {
  it('describes gold and world power for header tooltips', () => {
    expect(GOLD_TOOLTIP).toContain('Золото')
    expect(GOLD_TOOLTIP).toContain('магазине')
    expect(WORLD_POWER_TOOLTIP).toContain('Сила мира')
    expect(WORLD_POWER_TOOLTIP).toContain('+1%')
  })
})
