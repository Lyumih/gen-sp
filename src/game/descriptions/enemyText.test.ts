import { describe, expect, it } from 'vitest'
import { describeEnemyCodex } from './enemyText'

describe('describeEnemyCodex', () => {
  it('returns label and base stat strip for grunt', () => {
    const d = describeEnemyCodex('grunt', 1)
    expect(d.label).toBe('Рядовой')
    expect(d.summaryLines.some((l) => l.includes('❤️8'))).toBe(true)
  })

  it('includes plague herald label and counter class', () => {
    const d = describeEnemyCodex('enemy_plague_herald')
    expect(d.label).toBe('Чумной вестник')
    expect(d.summaryLines.some((l) => l.includes('Лекарь'))).toBe(true)
    expect(d.detailLines.some((l) => l.includes('Нежить'))).toBe(true)
    expect(d.detailLines.some((l) => l.includes('Умения:'))).toBe(true)
    expect(d.detailLines.some((l) => l.includes('Пассивы:'))).toBe(true)
  })
})
