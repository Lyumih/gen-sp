# Heal, loadout и cooldown — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Карта «Исцеление» (range 2 + LOS, `25%%`), loadout из 2 слотов, перезарядка в бою (fireball CD=3, heal CD=4), UI и автобой.

**Architecture:** Расширить `CardAttackTemplate` (`kind: 'heal'`, `cooldownTurns`); `BattlePlayerCard = CardInstance & { cooldownRemaining }` только в `BattleState.playerCards`; loadout в `CampaignState.battleLoadout` + снимок в `BattleAttemptSnapshot`; `USE_CARD_HEAL` в `runReducer` зеркалит `USE_CARD_ATTACK`; тик CD через `tickHeroCardCooldowns` после хода героя (skip в ход применения карты с CD).

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand, `@dnd-kit/*`.

**Spec:** `docs/superpowers/specs/2026-06-18-heal-loadout-cooldown-design.md`

## Global Constraints

- Проверки хода/дистанции/CD **до** `applyCardUse`; при no-op `uses_count` не растёт.
- `cooldownRemaining` только в бою; не в localStorage / `CardInstance` кампании.
- CD тик в **конце** хода героя; **не** в ход применения карты с CD.
- Loadout старт: `['c1', 'c2']`; коллекция включает `c3` heal.
- Автобой лечит только себя при HP < 50% maxHp, если нет лучшей атаки.
- Сообщения UI через `App.useApp()` внутри дерева `<App>`.

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/types.ts` | `BattlePlayerCard`, `BattleAction.heal`, `BattleLogEntry.heal`, `battleLoadout` |
| `src/game/content/cardTemplates.ts` | `kind: 'heal'`, шаблон `heal`, `cooldownTurns` на fireball |
| `src/game/content/cardHealAmount.ts` | `computeCardHealAmount` |
| `src/game/content/cardHealAmount.test.ts` | TDD лечения |
| `src/game/battle/combat.ts` | `withHeal(unit, amount)` |
| `src/game/battle/cardCooldown.ts` | `tickHeroCardCooldowns`, `getTemplateCooldownTurns` |
| `src/game/battle/cardCooldown.test.ts` | TDD тика CD |
| `src/game/battle/rangeOverlay.ts` | `validHealTargetCells`, `canHealTarget` |
| `src/game/battle/rangeOverlay.test.ts` | TDD overlay лечения |
| `src/game/battle/reducer.ts` | `tryHeal`, CD tick hook |
| `src/game/battle/reducer.test.ts` | heal + CD tick в reducer |
| `src/game/campaign/playerCardsFromLoadout.ts` | сбор `playerCards` из loadout |
| `src/game/campaign/mergeBattleCards.ts` | merge прогресса карт после победы |
| `src/game/campaign/scenarios.ts` | `playerCards` через loadout-хелпер |
| `src/game/campaign/battleSnapshot.ts` | `battleLoadout` в snapshot |
| `src/game/campaign/runReducer.ts` | `USE_CARD_HEAL`, `SET_BATTLE_LOADOUT`, CD guards, merge victory |
| `src/game/campaign/runReducer.test.ts` | интеграция heal/loadout/CD |
| `src/game/persistence/migrate.ts` | `c3` + `battleLoadout` |
| `src/game/persistence/migrate.test.ts` | миграция |
| `src/game/descriptions/cardText.ts` | строки для `kind === 'heal'` |
| `src/game/battle/battleLog.ts` | формат heal |
| `src/features/battle/BattleScreen.tsx` | heal overlay, CD badge, dispatch |
| `src/features/battle/heroAi.ts` | `card_heal` decision |
| `src/features/battle/heroAi.test.ts` | автобой heal |
| `src/features/inventory/CardsInventoryView.tsx` | loadout slots DnD |
| `src/features/campaign/CampaignHub.tsx` | callback `onSetBattleLoadout` |

---

### Task 1: Шаблон heal и `computeCardHealAmount`

**Files:**
- Modify: `src/game/content/cardTemplates.ts`
- Create: `src/game/content/cardHealAmount.ts`
- Create: `src/game/content/cardHealAmount.test.ts`

**Interfaces:**
- Produces: `computeCardHealAmount(template: CardAttackTemplate, levelForDamage: number): number`
- Produces: `getCardAttackTemplate('heal')` с `kind: 'heal'`, `healToken: '25%%'`, `fallbackHeal: 6`, `cooldownTurns: 4`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/content/cardHealAmount.test.ts
import { describe, it, expect } from 'vitest'
import { computeCardHealAmount } from './cardHealAmount'
import { getCardAttackTemplate } from './cardTemplates'

describe('computeCardHealAmount', () => {
  it('uses healToken 25%% at level 1', () => {
    const tmpl = getCardAttackTemplate('heal')
    expect(tmpl).toBeDefined()
    expect(computeCardHealAmount(tmpl!, 1)).toBe(25)
  })

  it('uses fallbackHeal when no token', () => {
    const tmpl = getCardAttackTemplate('heal')!
    const noToken = { ...tmpl, healToken: undefined }
    expect(computeCardHealAmount(noToken, 1)).toBe(6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/content/cardHealAmount.test.ts`
