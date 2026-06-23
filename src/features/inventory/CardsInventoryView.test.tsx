import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { CardsInventoryView } from './CardsInventoryView'

const noop = () => {}

describe('CardsInventoryView', () => {
  it('does not render inline drag hint lines', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    const html = renderToStaticMarkup(
      createElement(CardsInventoryView, {
        campaign,
        characterId: heroId,
        inBattle: false,
        onReorderCards: noop,
        onSetBattleLoadout: noop,
        onSetPassiveEquip: noop,
        onSellCard: noop,
        onPickModOffer: noop,
        onRemoveMod: noop,
      }),
    )
    expect(html).not.toContain('перетащите')
    expect(html).toContain('В бой')
    expect(html).toContain('Коллекция навыков')
  })
})
