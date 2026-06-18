import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { codexEntryId } from '../../game/codex/discovery'
import { CampaignCodexTab } from './CampaignCodexTab'

describe('CampaignCodexTab', () => {
  it('shows all item entries by default and marks undiscovered ones', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignCodexTab, {
        campaign: initialCampaignState(),
      }),
    )

    expect(html).toContain('Показать всё')
    expect(html).toContain('Открыто 0 / 3')
    expect(html).toContain('Деревянный меч')
    expect(html).toContain('не открыто')
  })

  it('marks newly discovered entries as unread', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignCodexTab, {
        campaign: {
          ...initialCampaignState(),
          codexDiscovered: [codexEntryId('item', 'wooden_sword')],
          codexSeenEntryIds: [],
        },
      }),
    )

    expect(html).toContain('Новое')
    expect(html).toContain('Открыто 1 / 3')
  })
})
