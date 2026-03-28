import { SCENARIOS } from './scenarios'

const BASE_SCENARIO_GOLD = 50

/** Золото за победу в сценарии по индексу в `SCENARIOS`. */
export function goldForScenarioVictory(scenarioSlotIndex: number): number {
  const sc = SCENARIOS[scenarioSlotIndex]
  if (!sc) return BASE_SCENARIO_GOLD
  return BASE_SCENARIO_GOLD + sc.enemies.length * 5
}
