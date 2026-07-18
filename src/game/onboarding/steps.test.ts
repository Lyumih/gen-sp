import { describe, expect, it } from 'vitest'
import { ONBOARDING_STEPS } from './steps'

describe('ONBOARDING_STEPS', () => {
  it('first_battle_started has hint pointing to battle tab', () => {
    const step = ONBOARDING_STEPS.find((s) => s.id === 'first_battle_started')
    expect(step?.hint).toContain('Бой')
  })

  it('expedition_started label mentions обучение', () => {
    const step = ONBOARDING_STEPS.find((s) => s.id === 'expedition_started')
    expect(step?.label).toContain('обучение')
  })
})
