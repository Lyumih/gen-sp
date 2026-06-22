import { describe, expect, it } from 'vitest'
import { SPEC_MOD_IDS } from '../content/modTemplates'
import { codexEntryId } from '../codex/registry'
import { describeCodexEntry } from '../codex/codexText'
import { describeCardModSummary, describeModCodex, describeModCombat } from './modText'

describe('describeModCombat', () => {
  it('formats damage mod with scaled percent at lm 0 and 50', () => {
    expect(describeModCombat('mod-damage-up', 0)).toContain('+50%')
    expect(describeModCombat('mod-damage-up', 50)).toContain('+75%')
  })

  it('formats self heal on use at lm 100', () => {
    expect(describeModCombat('mod-self-heal-on-use', 100)).toContain('+10 HP')
  })

  it('formats proc extra hit without lm scaling', () => {
    expect(describeModCombat('mod-double-strike', 50)).toContain('25%')
  })

  it('formats flat range mod at lm 100', () => {
    expect(describeModCombat('mod-range-up', 100)).toContain('+2')
  })
})

describe('describeCardModSummary', () => {
  it('returns null when no filled slots', () => {
    expect(describeCardModSummary([])).toBeNull()
    expect(describeCardModSummary([{ status: 'empty', offer: null }])).toBeNull()
  })

  it('joins filled mod combat lines', () => {
    const line = describeCardModSummary([
      { status: 'filled', templateId: 'mod-damage-up', lm: 0 },
      { status: 'filled', templateId: 'mod-crit-chance', lm: 10 },
    ])
    expect(line).toContain('Усиление урона')
    expect(line).toContain('Критический удар')
    expect(line).toContain(' · ')
  })
})

describe('describeModCodex', () => {
  it('returns label and description lines for kill_reward', () => {
    const d = describeModCodex('kill_reward')
    expect(d.label).toBe('Очки за убийство')
    expect(d.lines.some((l) => l.includes('побеждённого'))).toBe(true)
  })

  it('includes combat preview at lm 0 for spec mods', () => {
    for (const id of SPEC_MOD_IDS) {
      const d = describeModCodex(id)
      expect(d.lines[0]).toBe(describeModCombat(id, 0))
    }
  })
})

describe('describeCodexEntry mod category', () => {
  it('includes combat line for every spec mod id', () => {
    for (const templateId of SPEC_MOD_IDS) {
      const entry = {
        id: codexEntryId('mod', templateId),
        category: 'mod' as const,
        templateId,
        label: templateId,
      }
      const d = describeCodexEntry(entry)
      expect(d.summaryLines[0]).toBe(describeModCombat(templateId, 0))
      expect(d.detailLines[0]).toBe(describeModCombat(templateId, 0))
    }
  })
})
