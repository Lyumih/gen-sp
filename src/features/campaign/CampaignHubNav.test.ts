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
      }),
    )

    expect(html).toContain('Кодекс')
    expect(html).toContain('disabled')
  })
})
