export const DEFAULT_MOD_KILL_TEMPLATE_ID = 'kill_reward'

export type ModTemplate = {
  id: string
  label: string
  emoji?: string
  descriptionLines: readonly string[]
  /** All carrier tags must be present for the mod to appear in offers. */
  requires?: readonly string[]
  /** Mod is excluded when the carrier has any of these tags. */
  excludes?: readonly string[]
}

export const MOD_TEMPLATES: Readonly<Record<string, ModTemplate>> = {
  kill_reward: {
    id: 'kill_reward',
    label: 'Очки за убийство',
    emoji: '⚔️',
    descriptionLines: [
      'Начисляет очки первой модификации карты за каждого побеждённого врага.',
    ],
  },
}

export function getModTemplate(id: string): ModTemplate | undefined {
  return MOD_TEMPLATES[id]
}
