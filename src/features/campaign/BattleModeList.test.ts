import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getExpeditionChainById } from '../../game/expedition/config'
import { BattleModeList } from './BattleModeList'
import { BATTLE_MODE_CATEGORY } from './battleModeCategories'

describe('BattleModeList', () => {
  it('renders horizontal strip with category on tile, no section h4', () => {
    const chain = getExpeditionChainById('chaotic-map')!
    const html = renderToStaticMarkup(
      createElement(BattleModeList, {
        entries: [{ kind: 'chain', chain, categoryLabel: BATTLE_MODE_CATEGORY.trial }],
        onSelectChain: () => {},
      }),
    )
    expect(html).toContain('game-mode-strip')
    expect(html).toContain('game-scroll-x')
    expect(html).toContain('Испытание')
    expect(html).toContain('Хаос')
    expect(html).not.toContain('game-mode-section__title')
  })
})
