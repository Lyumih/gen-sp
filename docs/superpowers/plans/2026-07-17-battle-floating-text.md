# Battle Floating Text — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать всплывающий боевой текст (число + emoji) над юнитами/клетками при уроне, хиле, тиках и статусах; замедлить ходы врага через gating на drain очереди анимаций.

**Architecture:** Расширяем существующий animation pipeline (вариант 1 из spec): float рендерится внутри `BattleAnimationLayer` параллельно flash-эффектам; `presetRegistry` увеличивает duration шага до `FLOAT_READ_MS` (700 ms) для steps с float. Форматирование текста — `floatTextMap.ts`; UI — `FloatingCombatText.tsx`. Enemy/auto-battle AI в `BattleScreen` ждёт `animationPlaying`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, CSS keyframes (без новых npm-зависимостей).

**Spec:** `docs/superpowers/specs/2026-07-17-battle-floating-text-design.md`  
**UI patterns:** `AGENTS.md`, `src/game/ui/labels.ts`

## Global Constraints

- Emoji — только из `src/game/ui/labels.ts` (`UI_DAMAGE`, `UI_HEART`, `UI_DEFENSE`, `UI_HEAL`, `UI_ATTACK`, `UI_MAGIC`)
- Формат float: `-N 💥`, `(N 🛡)`, `+N ❤️`; статусы — emoji без числа
- `FLOAT_READ_MS = 700`; `FLOAT_ABSORB_STAGGER_MS = 100`; `ENEMY_ACTION_DELAY_MS = 350` (значение не менять)
- Reducer и `BattleLogEntry` **не менять**
- `prefers-reduced-motion`: durations = 0, float не рендерится
- Ручной ход игрока **не** блокируется анимацией; gating только для AI
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Text helpers** | 1 | `floatTextMap.ts` + tests |
| **B — Step data** | 2 | `types.ts`, `logToSteps.ts` + tests |
| **C — Timing** | 3 | `presetRegistry.ts` + tests |
| **D — UI layer** | 4–5 | `FloatingCombatText`, CSS, `BattleAnimationLayer` |
| **E — AI gating** | 6 | `BattleScreen.tsx` |
| **F — Verify** | 7 | full test suite + build |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/features/battle/animation/floatTextMap.ts` | Форматирование float lines, emoji статусов |
| `src/features/battle/animation/floatTextMap.test.ts` | Unit tests карты статусов |
| `src/features/battle/animation/types.ts` | `absorbedDamage?`, `damage?` на strike/aoe steps |
| `src/features/battle/animation/logToSteps.ts` | Проброс absorbed/damage из log |
| `src/features/battle/animation/logToSteps.test.ts` | Тесты проброса |
| `src/features/battle/animation/presetRegistry.ts` | `hasFloatText`, `FLOAT_READ_MS` |
| `src/features/battle/animation/presetRegistry.test.ts` | Duration rules |
| `src/features/battle/animation/FloatingCombatText.tsx` | Переиспользуемый float overlay |
| `src/features/battle/animation/battle-animation.css` | Обобщённые float keyframes + variants |
| `src/features/battle/animation/BattleAnimationLayer.tsx` | Интеграция float во все step cases |
| `src/features/battle/BattleScreen.tsx` | AI gating на `animationPlaying` |

---

### Task 1: Float text map and formatters

**Files:**
- Create: `src/features/battle/animation/floatTextMap.ts`
- Create: `src/features/battle/animation/floatTextMap.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type FloatVariant = 'damage' | 'heal' | 'absorb' | 'buff' | 'debuff'

  export type FloatLine = {
    text: string
    variant: FloatVariant
    delayMs?: number
  }

  export function formatDamageFloat(damage: number, absorbedDamage?: number): FloatLine[]
  export function formatHealFloat(amount: number): FloatLine[]
  export function formatStatusFloat(statusKind: string, polarity: 'buff' | 'debuff'): FloatLine[]
  export function statusKindEmoji(statusKind: string, polarity: 'buff' | 'debuff'): string
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/battle/animation/floatTextMap.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  formatDamageFloat,
  formatHealFloat,
  formatStatusFloat,
  statusKindEmoji,
} from './floatTextMap'
import { UI_DAMAGE, UI_DEFENSE, UI_HEART } from '../../../game/ui/labels'

