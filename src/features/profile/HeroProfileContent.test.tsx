import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { HeroProfileContent } from './HeroProfileContent'

describe('HeroProfileContent', () => {
  it('hubCharacterSummary hides gear multipliers and expected HP', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(HeroProfileContent, {
        mode: 'hub',
        campaign,
        battle: null,
        characterId: campaign.characters[0]!.id,
        hubCharacterSummary: true,
      }),
    )
    expect(html).toContain('★')
    expect(html).not.toContain('Ожидаемый max')
    expect(html).not.toMatch(/Экипировка:.*×/)
  })
})
