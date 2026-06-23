import { manhattan } from '../battle/grid'
import { resolveCardDamageTags } from '../battle/enemyResists'
import type { BattleState, PassiveInstance, Unit } from '../types'
import { passiveTierMult } from './passiveBonus'

function equippedPassives(state: BattleState, unitId: string): readonly PassiveInstance[] {
  return state.passivesByUnitId?.[unitId] ?? []
}

function hasPassive(passives: readonly PassiveInstance[], templateId: string): PassiveInstance | undefined {
  return passives.find((p) => p.templateId === templateId)
}

function scaledPercent(base: number, passive: PassiveInstance): number {
  return base * passiveTierMult(passive.global_level)
}

/** −25% healing for heroes adjacent to an enemy with anti-heal aura. */
export function antiHealMultiplierFromAdjacentEnemies(
  battle: BattleState,
  target: Unit,
): number {
  if (target.side !== 'player') return 1
  let mult = 1
  for (const enemy of battle.units) {
    if (enemy.side !== 'enemy' || enemy.hp <= 0) continue
    const passives = equippedPassives(battle, enemy.id)
    if (!hasPassive(passives, 'enemy_anti_heal_aura')) continue
    if (manhattan(enemy.x, enemy.y, target.x, target.y) === 1) {
      mult *= 1 - scaledPercent(0.25, hasPassive(passives, 'enemy_anti_heal_aura')!)
    }
  }
  return mult
}

/** boss_ranged_ward: −50% ranged damage taken. */
export function mitigateEnemyRangedWard(
  state: BattleState,
  target: Unit,
  damage: number,
  attackKind: 'melee' | 'ranged' | 'aoe',
  damageTags: readonly string[],
): number {
  if (target.side !== 'enemy' || damage <= 0) return damage
  const isRanged =
    attackKind === 'ranged' ||
    attackKind === 'aoe' ||
    damageTags.includes('ranged')
  if (!isRanged) return damage
  const ward = hasPassive(equippedPassives(state, target.id), 'boss_ranged_ward')
  if (!ward) return damage
  const reduction = scaledPercent(0.5, ward)
  return Math.max(1, Math.round(damage * (1 - reduction)))
}

/** boss_ignore_armor: attacker ignores 50% of target defense mitigation. */
export function defenseMitigationFactor(
  state: BattleState,
  attacker: Unit,
  _target: Unit,
): number {
  if (attacker.side !== 'enemy') return 1
  const ignore = hasPassive(equippedPassives(state, attacker.id), 'boss_ignore_armor')
  if (!ignore) return 1
  return 1 - scaledPercent(0.5, ignore)
}

/** enemy_holy_ward / enemy_dark_affinity on enemy card attacks. */
export function applyEnemyAffinityDamageMult(
  state: BattleState,
  attacker: Unit,
  damage: number,
  fromCard?: { templateId: string },
): number {
  if (attacker.side !== 'enemy' || damage <= 0 || !fromCard) return damage
  const passives = equippedPassives(state, attacker.id)
  const tags = resolveCardDamageTags(fromCard.templateId)
  let mult = 1
  const holy = hasPassive(passives, 'enemy_holy_ward')
  if (holy && tags.includes('holy')) {
    mult += scaledPercent(0.2, holy)
  }
  const dark = hasPassive(passives, 'enemy_dark_affinity')
  if (dark && tags.includes('dark')) {
    mult += scaledPercent(0.15, dark)
  }
  return Math.round(damage * mult)
}

export function bossNoFlankDefenseBonus(
  passives: readonly PassiveInstance[],
): number {
  const flank = hasPassive(passives, 'boss_no_flank')
  if (!flank) return 0
  return 2
}
