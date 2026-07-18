import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getExpeditionChainById } from '../../game/expedition/config'
import { BattleModeTile } from './BattleModeTile'

describe('BattleModeTile', () => {
  it('renders label, description, and param emoji line', () => {
    const chain = getExpeditionChainById('chaotic-map')!
    const html = renderToStaticMarkup(
      createElement(BattleModeTile, {
        chain,
        onClick: () => {},
      }),
    )
    expect(html).toContain('Хаос')
    expect(html).toContain('👥1–4')
    expect(html).toContain('button')
  })
})