describe('formatDamageFloat', () => {
  it('returns single damage line', () => {
    expect(formatDamageFloat(12)).toEqual([
      { text: `-12 ${UI_DAMAGE}`, variant: 'damage' },
    ])
  })

  it('appends absorb line with stagger', () => {
    expect(formatDamageFloat(3, 7)).toEqual([
      { text: `-3 ${UI_DAMAGE}`, variant: 'damage' },
      { text: `(7 ${UI_DEFENSE})`, variant: 'absorb', delayMs: 100 },
    ])
  })

  it('omits absorb when zero', () => {
    expect(formatDamageFloat(5, 0)).toHaveLength(1)
  })
})

describe('formatHealFloat', () => {
  it('formats positive heal', () => {
    expect(formatHealFloat(8)).toEqual([
      { text: `+8 ${UI_HEART}`, variant: 'heal' },
    ])
  })
})

describe('statusKindEmoji', () => {
  it('maps known kinds', () => {
    expect(statusKindEmoji('attack_up', 'buff')).toBe('⚔')
    expect(statusKindEmoji('dot', 'debuff')).toBe('🔥')
    expect(statusKindEmoji('regen', 'buff')).toBe('💚')
  })

  it('falls back by polarity', () => {
    expect(statusKindEmoji('unknown_xyz', 'buff')).toBe('✨')
    expect(statusKindEmoji('unknown_xyz', 'debuff')).toBe('💀')
  })
})

