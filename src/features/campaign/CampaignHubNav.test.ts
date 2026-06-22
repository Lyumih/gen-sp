import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CampaignHubNav } from './CampaignHubNav'

describe('CampaignHubNav', () => {
  it('renders codex tab with unread badge count', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'codex',
        onTabChange: () => {},
        unreadCodexCount: 3,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )

    expect(html).toContain('Кодекс')
    expect(html).toContain('3')
  })

  it('disables codex tab while battle is active', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'battle',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: true,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )

    expect(html).toContain('Кодекс')
    expect(html).toContain('disabled')
  })

  it('disables shop and tavern tabs during expedition', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'battle',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: true,
        tavernDisabled: true,
      }),
    )

    expect(html).toContain('Магазин')
    expect(html).toContain('Таверна')
    const disabledCount = html.match(/disabled/g)?.length ?? 0
    expect(disabledCount).toBeGreaterThanOrEqual(2)
  })
})
