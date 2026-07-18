import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getExpeditionChainsByTier } from '../../game/expedition/config'
import { BattleModeGrid } from './BattleModeGrid'

describe('BattleModeGrid', () => {
  it('renders section title and tile labels', () => {
    const html = renderToStaticMarkup(
      createElement(BattleModeGrid, {
        title: 'Скоро',
        soon: true,
        chains: getExpeditionChainsByTier('soon'),
        onSelect: () => {},
      }),
    )
    expect(html).toContain('Скоро')
    expect(html).toContain('Тест: один бой')
    expect(html).toContain('game-mode-section--soon')
  })

  it('returns null when chains empty', () => {
    const html = renderToStaticMarkup(
      createElement(BattleModeGrid, { chains: [], onSelect: () => {} }),
    )
    expect(html).toBe('')
  })
})
