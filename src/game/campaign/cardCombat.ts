import { applyAction, advanceBattleTurn } from '../battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { cellKey, inBounds, manhattan, wallSet } from '../battle/grid'
import { hasLineOfSight } from '../battle/lineOfSight'
import { canCastAoEAt, canHealTarget } from '../battle/rangeOverlay'
import { cellsInAoE } from '../battle/rangeOverlay'
import {
  appendUnitStatus,
  frenzyDefenseDebuff,
  statusForSkill,
} from '../battle/unitStatus'
import type { CardAttackTemplate } from '../content/cardTemplates'
import {
  getCardAttackTemplate,
  isHealKind,
  usesCardBuffDispatch,
} from '../content/cardTemplates'
import { getCharacter } from '../character/selectors'
import { applyCardUse } from '../memento/cardProgress'
import { modOfferSeed } from '../memento/carrierLevelChange'
import { applyItemUseRoll } from '../memento/itemProgress'
import { resolveCarrierTags } from '../mods/carrierTags'
import {
  applyAoeSizeMods,
  applyCooldownMods,
  applyRangeMods,
  type ModCombatContext,
} from '../mods/modPipeline'
import { resolveSkillForCard } from '../skills/resolveSkillForCard'
import type {
  BattleAction,
  BattlePlayerCard,
  BattleState,
  CampaignState,
  Unit,
} from '../types'

export type CardUseRoll = number

function cardModCombatContext(
  state: CampaignState,
  actorId: string,
  card: BattlePlayerCard,
  cardLevelRoll: number,
): ModCombatContext {
  let procIndex = 0
  return {
    carrierTags: resolveCarrierTags('card', card.templateId),
    modSlots: card.modSlots,
    rng: () => {
      procIndex += 1
      return (
        (modOfferSeed(
          `${state.battleAttemptId}:${actorId}:${card.id}:${cardLevelRoll}:proc${procIndex}`,
          0,
          0,
        ) %
          100) +
        1
      )
    },
  }
}

function battleModContext(ctx: ModCombatContext) {
  return { modSlots: ctx.modSlots, rng: ctx.rng }
}

function applyWeaponProgressOnAttackSkill(
  state: CampaignState,
  characterId: string,
  tmpl: CardAttackTemplate,
  roll: number,
): CampaignState {
  if (tmpl.statSource !== 'attack') return state
  const char = getCharacter(state, characterId)
  if (!char) return state
  const weaponId = char.equipment.weapon
  if (weaponId === null) return state
  const item = char.items.find((i) => i.id === weaponId)
  if (!item) return state
  const rolled = applyItemUseRoll(item, roll)
  const { leveledUp: _l, ...nextItem } = rolled
  return {
    ...state,
    characters: state.characters.map((c) =>
      c.id === characterId
        ? { ...c, items: c.items.map((i) => (i.id === weaponId ? nextItem : i)) }
        : c,
    ),
  }
}

function withStatuses(battle: BattleState, unitId: string, effects: ReturnType<typeof statusForSkill>[]): BattleState {
  const filtered = effects.filter((e): e is NonNullable<typeof e> => e !== null)
  if (filtered.length === 0) return battle
  return {
    ...battle,
    units: battle.units.map((u) => {
      if (u.id !== unitId) return u
      let next = u
      for (const e of filtered) next = appendUnitStatus(next, e)
      return next
    }),
    battleLog: [
      ...battle.battleLog,
      ...filtered.map((e) => ({
        type: 'status_applied' as const,
        unitId,
        statusKind: e.kind,
        sourceTemplateId: e.sourceTemplateId,
      })),
    ],
  }
}

function resolveAmount(
  state: CampaignState,
  actorId: string,
  actor: Unit,
  card: BattlePlayerCard,
  tmpl: CardAttackTemplate,
  modCtx: ModCombatContext,
) {
  const char = getCharacter(state, actorId)
  if (!char) return null
  return resolveSkillForCard(state, char, card, tmpl, modCtx, actor)
}

export function finalizeCardUse(
  state: CampaignState,
  _prevBattle: BattleState,
  nextBattle: BattleState,
  card: BattlePlayerCard,
  used: ReturnType<typeof applyCardUse>,
  roll: number,
  tmpl: CardAttackTemplate,
  actorId: string,
): CampaignState {
  let battle = nextBattle
  if (used.leveledUp) {
    battle = {
      ...battle,
      battleLog: [
        ...battle.battleLog,
        {
          type: 'card_level_up',
          cardId: card.id,
          templateId: card.templateId,
          fromLevel: card.global_level,
          toLevel: used.global_level,
          roll,
        },
      ],
    }
  }
  let nextState = applyWeaponProgressOnAttackSkill(state, actorId, tmpl, roll)
  return { ...nextState, battle }
}

export type CardAttackUseInput = {
  state: CampaignState
  battle: BattleState
  actorId: string
  actor: Unit
  card: BattlePlayerCard
  target: Unit
  roll: CardUseRoll
}

