import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CampaignHubNav } from './CampaignHubNav'

const baseProps = {
  activeTab: 'character' as const,
  onTabChange: () => {},
  unreadCodexCount: 0,
  shopDisabled: false,
  tavernDisabled: false,
  referenceDrawerOpen: false,
  referencePane: 'codex' as const,
  onCodexClick: () => {},
  onHelpClick: () => {},
}

describe('CampaignHubNav', () => {
  it('renders icon-only tabs with aria-labels', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        ...baseProps,
        activeTab: 'shop',
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
        ...baseProps,
        unreadCodexCount: 3,
      }),
    )
    expect(html).toContain('aria-label="Кодекс"')
    expect(html).toContain('3')
  })

  it('disables shop and tavern during expedition', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        ...baseProps,
        shopDisabled: true,
        tavernDisabled: true,
      }),
    )
    const disabledCount = html.match(/disabled/g)?.length ?? 0
    expect(disabledCount).toBeGreaterThanOrEqual(2)
  })

  it('keeps codex and help enabled when tabsDisabled', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        ...baseProps,
        tabsDisabled: true,
        shopDisabled: true,
        tavernDisabled: true,
      }),
    )
    const helpPos = html.indexOf('aria-label="Справка"')
    expect(helpPos).toBeGreaterThanOrEqual(0)
    const helpSlice = html.slice(helpPos, helpPos + 300)
    expect(helpSlice).not.toContain('disabled')
    const codexPos = html.indexOf('aria-label="Кодекс"')
    expect(codexPos).toBeGreaterThanOrEqual(0)
    const codexSlice = html.slice(codexPos, codexPos + 300)
    expect(codexSlice).not.toContain('disabled')
  })
})
