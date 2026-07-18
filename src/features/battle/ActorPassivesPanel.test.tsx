import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { ActorPassivesPanel } from './ActorPassivesPanel'

describe('ActorPassivesPanel', () => {
  it('renders passive cells with inv-cell class', () => {
    const campaign = initialCampaignState()
    const character = campaign.characters[0]!
    const passive = character.passives[0]
    if (!passive) return

    const html = renderToStaticMarkup(
      createElement(ActorPassivesPanel, {
        passives: [passive],
        character,
        campaign,
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('inv-badge-level')
    expect(html).not.toContain('ant-list')
  })
})
