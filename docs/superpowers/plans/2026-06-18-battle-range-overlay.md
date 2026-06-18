# Battle range overlay — implementation plan

> **Status: COMPLETE** (v1: `5026ed7`, v2 amendment: `f0865ba`, 118 tests pass)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Подсветка дальности хода, атаки/каста, AoE и угроз врагов на поле боя; карта «Огненный шар» (cast 3, AoE 3×3) для проверки ground-target AoE.

**Architecture:** Чистая геометрия в `src/game/battle/rangeOverlay.ts`; боевое ядро расширяется `aoe_strike` + `USE_CARD_AOE`; `BattleScreen` рисует слои overlay и per-card выбор; константы врагов в `enemyCombat.ts`. **v2:** `lineOfSight.ts`, BFS-ход, AoE confirm, autobattle AoE, `battle.css`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), React 19 + Ant Design 6, Zustand 5, Vite 8.

**Spec:** `docs/superpowers/specs/2026-06-18-battle-range-overlay-design.md` (v1 + v2 amendment)

## Global Constraints

- AoE: ground target; single-target — клик по врагу.
- **v2:** AoE — double-click confirm на той же клетке.
- Угрозы врагов: базовый overlay + focus при hover.
- Подсветка героя: дальность сразу; AoE 3×3 и valid-target — на hover (+ pending cell v2).
- Friendly fire для AoE: **да**.
- **v2:** Автобой **использует** AoE при выгодном score (`card_aoe`).
- Overlay скрыт при `autoBattleEnabled`.
- Цвета overlay: ход `#91caff` ~35%, дальность `#ffd591` ~40%, AoE `#ff7875` ~45%, цель `#b7eb8f` ~50%, угроза база `#ffa39e` ~25%, угроза focus `#ff4d4f` ~35%.
- **v2:** LOS (Bresenham, стены), BFS-ход `HERO_MOVE_RANGE=3`, анимация взрыва 600 ms.

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/battle/enemyCombat.ts` | Константы урона/дальности врагов |
| `src/game/battle/rangeOverlay.ts` | Геометрия подсветки (чистые функции) |
| `src/game/battle/rangeOverlay.test.ts` | Тесты геометрии |
| `src/game/content/cardTemplates.ts` | `kind: 'aoe'`, шаблон `fireball` |
| `src/game/types.ts` | `aoe_strike`, `USE_CARD_AOE`, `attackKind: 'aoe'` |
| `src/game/battle/reducer.ts` | `tryAoEStrike` |
| `src/game/battle/reducer.test.ts` | Тесты `aoe_strike` |
| `src/game/campaign/runReducer.ts` | `tryUseCardAoE`, `STARTER_CARDS` + `c2` |
| `src/game/campaign/runReducer.test.ts` | Тесты `USE_CARD_AOE` |
| `src/game/descriptions/cardText.ts` | Текст для AoE-карт |
| `src/game/battle/battleLog.ts` | Формат лога для `attackKind: 'aoe'` |
| `src/features/battle/enemyAi.ts` | Импорт из `enemyCombat.ts` |
| `src/features/battle/heroAi.ts` | Пропуск `kind === 'aoe'` |
| `src/features/battle/heroAi.test.ts` | Регрессия: fireball не выбирается |
| `src/features/battle/battleOverlayColors.ts` | Hex + rgba константы overlay |
| `src/features/battle/cellOverlayStyle.ts` | Сборка `background`/`boxShadow` по слоям |
| `src/features/battle/battle.css` | v2: анимация взрыва AoE |
| `src/game/battle/lineOfSight.ts` | v2: Bresenham LOS |
| `src/features/battle/BattleScreen.tsx` | Per-card UI, hover, overlay, AoE confirm |

---

### Task 1: Константы врагов

**Files:**
- Create: `src/game/battle/enemyCombat.ts`
- Modify: `src/features/battle/enemyAi.ts`

**Interfaces:**
- Produces:
  ```ts
  export const ENEMY_MELEE_DAMAGE = 4
  export const ENEMY_RANGED_DAMAGE = 3
  export const ENEMY_RANGED_MAX_RANGE = 8
  ```

- [ ] **Step 1: Create `enemyCombat.ts`**

```ts
/** Урон ближней атаки врага (MVP). */
export const ENEMY_MELEE_DAMAGE = 4