export function dispatchCardAttackUse(input: CardAttackUseInput): CampaignState | null {
  const { state, battle, actorId, actor, card, target, roll } = input
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return null

  const modCtx = cardModCombatContext(state, actorId, card, roll)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  const walls = wallSet(battle.walls)

  if (tmpl.kind === 'melee' || tmpl.kind === 'dot') {
    if (!canMeleeAttack(actor, target)) return null
  } else if (!canRangedAttack(actor, target, effectiveRange, walls)) {
    return null
  }

  const resolved = resolveAmount(state, actorId, actor, card, tmpl, modCtx)
  if (!resolved) return null

  const used = applyCardUse(card, roll)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = { ...used, cooldownRemaining: cd }
  const fromCard = { cardId: card.id, templateId: card.templateId }

  const battleAction: BattleAction =
    tmpl.kind === 'melee' || tmpl.kind === 'dot'
      ? {
          type: 'attack',
          attackerId: actorId,
          targetId: target.id,
          damage: resolved.amount,
          kind: 'melee',
          fromCard,
          modCtx: battleModContext(modCtx),
        }
      : {
          type: 'attack',
          attackerId: actorId,
          targetId: target.id,
          damage: resolved.amount,
          kind: 'ranged',
          maxRange: effectiveRange,
          fromCard,
          modCtx: battleModContext(modCtx),
        }

  let bWithCards: BattleState = {
    ...battle,
    playerCardsByUnitId: {
      ...battle.playerCardsByUnitId,
      [actorId]: (battle.playerCardsByUnitId[actorId] ?? []).map((c) =>
        c.id === card.id ? nextCard : c,
      ),
    },
    skipHeroCooldownTick: cd > 0 ? true : battle.skipHeroCooldownTick,
  }

  let nextBattle = applyAction(bWithCards, battleAction)

  if (tmpl.kind === 'dot') {
    const status = statusForSkill(card.templateId, resolved.effectPower)
    nextBattle = withStatuses(nextBattle, target.id, [status])
  }

  if (tmpl.kind === 'lifesteal_spell' && resolved.amount > 0) {
    const healAmt = Math.round(resolved.amount * 0.5)
    nextBattle = applyAction(nextBattle, {
      type: 'heal',
      healerId: actorId,
      targetId: actorId,
      amount: healAmt,
      fromCard,
      modCtx: battleModContext(modCtx),
    })
  }

  if (tmpl.kind === 'utility') {
    const status = statusForSkill(card.templateId, resolved.effectPower)
    nextBattle = withStatuses(nextBattle, target.id, [status])
  }

  return finalizeCardUse(state, battle, nextBattle, card, used, roll, tmpl, actorId)
}

export type CardAoEUseInput = {
  state: CampaignState
  battle: BattleState
  actorId: string
  actor: Unit
  card: BattlePlayerCard
  targetX: number
  targetY: number
  roll: CardUseRoll
}

export function dispatchCardAoEUse(input: CardAoEUseInput): CampaignState | null {
  const { state, battle, actorId, actor, card, targetX, targetY, roll } = input
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || tmpl.aoeSize === undefined) return null
  if (!inBounds(targetX, targetY, battle.width, battle.height)) return null

  const walls = wallSet(battle.walls)
  if (walls.has(cellKey(targetX, targetY))) return null

  const modCtx = cardModCombatContext(state, actorId, card, roll)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  if (!canCastAoEAt(actor, targetX, targetY, effectiveRange, walls)) return null

  const resolved = resolveAmount(state, actorId, actor, card, tmpl, modCtx)
  if (!resolved) return null

  const used = applyCardUse(card, roll)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = { ...used, cooldownRemaining: cd }
  const aoeSize = applyAoeSizeMods(tmpl.aoeSize, modCtx)
  const fromCard = { cardId: card.id, templateId: card.templateId }

  const damage = tmpl.kind === 'utility' && card.templateId === 'smoke_bomb' ? 0 : resolved.amount

  let bWithCards: BattleState = {
    ...battle,
    playerCardsByUnitId: {
      ...battle.playerCardsByUnitId,
      [actorId]: (battle.playerCardsByUnitId[actorId] ?? []).map((c) =>
        c.id === card.id ? nextCard : c,
      ),
    },
    skipHeroCooldownTick: cd > 0 ? true : battle.skipHeroCooldownTick,
  }

  let nextBattle = applyAction(bWithCards, {
    type: 'aoe_strike',
    attackerId: actorId,
    centerX: targetX,
    centerY: targetY,
    damage,
    aoeSize,
    fromCard,
    modCtx: battleModContext(modCtx),
  })

  if (card.templateId === 'smoke_bomb') {
    const cells = cellsInAoE(targetX, targetY, aoeSize, battle.width, battle.height)
    for (const u of nextBattle.units) {
      if (u.side !== 'enemy' || u.hp <= 0) continue
      if (!cells.has(cellKey(u.x, u.y))) continue
      const status = statusForSkill('smoke_bomb', resolved.effectPower)
      nextBattle = withStatuses(nextBattle, u.id, [status])
    }
  }

  return finalizeCardUse(state, battle, nextBattle, card, used, roll, tmpl, actorId)
}

