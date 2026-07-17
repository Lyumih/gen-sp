# Battle Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Косметические overlay-анимации боя (move, combat, heal, status, death) поверх мгновенного reducer, driven by `battleLog` и extensible preset registry.

**Architecture:** Pure mappers (`logToSteps`, `statusAuraMap`) → serializing visual queue → `BattleAnimationLayer` рендерит active step; grid показывает финальное состояние. Reducer не меняем.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, CSS keyframes (no new animation deps).

**Spec:** `docs/superpowers/specs/2026-07-17-battle-animations-design.md`  
**UI patterns:** `AGENTS.md`, emoji from `src/game/ui/labels.ts`

## Global Constraints

- Cosmetic only: reducer / `dispatchBattle` **не ждут** queue
- AI и игрок: **полные** durations (no speed-up for AI)
- Visual queue: **один** active step; новые append в tail
- Cell geometry: **58px** cell, **4px** gap (match `BattleScreen`)
- Teleport heuristic: `manhattan(from, to) > HERO_MOVE_RANGE (3)` from `src/game/battle/combat.ts`
- `prefers-reduced-motion: reduce` → duration **0**, instant drain
- Overlay: `pointer-events: none`, `aria-hidden`
- **Не менять** в MVP: `reducer.ts`, `cardCombat.ts`, `package.json`
- Phase 2 (`proc_sparkle`, log changes) — **out of scope** for this plan
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Core types & mapping** | 1–3 | Types, preset registry, status map, log→steps |
| **B — Queue logic** | 4–5 | Pure queue + React hook |
| **C — Visual layer** | 6–8 | CSS, geometry, BattleAnimationLayer presets |
| **D — Integration** | 9 | BattleScreen + UnitToken hidden state |
| **E — Verification** | 10 | Full test suite + manual checklist |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/features/battle/animation/types.ts` | `Cell`, `AnimationStep`, `LogToStepsContext` |
| `src/features/battle/animation/presetRegistry.ts` | `getPresetDurationMs(step)`, preset metadata |
| `src/features/battle/animation/statusAuraMap.ts` | `statusAuraPolarity(kind)` → `'buff' \| 'debuff'` |
| `src/features/battle/animation/logToSteps.ts` | `mapLogEntryToSteps`, `mapLogEntriesToSteps` |
| `src/features/battle/animation/animationQueueLogic.ts` | Pure queue: enqueue, advance, hidden units, flush |
| `src/features/battle/animation/useBattleAnimationQueue.ts` | React hook: log cursor, timers, reduced motion |
| `src/features/battle/animation/cellGeometry.ts` | `cellCenterPx`, `cellKeyToPx` |
| `src/features/battle/animation/BattleAnimationLayer.tsx` | Renders active step overlays |
| `src/features/battle/animation/battle-animation.css` | All preset keyframes |
| `src/features/battle/BattleScreen.tsx` | Grid ref, hook, layer, hidden tokens |
| `src/features/battle/UnitToken.tsx` | `hiddenByAnimation?: boolean` |

---

### Task 1: Animation types and preset registry

**Files:**
- Create: `src/features/battle/animation/types.ts`
- Create: `src/features/battle/animation/presetRegistry.ts`
- Create: `src/features/battle/animation/presetRegistry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Cell = { x: number; y: number }

  export type AnimationStep =
    | { kind: 'move'; unitId: string; from: Cell; to: Cell }
    | { kind: 'teleport'; unitId: string; from: Cell; to: Cell }
    | { kind: 'strike_melee'; attackerId: string; targetId: string; damage: number }
    | { kind: 'projectile'; attackerId: string; targetId: string; damage: number; attackKind: 'ranged' | 'aoe'; projectileEmoji?: string }
    | { kind: 'cast'; casterId: string; targetId: string }
    | { kind: 'aoe_burst'; center: Cell; cellKeys: readonly string[] }
    | { kind: 'heal'; healerId: string; targetId: string; amount: number }
    | { kind: 'resurrect'; healerId: string; targetId: string; hp: number }
    | { kind: 'buff_aura'; unitId: string; statusKind: string; holy?: boolean }
    | { kind: 'debuff_aura'; unitId: string; statusKind: string }
    | { kind: 'status_tick_dot'; unitId: string; damage: number }
    | { kind: 'status_tick_regen'; unitId: string; amount: number }
    | { kind: 'death'; unitId: string; at: Cell }

  export type LogToStepsContext = {
    units: readonly import('../../../game/types').Unit[]
  }

  export function getPresetDurationMs(step: AnimationStep, reducedMotion: boolean): number
  export function stepKindLabel(step: AnimationStep): string // for tests/debug
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/features/battle/animation/presetRegistry.test.ts
import { describe, expect, it } from 'vitest'
import { getPresetDurationMs } from './presetRegistry'
import type { AnimationStep } from './types'

