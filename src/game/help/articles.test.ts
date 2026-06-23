import { describe, expect, it } from 'vitest'
import { HELP_ARTICLE_ORDER, HELP_ARTICLES, helpArticleById } from './articles'

describe('help articles', () => {
  it('has unique ids in fixed order starting with about', () => {
    expect(HELP_ARTICLE_ORDER[0]).toBe('about')
    expect(HELP_ARTICLE_ORDER).toHaveLength(11)
    const ids = HELP_ARTICLES.map((a) => a.id)
    expect(ids).toEqual([...HELP_ARTICLE_ORDER])
    expect(new Set(ids).size).toBe(11)
  })

  it('every article has non-empty title and content', () => {
    for (const article of HELP_ARTICLES) {
      expect(article.title.trim().length).toBeGreaterThan(0)
      const hasParagraphs = article.paragraphs.some((p) => p.trim().length > 0)
      const hasBullets = article.bullets?.some((b) => b.trim().length > 0) ?? false
      expect(hasParagraphs || hasBullets).toBe(true)
      for (const p of article.paragraphs) {
        expect(p.trim().length).toBeGreaterThan(0)
      }
      if (article.bullets) {
        for (const b of article.bullets) {
          expect(b.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('memento article mentions three progression axes', () => {
    const memento = helpArticleById('memento')
    const text = [
      memento.title,
      ...memento.paragraphs,
      ...(memento.bullets ?? []),
    ].join(' ')
    expect(text).toContain('Memento Mori')
    expect(text).toContain('Смерть')
    expect(text).toContain('Использование')
    expect(text).toContain('Победа')
  })
})
