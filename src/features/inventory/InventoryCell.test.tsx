import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InventoryCell } from './InventoryCell'

describe('InventoryCell empty ghost', () => {
  it('adds inv-cell--empty-ghost when empty with emoji', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryCell, {
        state: 'empty',
        emoji: '⚔️',
        ariaLabel: 'Пустой слот умения',
      }),
    )
    expect(html).toContain('inv-cell--empty-ghost')
    expect(html).toContain('inv-cell--empty')
  })

  it('does not add ghost for generic empty cell without emoji', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryCell, {
        state: 'empty',
        ariaLabel: 'Пустой слот',
      }),
    )
    expect(html).toContain('inv-cell--empty')
    expect(html).not.toContain('inv-cell--empty-ghost')
  })

  it('does not add ghost when filled', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryCell, {
        state: 'filled',
        emoji: '⚔️',
        ariaLabel: 'Умение',
      }),
    )
    expect(html).not.toContain('inv-cell--empty-ghost')
  })
})
