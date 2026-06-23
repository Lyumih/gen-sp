import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { CharacterRosterView } from './CharacterRosterView'

const noop = () => {}

describe('CharacterRosterView', () => {
  it('compact variant omits drag hint and roster heading', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(CharacterRosterView, {
        campaign,
        selectedCharacterId: campaign.characters[0]!.id,
        inventoryCharacterId: campaign.characters[0]!.id,
        transferDisabled: false,
        squadLocked: false,
        activeDragId: null,
        onSelectCharacter: noop,
        onAssignToSquad: noop,
        onRemoveFromSquad: noop,
        variant: 'compact',
        showHeading: false,
      }),
    )
    expect(html).not.toContain('перетащи предмет')
    expect(html).not.toContain('Состав (')
  })

  it('full variant keeps StatStrip rating marker', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(CharacterRosterView, {
        campaign,
        selectedCharacterId: campaign.characters[0]!.id,
        inventoryCharacterId: campaign.characters[0]!.id,
        transferDisabled: true,
        squadLocked: true,
        activeDragId: null,
        onSelectCharacter: noop,
        onAssignToSquad: noop,
        onRemoveFromSquad: noop,
        variant: 'full',
      }),
    )
    expect(html).toContain('★')
    expect(html).toContain('Состав (')
  })
})
