import type { PassiveInstance } from '../types'
import { rollCardLevelUp } from '../memento/rollCardLevelUp'
import { rollWithLuckyRetry } from '../specialization/resolve'

function resolveRoll(randomInt1to100: number | (() => number)): () => number {
  if (typeof randomInt1to100 === 'function') return randomInt1to100
  return () => randomInt1to100
}

export function applyPassiveProgress<T extends Pick<PassiveInstance, 'global_level' | 'uses_count'>>(
  passive: T,
  randomInt1to100: number | (() => number),
  options?: { lucky?: boolean },
): T & { leveledUp: boolean; effectTriggered: boolean } {
  const uses_count = passive.uses_count + 1
  const roll = resolveRoll(randomInt1to100)
  const leveledUp = options?.lucky
    ? rollWithLuckyRetry(passive.global_level, roll, true)
    : rollCardLevelUp(passive.global_level, roll())
  const global_level = leveledUp ? passive.global_level + 1 : passive.global_level
  return { ...passive, uses_count, global_level, leveledUp, effectTriggered: true }
}
