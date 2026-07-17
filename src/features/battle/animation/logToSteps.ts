import type { BattleLogEntry } from '../../../game/types'
import { HERO_MOVE_RANGE } from '../../../game/battle/combat'
import { cellKey, manhattan } from '../../../game/battle/grid'
import { getCardAttackTemplate } from '../../../game/content/cardTemplateLookup'
import { UI_DAMAGE } from '../../../game/ui/labels'
import { isHolyBuffStatus, statusAuraPolarity } from './statusAuraMap'
import type { AnimationStep, Cell, LogToStepsContext } from './types'

function unitCell(ctx: LogToStepsContext, unitId: string): Cell | null {
  const u = ctx.units.find((x) => x.id === unitId)
  return u ? { x: u.x, y: u.y } : null
}

function appendDeath(
  steps: AnimationStep[],
  targetId: string,
  ctx: LogToStepsContext,
): AnimationStep[] {
  const at = unitCell(ctx, targetId)
  if (!at) return steps
  return [...steps, { kind: 'death', unitId: targetId, at }]
}

function projectileEmojiFromCard(fromCard?: { templateId: string }): string | undefined {
  if (!fromCard) return undefined
  const tmpl = getCardAttackTemplate(fromCard.templateId)
  return tmpl?.emoji ?? UI_DAMAGE
}

export function mapLogEntryToSteps(
  entry: BattleLogEntry,
  ctx: LogToStepsContext,
): AnimationStep[] {
  switch (entry.type) {
    case 'move': {
      const from = { x: entry.fromX, y: entry.fromY }
      const to = { x: entry.toX, y: entry.toY }
      const kind = manhattan(from.x, from.y, to.x, to.y) > HERO_MOVE_RANGE ? 'teleport' : 'move'
      return [{ kind, unitId: entry.unitId, from, to }]
    }
    case 'strike': {
      if (entry.damage === 0) {
        return [{ kind: 'cast', casterId: entry.attackerId, targetId: entry.targetId }]
      }
      let steps: AnimationStep[]
      if (entry.attackKind === 'melee') {
        steps = [{
          kind: 'strike_melee',
          attackerId: entry.attackerId,
          targetId: entry.targetId,
          damage: entry.damage,
        }]
      } else if (entry.attackKind === 'aoe') {
        const at = unitCell(ctx, entry.targetId)
        steps = [{
          kind: 'aoe_burst',
          center: at ?? { x: 0, y: 0 },
          cellKeys: at ? [cellKey(at.x, at.y)] : [],
        }]
      } else {
        steps = [{
          kind: 'projectile',
          attackerId: entry.attackerId,
          targetId: entry.targetId,
          damage: entry.damage,
          attackKind: 'ranged',
          projectileEmoji: projectileEmojiFromCard(entry.fromCard),
        }]
      }
      return entry.targetKilled ? appendDeath(steps, entry.targetId, ctx) : steps
    }
    case 'heal':
      return [{
        kind: 'heal',
        healerId: entry.healerId,
        targetId: entry.targetId,
        amount: entry.amount,
      }]
    case 'resurrect':
      return [{
        kind: 'resurrect',
        healerId: entry.healerId,
        targetId: entry.targetId,
        hp: entry.hp,
      }]
    case 'status_applied': {
      const polarity = statusAuraPolarity(entry.statusKind)
      if (polarity === 'buff') {
        return [{
          kind: 'buff_aura',
          unitId: entry.unitId,
          statusKind: entry.statusKind,
          holy: isHolyBuffStatus(entry.statusKind, entry.sourceTemplateId),
        }]
      }
      return [{
        kind: 'debuff_aura',
        unitId: entry.unitId,
        statusKind: entry.statusKind,
      }]
    }
    case 'status_tick': {
      if (entry.dotDamage !== undefined) {
        return [{ kind: 'status_tick_dot', unitId: entry.unitId, damage: entry.dotDamage }]
      }
      if (entry.regenHeal !== undefined) {
        return [{ kind: 'status_tick_regen', unitId: entry.unitId, amount: entry.regenHeal }]
      }
      return []
    }
    case 'card_level_up':
    case 'mod_proc':
    case 'passive_proc':
      return []
    default: {
      const _exhaustive: never = entry
      return _exhaustive
    }
  }
}

export function mapLogEntriesToSteps(
  entries: readonly BattleLogEntry[],
  ctx: LogToStepsContext,
): AnimationStep[] {
  return entries.flatMap((e) => mapLogEntryToSteps(e, ctx))
}