describe('getPresetDurationMs', () => {
  it('returns 280 for move when motion enabled', () => {
    const step: AnimationStep = {
      kind: 'move',
      unitId: 'h1',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    }
    expect(getPresetDurationMs(step, false)).toBe(280)
  })

  it('returns 0 when reduced motion', () => {
    const step: AnimationStep = {
      kind: 'death',
      unitId: 'e1',
      at: { x: 2, y: 0 },
    }
    expect(getPresetDurationMs(step, true)).toBe(0)
  })

  it('returns 600 for aoe_burst', () => {
    const step: AnimationStep = {
      kind: 'aoe_burst',
      center: { x: 1, y: 1 },
      cellKeys: ['1,1'],
    }
    expect(getPresetDurationMs(step, false)).toBe(600)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/presetRegistry.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `types.ts` with full `AnimationStep` union from spec §3.2.

Create `presetRegistry.ts`:

```ts
import type { AnimationStep } from './types'

const DURATIONS: Record<AnimationStep['kind'], number> = {
  move: 280,
  teleport: 200,
  strike_melee: 220,
  projectile: 260,
  cast: 180,
  aoe_burst: 600,
  heal: 240,
  resurrect: 450,
  buff_aura: 260,
  debuff_aura: 260,
  status_tick_dot: 120,
  status_tick_regen: 120,
  death: 380,
}

export function getPresetDurationMs(step: AnimationStep, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  return DURATIONS[step.kind]
}

export function stepKindLabel(step: AnimationStep): string {
  return step.kind
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/presetRegistry.test.ts`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/types.ts src/features/battle/animation/presetRegistry.ts src/features/battle/animation/presetRegistry.test.ts
git commit -m "feat(battle): add animation step types and preset duration registry"
```

---

### Task 2: Status aura polarity map

**Files:**
- Create: `src/features/battle/animation/statusAuraMap.ts`
- Create: `src/features/battle/animation/statusAuraMap.test.ts`

**Interfaces:**
- Consumes: `UnitStatusKind` from `src/game/battle/unitStatus.ts`
- Produces:
  ```ts
  export type StatusAuraPolarity = 'buff' | 'debuff'
  export function statusAuraPolarity(statusKind: string): StatusAuraPolarity
  export function isHolyBuffStatus(statusKind: string, sourceTemplateId?: string): boolean
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/features/battle/animation/statusAuraMap.test.ts
import { describe, expect, it } from 'vitest'
import { statusAuraPolarity, isHolyBuffStatus } from './statusAuraMap'

describe('statusAuraPolarity', () => {
  it('classifies attack_up as buff', () => {
    expect(statusAuraPolarity('attack_up')).toBe('buff')
  })

  it('classifies dot as debuff', () => {
    expect(statusAuraPolarity('dot')).toBe('debuff')
  })

  it('classifies damage_reduction as buff', () => {
    expect(statusAuraPolarity('damage_reduction')).toBe('buff')
  })

  it('defaults unknown kinds to debuff', () => {
    expect(statusAuraPolarity('future_unknown')).toBe('debuff')
  })
})

describe('isHolyBuffStatus', () => {
  it('returns true for divine_shield source', () => {
    expect(isHolyBuffStatus('damage_reduction', 'divine_shield')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/statusAuraMap.test.ts`  
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/battle/animation/statusAuraMap.ts
import type { UnitStatusKind } from '../../../game/battle/unitStatus'

const BUFF_KINDS = new Set<UnitStatusKind>([
  'attack_up',
  'defense_up',
  'card_damage_up',
  'damage_reduction',
  'regen',
  'elemental_resist',
])

export type StatusAuraPolarity = 'buff' | 'debuff'

export function statusAuraPolarity(statusKind: string): StatusAuraPolarity {
  if (BUFF_KINDS.has(statusKind as UnitStatusKind)) return 'buff'
  return 'debuff'
}

export function isHolyBuffStatus(statusKind: string, sourceTemplateId?: string): boolean {
  return statusKind === 'damage_reduction' && sourceTemplateId === 'divine_shield'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/statusAuraMap.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/statusAuraMap.ts src/features/battle/animation/statusAuraMap.test.ts
git commit -m "feat(battle): map status kinds to buff/debuff aura polarity"
```

---

### Task 3: Log entry → animation steps mapper

**Files:**
- Create: `src/features/battle/animation/logToSteps.ts`
- Create: `src/features/battle/animation/logToSteps.test.ts`

**Interfaces:**
- Consumes: `BattleLogEntry`, `Unit` from `src/game/types.ts`; `HERO_MOVE_RANGE` from `src/game/battle/combat.ts`; `statusAuraPolarity`, `isHolyBuffStatus` from `./statusAuraMap`; `cellKey` from `src/game/battle/grid.ts`; `getCardAttackTemplate` from `src/game/content/cardTemplateLookup.ts`; `UI_DAMAGE` from `src/game/ui/labels.ts`
- Produces:
  ```ts
  export function mapLogEntryToSteps(
    entry: BattleLogEntry,
    ctx: LogToStepsContext,
  ): AnimationStep[]

  export function mapLogEntriesToSteps(
    entries: readonly BattleLogEntry[],
    ctx: LogToStepsContext,
  ): AnimationStep[]
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/battle/animation/logToSteps.test.ts
import { describe, expect, it } from 'vitest'
import { mapLogEntryToSteps } from './logToSteps'
import type { BattleLogEntry, Unit } from '../../../game/types'

const units: Unit[] = [
  { id: 'hero', side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 },
  { id: 'e1', side: 'enemy', x: 3, y: 0, hp: 0, maxHp: 5, unitLevel: 1 },
]

const ctx = { units }

describe('mapLogEntryToSteps move', () => {
  it('maps short move to move step', () => {
    const entry: BattleLogEntry = {
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 0,
    }
    expect(mapLogEntryToSteps(entry, ctx)).toEqual([
      { kind: 'move', unitId: 'hero', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
    ])
  })

  it('maps long move to teleport step', () => {
    const entry: BattleLogEntry = {
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 5,
      toY: 0,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('teleport')
  })
})

describe('mapLogEntryToSteps strike', () => {
  it('maps zero damage to cast', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'e1',
      targetId: 'hero',
      damage: 0,
      attackKind: 'ranged',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)).toEqual([
      { kind: 'cast', casterId: 'e1', targetId: 'hero' },
    ])
  })

  it('maps melee with kill to strike_melee + death', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
      attackKind: 'melee',
      targetKilled: true,
    }
    const steps = mapLogEntryToSteps(entry, ctx)
    expect(steps).toHaveLength(2)
    expect(steps[0]).toMatchObject({ kind: 'strike_melee', damage: 5 })
    expect(steps[1]).toMatchObject({ kind: 'death', unitId: 'e1', at: { x: 3, y: 0 } })
  })

  it('maps ranged to projectile', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 4,
      attackKind: 'ranged',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('projectile')
  })

  it('maps aoe to aoe_burst at target cell', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 3,
      attackKind: 'aoe',
      targetKilled: false,
    }
    const step = mapLogEntryToSteps(entry, ctx)[0]
    expect(step).toMatchObject({
      kind: 'aoe_burst',
      center: { x: 3, y: 0 },
      cellKeys: ['3,0'],
    })
  })
})

describe('mapLogEntryToSteps support', () => {
  it('maps heal', () => {
    const entry: BattleLogEntry = {
      type: 'heal',
      healerId: 'hero',
      targetId: 'hero',
      amount: 6,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('heal')
  })

  it('maps resurrect', () => {
    const entry: BattleLogEntry = {
      type: 'resurrect',
      healerId: 'hero',
      targetId: 'e1',
      hp: 2,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('resurrect')
  })

  it('maps status_applied to buff_aura', () => {
    const entry: BattleLogEntry = {
      type: 'status_applied',
      unitId: 'hero',
      statusKind: 'attack_up',
      sourceTemplateId: 'battle_cry',
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'buff_aura',
      statusKind: 'attack_up',
    })
  })

  it('maps divine_shield to holy buff', () => {
    const entry: BattleLogEntry = {
      type: 'status_applied',
      unitId: 'hero',
      statusKind: 'damage_reduction',
      sourceTemplateId: 'divine_shield',
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'buff_aura',
      holy: true,
    })
  })

  it('maps status_tick dot and regen', () => {
    expect(
      mapLogEntryToSteps({ type: 'status_tick', unitId: 'hero', dotDamage: 2 }, ctx)[0]?.kind,
    ).toBe('status_tick_dot')
    expect(
      mapLogEntryToSteps({ type: 'status_tick', unitId: 'hero', regenHeal: 3 }, ctx)[0]?.kind,
    ).toBe('status_tick_regen')
  })

  it('skips card_level_up', () => {
    const entry: BattleLogEntry = {
      type: 'card_level_up',
      cardId: 'c1',
      templateId: 'strike',
      fromLevel: 1,
      toLevel: 2,
      roll: 42,
    }
    expect(mapLogEntryToSteps(entry, ctx)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/logToSteps.test.ts`  
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Implement helpers in `logToSteps.ts`:

```ts
import type { BattleLogEntry } from '../../../game/types'
import { HERO_MOVE_RANGE } from '../../../game/battle/combat'
import { manhattan } from '../../../game/battle/grid'
import { cellKey } from '../../../game/battle/grid'
import { getCardAttackTemplate } from '../../../game/content/cardTemplateLookup'
import { UI_DAMAGE } from '../../../game/ui/labels'
import { statusAuraPolarity, isHolyBuffStatus } from './statusAuraMap'
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/logToSteps.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/logToSteps.ts src/features/battle/animation/logToSteps.test.ts
git commit -m "feat(battle): map battleLog entries to animation steps"
```

---

### Task 4: Pure animation queue logic

**Files:**
- Create: `src/features/battle/animation/animationQueueLogic.ts`
- Create: `src/features/battle/animation/animationQueueLogic.test.ts`

**Interfaces:**
- Consumes: `AnimationStep`, `getPresetDurationMs`
- Produces:
  ```ts
  export type AnimationQueueState = {
    pending: AnimationStep[]
    active: AnimationStep | null
  }

  export function createEmptyQueue(): AnimationQueueState
  export function enqueueSteps(state: AnimationQueueState, steps: AnimationStep[]): AnimationQueueState
  export function startNextStep(state: AnimationQueueState): AnimationQueueState
  export function clearQueue(): AnimationQueueState
  export function getHiddenUnitIds(active: AnimationStep | null): ReadonlySet<string>
  export function shouldAdvanceQueue(
    state: AnimationQueueState,
    nowMs: number,
    activeStartedAt: number | null,
    reducedMotion: boolean,
  ): boolean
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/features/battle/animation/animationQueueLogic.test.ts
import { describe, expect, it } from 'vitest'
import {
  createEmptyQueue,
  enqueueSteps,
  startNextStep,
  clearQueue,
  getHiddenUnitIds,
  shouldAdvanceQueue,
} from './animationQueueLogic'
import type { AnimationStep } from './types'

const moveStep: AnimationStep = {
  kind: 'move',
  unitId: 'hero',
  from: { x: 0, y: 0 },
  to: { x: 1, y: 0 },
}

describe('animationQueueLogic', () => {
  it('enqueues and starts first step', () => {
    let q = enqueueSteps(createEmptyQueue(), [moveStep])
    expect(q.active).toBeNull()
    q = startNextStep(q)
    expect(q.active).toEqual(moveStep)
    expect(q.pending).toHaveLength(0)
  })

  it('hides unit on destination during move', () => {
    const hidden = getHiddenUnitIds(moveStep)
    expect(hidden.has('hero')).toBe(true)
  })

  it('hides dead unit during death step', () => {
    const hidden = getHiddenUnitIds({
      kind: 'death',
      unitId: 'e1',
      at: { x: 2, y: 0 },
    })
    expect(hidden.has('e1')).toBe(true)
  })

  it('does not hide during heal', () => {
    expect(
      getHiddenUnitIds({
        kind: 'heal',
        healerId: 'hero',
        targetId: 'hero',
        amount: 5,
      }).size,
    ).toBe(0)
  })

  it('shouldAdvanceQueue respects duration', () => {
    const q = { pending: [], active: moveStep }
    expect(shouldAdvanceQueue(q, 100, 0, false)).toBe(false)
    expect(shouldAdvanceQueue(q, 281, 0, false)).toBe(true)
  })

  it('shouldAdvanceQueue is instant when reduced motion', () => {
    const q = { pending: [], active: moveStep }
    expect(shouldAdvanceQueue(q, 0, 0, true)).toBe(true)
  })

  it('clearQueue resets state', () => {
    expect(clearQueue()).toEqual({ pending: [], active: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/animationQueueLogic.test.ts`  
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/battle/animation/animationQueueLogic.ts
import { getPresetDurationMs } from './presetRegistry'
import type { AnimationStep } from './types'

export type AnimationQueueState = {
  pending: AnimationStep[]
  active: AnimationStep | null
}

export function createEmptyQueue(): AnimationQueueState {
  return { pending: [], active: null }
}

export function enqueueSteps(state: AnimationQueueState, steps: AnimationStep[]): AnimationQueueState {
  if (steps.length === 0) return state
  return { ...state, pending: [...state.pending, ...steps] }
}

export function startNextStep(state: AnimationQueueState): AnimationQueueState {
  if (state.active !== null || state.pending.length === 0) return state
  const [next, ...rest] = state.pending
  return { pending: rest, active: next ?? null }
}

export function clearQueue(): AnimationQueueState {
  return createEmptyQueue()
}

export function getHiddenUnitIds(active: AnimationStep | null): ReadonlySet<string> {
  if (!active) return new Set()
  switch (active.kind) {
    case 'move':
    case 'teleport':
      return new Set([active.unitId])
    case 'death':
      return new Set([active.unitId])
    default:
      return new Set()
  }
}

export function shouldAdvanceQueue(
  state: AnimationQueueState,
  nowMs: number,
  activeStartedAt: number | null,
  reducedMotion: boolean,
): boolean {
  if (!state.active || activeStartedAt === null) return false
  const duration = getPresetDurationMs(state.active, reducedMotion)
  if (duration === 0) return true
  return nowMs - activeStartedAt >= duration
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/animationQueueLogic.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/animationQueueLogic.ts src/features/battle/animation/animationQueueLogic.test.ts
git commit -m "feat(battle): add pure animation queue logic with hidden unit rules"
```

---

### Task 5: React hook — useBattleAnimationQueue

**Files:**
- Create: `src/features/battle/animation/useBattleAnimationQueue.ts`
- Create: `src/features/battle/animation/useBattleAnimationQueue.test.ts`

**Interfaces:**
- Consumes: all Task 3–4 exports
- Produces:
  ```ts
  export type BattleAnimationController = {
    activeStep: AnimationStep | null
    hiddenUnitIds: ReadonlySet<string>
    queueLength: number
  }

  export function useBattleAnimationQueue(
    battleLog: readonly BattleLogEntry[],
    units: readonly Unit[],
    enabled: boolean,
  ): BattleAnimationController
  ```

- [ ] **Step 1: Write the failing test (pure helper extract)**

Test log cursor diffing as pure function to avoid `renderHook`:

```ts
// src/features/battle/animation/useBattleAnimationQueue.test.ts
import { describe, expect, it } from 'vitest'
import { diffNewLogEntries } from './useBattleAnimationQueue'
import type { BattleLogEntry } from '../../../game/types'

describe('diffNewLogEntries', () => {
  it('returns slice after cursor', () => {
    const log: BattleLogEntry[] = [
      { type: 'move', unitId: 'h', fromX: 0, fromY: 0, toX: 1, toY: 0 },
      { type: 'heal', healerId: 'h', targetId: 'h', amount: 3 },
    ]
    expect(diffNewLogEntries(log, 1)).toEqual([log[1]])
  })

  it('returns empty when no new entries', () => {
    expect(diffNewLogEntries([], 0)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/useBattleAnimationQueue.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement hook + diff helper**

```ts
// src/features/battle/animation/useBattleAnimationQueue.ts
import { useEffect, useRef, useState } from 'react'
import type { BattleLogEntry, Unit } from '../../../game/types'
import {
  clearQueue,
  createEmptyQueue,
  enqueueSteps,
  getHiddenUnitIds,
  shouldAdvanceQueue,
  startNextStep,
  type AnimationQueueState,
} from './animationQueueLogic'
import { mapLogEntriesToSteps } from './logToSteps'
import type { AnimationStep } from './types'

export function diffNewLogEntries(
  battleLog: readonly BattleLogEntry[],
  cursor: number,
): BattleLogEntry[] {
  if (cursor >= battleLog.length) return []
  return battleLog.slice(cursor)
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export type BattleAnimationController = {
  activeStep: AnimationStep | null
  hiddenUnitIds: ReadonlySet<string>
  queueLength: number
}

export function useBattleAnimationQueue(
  battleLog: readonly BattleLogEntry[],
  units: readonly Unit[],
  enabled: boolean,
): BattleAnimationController {
  const reducedMotion = usePrefersReducedMotion()
  const cursorRef = useRef(0)
  const [queue, setQueue] = useState<AnimationQueueState>(createEmptyQueue)
  const activeStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      cursorRef.current = 0
      setQueue(clearQueue())
      activeStartedAtRef.current = null
      return
    }

    const newEntries = diffNewLogEntries(battleLog, cursorRef.current)
    cursorRef.current = battleLog.length
    if (newEntries.length === 0) return

    const steps = mapLogEntriesToSteps(newEntries, { units })
    setQueue((q) => enqueueSteps(q, steps))
  }, [battleLog, units, enabled])

  useEffect(() => {
    if (!enabled) return

    let raf = 0
    const tick = (now: number) => {
      setQueue((q) => {
        let next = q
        if (next.active === null) {
          next = startNextStep(next)
          if (next.active) activeStartedAtRef.current = now
        }
        if (
          next.active &&
          shouldAdvanceQueue(next, now, activeStartedAtRef.current, reducedMotion)
        ) {
          activeStartedAtRef.current = null
          return startNextStep({ ...next, active: null })
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, reducedMotion])

  const activeStep = queue.active
  return {
    activeStep,
    hiddenUnitIds: getHiddenUnitIds(activeStep),
    queueLength: queue.pending.length + (queue.active ? 1 : 0),
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/features/battle/animation/useBattleAnimationQueue.test.ts`  
Expected: PASS

Run: `npm run build`  
Expected: PASS (no type errors)

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/useBattleAnimationQueue.ts src/features/battle/animation/useBattleAnimationQueue.test.ts
git commit -m "feat(battle): add useBattleAnimationQueue hook with log cursor and RAF drain"
```

---

### Task 6: Cell geometry helper

**Files:**
- Create: `src/features/battle/animation/cellGeometry.ts`
- Create: `src/features/battle/animation/cellGeometry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BATTLE_CELL_SIZE_PX = 58
  export const BATTLE_CELL_GAP_PX = 4

  export function cellTopLeftPx(x: number, y: number): { left: number; top: number }
  export function cellCenterPx(x: number, y: number): { left: number; top: number }
  export function parseCellKey(key: string): Cell | null
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { cellCenterPx, cellTopLeftPx, parseCellKey, BATTLE_CELL_SIZE_PX, BATTLE_CELL_GAP_PX } from './cellGeometry'

describe('cellGeometry', () => {
  it('computes top-left for origin cell', () => {
    expect(cellTopLeftPx(0, 0)).toEqual({ left: 0, top: 0 })
  })

  it('computes top-left for x=1 with gap', () => {
    expect(cellTopLeftPx(1, 0).left).toBe(BATTLE_CELL_SIZE_PX + BATTLE_CELL_GAP_PX)
  })

  it('computes center as half cell offset', () => {
    const c = cellCenterPx(0, 0)
    expect(c.left).toBe(BATTLE_CELL_SIZE_PX / 2)
    expect(c.top).toBe(BATTLE_CELL_SIZE_PX / 2)
  })

  it('parses cell key', () => {
    expect(parseCellKey('2,3')).toEqual({ x: 2, y: 3 })
  })
})
```

- [ ] **Step 2–4: Implement, run tests**

```ts
import type { Cell } from './types'

export const BATTLE_CELL_SIZE_PX = 58
export const BATTLE_CELL_GAP_PX = 4

export function cellTopLeftPx(x: number, y: number): { left: number; top: number } {
  const stride = BATTLE_CELL_SIZE_PX + BATTLE_CELL_GAP_PX
  return { left: x * stride, top: y * stride }
}

export function cellCenterPx(x: number, y: number): { left: number; top: number } {
  const tl = cellTopLeftPx(x, y)
  return {
    left: tl.left + BATTLE_CELL_SIZE_PX / 2,
    top: tl.top + BATTLE_CELL_SIZE_PX / 2,
  }
}

export function parseCellKey(key: string): Cell | null {
  const [xs, ys] = key.split(',')
  if (xs === undefined || ys === undefined) return null
  const x = Number(xs)
  const y = Number(ys)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}
```

Run: `npm run test -- src/features/battle/animation/cellGeometry.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/cellGeometry.ts src/features/battle/animation/cellGeometry.test.ts
git commit -m "feat(battle): add grid cell pixel geometry helpers for animation layer"
```

---

### Task 7: CSS keyframes for all presets

**Files:**
- Create: `src/features/battle/animation/battle-animation.css`

**Interfaces:**
- Produces CSS classes:
  - `.battle-anim-layer`, `.battle-anim-ghost-token`
  - `.battle-anim--move`, `.battle-anim--teleport-out`, `.battle-anim--teleport-in`
  - `.battle-anim--strike-lunge`, `.battle-anim--hit-flash`, `.battle-anim--shake`
  - `.battle-anim--projectile`
  - `.battle-anim--cast-glow`, `.battle-anim--cast-beam`
  - `.battle-anim--aoe-burst` (reuse pulse timing from `.battle-cell-explosion`)
  - `.battle-anim--heal-pulse`, `.battle-anim--heal-float`, `.battle-anim--heal-beam`
  - `.battle-anim--resurrect`
  - `.battle-anim--buff-aura`, `.battle-anim--buff-aura--holy`
  - `.battle-anim--debuff-aura`
  - `.battle-anim--death`
  - `.battle-anim--tick-dot`, `.battle-anim--tick-regen`

- [ ] **Step 1: Create CSS file with keyframes**

Include `@keyframes` for each preset duration matching `presetRegistry.ts`. Example excerpts:

```css
.battle-anim-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}

@keyframes battle-anim-move {
  from { transform: translate(var(--from-x), var(--from-y)); }
  to { transform: translate(var(--to-x), var(--to-y)); }
}

.battle-anim--move {
  animation: battle-anim-move 280ms ease-in-out;
}

@keyframes battle-anim-heal-pulse {
  0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7); }
  50% { box-shadow: 0 0 12px 4px rgba(82, 196, 26, 0.9); }
  100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
}

/* ... remaining presets per spec §4 ... */

@media (prefers-reduced-motion: reduce) {
  .battle-anim-layer * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

- [ ] **Step 2: Import CSS from BattleAnimationLayer (Task 8) — no standalone test**

- [ ] **Step 3: Commit**

```bash
git add src/features/battle/animation/battle-animation.css
git commit -m "feat(battle): add CSS keyframes for battle animation presets"
```

---

### Task 8: BattleAnimationLayer component

**Files:**
- Create: `src/features/battle/animation/BattleAnimationLayer.tsx`
- Modify: import css in layer file

**Interfaces:**
- Consumes: `BattleAnimationController`, `Unit[]`, `getUnitDisplay`, `cellCenterPx`, `UI_DAMAGE`, `UI_HEAL`
- Produces:
  ```tsx
  export type BattleAnimationLayerProps = {
    activeStep: AnimationStep | null
    units: readonly Unit[]
    getUnitDisplay: (unitId: string) => UnitDisplay | undefined
  }

  export function BattleAnimationLayer(props: BattleAnimationLayerProps): JSX.Element | null
  ```

- [ ] **Step 1: Create layer with switch on `activeStep.kind`**

Structure:

```tsx
import './battle-animation.css'
import { cellCenterPx } from './cellGeometry'
import { UI_DAMAGE, UI_HEAL } from '../../../game/ui/labels'
import type { AnimationStep } from './types'
// ...

function GhostToken({ emoji, className, style }: { emoji: string; className: string; style?: CSSProperties }) {
  return (
    <span className={`battle-anim-ghost-token ${className}`} style={style} aria-hidden>
      {emoji}
    </span>
  )
}

export function BattleAnimationLayer({ activeStep, units, getUnitDisplay }: BattleAnimationLayerProps) {
  if (!activeStep) return null

  return (
    <div className="battle-anim-layer" aria-hidden>
      {renderStep(activeStep, units, getUnitDisplay)}
    </div>
  )
}
```

Implement `renderStep` cases:

| kind | Render |
|------|--------|
| `move` | Ghost at `--from-x/y` → `--to-x/y` with `.battle-anim--move` |
| `teleport` | Two ghosts: fade-out at from, fade-in at to |
| `strike_melee` | Lunge ghost on attacker cell + flash overlay on target |
| `projectile` | Emoji span animated along line attacker→target |
| `cast` | Glow on caster + beam to target |
| `aoe_burst` | `.battle-cell-explosion` or `.battle-anim--aoe-burst` divs per `cellKeys` |
| `heal` | Pulse on target + optional beam + float `+{amount}` with `UI_HEART` |
| `resurrect` | Fade-in ghost on target cell |
| `buff_aura` / `debuff_aura` | Ring overlay on unit cell; `--holy` modifier when `holy` |
| `status_tick_*` | Mini variants of hit/heal |
| `death` | Ghost token fade at `at` |

Use inline `--from-x`, `--to-x` CSS variables in px from `cellCenterPx`.

- [ ] **Step 2: Run build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/battle/animation/BattleAnimationLayer.tsx
git commit -m "feat(battle): add BattleAnimationLayer overlay renderer for all presets"
```

---

### Task 9: BattleScreen and UnitToken integration

**Files:**
- Modify: `src/features/battle/UnitToken.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: `useBattleAnimationQueue`, `BattleAnimationLayer`, existing `getUnitDisplay`

- [ ] **Step 1: Add hidden prop to UnitToken**

```tsx
// UnitTokenProps
hiddenByAnimation?: boolean

// In render — early return or opacity 0:
if (hiddenByAnimation) {
  return (
    <span
      className="unit-token unit-token--anim-hidden"
      style={{ opacity: 0, pointerEvents: 'none' }}
      aria-hidden
    />
  )
}
```

Add to `battle.css` or `battle-animation.css`:

```css
.unit-token--anim-hidden {
  visibility: hidden;
}
```

- [ ] **Step 2: Wire BattleScreen**

Locate grid container in `BattleScreen.tsx`. Wrap:

```tsx
const gridRef = useRef<HTMLDivElement>(null)
const battleAnim = useBattleAnimationQueue(
  battle.battleLog,
  battle.units,
  battle.phase === 'ongoing',
)

// Inside battle field JSX:
<div className="battle-field-root" style={{ position: 'relative' }}>
  <div ref={gridRef} /* existing grid styles */>
    {/* cells — pass hiddenByAnimation={battleAnim.hiddenUnitIds.has(unit.id)} to UnitToken */}
  </div>
  <BattleAnimationLayer
    activeStep={battleAnim.activeStep}
    units={battle.units}
    getUnitDisplay={(id) => getUnitDisplay(id, /* existing args */)}
  />
</div>
```

Find existing `getUnitDisplay` call pattern in `BattleScreen` / `BattleUnitCell` and reuse.

- [ ] **Step 3: Run build and tests**

Run: `npm run test`  
Expected: all PASS

Run: `npm run build`  
Expected: PASS

Run: `npm run lint`  
Expected: PASS (fix any new lint issues)

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/UnitToken.tsx src/features/battle/BattleScreen.tsx src/features/battle/battle.css
git commit -m "feat(battle): integrate animation layer and hide tokens during move/death overlays"
```

---

### Task 10: Final verification

**Files:** none new

- [ ] **Step 1: Run full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 2: Manual smoke test**

Run: `npm run start`

Checklist from spec §10:

- [ ] Player move shows ghost tween; token hidden at destination during anim
- [ ] Melee attack: lunge + flash
- [ ] Ranged card: projectile
- [ ] AoE card: burst on hit cell
- [ ] Heal / regen / resurrect
- [ ] Buff (battle_cry) and debuff (snare) auras
- [ ] Kill → death fade
- [ ] Boss blink (if scenario available) → teleport not walk
- [ ] DoT/regen tick at turn start
- [ ] Enemy AI: queue drains sequentially without overlap chaos
- [ ] Abandon battle: no console errors, anim stops

- [ ] **Step 3: Final commit if any polish fixes**

```bash
git commit -m "fix(battle): animation polish from manual QA"
```

---

## Spec Coverage Self-Review

| Spec section | Task |
|--------------|------|
| §1 Goal — all 13 MVP presets | Tasks 1, 3, 7, 8 |
| §2 Architecture + extensibility | Tasks 1–5, 8 (switch pattern) |
| §3 Pipeline log→steps | Task 3 |
| §3.4 status aura map | Task 2 |
| §4 Timings | Task 1 `presetRegistry` |
| §4.1 Overlay vs grid hidden rules | Tasks 4, 9 |
| §4.2 AoE pre/post | Task 8 (post); pre-confirm unchanged |
| §4.3 Projectile emoji | Task 3 `projectileEmojiFromCard` |
| §5 Queue lifecycle | Tasks 4–5 |
| §5.3 reduced motion | Tasks 5, 7 |
| §6 Geometry | Task 6 |
| §7 BattleScreen integration | Task 9 |
| §9 Phase 2 | Out of scope |
| §10 Testing | Tasks 1–6, 10 |

**Phase 2 items explicitly deferred:** `proc_sparkle`, `defense_add` log, `moveStyle` in log, queue indicator, floating damage numbers.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-battle-animations.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach?
