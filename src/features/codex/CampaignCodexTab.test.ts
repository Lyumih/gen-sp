import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { codexEntriesByCategory } from '../../game/codex/registry'
import { codexEntryId } from '../../game/codex/discovery'
import { CampaignCodexTab } from './CampaignCodexTab'

describe('CampaignCodexTab', () => {
  it('shows class entries by default with starter warrior discovered', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignCodexTab, {
        campaign: initialCampaignState(),
      }),
    )

    const classTotal = codexEntriesByCategory('class').length
    expect(html).toContain('Показать всё')
    expect(html).toContain(`Открыто 1 / ${classTotal}`)
    expect(html).toContain('Воин')
    expect(html).toContain('Новое')
    expect(html).toContain('не открыто')
    expect(html).toContain('Классы')
  })

  it('marks newly discovered item entries as unread when viewing items', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignCodexTab, {
        campaign: {
          ...initialCampaignState(),
          codexDiscovered: [
            codexEntryId('class', 'warrior'),
            codexEntryId('item', 'wooden_sword'),
          ],
          codexSeenEntryIds: [codexEntryId('class', 'warrior')],
        },
        initialCategory: 'item',
      }),
    )

    expect(html).toContain('Деревянный меч')
    expect(html).toContain('Новое')
    const itemTotal = codexEntriesByCategory('item').length
    expect(html).toContain(`Открыто 1 / ${itemTotal}`)
  })
})
