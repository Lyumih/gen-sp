import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../../game/campaign/runReducer'
import { BattleBasicActionCell } from './BattleBasicActionCell'

function battleFixture() {
  const started = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
  const battle = started.battle
  if (!battle) throw new Error('expected battle')
  return battle
}

describe('BattleBasicActionCell', () => {
  it('renders inv-cell with move emoji', () => {
    const battle = battleFixture()
    const html = renderToStaticMarkup(
      createElement(BattleBasicActionCell, {
        kind: 'move',
        battle,
        effectiveRangedRange: 6,
        rangedCooldownRemaining: 0,
        selected: false,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('👟')
  })

  it('adds selected class when selected', () => {
    const battle = battleFixture()
    const html = renderToStaticMarkup(
      createElement(BattleBasicActionCell, {
        kind: 'melee',
        battle,
        effectiveRangedRange: 6,
        rangedCooldownRemaining: 0,
        selected: true,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell--selected')
  })
})
