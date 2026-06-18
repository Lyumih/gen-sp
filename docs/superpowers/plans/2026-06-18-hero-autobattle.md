# Hero autobattle — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toggle «Автобой» на экране боя: при включении герой автоматически ходит по алгоритму (kill shot → карта → melee → ranged → шаг к цели) с задержкой 2 s; состояние toggle живёт в сессии, не в save.

**Architecture:** Чистая функция `pickHeroAiAction(state)` в `src/features/battle/heroAi.ts` (зеркало `enemyAi.ts`); UI в `BattleScreen` триггерит через `useEffect` + `setTimeout(2000)`; сессионный флаг `autoBattleEnabled` в `useGameStore` вне `campaign`.

**Tech Stack:** TypeScript strict, Vitest (`npm run test`), React 19 + Ant Design 6, Zustand 5, существующие `combat.ts`, `runReducer` (`USE_CARD_ATTACK`), `randomInt1to100`.

**Spec:** `docs/superpowers/specs/2026-06-18-hero-autobattle-design.md`

## Global Constraints

- Задержка автобоя героя: **2000 ms** (`HERO_AI_DELAY_MS`); задержка врага остаётся **350 ms**.
- Toggle **не** сохраняется в localStorage / `CampaignState`.
- При ON: Radio.Group действий disabled; клики по сетке не выполняют ход.
- Алгоритм: kill shot → карта (макс. урон, tie → `modKillTargetCardId`) → базовая melee → базовая ranged → greedy move (как `enemyAi`).
- Pathfinding (A*), настройки стратегии, автобой врагов — **не v1**.

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/features/battle/heroAi.ts` | `HeroAiDecision`, `pickHeroAiAction(state)` |
| `src/features/battle/heroAi.test.ts` | Unit-тесты алгоритма |
| `src/store/gameStore.ts` | `autoBattleEnabled`, `setAutoBattleEnabled` |
| `src/features/battle/BattleScreen.tsx` | Switch «Автобой», hero `useEffect`, disable manual actions |

---

### Task 1: `pickHeroAiAction` (TDD)

**Files:**
- Create: `src/features/battle/heroAi.ts`
- Create: `src/features/battle/heroAi.test.ts`

**Interfaces:**
- Consumes: `BattleState`, `getCurrentActorId`, `canMeleeAttack`, `canRangedAttack`, `computeCardAttackDamage`, `getCardAttackTemplate`, `HERO_BASIC_*` из `combat.ts`, `ORTHO_DELTAS`, `cellKey`, `manhattan`, `wallSet` из `grid.ts`
- Produces:
  ```ts
  export type HeroAiDecision =
    | { kind: 'battle'; action: BattleAction }
    | { kind: 'card'; cardId: string; targetId: string }
    | null

  export function pickHeroAiAction(state: BattleState): HeroAiDecision
  ```

- [ ] **Step 1: Write the failing test file**

Create `src/features/battle/heroAi.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { BattleState, CardInstance, Unit } from '../../game/types'
import { pickHeroAiAction } from './heroAi'

function unit(partial: Unit): Unit {
  return partial
}

function card(partial: Partial<CardInstance> & Pick<CardInstance, 'id'>): CardInstance {
  return {
    templateId: 'strike',
    global_level: 1,
    uses_count: 0,
    modifications: [],
    ...partial,
  }
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 6,
    height: 4,
    walls: [],
    units: [
      unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
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

describe('pickHeroAiAction', () => {
  it('returns null when not hero turn', () => {
    const s = battle({ currentTurnIndex: 1 })
    expect(pickHeroAiAction(s)).toBeNull()
  })

  it('moves toward closest enemy when no attack available', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 3, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({
      kind: 'battle',
      action: { type: 'move', unitId: 'hero', toX: 1, toY: 0 },
    })
  })

  it('prefers kill shot target over closer non-lethal enemy', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 3, y: 0, hp: 4, maxHp: 4, unitLevel: 1 }),
      ],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: 'hero',
        targetId: 'e2',
        damage: 4,
        kind: 'ranged',
        maxRange: 6,
      },
    })
  })

  it('uses card when in range and stronger than basic attack', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      playerCards: [card({ id: 'c1', global_level: 100 })],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({ kind: 'card', cardId: 'c1', targetId: 'e1' })
  })

  it('prefers modKillTargetCardId on equal card damage', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      playerCards: [
        card({ id: 'c1', global_level: 50 }),
        card({ id: 'c2', global_level: 50 }),
      ],
      modKillTargetCardId: 'c2',
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({ kind: 'card', cardId: 'c2', targetId: 'e1' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/heroAi.test.ts`

Expected: FAIL — cannot find module `./heroAi`

- [ ] **Step 3: Implement `heroAi.ts`**

Create `src/features/battle/heroAi.ts`:

```ts
import { computeCardAttackDamage } from '../../game/content/cardAttackDamage'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_MAX_RANGE,
  canMeleeAttack,
  canRangedAttack,
} from '../../game/battle/combat'
import { getCurrentActorId } from '../../game/battle/reducer'
import { ORTHO_DELTAS, cellKey, manhattan, wallSet } from '../../game/battle/grid'
import type { BattleAction, BattleState, CardInstance, Unit } from '../../game/types'

export type HeroAiDecision =
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'card'; cardId: string; targetId: string }
  | null

function aliveEnemies(state: BattleState): Unit[] {
  return state.units.filter((u) => u.side === 'enemy' && u.hp > 0)
}

function cardInRange(hero: Unit, target: Unit, card: CardInstance, tmpl: NonNullable<ReturnType<typeof getCardAttackTemplate>>): boolean {
  if (tmpl.kind === 'melee') return canMeleeAttack(hero, target)
  return canRangedAttack(hero, target, tmpl.maxRange)
}

function cardDamage(card: CardInstance, state: BattleState): number {
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return 0
  return computeCardAttackDamage(tmpl, card.global_level + state.gearCardLevelBonus)
}

function maxAvailableDamage(hero: Unit, enemy: Unit, state: BattleState): number {
  let best = 0
  for (const c of state.playerCards) {
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || !cardInRange(hero, enemy, c, tmpl)) continue
    best = Math.max(best, cardDamage(c, state))
  }
  if (canMeleeAttack(hero, enemy)) best = Math.max(best, HERO_BASIC_MELEE_DAMAGE)
  if (canRangedAttack(hero, enemy, HERO_BASIC_RANGED_MAX_RANGE)) {
    best = Math.max(best, HERO_BASIC_RANGED_DAMAGE)
  }
  return best
}

