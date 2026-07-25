import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BattleEndTurnCell } from './BattleEndTurnCell'

describe('BattleEndTurnCell', () => {
  it('renders inv-cell with end-turn emoji', () => {
    const html = renderToStaticMarkup(
      createElement(BattleEndTurnCell, {
        disabled: false,
        onEndTurn: () => {},
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('⏭')
  })

  it('uses disabled state when disabled', () => {
    const html = renderToStaticMarkup(
      createElement(BattleEndTurnCell, {
        disabled: true,
        onEndTurn: () => {},
      }),
    )
    expect(html).toContain('inv-cell--disabled')
  })
})
