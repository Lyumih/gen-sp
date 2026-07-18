import { describe, expect, it } from 'vitest'
import { GOLD_TOOLTIP, worldPowerTooltip } from './resourceTooltips'

describe('resourceTooltips', () => {
  it('describes gold and world power for header tooltips', () => {
    expect(GOLD_TOOLTIP).toContain('Золото')
    expect(GOLD_TOOLTIP).toContain('магазине')
    expect(worldPowerTooltip(5)).toContain('Сила мира')
    expect(worldPowerTooltip(5)).toContain('+5%')
    expect(worldPowerTooltip(5)).toContain('Мир помнит')
  })
})