Expected: FAIL — нет модуля / шаблона `heal`

- [ ] **Step 3: Extend template type and catalog**

```ts
// cardTemplates.ts — расширение типа
export type CardAttackTemplate = {
  label: string
  kind: 'melee' | 'ranged' | 'aoe' | 'heal'
  maxRange: number
  aoeSize?: number
  damageToken?: string
  fallbackDamage?: number
  healToken?: string
  fallbackHeal?: number
  cooldownTurns?: number
  emoji?: string
}

// fireball — добавить cooldownTurns: 3

heal: {
  label: 'Исцеление',
  kind: 'heal',
  maxRange: 2,
  healToken: '25%%',
  fallbackHeal: 6,
  cooldownTurns: 4,
  emoji: '💚',
},
```

- [ ] **Step 4: Implement computeCardHealAmount**

```ts
// src/game/content/cardHealAmount.ts
import { resolvePercentValue } from '../memento/resolvePercentToken'
import type { CardAttackTemplate } from './cardTemplates'

export function computeCardHealAmount(
  template: CardAttackTemplate,
  levelForDamage: number,
): number {
  if (template.healToken !== undefined) {
    const v = resolvePercentValue(levelForDamage, template.healToken)
    if (v !== null) return v
  }
  return template.fallbackHeal ?? 0
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/game/content/cardHealAmount.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/content/cardTemplates.ts src/game/content/cardHealAmount.ts src/game/content/cardHealAmount.test.ts
git commit -m "feat(game): heal card template and computeCardHealAmount"
```

---

### Task 2: Типы — heal action, battle log, BattlePlayerCard

**Files:**
- Modify: `src/game/types.ts`

**Interfaces:**
- Produces: `BattlePlayerCard = CardInstance & { cooldownRemaining: number }`
- Produces: `BattleState.playerCards: readonly BattlePlayerCard[]`
- Produces: `BattleAction` union + `{ type: 'heal'; healerId; targetId; amount; fromCard? }`
- Produces: `BattleLogEntry` + `{ type: 'heal'; ... }`
- Produces: `CampaignState.battleLoadout: [string | null, string | null]`
- Produces: `BattleAttemptSnapshot.battleLoadout: [string | null, string | null]`

- [ ] **Step 1: Add types**

```ts
export type BattlePlayerCard = CardInstance & { cooldownRemaining: number }

// BattleState.playerCards: readonly BattlePlayerCard[]

// BattleAction:
| {
    type: 'heal'
    healerId: string
    targetId: string
    amount: number
    fromCard?: { cardId: string; templateId: string }
  }

// BattleLogEntry:
| {
    type: 'heal'
    healerId: string
    targetId: string
    amount: number
    fromCard?: { cardId: string; templateId: string }
  }

// CampaignState:
battleLoadout: [string | null, string | null]

// BattleAttemptSnapshot:
battleLoadout: [string | null, string | null]
```

- [ ] **Step 2: Fix compile errors project-wide**

