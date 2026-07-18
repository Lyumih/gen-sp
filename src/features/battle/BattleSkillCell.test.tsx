import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { BattleSkillCell } from './BattleSkillCell'

describe('BattleSkillCell', () => {
  it('renders inv-cell with level badge', () => {
    const campaign = initialCampaignState()
    const character = campaign.characters[0]!
    const card = character.cards[0]
    if (!card) throw new Error('fixture needs a card')

    const html = renderToStaticMarkup(
      createElement(BattleSkillCell, {
        card: { ...card, cooldownRemaining: 0 },
        character,
        campaign,
        selected: false,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('inv-badge-level')
  })

  it('adds selected class when selected', () => {
    const campaign = initialCampaignState()
    const character = campaign.characters[0]!
    const card = character.cards[0]
    if (!card) throw new Error('fixture needs a card')

    const html = renderToStaticMarkup(
      createElement(BattleSkillCell, {
        card: { ...card, cooldownRemaining: 0 },
        character,
        campaign,
        selected: true,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell--selected')
  })
})
