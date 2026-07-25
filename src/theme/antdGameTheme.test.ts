import { describe, expect, it } from 'vitest'
import { antdGameTheme } from './antdGameTheme'

describe('antdGameTheme', () => {
  it('uses Golos Text and warm panel background', () => {
    expect(antdGameTheme.token?.fontFamily).toContain('Golos Text')
    expect(antdGameTheme.token?.colorBgContainer).toBe('#fffdf8')
  })

  it('uses warm primary accent', () => {
    expect(antdGameTheme.token?.colorPrimary).toBe('#8b6914')
    expect(antdGameTheme.token?.colorPrimaryHover).toBe('#735610')
  })
})
