import type { PassiveInstance } from '../types'
import { rollCardLevelUp } from '../memento/rollCardLevelUp'

export function applyPassiveProgress<T extends Pick<PassiveInstance, 'global_level' | 'uses_count'>>(
  passive: T,
  randomInt1to100: number,
): T & { leveledUp: boolean; effectTriggered: boolean } {
  const uses_count = passive.uses_count + 1
  const leveledUp = rollCardLevelUp(passive.global_level, randomInt1to100)
  const global_level = leveledUp ? passive.global_level + 1 : passive.global_level
  return { ...passive, uses_count, global_level, leveledUp, effectTriggered: true }
}