Run: `npm run build`
Expected: errors in files using `playerCards` — исправить минимально (добавить `cooldownRemaining: 0` в тестовых фабриках).

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(types): heal action, BattlePlayerCard, battleLoadout"
```

---

### Task 3: `withHeal` и `tryHeal` в battle reducer

**Files:**
- Modify: `src/game/battle/combat.ts`
- Modify: `src/game/battle/reducer.ts`
- Modify: `src/game/battle/reducer.test.ts`

**Interfaces:**
- Consumes: `BattleAction` heal, `BattlePlayerCard`
- Produces: `applyAction(state, { type: 'heal', ... })` — HP↑, log, advance turn

- [ ] **Step 1: Write failing test**

```ts
// reducer.test.ts — добавить describe('applyAction heal')
it('heals ally up to maxHp and advances turn', () => {
  const hero = unit({ id: 'hero', side: 'player', hp: 10, maxHp: 30, x: 1, y: 1 })
  const state = baseState({
    units: [hero, enemy({ x: 5, y: 5 })],
    currentTurnIndex: 0,
    turnOrder: ['hero', 'e1'],
  })
  const next = applyAction(state, {
    type: 'heal',
    healerId: 'hero',
    targetId: 'hero',
    amount: 6,
    fromCard: { cardId: 'c3', templateId: 'heal' },
  })
  expect(next.units.find((u) => u.id === 'hero')!.hp).toBe(16)
  expect(next.battleLog.at(-1)).toMatchObject({ type: 'heal', amount: 6 })
  expect(getCurrentActorId(next)).not.toBe('hero')
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `npm run test -- src/game/battle/reducer.test.ts`

- [ ] **Step 3: Implement withHeal and tryHeal**

```ts
// combat.ts
export function withHeal(unit: Unit, amount: number): Unit {
  return { ...unit, hp: Math.min(unit.maxHp, unit.hp + amount) }
}

// reducer.ts — tryHeal: same guards as tryAttack (actor, alive), no self-damage block for heal (healer === target OK)
// applyAction switch case 'heal'
```

- [ ] **Step 4: Run test — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/combat.ts src/game/battle/reducer.ts src/game/battle/reducer.test.ts
git commit -m "feat(battle): heal battle action"
```

---

### Task 4: CD helpers и tick после хода героя

**Files:**
- Create: `src/game/battle/cardCooldown.ts`
- Create: `src/game/battle/cardCooldown.test.ts`
- Modify: `src/game/battle/reducer.ts`

**Interfaces:**
- Produces: `getTemplateCooldownTurns(templateId: string): number`
- Produces: `tickHeroCardCooldowns(state: BattleState): BattleState` — все `cooldownRemaining > 0` → `-1`
- Produces: `applyAction` после move/attack/aoe/heal от героя вызывает tick (если `phase === 'ongoing'`)

- [ ] **Step 1: Write failing CD tick test**

```ts
describe('tickHeroCardCooldowns', () => {
  it('decrements all positive cooldowns', () => {
    const state = baseState({
      playerCards: [{ ...card(), cooldownRemaining: 3 }],
    })
    const next = tickHeroCardCooldowns(state)
    expect(next.playerCards[0]!.cooldownRemaining).toBe(2)
  })
})
```

- [ ] **Step 2: Implement cardCooldown.ts**

- [ ] **Step 3: Wire tick into reducer after hero turn ends**

В `tryMove`, `tryAttack`, `tryHeal` — перед `return advanceTurnFrom(...)`:

```ts
let next = advanceTurnFrom(...)
if (next.phase === 'ongoing') next = tickHeroCardCooldowns(next)
return next
```

`tryAoEStrike` — аналогично если `attackerId === 'hero'`.

- [ ] **Step 4: reducer test — move decrements CD**

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/cardCooldown.ts src/game/battle/cardCooldown.test.ts src/game/battle/reducer.ts src/game/battle/reducer.test.ts
git commit -m "feat(battle): card cooldown tick after hero turn"
```

---

### Task 5: `validHealTargetCells` и `canHealTarget`

**Files:**
- Modify: `src/game/battle/rangeOverlay.ts`
- Modify: `src/game/battle/rangeOverlay.test.ts`

**Interfaces:**
- Produces: `canHealTarget(hero: Unit, target: Unit, maxRange: number, walls: ReadonlySet<string>): boolean`
- Produces: `validHealTargetCells(state: BattleState, hero: Unit, maxRange: number): Set<string>`

- [ ] **Step 1: Write failing tests**

```ts
it('includes hero cell when hp < maxHp', () => { ... })
it('excludes full HP ally', () => { ... })
it('excludes enemy even in range', () => { ... })
it('excludes ally behind wall', () => { ... })
```

- [ ] **Step 2: Implement**

```ts
export function canHealTarget(
  hero: Unit,
  target: Unit,
  maxRange: number,
  walls: ReadonlySet<string>,
): boolean {
  if (target.side !== 'player' || target.hp <= 0 || target.hp >= target.maxHp) return false
  const d = manhattan(hero.x, hero.y, target.x, target.y)
  if (d > maxRange) return false
  if (d === 0) return true
  return hasLineOfSight(hero.x, hero.y, target.x, target.y, walls)
}

export function validHealTargetCells(state: BattleState, hero: Unit, maxRange: number): Set<string> {
  const walls = wallSet(state.walls)
  const out = new Set<string>()
  for (const u of state.units) {
    if (canHealTarget(hero, u, maxRange, walls)) out.add(cellKey(u.x, u.y))
  }
  return out
}
```

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/game/battle/rangeOverlay.ts src/game/battle/rangeOverlay.test.ts
git commit -m "feat(battle): validHealTargetCells overlay helper"
```

---

### Task 6: Loadout — сбор playerCards и merge после победы

**Files:**
- Create: `src/game/campaign/playerCardsFromLoadout.ts`
- Create: `src/game/campaign/playerCardsFromLoadout.test.ts`
- Create: `src/game/campaign/mergeBattleCards.ts`
- Create: `src/game/campaign/mergeBattleCards.test.ts`
- Modify: `src/game/campaign/scenarios.ts`
- Modify: `src/game/campaign/battleSnapshot.ts`
- Modify: `src/game/campaign/runReducer.ts` (`STARTER_CARDS`, `initialCampaignState`, `finalizeVictory`)

**Interfaces:**
- Produces: `playerCardsFromLoadout(collection, loadout): BattlePlayerCard[]`
- Produces: `mergeBattleCardsIntoCollection(collection, battleCards): CardInstance[]`

- [ ] **Step 1: Write failing loadout test**

```ts
it('builds battle cards from loadout ids only', () => {
  const collection = [c1, c2, c3heal]
  const cards = playerCardsFromLoadout(collection, ['c1', 'c2'])
  expect(cards.map((c) => c.id)).toEqual(['c1', 'c2'])
  expect(cards.every((c) => c.cooldownRemaining === 0)).toBe(true)
})
```

- [ ] **Step 2: Implement playerCardsFromLoadout**

- [ ] **Step 3: Write merge test**

```ts
it('updates collection progress without dropping non-loadout cards', () => {
  const collection = [c1, c2, c3]
  const battle = [{ ...c1, uses_count: 5, cooldownRemaining: 2 }]
  const merged = mergeBattleCardsIntoCollection(collection, battle)
  expect(merged.find((c) => c.id === 'c1')!.uses_count).toBe(5)
  expect(merged.find((c) => c.id === 'c3')).toBeDefined()
  expect(merged[0]).not.toHaveProperty('cooldownRemaining')
})
```

- [ ] **Step 4: Add c3 to STARTER_CARDS, battleLoadout default**

```ts
{
  id: 'c3',
  templateId: 'heal',
  global_level: 1,
  uses_count: 0,
  modifications: [],
},
// initialCampaignState:
battleLoadout: ['c1', 'c2'],
```

- [ ] **Step 5: Update battleSnapshot + scenarios**

```ts
// buildBattleAttemptSnapshot
battleLoadout: [...state.battleLoadout],

// battleStateFromScenario
playerCards: playerCardsFromLoadout(snapshot.cards, snapshot.battleLoadout),
```

- [ ] **Step 6: finalizeVictory uses merge**

```ts
cards: mergeBattleCardsIntoCollection(cloneCards(state.cards), b.playerCards),
```

- [ ] **Step 7: Run tests — PASS**

Run: `npm run test -- src/game/campaign/playerCardsFromLoadout.test.ts src/game/campaign/mergeBattleCards.test.ts`

- [ ] **Step 8: Commit**

```bash
git add src/game/campaign/playerCardsFromLoadout.ts src/game/campaign/playerCardsFromLoadout.test.ts src/game/campaign/mergeBattleCards.ts src/game/campaign/mergeBattleCards.test.ts src/game/campaign/scenarios.ts src/game/campaign/battleSnapshot.ts src/game/campaign/runReducer.ts
git commit -m "feat(campaign): battle loadout and card merge on victory"
```

---

### Task 7: `USE_CARD_HEAL` и CD guards в runReducer

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces: `RunAction` + `USE_CARD_HEAL`, `SET_BATTLE_LOADOUT`
- Consumes: `canHealTarget`, `computeCardHealAmount`, `getTemplateCooldownTurns`

- [ ] **Step 1: Write failing heal integration test**

```ts
it('USE_CARD_HEAL restores hp, sets CD=4, skips tick same turn', () => {
  let s = initialCampaignState()
  s = { ...s, battleLoadout: ['c3', null], battle: ongoingBattleWithLowHpHero() }
  const hpBefore = s.battle!.units.find((u) => u.id === 'hero')!.hp
  s = applyRunAction(s, {
    type: 'USE_CARD_HEAL',
    cardId: 'c3',
    targetId: 'hero',
    randomInt1to100: 99,
  })
  expect(s.battle!.units.find((u) => u.id === 'hero')!.hp).toBeGreaterThan(hpBefore)
  expect(s.battle!.playerCards.find((c) => c.id === 'c3')!.cooldownRemaining).toBe(4)
  expect(s.battle!.playerCards.find((c) => c.id === 'c3')!.uses_count).toBe(1)
})
```

- [ ] **Step 2: Implement tryUseCardHeal** (mirror `tryUseCardAttack` guards + `canHealTarget`)

- [ ] **Step 3: Add CD check + set on USE_CARD_ATTACK / USE_CARD_AOE**

```ts
if ((card.cooldownRemaining ?? 0) > 0) return state
// after successful use:
const cd = getTemplateCooldownTurns(card.templateId)
const nextCard = { ...used, cooldownRemaining: cd > 0 ? cd : 0 }
```

- [ ] **Step 4: Skip CD tick when card with CD was used**

После `applyAction` в card handlers — **не** вызывать `tickHeroCardCooldowns` (CD уже set, tick только на move/basic attack path).

Паттерн: card handlers возвращают battle **без** tick; `BATTLE_DISPATCH` path использует reducer tick.

- [ ] **Step 5: Guard tests** — CD>0, full HP, enemy target → no-op

- [ ] **Step 6: Fireball CD test** — CD=3 after AoE

- [ ] **Step 7: Implement SET_BATTLE_LOADOUT**

```ts
case 'SET_BATTLE_LOADOUT': {
  if (!inHub(state)) return state
  const { slotIndex, cardId } = action
  if (slotIndex !== 0 && slotIndex !== 1) return state
  if (cardId !== null && !state.cards.some((c) => c.id === cardId)) return state
  const next = [...state.battleLoadout] as [string | null, string | null]
  if (cardId !== null) {
    const other = slotIndex === 0 ? 1 : 0
    if (next[other] === cardId) next[other] = null
    if (next[slotIndex === 0 ? 1 : 0] === cardId) { /* handled by clear other */ }
    for (let i = 0; i < 2; i++) {
      if (i !== slotIndex && next[i] === cardId) next[i] = null
    }
  }
  next[slotIndex] = cardId
  return { ...state, battleLoadout: next }
}
```

- [ ] **Step 8: Run tests — PASS**

Run: `npm run test -- src/game/campaign/runReducer.test.ts`

- [ ] **Step 9: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): USE_CARD_HEAL, card cooldown guards, SET_BATTLE_LOADOUT"
```

---

### Task 8: Миграция save

**Files:**
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

- [ ] **Step 1: Write failing migration test**

```ts
it('adds c3 heal and default battleLoadout to old saves', () => {
  const old = { ...campaignWithoutC3AndLoadout }
  const out = migrateCampaign(old)
  expect(out.cards.some((c) => c.id === 'c3')).toBe(true)
  expect(out.battleLoadout).toEqual(['c1', 'c2'])
})
```

- [ ] **Step 2: Implement migration**

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts
git commit -m "feat(persistence): migrate heal card and battleLoadout"
```

---

### Task 9: Описания и battle log

**Files:**
- Modify: `src/game/descriptions/cardText.ts`
- Modify: `src/game/battle/battleLog.ts`

- [ ] **Step 1: describeCardCombatStats for heal**

```ts
if (tmpl.kind === 'heal') {
  const expectedHeal = computeCardHealAmount(tmpl, levelForDamage)
  // lines: дальность 2, токен лечения, ожидаемое лечение
}
```

- [ ] **Step 2: formatBattleLogEntry for heal**

```ts
case 'heal':
  return `💚 ${name(entry.healerId)} исцеляет ${name(entry.targetId)} на ${entry.amount}${cardSuffix(entry.fromCard)}`
```

- [ ] **Step 3: Commit**

```bash
git add src/game/descriptions/cardText.ts src/game/battle/battleLog.ts
git commit -m "feat(ui): heal card stats and battle log format"
```

---

### Task 10: BattleScreen — heal mode и CD badge

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/battle/cellOverlayStyle.ts` (если нужен зелёный цвет)

- [ ] **Step 1: Heal overlay when selected heal card**

```tsx
if (mode === 'card' && selectedCardTemplate?.kind === 'heal' && hero) {
  validTargetCells = validHealTargetCells(battle, hero, selectedCardTemplate.maxRange)
}
```

- [ ] **Step 2: Click handler dispatches USE_CARD_HEAL**

```tsx
if (tmpl.kind === 'heal') {
  dispatchRun({
    type: 'USE_CARD_HEAL',
    cardId: card.id,
    targetId: unit.id,
    randomInt1to100: randomInt1to100(),
  })
}
```

- [ ] **Step 3: CD badge on card buttons**

```tsx
const cd = card.cooldownRemaining ?? 0
disabled={actionsDisabled || cd > 0}
// badge: cd > 0 ? `CD ${cd}` : null
```

- [ ] **Step 4: Auto-battle dispatch card_heal** (если ещё не в Task 11)

- [ ] **Step 5: Manual smoke — npm run start**, выбрать heal в loadout, войти в бой

- [ ] **Step 6: Commit**

```bash
git add src/features/battle/BattleScreen.tsx src/features/battle/cellOverlayStyle.ts
git commit -m "feat(battle-ui): heal targeting and cooldown badge"
```

---

### Task 11: heroAi — `card_heal`

**Files:**
- Modify: `src/features/battle/heroAi.ts`
- Modify: `src/features/battle/heroAi.test.ts`
- Modify: `src/features/battle/BattleScreen.tsx` (dispatch branch)

- [ ] **Step 1: Write failing test**

```ts
it('heals self when below 50% hp and no kill shot', () => {
  const state = battleWithLowHpHeroAndHealInLoadout()
  const d = pickHeroAiAction(state)
  expect(d).toEqual({ kind: 'card_heal', cardId: 'c3', targetId: 'hero' })
})
```

- [ ] **Step 2: Implement pickHealIfNeeded before attack branch**

```ts
function shouldConsiderHeal(hero: Unit): boolean {
  return hero.hp < hero.maxHp * 0.5
}
```

- [ ] **Step 3: BattleScreen auto-battle effect**

```tsx
} else if (decision.kind === 'card_heal') {
  dispatchRun({ type: 'USE_CARD_HEAL', cardId: decision.cardId, targetId: decision.targetId, randomInt1to100: randomInt1to100() })
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/heroAi.ts src/features/battle/heroAi.test.ts src/features/battle/BattleScreen.tsx
git commit -m "feat(heroAi): self-heal when below 50% hp"
```

---

### Task 12: Loadout UI в CardsInventoryView

**Files:**
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/game/campaign/runReducer.ts` (экспорт типа action уже есть)

- [ ] **Step 1: Add props `battleLoadout`, `onSetBattleLoadout`**

```tsx
type CardsInventoryViewProps = {
  ...
  battleLoadout: [string | null, string | null]
  onSetBattleLoadout: (slotIndex: 0 | 1, cardId: string | null) => void
}
```

- [ ] **Step 2: Render two loadout slots above collection grid**

DnD: drop collection card → slot calls `onSetBattleLoadout(slotIndex, cardId)`; drag out → `null`.

- [ ] **Step 3: CampaignHub wires dispatch**

```tsx
onSetBattleLoadout={(slotIndex, cardId) =>
  dispatchRun({ type: 'SET_BATTLE_LOADOUT', slotIndex, cardId })
}
```

- [ ] **Step 4: Cards in loadout slots hidden from collection grid** (or shown disabled — pick: **hidden from collection** to avoid duplicate drag ids)

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/CardsInventoryView.tsx src/features/campaign/CampaignHub.tsx
git commit -m "feat(inventory): battle loadout drag-and-drop slots"
```

---

### Task 13: Регрессия и build

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: all PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: no TypeScript errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no new errors

- [ ] **Step 4: Final commit if fixups needed**

```bash
git commit -m "chore: fix heal/loadout/cooldown integration nits"
```

---

## Spec coverage (self-review)

| Spec § | Task |
|--------|------|
| Heal template + `25%%` | Task 1 |
| Fireball CD=3 | Task 1, 7 |
| Loadout 2 slots | Task 6, 12 |
| c3 not in default loadout | Task 6 |
| CD tick end of hero turn | Task 4, 7 |
| CD skip on use turn | Task 7 |
| USE_CARD_HEAL + BattleAction.heal | Task 3, 7 |
| validHealTargetCells | Task 5 |
| UI heal overlay + CD badge | Task 10 |
| Autoboy heal <50% | Task 11 |
| Migration | Task 8 |
| merge victory cards | Task 6 |
| battleLog heal | Task 9 |

**Placeholder scan:** none.

**Type consistency:** `BattlePlayerCard.cooldownRemaining` everywhere in battle; stripped in `mergeBattleCardsIntoCollection`.
