import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { renderHelpInline } from './renderHelpText'

describe('renderHelpInline', () => {
  it('returns plain text unchanged', () => {
    expect(renderHelpInline('простой текст')).toBe('простой текст')
  })

  it('renders bold and italic markup', () => {
    const html = renderToStaticMarkup(
      createElement('span', null, renderHelpInline('система **Memento Mori** и *expedition*')),
    )
    expect(html).toContain('<strong>')
    expect(html).toContain('Memento Mori')
    expect(html).toContain('<i>')
    expect(html).toContain('expedition')
  })
})