function compareTargets(a: Unit, b: Unit, hero: Unit): number {
  const da = manhattan(hero.x, hero.y, a.x, a.y)
  const db = manhattan(hero.x, hero.y, b.x, b.y)
  if (da !== db) return da - db
  return a.hp - b.hp
}

function pickTarget(hero: Unit, enemies: Unit[], state: BattleState): Unit {
  const killable = enemies.filter((e) => maxAvailableDamage(hero, e, state) >= e.hp)
  const pool = killable.length > 0 ? killable : enemies
  return pool.reduce((best, e) => (compareTargets(e, best, hero) < 0 ? e : best))
}

function pickBestCard(hero: Unit, target: Unit, state: BattleState): CardInstance | null {
  let best: CardInstance | null = null
  let bestDmg = -1
  for (const c of state.playerCards) {
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || !cardInRange(hero, target, c, tmpl)) continue
    const dmg = cardDamage(c, state)
    if (dmg > bestDmg) {
      best = c
      bestDmg = dmg
    } else if (
      dmg === bestDmg &&
      best !== null &&
      c.id === state.modKillTargetCardId &&
      best.id !== state.modKillTargetCardId
    ) {
      best = c
    }
  }
  return best
}

function pickMoveStep(hero: Unit, target: Unit, state: BattleState): BattleAction | null {
  const walls = wallSet(state.walls)
  let best: { x: number; y: number; d: number } | null = null
  for (const d of ORTHO_DELTAS) {
    const x = hero.x + d.dx
    const y = hero.y + d.dy
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue
    if (walls.has(cellKey(x, y))) continue
    if (state.units.some((u) => u.hp > 0 && u.x === x && u.y === y)) continue
    const dist = manhattan(x, y, target.x, target.y)
    if (!best || dist < best.d) best = { x, y, d: dist }
  }
  if (!best) return null
  return { type: 'move', unitId: hero.id, toX: best.x, toY: best.y }
}

export function pickHeroAiAction(state: BattleState): HeroAiDecision {
  if (state.phase !== 'ongoing') return null
  if (getCurrentActorId(state) !== 'hero') return null

  const hero = state.units.find((u) => u.id === 'hero' && u.hp > 0)
  if (!hero) return null

  const enemies = aliveEnemies(state)
  if (enemies.length === 0) return null

  const target = pickTarget(hero, enemies, state)

  const card = pickBestCard(hero, target, state)
  if (card) {
    return { kind: 'card', cardId: card.id, targetId: target.id }
  }

  if (canMeleeAttack(hero, target)) {
    return {
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: hero.id,
        targetId: target.id,
        damage: HERO_BASIC_MELEE_DAMAGE,
        kind: 'melee',
      },
    }
  }

  if (canRangedAttack(hero, target, HERO_BASIC_RANGED_MAX_RANGE)) {
    return {
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: hero.id,
        targetId: target.id,
        damage: HERO_BASIC_RANGED_DAMAGE,
        kind: 'ranged',
        maxRange: HERO_BASIC_RANGED_MAX_RANGE,
      },
    }
  }

  const move = pickMoveStep(hero, target, state)
  if (move) return { kind: 'battle', action: move }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/features/battle/heroAi.test.ts`

Expected: PASS (5 tests)

- [ ] **Step 5: Run full test suite**

Run: `npm run test`

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/battle/heroAi.ts src/features/battle/heroAi.test.ts
git commit -m "feat(battle): hero autobattle AI decision helper"
```

