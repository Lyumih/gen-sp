import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HELP_ARTICLES } from '../../game/help/articles'
import { CampaignHelpTab } from './CampaignHelpTab'

describe('CampaignHelpTab', () => {
  it('renders all help sections including Memento Mori', () => {
    const html = renderToStaticMarkup(createElement(CampaignHelpTab))

    for (const article of HELP_ARTICLES) {
      expect(html).toContain(article.title)
    }
    expect(html).toContain('Memento Mori')
    expect(html).toContain('ant-collapse')
    expect(html).toContain('<strong>')
  })
})
