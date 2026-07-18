const SCENARIO_DISPLAY_LABELS: Record<string, string> = {
  tutorial: 'Первая схватка',
  'two-front': 'Два фронта',
  'boss-lite': 'Босс',
}

export function getScenarioDisplayLabel(scenarioId: string): string {
  return SCENARIO_DISPLAY_LABELS[scenarioId] ?? scenarioId
}