describe('formatStatusFloat', () => {
  it('returns buff variant for buff polarity', () => {
    expect(formatStatusFloat('attack_up', 'buff')).toEqual([
      { text: '⚔', variant: 'buff' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/floatTextMap.test.ts`  
Expected: FAIL — module `./floatTextMap` not found

- [ ] **Step 3: Write minimal implementation**

Create `src/features/battle/animation/floatTextMap.ts`:

```ts
import type { UnitStatusKind } from '../../../game/battle/unitStatus'
import {
  UI_ATTACK,
  UI_DAMAGE,
  UI_DEFENSE,
  UI_HEAL,
  UI_HEART,
  UI_MAGIC,
} from '../../../game/ui/labels'

export type FloatVariant = 'damage' | 'heal' | 'absorb' | 'buff' | 'debuff'

export type FloatLine = {
  text: string
  variant: FloatVariant
  delayMs?: number
}

export const FLOAT_ABSORB_STAGGER_MS = 100

const STATUS_EMOJI: Partial<Record<UnitStatusKind, string>> = {
  attack_up: UI_ATTACK,
  defense_up: UI_DEFENSE,
  defense_down: UI_DEFENSE,
  card_damage_up: UI_DAMAGE,
  regen: UI_HEAL,
  elemental_resist: UI_MAGIC,
  dot: '🔥',
  rooted: '⛓',
  damage_reduction: UI_DEFENSE,
}

export function statusKindEmoji(statusKind: string, polarity: 'buff' | 'debuff'): string {
  const mapped = STATUS_EMOJI[statusKind as UnitStatusKind]
  if (mapped) return mapped
  return polarity === 'buff' ? '✨' : '💀'
}

export function formatDamageFloat(damage: number, absorbedDamage?: number): FloatLine[] {
  const lines: FloatLine[] = [
    { text: `-${damage} ${UI_DAMAGE}`, variant: 'damage' },
  ]
  if (absorbedDamage !== undefined && absorbedDamage > 0) {
    lines.push({
      text: `(${absorbedDamage} ${UI_DEFENSE})`,
      variant: 'absorb',
      delayMs: FLOAT_ABSORB_STAGGER_MS,
    })
  }
  return lines
}

export function formatHealFloat(amount: number): FloatLine[] {
  return [{ text: `+${amount} ${UI_HEART}`, variant: 'heal' }]
}

export function formatStatusFloat(statusKind: string, polarity: 'buff' | 'debuff'): FloatLine[] {
  return [{
    text: statusKindEmoji(statusKind, polarity),
    variant: polarity === 'buff' ? 'buff' : 'debuff',
  }]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/floatTextMap.test.ts`  
Expected: PASS (3 tests / 4 describe blocks)

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/floatTextMap.ts src/features/battle/animation/floatTextMap.test.ts
git commit -m "$(cat <<'EOF'
feat(battle): add float text formatters for combat numbers

EOF
)"
```

---

### Task 2: Extend AnimationStep types and logToSteps

**Files:**
- Modify: `src/features/battle/animation/types.ts`
- Modify: `src/features/battle/animation/logToSteps.ts`
- Modify: `src/features/battle/animation/logToSteps.test.ts`

**Interfaces:**
- Consumes: existing `mapLogEntryToSteps(entry, ctx)`
- Produces: strike steps with optional `absorbedDamage`; `aoe_burst` with `damage?` and `absorbedDamage?`

- [ ] **Step 1: Write the failing test**

Add to `src/features/battle/animation/logToSteps.test.ts`:

```ts
  it('passes absorbedDamage on melee strike', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 3,
      absorbedDamage: 7,
      attackKind: 'melee',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'strike_melee',
      damage: 3,
      absorbedDamage: 7,
    })
  })

  it('passes damage and absorbedDamage on aoe strike', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 4,
      absorbedDamage: 2,
      attackKind: 'aoe',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'aoe_burst',
      damage: 4,
      absorbedDamage: 2,
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/logToSteps.test.ts`  
Expected: FAIL — `absorbedDamage` not on step object

- [ ] **Step 3: Update types and mapper**

In `src/features/battle/animation/types.ts`, change strike and aoe variants:

```ts
  | { kind: 'strike_melee'; attackerId: string; targetId: string; damage: number; absorbedDamage?: number }
  | {
      kind: 'projectile'
      attackerId: string
      targetId: string
      damage: number
      absorbedDamage?: number
      attackKind: 'ranged' | 'aoe'
      projectileEmoji?: string
    }
  | { kind: 'aoe_burst'; center: Cell; cellKeys: readonly string[]; damage?: number; absorbedDamage?: number }
```

In `src/features/battle/animation/logToSteps.ts`, update `case 'strike'`:

```ts
      const absorbed =
        entry.absorbedDamage !== undefined && entry.absorbedDamage > 0
          ? entry.absorbedDamage
          : undefined

      if (entry.attackKind === 'melee') {
        steps = [{
          kind: 'strike_melee',
          attackerId: entry.attackerId,
          targetId: entry.targetId,
          damage: entry.damage,
          ...(absorbed !== undefined ? { absorbedDamage: absorbed } : {}),
        }]
      } else if (entry.attackKind === 'aoe') {
        const at = unitCell(ctx, entry.targetId)
        steps = [{
          kind: 'aoe_burst',
          center: at ?? { x: 0, y: 0 },
          cellKeys: at ? [cellKey(at.x, at.y)] : [],
          damage: entry.damage,
          ...(absorbed !== undefined ? { absorbedDamage: absorbed } : {}),
        }]
      } else {
        steps = [{
          kind: 'projectile',
          attackerId: entry.attackerId,
          targetId: entry.targetId,
          damage: entry.damage,
          attackKind: 'ranged',
          projectileEmoji: projectileEmojiFromCard(entry.fromCard),
          ...(absorbed !== undefined ? { absorbedDamage: absorbed } : {}),
        }]
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/logToSteps.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/types.ts src/features/battle/animation/logToSteps.ts src/features/battle/animation/logToSteps.test.ts
git commit -m "$(cat <<'EOF'
feat(battle): pass absorbedDamage through animation steps

EOF
)"
```

---

### Task 3: Float-aware step durations

**Files:**
- Modify: `src/features/battle/animation/presetRegistry.ts`
- Modify: `src/features/battle/animation/presetRegistry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const FLOAT_READ_MS = 700
  export function hasFloatText(step: AnimationStep): boolean
  // getPresetDurationMs returns max(DURATIONS[kind], FLOAT_READ_MS) when hasFloatText
  ```

- [ ] **Step 1: Write the failing tests**

Add/replace in `src/features/battle/animation/presetRegistry.test.ts`:

```ts
import { FLOAT_READ_MS, getPresetDurationMs, hasFloatText } from './presetRegistry'

describe('hasFloatText', () => {
  it('is true for strike with damage', () => {
    expect(hasFloatText({
      kind: 'strike_melee',
      attackerId: 'h',
      targetId: 'e',
      damage: 5,
    })).toBe(true)
  })

  it('is false for move', () => {
    expect(hasFloatText({
      kind: 'move',
      unitId: 'h',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    })).toBe(false)
  })

  it('is false for aoe without damage', () => {
    expect(hasFloatText({
      kind: 'aoe_burst',
      center: { x: 1, y: 1 },
      cellKeys: ['1,1'],
    })).toBe(false)
  })
})

describe('getPresetDurationMs with float', () => {
  it('returns FLOAT_READ_MS for strike_melee (700 > 220)', () => {
    expect(getPresetDurationMs({
      kind: 'strike_melee',
      attackerId: 'h',
      targetId: 'e',
      damage: 3,
    }, false)).toBe(FLOAT_READ_MS)
  })

  it('returns 280 for move unchanged', () => {
    expect(getPresetDurationMs({
      kind: 'move',
      unitId: 'h',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    }, false)).toBe(280)
  })

  it('returns 700 for heal (700 > 240)', () => {
    expect(getPresetDurationMs({
      kind: 'heal',
      healerId: 'h',
      targetId: 'h',
      amount: 5,
    }, false)).toBe(700)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/animation/presetRegistry.test.ts`  
Expected: FAIL — `hasFloatText` not exported; strike returns 220 not 700

- [ ] **Step 3: Implement presetRegistry changes**

Replace `src/features/battle/animation/presetRegistry.ts`:

```ts
import type { AnimationStep } from './types'

export const FLOAT_READ_MS = 700

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

export function hasFloatText(step: AnimationStep): boolean {
  switch (step.kind) {
    case 'strike_melee':
    case 'projectile':
      return step.damage > 0
    case 'heal':
    case 'resurrect':
    case 'status_tick_dot':
    case 'status_tick_regen':
    case 'buff_aura':
    case 'debuff_aura':
      return true
    case 'aoe_burst':
      return (step.damage ?? 0) > 0
    default:
      return false
  }
}

export function getPresetDurationMs(step: AnimationStep, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  const base = DURATIONS[step.kind]
  if (!hasFloatText(step)) return base
  return Math.max(base, FLOAT_READ_MS)
}

export function stepKindLabel(step: AnimationStep): string {
  return step.kind
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/battle/animation/presetRegistry.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/presetRegistry.ts src/features/battle/animation/presetRegistry.test.ts
git commit -m "$(cat <<'EOF'
feat(battle): extend animation step duration for float read time

EOF
)"
```

---

### Task 4: FloatingCombatText component and CSS

**Files:**
- Create: `src/features/battle/animation/FloatingCombatText.tsx`
- Modify: `src/features/battle/animation/battle-animation.css`

**Interfaces:**
- Consumes: `FloatLine`, `Cell`, `cellCenterPx` from `./cellGeometry`, `FLOAT_READ_MS` from `./presetRegistry`
- Produces:
  ```tsx
  export function FloatingCombatText(props: {
    cell: Cell
    lines: readonly FloatLine[]
  }): React.ReactElement | null
  ```

- [ ] **Step 1: Add CSS (no unit test — visual)**

In `src/features/battle/animation/battle-animation.css`, replace `.battle-anim--heal-float` block with:

```css
@keyframes battle-anim-float-rise {
  from {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  to {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 20px));
  }
}

.battle-anim--float {
  position: absolute;
  pointer-events: none;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  animation: battle-anim-float-rise 700ms ease-out forwards;
  z-index: 3;
}

.battle-anim--float--damage {
  color: #cf1322;
}

.battle-anim--float--heal {
  color: #389e0d;
}

.battle-anim--float--absorb {
  color: #8c8c8c;
  font-size: 10px;
  margin-top: 2px;
  margin-left: 8px;
}

.battle-anim--float--buff {
  color: #1677ff;
  font-size: 14px;
}

.battle-anim--float--buff--holy {
  color: #d4b106;
}

.battle-anim--float--debuff {
  color: #722ed1;
  font-size: 14px;
}

/* legacy alias — remove inline heal-float from BattleAnimationLayer in Task 5 */
.battle-anim--heal-float {
  animation: battle-anim-float-rise 700ms ease-out forwards;
  color: #389e0d;
  font-size: 12px;
  font-weight: 600;
}
```

- [ ] **Step 2: Create FloatingCombatText component**

Create `src/features/battle/animation/FloatingCombatText.tsx`:

```tsx
import type { CSSProperties } from 'react'
import { cellCenterPx } from './cellGeometry'
import type { FloatLine } from './floatTextMap'
import type { Cell } from './types'

export type FloatingCombatTextProps = {
  cell: Cell
  lines: readonly FloatLine[]
  holy?: boolean
}

function variantClass(variant: FloatLine['variant'], holy?: boolean): string {
  if (variant === 'buff' && holy) return 'battle-anim--float--buff--holy'
  return `battle-anim--float--${variant}`
}

export function FloatingCombatText({ cell, lines, holy }: FloatingCombatTextProps) {
  if (lines.length === 0) return null
  const pos = cellCenterPx(cell.x, cell.y)

  return (
    <span
      className="battle-anim-overlay battle-anim--float-stack"
      style={{ left: pos.left, top: pos.top }}
      aria-hidden
    >
      {lines.map((line, i) => {
        const style: CSSProperties = {}
        if (line.delayMs) style.animationDelay = `${line.delayMs}ms`
        return (
          <span
            key={`${line.variant}-${i}`}
            className={`battle-anim--float ${variantClass(line.variant, holy)}`}
            style={style}
          >
            {line.text}
          </span>
        )
      })}
    </span>
  )
}
```

Add to CSS:

```css
.battle-anim--float-stack {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  z-index: 3;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`  
Expected: PASS (or only unrelated errors — fix import paths if needed)

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/animation/FloatingCombatText.tsx src/features/battle/animation/battle-animation.css
git commit -m "$(cat <<'EOF'
feat(battle): add FloatingCombatText overlay component

EOF
)"
```

---

### Task 5: Integrate floats in BattleAnimationLayer

**Files:**
- Modify: `src/features/battle/animation/BattleAnimationLayer.tsx`

**Interfaces:**
- Consumes: `FloatingCombatText`, `formatDamageFloat`, `formatHealFloat`, `formatStatusFloat`
- Produces: float overlays on all float-capable steps

- [ ] **Step 1: Add imports and helper**

At top of `BattleAnimationLayer.tsx`:

```tsx
import { FloatingCombatText } from './FloatingCombatText'
import { formatDamageFloat, formatHealFloat, formatStatusFloat } from './floatTextMap'
```

- [ ] **Step 2: Add floats to combat steps**

For each case below, append `<FloatingCombatText />` alongside existing flash effects:

**`strike_melee`** — after `CellFlash`, on `targetCell`:

```tsx
<FloatingCombatText
  cell={targetCell}
  lines={formatDamageFloat(step.damage, step.absorbedDamage)}
/>
```

**`projectile`** — on `targetCell`:

```tsx
<FloatingCombatText
  cell={targetCell}
  lines={formatDamageFloat(step.damage, step.absorbedDamage)}
/>
```

**`aoe_burst`** — when `step.damage` defined, on `step.center`:

```tsx
{step.damage !== undefined && step.damage > 0 ? (
  <FloatingCombatText
    cell={step.center}
    lines={formatDamageFloat(step.damage, step.absorbedDamage)}
  />
) : null}
```

**`heal`** — replace inline `+{step.amount} {UI_HEART}` span with:

```tsx
<FloatingCombatText
  cell={targetCell}
  lines={formatHealFloat(step.amount)}
/>
```

Remove unused `UI_HEART` import if no longer referenced.

**`resurrect`** — add on `targetCell`:

```tsx
<FloatingCombatText
  cell={targetCell}
  lines={formatHealFloat(step.hp)}
/>
```

**`buff_aura`** — on unit cell:

```tsx
<FloatingCombatText
  cell={cell}
  lines={formatStatusFloat(step.statusKind, 'buff')}
  holy={step.holy}
/>
```

**`debuff_aura`**:

```tsx
<FloatingCombatText
  cell={cell}
  lines={formatStatusFloat(step.statusKind, 'debuff')}
/>
```

**`status_tick_dot`**:

```tsx
<FloatingCombatText
  cell={cell}
  lines={formatDamageFloat(step.damage)}
/>
```

**`status_tick_regen`**:

```tsx
<FloatingCombatText
  cell={cell}
  lines={formatHealFloat(step.amount)}
/>
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/features/battle/animation/`  
Expected: PASS

- [ ] **Step 4: Manual smoke in dev server**

Run: `npm run start` (if not running)  
Actions: enter battle, melee attack enemy — verify `-N 💥` floats above target for ~700 ms

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/animation/BattleAnimationLayer.tsx
git commit -m "$(cat <<'EOF'
feat(battle): show floating combat text on damage, heal, and status steps

EOF
)"
```

---

### Task 6: Enemy and auto-battle AI animation gating

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: existing `animationPlaying` derived from `battleAnim`
- Produces: enemy/auto-battle effects skip dispatch while `animationPlaying === true`

- [ ] **Step 1: Gate enemy AI**

In the enemy `useEffect` (~line 324), add early return and dependency:

```tsx
  useEffect(() => {
    if (!battle || battle.phase !== 'ongoing' || !currentId) return
    if (animationPlaying) return   // <-- ADD
    const actor = battle.units.find((u) => u.id === currentId)
    if (!actor || actor.side !== 'enemy' || actor.hp <= 0) return
    // ... rest unchanged
  }, [battle, currentId, battle?.currentTurnIndex, battle?.roundNumber, battle?.battleLog.length, animationPlaying])  // <-- ADD animationPlaying
```

- [ ] **Step 2: Gate auto-battle player AI**

In the auto-battle `useEffect` (~line 359), add:

```tsx
  useEffect(() => {
    if (!autoBattleEnabled || !battle || battle.phase !== 'ongoing') return
    if (animationPlaying) return   // <-- ADD
    const actor = battle.units.find((u) => u.id === getCurrentActorId(battle))
    // ... rest unchanged
  }, [battle, autoBattleEnabled, animationPlaying])  // <-- ADD animationPlaying
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "$(cat <<'EOF'
feat(battle): gate enemy and auto-battle AI on animation queue drain

EOF
)"
```

---

### Task 7: Final verification

**Files:** (none — verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`  
Expected: all tests PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Manual checklist (spec §9)**

- [ ] Melee / ranged: `-N 💥` over target
- [ ] Damage + absorb: two staggered lines
- [ ] Heal / regen tick: `+N ❤️`
- [ ] DoT tick: `-N 💥`
- [ ] Buff / debuff: emoji over unit
- [ ] Lifesteal chain: projectile float then heal float sequentially
- [ ] Enemy waits for float + 350 ms before acting
- [ ] Auto-battle does not skip animations
- [ ] DevTools → Rendering → Emulate prefers-reduced-motion: no floats, instant drain

- [ ] **Step 4: Commit spec/plan docs (if not yet committed)**

```bash
git add docs/superpowers/specs/2026-07-17-battle-floating-text-design.md docs/superpowers/plans/2026-07-17-battle-floating-text.md
git commit -m "$(cat <<'EOF'
docs: add battle floating text spec and implementation plan

EOF
)"
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|------------------|------|
| Format B (`-N 💥`, `(N 🛡)`, `+N ❤️`) | Task 1 |
| Status emoji map + fallbacks | Task 1 |
| absorbedDamage on strike steps | Task 2 |
| aoe_burst damage passthrough | Task 2 |
| FLOAT_READ_MS = 700 | Task 3 |
| Float inside existing steps | Tasks 4–5 |
| Stagger absorb +100 ms | Task 1, 4 |
| Enemy AI gating | Task 6 |
| Auto-battle gating | Task 6 |
| reduced-motion skip | Task 3 (duration 0) + Task 5 (no visible float when instant) |
| Reducer/log unchanged | Global constraints |
| Out of scope (crit, proc) | Not in plan |

No placeholders remain.