/** Урон дальней атаки врага (MVP). */
export const ENEMY_RANGED_DAMAGE = 3

/** Макс. дистанция дальней атаки врага (манхэттен). */
export const ENEMY_RANGED_MAX_RANGE = 8
```

- [ ] **Step 2: Update `enemyAi.ts`**

Replace hardcoded `4`, `3`, `8` with imports from `../../game/battle/enemyCombat`.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: all pass (no behavior change)

- [ ] **Step 4: Commit**

```bash
git add src/game/battle/enemyCombat.ts src/features/battle/enemyAi.ts
git commit -m "refactor(battle): extract enemy combat constants"
```

---

### Task 2: `rangeOverlay.ts` (TDD)

**Files:**
- Create: `src/game/battle/rangeOverlay.ts`
- Create: `src/game/battle/rangeOverlay.test.ts`

**Interfaces:**
- Consumes: `BattleState`, `Unit`, `cellKey`, `manhattan`, `orthoNeighbors`, `wallSet`, `inBounds`, `ENEMY_RANGED_MAX_RANGE` from `enemyCombat.ts`
- Produces:
  ```ts
  export function reachableMoveCells(state: BattleState, unitId: string): Set<string>
  export function cellsInManhattanRange(
    ox: number, oy: number, minRange: number, maxRange: number,
    width: number, height: number, walls?: ReadonlySet<string>,
  ): Set<string>
  export function cellsInAoE(
    cx: number, cy: number, aoeSize: number, width: number, height: number,
  ): Set<string>
  export function enemyThreatCells(state: BattleState, enemyId: string): Set<string>
  export function aggregateEnemyThreatCells(state: BattleState): Set<string>
  export function validSingleTargetCells(
    state: BattleState, ox: number, oy: number,
    kind: 'melee' | 'ranged', maxRange: number,
  ): Set<string>
  export function canCastAoEAt(
    hero: Unit, targetX: number, targetY: number, castRange: number,
  ): boolean
  ```

- [ ] **Step 1: Write failing tests**

Create `src/game/battle/rangeOverlay.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { BattleState, Unit } from '../types'
import { cellKey } from './grid'
import {
  aggregateEnemyThreatCells,
  canCastAoEAt,
  cellsInAoE,
  cellsInManhattanRange,
  enemyThreatCells,
  reachableMoveCells,
} from './rangeOverlay'

