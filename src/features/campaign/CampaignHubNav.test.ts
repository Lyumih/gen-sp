import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CampaignHubNav } from './CampaignHubNav'

describe('CampaignHubNav', () => {
  it('renders icon-only tabs with aria-labels', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'shop',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )
    expect(html).toContain('aria-label="Персонаж"')
    expect(html).toContain('aria-label="Магазин"')
    expect(html).not.toContain('>Персонаж<')
    expect(html).not.toContain('>Бой<')
  })

  it('renders codex badge count', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 3,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )
    expect(html).toContain('aria-label="Кодекс"')
    expect(html).toContain('3')
  })

  it('disables shop and tavern during expedition', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: true,
        tavernDisabled: true,
      }),
    )
    const disabledCount = html.match(/disabled/g)?.length ?? 0
    expect(disabledCount).toBeGreaterThanOrEqual(2)
  })

  it('keeps help enabled when tabsDisabled', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: true,
        shopDisabled: true,
        tavernDisabled: true,
        tabsDisabled: true,
      }),
    )
    const helpPos = html.indexOf('aria-label="Справка"')
    expect(helpPos).toBeGreaterThanOrEqual(0)
    const helpSlice = html.slice(helpPos, helpPos + 300)
    expect(helpSlice).not.toContain('disabled')
  })
})
