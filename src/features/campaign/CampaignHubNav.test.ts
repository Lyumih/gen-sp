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

  it('highlights battle tab when battle context is active on another tab', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
        battleTabHighlighted: true,
      }),
    )

    expect(html).toContain('ant-btn-primary')
    expect(html).toContain('Бой')
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

  it('renders character tab first in tab order', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )

    const shopPos = html.indexOf('Магазин')
    const characterPos = html.indexOf('Персонаж')
    expect(characterPos).toBeGreaterThanOrEqual(0)
    expect(shopPos).toBeGreaterThan(characterPos)
  })

  it('renders help tab label and icon', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'help',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )

    expect(html).toContain('Справка')
  })

  it('keeps help tab enabled when tabsDisabled is true', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'battle',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: true,
        shopDisabled: true,
        tavernDisabled: true,
        tabsDisabled: true,
      }),
    )

    const helpPos = html.indexOf('Справка')
    const helpSlice = html.slice(helpPos, helpPos + 200)
    expect(helpSlice).not.toContain('disabled')
  })
})
