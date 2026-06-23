import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { ChestInventoryView } from './ChestInventoryView'

describe('ChestInventoryView', () => {
  it('hides intro text when showIntro is false', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(ChestInventoryView, {
        campaign,
        inBattle: false,
        onSellChestItem: () => {},
        showIntro: false,
      }),
    )
    expect(html).not.toContain('Общий сундук')
  })
})
