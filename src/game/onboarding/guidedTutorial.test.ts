import { describe, expect, it } from 'vitest'
import { GUIDED_TUTORIAL_STEPS } from './guidedTutorial'

describe('GUIDED_TUTORIAL_STEPS', () => {
  it('step 1 does not mention Ход button', () => {
    expect(GUIDED_TUTORIAL_STEPS[1]?.hint).not.toContain('«Ход»')
    expect(GUIDED_TUTORIAL_STEPS[1]?.hint).toContain('зелёную')
  })

  it('includes end turn step', () => {
    expect(GUIDED_TUTORIAL_STEPS.some((s) => s.hint.includes('Завершить ход'))).toBe(true)
  })
})