---

### Task 2: Session flag in `gameStore`

**Files:**
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Consumes: existing `GameStoreState`
- Produces:
  ```ts
  autoBattleEnabled: boolean
  setAutoBattleEnabled: (enabled: boolean) => void
  ```

- [ ] **Step 1: Extend store**

In `src/store/gameStore.ts`, add to `GameStoreState`:

```ts
autoBattleEnabled: boolean
setAutoBattleEnabled: (enabled: boolean) => void
```

In the `create` callback, after `campaign: readInitialCampaign()`:

```ts
autoBattleEnabled: false,
setAutoBattleEnabled: (enabled) => set({ autoBattleEnabled: enabled }),
```

Убедиться, что `useGameStore.subscribe` по-прежнему сохраняет **только** `state.campaign` — `autoBattleEnabled` не попадает в localStorage.

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: exit 0, no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): session-scoped autoBattleEnabled flag"
```

---

### Task 3: BattleScreen UI + auto-turn effect

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: `pickHeroAiAction`, `autoBattleEnabled`, `setAutoBattleEnabled`, `dispatchRun`, `dispatchBattle`, `randomInt1to100`, `getCurrentActorId`
- Produces: Switch «Автобой», `HERO_AI_DELAY_MS = 2000`, hero auto `useEffect`

- [ ] **Step 1: Add imports and constant**

At top of `BattleScreen.tsx`:

```ts
import { RobotOutlined } from '@ant-design/icons'
import { Switch } from 'antd' // merge into existing antd import
import { pickHeroAiAction } from './heroAi'

const HERO_AI_DELAY_MS = 2000
```

- [ ] **Step 2: Wire store selectors**

Inside `BattleScreen`:

```ts
const autoBattleEnabled = useGameStore((s) => s.autoBattleEnabled)
const setAutoBattleEnabled = useGameStore((s) => s.setAutoBattleEnabled)
```

- [ ] **Step 3: Add hero auto-turn useEffect**

After existing enemy AI `useEffect` (~line 86–97):

```tsx
useEffect(() => {
  if (!autoBattleEnabled || !battle || battle.phase !== 'ongoing') return
  const actor = battle.units.find((u) => u.id === getCurrentActorId(battle))
  if (!actor || actor.side !== 'player') return
  const t = window.setTimeout(() => {
    const store = useGameStore.getState()
    const b = store.campaign.battle
    if (!b || b.phase !== 'ongoing' || !store.autoBattleEnabled) return
    const decision = pickHeroAiAction(b)
    if (!decision) return
    if (decision.kind === 'battle') {
      store.dispatchBattle(decision.action)
    } else {
      store.dispatchRun({
        type: 'USE_CARD_ATTACK',
        cardId: decision.cardId,
        targetId: decision.targetId,
        randomInt1to100: randomInt1to100(),
      })
    }
  }, HERO_AI_DELAY_MS)
  return () => window.clearTimeout(t)
}, [battle, autoBattleEnabled])
```

- [ ] **Step 4: Disable manual actions when auto ON**

Change:

```ts
const actionsDisabled = battle.phase !== 'ongoing' || currentId !== hero?.id
```

To:

```ts
const actionsDisabled =
  battle.phase !== 'ongoing' || currentId !== hero?.id || autoBattleEnabled
```

In `onCellClick`, add early return after phase check:

```ts
if (autoBattleEnabled) return
```

- [ ] **Step 5: Add Switch UI**

In блок «Действия героя», перед «Перемещение и базовая атака»:

```tsx
<div style={{ marginBottom: 8 }}>
  <Space align="center">
    <Switch
      checked={autoBattleEnabled}
      onChange={setAutoBattleEnabled}
      disabled={battle.phase !== 'ongoing'}
    />
    <Typography.Text>
      <RobotOutlined aria-hidden /> Автобой
    </Typography.Text>
    {autoBattleEnabled && currentId === hero?.id && (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        (ход через 2 с)
      </Typography.Text>
    )}
  </Space>
</div>
```

- [ ] **Step 6: Manual smoke test**

Run: `npm run start`

Checklist:
1. Начать бой → включить «Автобой» → через ~2 с герой делает ход
2. Выключить toggle → следующий ход героя только вручную
3. Перейти в хаб и вернуться в новый бой → toggle сохранил состояние (если не выключали)
4. Обновить страницу → toggle OFF

- [ ] **Step 7: Run full test suite**

Run: `npm run test`

Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): autobattle toggle and 2s hero turn delay"
```

---

### Task 4: Spec status update

**Files:**
- Modify: `docs/superpowers/specs/2026-06-18-hero-autobattle-design.md`

- [ ] **Step 1:** Change status line from `черновик, ожидает ревью` to `утверждён`.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-18-hero-autobattle-design.md docs/superpowers/plans/2026-06-18-hero-autobattle.md
git commit -m "docs: hero autobattle implementation plan"
```
