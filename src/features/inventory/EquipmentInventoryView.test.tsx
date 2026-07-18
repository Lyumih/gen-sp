import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { EquipmentInventoryView } from './EquipmentInventoryView'

const noop = () => {}

describe('EquipmentInventoryView character hub', () => {
  it('renders Экипировка before Активные умения', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    const html = renderToStaticMarkup(
      createElement(EquipmentInventoryView, {
        campaign,
        characterId: heroId,
        inBattle: false,
        onEquip: noop,
        onUnequip: noop,
        onReorderStash: noop,
        onInvalidSlot: noop,
        onPickModOffer: noop,
        onRemoveMod: noop,
        onSetBattleLoadout: noop,
        onSetPassiveEquip: noop,
        onReorderCards: noop,
        characterHub: {
          rail: createElement('span', { 'data-testid': 'rail' }, 'RAIL'),
          buildHeader: createElement('span', { 'data-testid': 'header' }, 'HEADER'),
          loadoutPanel: createElement('span', null, 'Активные умения'),
          renderStashTabs: (panel) =>
            createElement('div', null, panel, createElement('span', null, 'STASH')),
        },
      }),
    )
    expect(html).toContain('Экипировка')
    expect(html).not.toContain('Надето')
    const equipIdx = html.indexOf('Экипировка')
    const skillsIdx = html.indexOf('Активные умения')
    expect(equipIdx).toBeGreaterThan(-1)
    expect(skillsIdx).toBeGreaterThan(equipIdx)
  })
})
