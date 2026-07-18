import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { SquadAssemblyPanel } from './SquadAssemblyPanel'

describe('SquadAssemblyPanel', () => {
  it('does not render Слот 1 label', () => {
    const html = renderToStaticMarkup(
      createElement(SquadAssemblyPanel, {
        campaign: initialCampaignState(),
        onSetSquadSlot: () => {},
        onSwapSquadSlots: () => {},
      }),
    )
    expect(html).not.toContain('Слот 1')
    expect(html).not.toContain('>Отряд<')
  })

  it('shows reserve column with пусто when no reserve characters', () => {
    const html = renderToStaticMarkup(
      createElement(SquadAssemblyPanel, {
        campaign: initialCampaignState(),
        onSetSquadSlot: () => {},
        onSwapSquadSlots: () => {},
      }),
    )
    expect(html).toContain('Резерв')
    expect(html).toContain('пусто')
  })
})