function unit(partial: Unit): Unit {
  return partial
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 5,
    height: 5,
    walls: [],
    units: [
      unit({ id: 'hero', side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
      unit({ id: 'e1', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
    ],
    turnOrder: ['hero', 'e1'],
    currentTurnIndex: 0,
    phase: 'ongoing',
    worldPower: 0,
    playerCards: [],
    modKillTargetCardId: null,
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

describe('cellsInManhattanRange', () => {
  it('returns disk with min and max inclusive', () => {
    const s = cellsInManhattanRange(2, 2, 1, 2, 5, 5)
    expect(s.has(cellKey(2, 2))).toBe(false)
    expect(s.has(cellKey(2, 1))).toBe(true)
    expect(s.has(cellKey(4, 2))).toBe(true)
    expect(s.has(cellKey(0, 2))).toBe(false)
  })
})

describe('cellsInAoE', () => {
  it('returns 3x3 centered on cell clipped to bounds', () => {
    const s = cellsInAoE(0, 0, 3, 5, 5)
    expect(s.size).toBe(4)
    expect(s.has(cellKey(0, 0))).toBe(true)
    expect(s.has(cellKey(1, 1))).toBe(true)
    expect(s.has(cellKey(2, 2))).toBe(false)
  })

  it('returns full 3x3 in center of grid', () => {
    const s = cellsInAoE(2, 2, 3, 5, 5)
    expect(s.size).toBe(9)
  })
})

describe('reachableMoveCells', () => {
  it('returns free orthogonal neighbors only', () => {
    const s = battle({ walls: [cellKey(2, 1)] })
    const moves = reachableMoveCells(s, 'hero')
    expect(moves.has(cellKey(2, 1))).toBe(false)
    expect(moves.has(cellKey(3, 2))).toBe(true)
    expect(moves.size).toBe(3)
  })
})

describe('enemyThreatCells', () => {
  it('includes melee neighbors and ranged disk for enemy', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const threat = enemyThreatCells(s, 'e1')
    expect(threat.has(cellKey(0, 1))).toBe(true)
    expect(threat.has(cellKey(1, 0))).toBe(true)
    expect(threat.has(cellKey(0, 8))).toBe(false)
  })
})

describe('aggregateEnemyThreatCells', () => {
  it('unions all enemy zones', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 4, y: 4, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const agg = aggregateEnemyThreatCells(s)
    expect(agg.has(cellKey(0, 1))).toBe(true)
    expect(agg.has(cellKey(3, 4))).toBe(true)
  })
})

describe('canCastAoEAt', () => {
  it('allows cast within manhattan castRange', () => {
    const hero = unit({ id: 'hero', side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 })
    expect(canCastAoEAt(hero, 2, 3, 3)).toBe(true)
    expect(canCastAoEAt(hero, 0, 0, 3)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify fail**

Run: `npm run test -- src/game/battle/rangeOverlay.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `rangeOverlay.ts`**

```ts
import type { BattleState, Unit } from '../types'
import { ENEMY_RANGED_MAX_RANGE } from './enemyCombat'
import { cellKey, inBounds, manhattan, orthoNeighbors, wallSet } from './grid'

export function cellsInManhattanRange(
  ox: number,
  oy: number,
  minRange: number,
  maxRange: number,
  width: number,
  height: number,
  walls?: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = manhattan(ox, oy, x, y)
      if (d < minRange || d > maxRange) continue
      const k = cellKey(x, y)
      if (walls?.has(k)) continue
      out.add(k)
    }
  }
  return out
}

/** aoeSize×aoeSize square centered on (cx, cy), clipped to grid. */
export function cellsInAoE(
  cx: number,
  cy: number,
  aoeSize: number,
  width: number,
  height: number,
): Set<string> {
  const half = Math.floor(aoeSize / 2)
  const out = new Set<string>()
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (inBounds(x, y, width, height)) out.add(cellKey(x, y))
    }
  }
  return out
}

export function reachableMoveCells(state: BattleState, unitId: string): Set<string> {
  const unit = state.units.find((u) => u.id === unitId && u.hp > 0)
  if (!unit) return new Set()
  const walls = wallSet(state.walls)
  const out = new Set<string>()
  for (const [x, y] of orthoNeighbors(unit.x, unit.y)) {
    if (!inBounds(x, y, state.width, state.height)) continue
    const k = cellKey(x, y)
    if (walls.has(k)) continue
    if (state.units.some((u) => u.hp > 0 && u.x === x && u.y === y)) continue
    out.add(k)
  }
  return out
}

export function enemyThreatCells(state: BattleState, enemyId: string): Set<string> {
  const enemy = state.units.find((u) => u.id === enemyId && u.side === 'enemy' && u.hp > 0)
  if (!enemy) return new Set()
  const melee = cellsInManhattanRange(
    enemy.x, enemy.y, 1, 1, state.width, state.height,
  )
  const ranged = cellsInManhattanRange(
    enemy.x, enemy.y, 1, ENEMY_RANGED_MAX_RANGE, state.width, state.height,
  )
  return new Set([...melee, ...ranged])
}

export function aggregateEnemyThreatCells(state: BattleState): Set<string> {
  const out = new Set<string>()
  for (const u of state.units) {
    if (u.side !== 'enemy' || u.hp <= 0) continue
    for (const k of enemyThreatCells(state, u.id)) out.add(k)
  }
  return out
}

export function validSingleTargetCells(
  state: BattleState,
  ox: number,
  oy: number,
  kind: 'melee' | 'ranged',
  maxRange: number,
): Set<string> {
  const minR = kind === 'melee' ? 1 : 1
  const maxR = kind === 'melee' ? 1 : maxRange
  const range = cellsInManhattanRange(ox, oy, minR, maxR, state.width, state.height)
  const out = new Set<string>()
  for (const u of state.units) {
    if (u.side !== 'enemy' || u.hp <= 0) continue
    if (range.has(cellKey(u.x, u.y))) out.add(cellKey(u.x, u.y))
  }
  return out
}

export function canCastAoEAt(
  hero: Unit,
  targetX: number,
  targetY: number,
  castRange: number,
): boolean {
  return manhattan(hero.x, hero.y, targetX, targetY) <= castRange
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/battle/rangeOverlay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/rangeOverlay.ts src/game/battle/rangeOverlay.test.ts
git commit -m "feat(battle): range overlay geometry helpers"
```

---

### Task 3: Шаблон fireball + стартовая колода + тексты

**Files:**
- Modify: `src/game/content/cardTemplates.ts`
- Modify: `src/game/campaign/runReducer.ts` (`STARTER_CARDS`)
- Modify: `src/game/descriptions/cardText.ts`
- Test: `src/game/content/cardAttackDamage.test.ts` (add fireball case if needed)

**Interfaces:**
- Produces: `CardAttackTemplate.kind: 'melee' | 'ranged' | 'aoe'`, template `fireball`, starter card `c2`

- [ ] **Step 1: Extend `CardAttackTemplate` and add fireball**

In `cardTemplates.ts`:

```ts
export type CardAttackTemplate = {
  label: string
  kind: 'melee' | 'ranged' | 'aoe'
  maxRange: number
  aoeSize?: number
  damageToken?: string
  fallbackDamage: number
  emoji?: string
}

// in CARD_ATTACK_TEMPLATES:
fireball: {
  label: 'Огненный шар',
  kind: 'aoe',
  maxRange: 3,
  aoeSize: 3,
  damageToken: '50%%',
  fallbackDamage: 8,
  emoji: '🔥',
},
```

- [ ] **Step 2: Add `c2` to `STARTER_CARDS`**

```ts
export const STARTER_CARDS: CardInstance[] = [
  {
    id: 'c1',
    templateId: 'strike',
    global_level: 1,
    uses_count: 0,
    modifications: [],
  },
  {
    id: 'c2',
    templateId: 'fireball',
    global_level: 1,
    uses_count: 0,
    modifications: [],
  },
]
```

- [ ] **Step 3: Update `describeCardCombatStats` for AoE**

In `cardText.ts`, when `tmpl.kind === 'aoe'`:

```ts
const kindRu =
  tmpl.kind === 'melee'
    ? 'Ближний бой'
    : tmpl.kind === 'ranged'
      ? 'Дальний бой'
      : 'Дальний бой (область)'
const rangeLine =
  tmpl.kind === 'aoe' && tmpl.aoeSize !== undefined
    ? `${kindRu}, дальность ${tmpl.maxRange} ${UI_CELL}, область ${tmpl.aoeSize}×${tmpl.aoeSize}`
    : `${kindRu}, дальность ${tmpl.maxRange} ${UI_CELL}`
```

Use `rangeLine` as first element of `lines` array.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS (fix any tests assuming single starter card count)

- [ ] **Step 5: Commit**

```bash
git add src/game/content/cardTemplates.ts src/game/campaign/runReducer.ts src/game/descriptions/cardText.ts
git commit -m "feat(cards): add fireball AoE template and starter deck"
```

---

### Task 4: `aoe_strike` в battle reducer (TDD)

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/battle/reducer.ts`
- Modify: `src/game/battle/reducer.test.ts`

**Interfaces:**
- Consumes: `cellsInAoE` from `rangeOverlay.ts`
- Produces:
  ```ts
  // BattleAction union adds:
  | {
      type: 'aoe_strike'
      attackerId: string
      centerX: number
      centerY: number
      damage: number
      aoeSize: number
      fromCard?: { cardId: string; templateId: string }
    }
  // BattleLogEntry strike.attackKind adds 'aoe'
  ```

- [ ] **Step 1: Write failing test in `reducer.test.ts`**

```ts
describe('applyAction aoe_strike', () => {
  it('damages all units in 3x3 and advances turn once', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 1, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 3, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'aoe_strike',
      attackerId: 'hero',
      centerX: 2,
      centerY: 2,
      damage: 8,
      aoeSize: 3,
    })
    expect(next.units.find((u) => u.id === 'e1')!.hp).toBe(2)
    expect(next.units.find((u) => u.id === 'e2')!.hp).toBe(2)
    expect(next.units.find((u) => u.id === 'hero')!.hp).toBe(2)
    expect(next.currentTurnIndex).toBe(1)
    expect(next.battleLog.filter((e) => e.type === 'strike')).toHaveLength(3)
    expect(next.battleLog.every((e) => e.type === 'strike' && e.attackKind === 'aoe')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/battle/reducer.test.ts`

- [ ] **Step 3: Extend types and implement `tryAoEStrike`**

In `types.ts`, add `aoe_strike` to `BattleAction` and `'aoe'` to strike `attackKind`.

In `reducer.ts`:

```ts
import { cellsInAoE } from './rangeOverlay'

function tryAoEStrike(
  state: BattleState,
  action: Extract<BattleAction, { type: 'aoe_strike' }>,
): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.attackerId !== actorId) return state

  const attacker = getUnit(state, action.attackerId)
  if (!isAliveUnit(attacker)) return state

  const aoeKeys = cellsInAoE(
    action.centerX,
    action.centerY,
    action.aoeSize,
    state.width,
    state.height,
  )
  const hitIds = state.units
    .filter((u) => u.hp > 0 && aoeKeys.has(cellKey(u.x, u.y)))
    .map((u) => u.id)
  if (hitIds.length === 0) return state

  let next: BattleState = state
  let lastKilled: Unit | null = null
  const newLog: BattleLogEntry[] = [...state.battleLog]

  for (const id of hitIds) {
    const target = getUnit(next, id)
    if (!isAliveUnit(target)) continue
    const updated = withDamage(target, action.damage)
    const wasKill = updated.hp <= 0 && target.hp > 0
    if (wasKill) lastKilled = updated
    next = {
      ...next,
      units: next.units.map((u) => (u.id === id ? updated : u)),
    }
    newLog.push({
      type: 'strike',
      attackerId: action.attackerId,
      targetId: id,
      damage: action.damage,
      attackKind: 'aoe',
      targetKilled: wasKill,
      ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
    })
  }

  next = { ...next, battleLog: newLog }
  next = afterHpChange(next, lastKilled)
  if (next.phase !== 'ongoing') return next
  return advanceTurnFrom(next, ptr)
}
```

Add `case 'aoe_strike': return tryAoEStrike(state, action)` in `applyAction`.

Note: `afterHpChange` per kill — call once with last killed; if multiple kills in one AoE, loop `afterHpChange` for each enemy kill or refactor to apply rewards for all kills. **Implementer:** after each enemy death in the loop, call `afterHpChange` when `wasKill && updated.side === 'enemy'` so worldPower/mod rewards apply per kill.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/battle/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/battle/reducer.ts src/game/battle/reducer.test.ts
git commit -m "feat(battle): aoe_strike action with multi-target damage"
```

---

### Task 5: `USE_CARD_AOE` в runReducer (TDD)

**Files:**
- Modify: `src/game/types.ts` (if RunAction lives in runReducer — modify `runReducer.ts` export)
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Consumes: `canCastAoEAt`, `applyAction`, `getCardAttackTemplate`, `applyCardUse`, `computeCardAttackDamage`
- Produces: `RunAction` variant `USE_CARD_AOE`, handler `tryUseCardAoE`

- [ ] **Step 1: Add failing tests**

```ts
describe('USE_CARD_AOE', () => {
  function battleWithFireball() {
    let s = initialCampaignState()
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    return s
  }

  it('applies damage in 3x3 and increments uses_count', () => {
    let s = battleWithFireball()
    const b = s.battle!
    const hero = b.units.find((u) => u.id === 'hero')!
    s = {
      ...s,
      battle: {
        ...b,
        units: b.units.map((u) =>
          u.id === 'hero' ? { ...u, x: 2, y: 2 } : u.id === 'e1' ? { ...u, x: 2, y: 1 } : u,
        ),
      },
    }
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 2,
      targetY: 2,
      randomInt1to100: 50,
    })
    expect(s.battle!.playerCards.find((c) => c.id === 'c2')!.uses_count).toBe(1)
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBeLessThan(10)
  })

  it('no-op when target out of cast range', () => {
    let s = battleWithFireball()
    const before = s.battle!.playerCards.find((c) => c.id === 'c2')!.uses_count
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 0,
      targetY: 0,
      randomInt1to100: 50,
    })
    expect(s.battle!.playerCards.find((c) => c.id === 'c2')!.uses_count).toBe(before)
  })
})
```

Adjust unit positions to match scenario layout after `START_OR_CONTINUE_BATTLE`.

- [ ] **Step 2: Implement `tryUseCardAoE`**

Mirror `tryUseCardAttack` validation order:

1. `phase === 'ongoing'`, hero turn
2. Card exists, template `kind === 'aoe'`, `aoeSize` defined
3. Target in bounds, not wall (`wallSet(b.walls).has(cellKey)` → reject)
4. `canCastAoEAt(hero, targetX, targetY, tmpl.maxRange)`
5. `applyCardUse`, damage, `applyAction` with `aoe_strike`

Add to `RunAction`:

```ts
| {
    type: 'USE_CARD_AOE'
    cardId: string
    targetX: number
    targetY: number
    randomInt1to100: number
  }
```

Wire `case 'USE_CARD_AOE': return tryUseCardAoE(state, action)` in `applyRunAction`.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/game/campaign/runReducer.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): USE_CARD_AOE for ground-target AoE cards"
```

---

### Task 6: heroAi skip AoE + battle log

**Files:**
- Modify: `src/features/battle/heroAi.ts`
- Modify: `src/features/battle/heroAi.test.ts`
- Modify: `src/game/battle/battleLog.ts`

- [ ] **Step 1: heroAi — skip `kind === 'aoe'`**

In `cardInRange` / card loop, return false early if `tmpl.kind === 'aoe'`.

In `maxAvailableDamage`, skip aoe templates.

- [ ] **Step 2: Add regression test**

```ts
it('does not pick fireball aoe card', () => {
  const s = battle({
    units: [
      unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
    ],
    playerCards: [
      card({ id: 'c2', templateId: 'fireball' }),
    ],
  })
  const d = pickHeroAiAction(s)
  expect(d?.kind === 'card' && d.cardId === 'c2').toBe(false)
})
```

- [ ] **Step 3: Update `formatBattleLogEntry` for aoe**

```ts
const src = entry.fromCard
  ? `карта «${getCardDisplayLabel(entry.fromCard.templateId)}»`
  : entry.attackKind === 'melee'
    ? 'ближний удар'
    : entry.attackKind === 'aoe'
      ? 'область'
      : 'выстрел'
```

- [ ] **Step 4: Run tests + commit**

Run: `npm run test`
```bash
git add src/features/battle/heroAi.ts src/features/battle/heroAi.test.ts src/game/battle/battleLog.ts
git commit -m "fix(battle): skip AoE in hero AI and format aoe log entries"
```

---

### Task 7: Overlay colors + cell style helper

**Files:**
- Create: `src/features/battle/battleOverlayColors.ts`
- Create: `src/features/battle/cellOverlayStyle.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CellOverlayLayers = {
    threatBase?: boolean
    threatFocus?: boolean
    move?: boolean
    actionRange?: boolean
    aoe?: boolean
    validTarget?: boolean
    dimThreat?: boolean
  }
  export function cellBackgroundStyle(layers: CellOverlayLayers): CSSProperties
  ```

- [ ] **Step 1: Create color constants**

```ts
export const OVERLAY_MOVE = 'rgba(145, 202, 255, 0.35)'
export const OVERLAY_ACTION_RANGE = 'rgba(255, 213, 145, 0.40)'
export const OVERLAY_AOE = 'rgba(255, 120, 117, 0.45)'
export const OVERLAY_VALID_TARGET = 'rgba(183, 235, 143, 0.50)'
export const OVERLAY_THREAT_BASE = 'rgba(255, 163, 158, 0.25)'
export const OVERLAY_THREAT_FOCUS = 'rgba(255, 77, 79, 0.35)'
export const OVERLAY_THREAT_DIM = 'rgba(255, 163, 158, 0.125)'
```

- [ ] **Step 2: Implement `cellBackgroundStyle`**

Stack layers using multiple `linear-gradient` stops or return `{ background: firstColor }` with priority: validTarget > aoe > actionRange > move > threatFocus > threatBase. When `dimThreat`, use `OVERLAY_THREAT_DIM` instead of base for non-focus cells.

- [ ] **Step 3: Commit**

```bash
git add src/features/battle/battleOverlayColors.ts src/features/battle/cellOverlayStyle.ts
git commit -m "feat(battle): overlay color constants and cell style helper"
```

---

### Task 8: `BattleScreen` overlay + per-card UI

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: all `rangeOverlay` functions, `cellBackgroundStyle`, `getCardAttackTemplate`, `USE_CARD_AOE`, `USE_CARD_ATTACK`

- [ ] **Step 1: Add local state**

```ts
const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null)
const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
```

Initialize `selectedCardId` to first card when battle loads / cards change.

- [ ] **Step 2: Compute overlay sets in `useMemo`**

```ts
const overlayActive =
  battle.phase === 'ongoing' &&
  !autoBattleEnabled &&
  currentId === hero?.id

const threatBase = useMemo(
  () => (overlayActive ? aggregateEnemyThreatCells(battle) : new Set<string>()),
  [battle, overlayActive],
)
const threatFocus = useMemo(
  () =>
    overlayActive && hoveredEnemyId
      ? enemyThreatCells(battle, hoveredEnemyId)
      : new Set<string>(),
  [battle, overlayActive, hoveredEnemyId],
)
// Similar for moveCells, actionRangeCells, aoePreviewCells based on mode + selectedCard + hoverCell
```

Logic by mode:
- `move`: `reachableMoveCells`
- `melee`: `cellsInManhattanRange(hero.x, hero.y, 1, 1, ...)`
- `ranged`: `cellsInManhattanRange(..., 1, HERO_BASIC_RANGED_MAX_RANGE, ...)`
- `card` + strike: melee/ranged from template
- `card` + fireball: cast range `cellsInManhattanRange(..., 0, 3, ...)`; if `hoverCell` in cast range → `cellsInAoE(hoverCell.x, hoverCell.y, 3, ...)`

- [ ] **Step 3: Update grid cell render**

- `onMouseEnter` → `setHoverCell({ x, y })`; if enemy on cell → `setHoveredEnemyId(enemy.id)`
- `onMouseLeave` → clear hover
- Apply `cellBackgroundStyle({ ... })` to button `style`
- Walls: `cursor: 'default'`, no overlay

- [ ] **Step 4: Update `onCellClick` for AoE**

When `mode === 'card'` and selected template `kind === 'aoe'`:

```ts
dispatchRun({
  type: 'USE_CARD_AOE',
  cardId: selectedCardId!,
  targetX: x,
  targetY: y,
  randomInt1to100: randomInt1to100(),
})
```

Single-target card: use `selectedCardId` instead of `playerCards[0]`.

Validate range before dispatch; show `message.warning('Вне дальности')` if invalid.

- [ ] **Step 5: Per-card Radio.Group**

Replace single card button with:

```tsx
<Radio.Group
  value={mode === 'card' ? selectedCardId : undefined}
  onChange={(e) => {
    setMode('card')
    setSelectedCardId(e.target.value)
  }}
  disabled={actionsDisabled || battle.playerCards.length === 0}
>
  {battle.playerCards.map((c) => (
    <Radio.Button key={c.id} value={c.id}>
      {/* label with getCardDisplayLabel + damage + AoE hint if aoe */}
    </Radio.Button>
  ))}
</Radio.Group>
```

- [ ] **Step 6: Legend under grid**

Four chips with colored squares: «Ход», «Дальность», «Область», «Угроза».

- [ ] **Step 7: Manual smoke test**

Run: `npm run start`
Check: move blue, ranged amber, fireball cast + hover red 3×3, enemy threat base + hover focus, autobattle hides overlay.

- [ ] **Step 8: Full test suite + build**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): range overlay UI and per-card targeting"
```

---

## Self-Review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Move overlay | Task 2, 8 |
| Attack/cast range | Task 2, 8 |
| AoE 3×3 hover | Task 2, 8 |
| Enemy threat A+B | Task 1, 2, 8 |
| Fireball card | Task 3 |
| USE_CARD_AOE | Task 5 |
| Friendly fire | Task 4 |
| Autoboy AoE (v2) | Task 6 v2 + `f0865ba` |
| LOS / BFS / confirm / animation | v2 commit `f0865ba` |
| Overlay hidden autobattle | Task 8 |
| Legend | Task 8 |
| Per-card UI | Task 8 |
| Tests | Tasks 2, 4, 5, 6 + v2 (118 total) |

## Implementation log

| Task | Commit | Status |
|------|--------|--------|
| 1 enemyCombat | `92c78b3` | done |
| 2 rangeOverlay | `ac643b2` | done |
| 3 fireball | `a39d640` | done |
| 4 aoe_strike | `55db111` | done |
| 5 USE_CARD_AOE | `d2a6fbe` | done |
| 6 heroAi + log | `13512b2`, v2 `f0865ba` | done |
| 7 overlay colors | `fc8c1f0` | done |
| 8 BattleScreen | `5026ed7` | done |
| v2 amendment | `f0865ba` | done |

---

## Execution Handoff

**Plan complete.** Spec updated with v2 amendment. No further implementation required unless new features (tooltip, move animation, unit-blocking LOS).