export type CardHealUseInput = {
  state: CampaignState
  battle: BattleState
  actorId: string
  actor: Unit
  card: BattlePlayerCard
  target: Unit
  roll: CardUseRoll
}

function canHealOrResurrect(
  hero: Unit,
  target: Unit,
  maxRange: number,
  walls: ReadonlySet<string>,
  kind: CardAttackTemplate['kind'],
): boolean {
  const d = manhattan(hero.x, hero.y, target.x, target.y)
  if (d > maxRange) return false
  if (d > 0 && !hasLineOfSight(hero.x, hero.y, target.x, target.y, walls)) return false
  if (kind === 'resurrect') {
    return target.side === 'player' && target.hp <= 0
  }
  return canHealTarget(hero, target, maxRange, walls)
}

export function dispatchCardHealUse(input: CardHealUseInput): CampaignState | null {
  const { state, battle, actorId, actor, card, target, roll } = input
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || !isHealKind(tmpl.kind)) return null

  const walls = wallSet(battle.walls)
  const modCtx = cardModCombatContext(state, actorId, card, roll)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  if (!canHealOrResurrect(actor, target, effectiveRange, walls, tmpl.kind)) return null

  const resolved = resolveAmount(state, actorId, actor, card, tmpl, modCtx)
  if (!resolved) return null

  const used = applyCardUse(card, roll)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = { ...used, cooldownRemaining: cd }
  const fromCard = { cardId: card.id, templateId: card.templateId }

  let bWithCards: BattleState = {
    ...battle,
    playerCardsByUnitId: {
      ...battle.playerCardsByUnitId,
      [actorId]: (battle.playerCardsByUnitId[actorId] ?? []).map((c) =>
        c.id === card.id ? nextCard : c,
      ),
    },
    skipHeroCooldownTick: cd > 0 ? true : battle.skipHeroCooldownTick,
  }

  let nextBattle: BattleState

  if (tmpl.kind === 'resurrect') {
    const hp = Math.max(1, Math.round(target.maxHp * 0.25))
    nextBattle = {
      ...bWithCards,
      units: bWithCards.units.map((u) =>
        u.id === target.id ? { ...u, hp, statusEffects: [] } : u,
      ),
      battleLog: [
        ...bWithCards.battleLog,
        { type: 'resurrect', healerId: actorId, targetId: target.id, hp, fromCard },
      ],
    }
    if (nextBattle.phase === 'ongoing') nextBattle = advanceBattleTurn(nextBattle)
  } else {
    nextBattle = applyAction(bWithCards, {
      type: 'heal',
      healerId: actorId,
      targetId: target.id,
      amount: resolved.amount,
      fromCard,
      modCtx: battleModContext(modCtx),
    })
    if (tmpl.kind === 'regen') {
      const status = statusForSkill('regeneration', resolved.effectPower)
      nextBattle = withStatuses(nextBattle, target.id, [status])
    }
  }

  return finalizeCardUse(state, battle, nextBattle, card, used, roll, tmpl, actorId)
}

export type CardBuffUseInput = {
  state: CampaignState
  battle: BattleState
  actorId: string
  actor: Unit
  card: BattlePlayerCard
  target: Unit
  roll: CardUseRoll
}

export function dispatchCardBuffUse(input: CardBuffUseInput): CampaignState | null {
  const { state, battle, actorId, actor, card, target, roll } = input
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl || !usesCardBuffDispatch(tmpl.kind)) return null

  if (target.side !== 'player') return null
  const walls = wallSet(battle.walls)
  const modCtx = cardModCombatContext(state, actorId, card, roll)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  const d = manhattan(actor.x, actor.y, target.x, target.y)
  if (d > effectiveRange) return null
  if (d > 0 && !hasLineOfSight(actor.x, actor.y, target.x, target.y, walls)) return null

  const resolved = resolveAmount(state, actorId, actor, card, tmpl, modCtx)
  if (!resolved) return null

  const used = applyCardUse(card, roll)
  const cd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const nextCard: BattlePlayerCard = { ...used, cooldownRemaining: cd }

  const status = statusForSkill(card.templateId, resolved.effectPower)
  const defDebuff = frenzyDefenseDebuff(card.templateId, resolved.effectPower)

  let nextBattle: BattleState = {
    ...battle,
    playerCardsByUnitId: {
      ...battle.playerCardsByUnitId,
      [actorId]: (battle.playerCardsByUnitId[actorId] ?? []).map((c) =>
        c.id === card.id ? nextCard : c,
      ),
    },
    skipHeroCooldownTick: cd > 0 ? true : battle.skipHeroCooldownTick,
  }

  nextBattle = withStatuses(nextBattle, target.id, [status, defDebuff])
  if (nextBattle.phase === 'ongoing') nextBattle = advanceBattleTurn(nextBattle)

  return finalizeCardUse(state, battle, nextBattle, card, used, roll, tmpl, actorId)
}
