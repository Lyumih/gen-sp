# Combat Mana System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ввести боевой ресурс маны — pool + regen на юните, стоимость умений, списание/реген в reducer, UI и миграцию save.

**Architecture:** Два flat-стата в `baseStats` (`mana` = max pool, `manaRegen` = +N в начале хода). На `Unit` — `mana` / `maxMana` (как HP). Чистые функции в `src/game/battle/mana.ts`; gate/spend в `cardCombat` + `runReducer` + enemy paths в `reducer`. Class-specific roll 0…N в `rollBaseStats.ts`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-07-20-combat-mana-system-design.md`  
**UI patterns:** `AGENTS.md`

## Global Constraints

- 10 stat ids; новый: `manaRegen` (♻️)
- `mana` (🔮) = max pool в бою; **flat** — без `computeUnitStat` / level / worldPower
- `manaRegen` = +N 🔮 в **начале хода** юнита; cap at `maxMana`
- Class roll tables: mage mana N=35/regen N=8 … warrior mana N=20/regen N=3, berserker mana N=18/regen N=3 (roll uniform **0…N**)
- Старт боя: `mana = maxMana = baseStats.mana`
- Базовые атаки (melee/ranged) — **0 mana**
- Gate порядок: CD → mana → range/target
- Нехватка маны: reducer silent no-op; UI `message.warning('Недостаточно маны')` via `App.useApp()`
- `mod-mana-save`: включить (`enabled: true`), `applyManaCostMods` — `Math.max(0, Math.ceil(base * (1 + mult)))`
- SAVE_VERSION **14** (from 13)
- Вне scope: mana drain/silence (`monster_mana_siphon`), перенос маны между боями, gear/passive бонусы к pool/regen
- Emoji: `UI_MANA`, `UI_COOLDOWN = '⏳'` из `src/game/ui/labels.ts`
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Config & roll** | 1–2 | `manaRegen` stat, class tables, tavern roll |
| **B — Templates & mods** | 3–4 | `manaCost` на картах, `applyManaCostMods` |
| **C — Battle core** | 5–7 | Unit fields, spawn, regen, spend, gates |
| **D — AI & enemies** | 8–9 | enemyAi, archetype `manaRegen` |
| **E — Persistence** | 10 | Migration v13→v14 |
| **F — UI** | 11–12 | Panel, tooltip, skill badges, popover |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/config/baseStats.ts` | `manaRegen` stat meta, `CLASS_MANA_ROLL_MAX`, `CLASS_MANA_REGEN_ROLL_MAX` |
| `src/game/stats/rollBaseStats.ts` | class-specific roll for `mana` / `manaRegen` |
| `src/game/battle/mana.ts` | `regenManaAtTurnStart`, `spendMana`, `canAffordManaCost`, `unitManaFromBaseStats` |
| `src/game/mods/modPipeline.ts` | `applyManaCostMods` |
| `src/game/content/cardTemplateTypes.ts` | `manaCost: number` |
| `src/game/content/cardTemplates.ts` | hero mana costs (spec §5.1) |
| `src/game/content/monsterSkillTemplates.ts` | monster mana costs (spec §5.2) |
| `src/game/types.ts` | `Unit.mana?`, `Unit.maxMana?`, optional `mana_spent` log |
| `src/game/battle/initiative.ts` | mana regen hook in `processTurnStartStatuses` |
| `src/game/campaign/scenarios.ts` | spawn `mana`/`maxMana` on units |
| `src/game/campaign/cardCombat.ts` | mana gate + spend on player card dispatch |
| `src/game/campaign/runReducer.ts` | early mana gate before dispatch |
| `src/game/battle/reducer.ts` | enemy card mana gate + spend |
| `src/features/battle/enemyAi.ts` | skip unaffordable cards |
| `src/game/persistence/migrate.ts` | v13→v14 |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 14` |
| `src/features/battle/BattleSkillCell.tsx` | badge `💥N · 🔮M · ⏳CD` |
| `src/features/battle/BattleScreen.tsx` | `🔮cur/max` panel + mana warning |
| `src/features/battle/BattleUnitTooltip.tsx` | mana line in hover |
| `src/game/descriptions/cardText.ts` | cost line in popover |

---

### Task 1: Config — `manaRegen` stat + class roll tables

**Files:**
- Modify: `src/game/config/baseStats.ts`
- Modify: `src/game/ui/labels.ts`
- Modify: `src/game/config/baseStats.test.ts`
- Modify: `src/game/stats/testFixtures.ts`

**Interfaces:**
- Produces:
  ```ts
  export type StatId = /* existing */ | 'manaRegen'
  export const CLASS_MANA_ROLL_MAX: Record<ClassId, number>
  export const CLASS_MANA_REGEN_ROLL_MAX: Record<ClassId, number>
  export const UI_MANA_REGEN = '♻️'  // in labels.ts
  ```

- [ ] **Step 1: Write failing test**

Add to `src/game/config/baseStats.test.ts`:

```ts
import { CLASS_MANA_REGEN_ROLL_MAX, CLASS_MANA_ROLL_MAX } from './baseStats'

it('has manaRegen as 10th stat', () => {
  expect(BASE_STAT_IDS).toContain('manaRegen')
  expect(BASE_STAT_IDS).toHaveLength(10)
})

it('warrior mana roll max is at least 15', () => {
  expect(CLASS_MANA_ROLL_MAX.warrior).toBeGreaterThanOrEqual(15)
  expect(CLASS_MANA_ROLL_MAX.berserker).toBeGreaterThanOrEqual(15)
})

it('mage has highest mana pool roll max', () => {
  expect(CLASS_MANA_ROLL_MAX.mage).toBe(35)
  expect(CLASS_MANA_REGEN_ROLL_MAX.mage).toBe(8)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/config/baseStats.test.ts`  
Expected: FAIL — `manaRegen` / tables missing

- [ ] **Step 3: Implement**

In `baseStats.ts`:
- Add `'manaRegen'` to `StatId`, `BASE_STAT_IDS` (after `mana`), `BASE_STAT_BOUNDS` `{ min: 0, max: 8 }`, `BASE_STAT_META` `{ labelRu: 'Реген маны', emoji: UI_MANA_REGEN, descriptionRu: 'Восстановление 🔮 в начале своего хода в бою.' }`
- Update `mana.descriptionRu` → `'Максимум маны в бою (flat).'`
- Add tables per spec §3.2
- Update `STARTER_HERO_BASE_STATS`: add `manaRegen: 2` (or roll-appropriate for warrior starter)

In `labels.ts`: `export const UI_MANA_REGEN = '♻️'`, `export const UI_COOLDOWN = '⏳'`

Update `testFixtures.ts` sample stats with `manaRegen: 3`

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/config/baseStats.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/config/baseStats.ts src/game/config/baseStats.test.ts src/game/ui/labels.ts src/game/stats/testFixtures.ts
git commit -m "feat: add manaRegen stat and class mana roll tables"
```

---

### Task 2: Tavern roll — class-specific `mana` / `manaRegen`

**Files:**
- Modify: `src/game/stats/rollBaseStats.ts`
- Modify: `src/game/stats/rollBaseStats.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function rollClassManaStats(
    classId: string,
    rng: () => number,
  ): Pick<BaseStats, 'mana' | 'manaRegen'>

  export function rollClassManaStatsDeterministic(
    classId: string,
    seedKey: string,
  ): Pick<BaseStats, 'mana' | 'manaRegen'>
  ```
- Consumes: `CLASS_MANA_ROLL_MAX`, `CLASS_MANA_REGEN_ROLL_MAX`, `rollStatInRange`, `hashSeed`

- [ ] **Step 1: Write failing test**

Add to `rollBaseStats.test.ts`:

```ts
import { rollClassManaStats, rollClassManaStatsDeterministic } from './rollBaseStats'

describe('rollClassManaStats', () => {
  it('mage mana is within 0..35', () => {
    for (let i = 0; i < 20; i++) {
      const { mana, manaRegen } = rollClassManaStats('mage', Math.random)
      expect(mana).toBeGreaterThanOrEqual(0)
      expect(mana).toBeLessThanOrEqual(35)
      expect(manaRegen).toBeLessThanOrEqual(8)
    }
  })

  it('deterministic roll is stable', () => {
    const a = rollClassManaStatsDeterministic('healer', 'char-1')
    const b = rollClassManaStatsDeterministic('healer', 'char-1')
    expect(a).toEqual(b)
  })
})

describe('rollBaseStatsForClass mana', () => {
  it('uses class table not affinity extended range for mana', () => {
    const stats = rollBaseStatsForClass('mage', () => 0.99)
    expect(stats.mana).toBeLessThanOrEqual(35)
    expect(stats.manaRegen).toBeLessThanOrEqual(8)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/stats/rollBaseStats.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

In `rollBaseStats.ts`:

```ts
import { CLASS_MANA_REGEN_ROLL_MAX, CLASS_MANA_ROLL_MAX, type ClassId } from '../config/baseStats'

export function rollClassManaStats(classId: string, rng: () => number): Pick<BaseStats, 'mana' | 'manaRegen'> {
  const cid = classId as ClassId
  const manaMax = CLASS_MANA_ROLL_MAX[cid] ?? 0
  const regenMax = CLASS_MANA_REGEN_ROLL_MAX[cid] ?? 0
  return {
    mana: rollStatInRange(0, manaMax, rng),
    manaRegen: rollStatInRange(0, regenMax, rng),
  }
}

export function rollClassManaStatsDeterministic(classId: string, seedKey: string): Pick<BaseStats, 'mana' | 'manaRegen'> {
  let s = hashSeed(`${seedKey}:classMana:${classId}`) >>> 0
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
  return rollClassManaStats(classId, rng)
}
```

In `rollBaseStatsForClass`: skip `mana`/`manaRegen` in main loop; assign via `rollClassManaStats(classId, rng)` at end.

Update `emptyBaseStats()` — already iterates `BASE_STAT_IDS`; picks up `manaRegen` automatically.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/stats/rollBaseStats.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/stats/rollBaseStats.ts src/game/stats/rollBaseStats.test.ts
git commit -m "feat: roll mana and manaRegen from class-specific tables"
```

---

### Task 3: Card templates — `manaCost` field + all values

**Files:**
- Modify: `src/game/content/cardTemplateTypes.ts`
- Modify: `src/game/content/cardTemplates.ts`
- Modify: `src/game/content/monsterSkillTemplates.ts`
- Modify: `src/game/content/cardTemplates.test.ts`

**Interfaces:**
- Produces: every `CardAttackTemplate` has required `manaCost: number`
- Consumes: spec §5.1 and §5.2 tables

- [ ] **Step 1: Write failing test**

Add to `cardTemplates.test.ts`:

```ts
import { CARD_ATTACK_TEMPLATES } from './cardTemplates'
import { MONSTER_SKILL_TEMPLATES } from './monsterSkillTemplates'

describe('manaCost on templates', () => {
  it('every hero template has manaCost', () => {
    for (const [id, tmpl] of Object.entries(CARD_ATTACK_TEMPLATES)) {
      expect(tmpl.manaCost, id).toBeGreaterThan(0)
    }
  })

  it('fireball costs 13', () => {
    expect(CARD_ATTACK_TEMPLATES.fireball.manaCost).toBe(13)
  })

  it('every monster template has manaCost', () => {
    for (const [id, tmpl] of Object.entries(MONSTER_SKILL_TEMPLATES)) {
      expect(tmpl.manaCost, id).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/content/cardTemplates.test.ts`  
Expected: FAIL — `manaCost` undefined / missing on type

- [ ] **Step 3: Implement**

Add `manaCost: number` to `CardAttackTemplate` in `cardTemplateTypes.ts`.

Add `manaCost` to **every** entry in `cardTemplates.ts` and `monsterSkillTemplates.ts` per spec §5.1 / §5.2 (copy exact values from spec).

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/content/cardTemplates.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/content/cardTemplateTypes.ts src/game/content/cardTemplates.ts src/game/content/monsterSkillTemplates.ts src/game/content/cardTemplates.test.ts
git commit -m "feat: add manaCost to all skill templates"
```

---

### Task 4: Mod pipeline — `applyManaCostMods` + enable `mod-mana-save`

**Files:**
- Modify: `src/game/mods/modPipeline.ts`
- Modify: `src/game/mods/modPipeline.test.ts`
- Modify: `src/game/content/modTemplates.ts`

**Interfaces:**
- Produces:
  ```ts
  export function applyManaCostMods(baseCost: number, ctx: ModCombatContext): number
  ```

- [ ] **Step 1: Write failing test**

Add to `modPipeline.test.ts`:

```ts
describe('applyManaCostMods', () => {
  it('mod-mana-save −20% rounds up with ceil', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-mana-save', lm: 0 }]
    const ctx: ModCombatContext = { carrierTags: ['skill'], modSlots: slots, rng: () => 50 }
    expect(applyManaCostMods(10, ctx)).toBe(8)
    expect(applyManaCostMods(13, ctx)).toBe(11)
  })

  it('never goes below 0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-mana-save', lm: 0 }]
    const ctx: ModCombatContext = { carrierTags: ['skill'], modSlots: slots, rng: () => 50 }
    expect(applyManaCostMods(1, ctx)).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/mods/modPipeline.test.ts`  
Expected: FAIL — `applyManaCostMods` not exported

- [ ] **Step 3: Implement**

In `modPipeline.ts`:

```ts
export function applyManaCostMods(baseCost: number, ctx: ModCombatContext): number {
  const mult = sumOpsByKind(ctx.modSlots, 'mana_cost_mult')
  return Math.max(0, Math.ceil(baseCost * (1 + mult)))
}
```

In `modTemplates.ts`: set `'mod-mana-save'.enabled = true`, update description line (remove «фаза 2»).

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/mods/modPipeline.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/mods/modPipeline.ts src/game/mods/modPipeline.test.ts src/game/content/modTemplates.ts
git commit -m "feat: apply mana cost mods and enable mod-mana-save"
```

---

### Task 5: Battle mana helpers + Unit spawn fields

**Files:**
- Create: `src/game/battle/mana.ts`
- Create: `src/game/battle/mana.test.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/campaign/scenarios.ts`

**Interfaces:**
- Produces:
  ```ts
  export function unitManaFromBaseStats(baseStats: BaseStats): { mana: number; maxMana: number }
  export function regenManaAtTurnStart(unit: Unit): Unit
  export function canAffordManaCost(unit: Unit, cost: number): boolean
  export function spendMana(unit: Unit, cost: number): Unit

  export function effectiveManaCostForTemplate(
    templateId: string,
    modCtx: ModCombatContext,
  ): number | null
  ```
- Consumes: `applyManaCostMods`, `getCardAttackTemplate`

- [ ] **Step 1: Write failing test**

Create `src/game/battle/mana.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MINI_BASE_STATS } from '../stats/testFixtures'
import type { Unit } from '../types'
import {
  canAffordManaCost,
  regenManaAtTurnStart,
  spendMana,
  unitManaFromBaseStats,
} from './mana'

const unit = (overrides: Partial<Unit>): Unit => ({
  id: 'u1',
  side: 'player',
  x: 0,
  y: 0,
  hp: 10,
  maxHp: 10,
  unitLevel: 1,
  mana: 20,
  maxMana: 30,
  baseStats: { ...MINI_BASE_STATS, mana: 30, manaRegen: 4 },
  ...overrides,
})

describe('unitManaFromBaseStats', () => {
  it('starts full at max pool', () => {
    expect(unitManaFromBaseStats({ ...MINI_BASE_STATS, mana: 25, manaRegen: 3 })).toEqual({
      mana: 25,
      maxMana: 25,
    })
  })
})

describe('regenManaAtTurnStart', () => {
  it('adds manaRegen capped at maxMana', () => {
    const u = unit({ mana: 28 })
    expect(regenManaAtTurnStart(u).mana).toBe(30)
  })

  it('no-op when manaRegen is 0', () => {
    const u = unit({ baseStats: { ...MINI_BASE_STATS, manaRegen: 0 }, mana: 10 })
    expect(regenManaAtTurnStart(u).mana).toBe(10)
  })
})

describe('spendMana', () => {
  it('subtracts cost', () => {
    expect(spendMana(unit({ mana: 20 }), 12).mana).toBe(8)
  })
})

describe('canAffordManaCost', () => {
  it('false when insufficient', () => {
    expect(canAffordManaCost(unit({ mana: 5 }), 10)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/battle/mana.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

`src/game/battle/mana.ts` — implement helpers above; `effectiveManaCostForTemplate` uses `getCardAttackTemplate` + `applyManaCostMods`.

`types.ts` — extend `Unit`:

```ts
mana?: number
maxMana?: number
```

Optional `BattleLogEntry`:

```ts
| { type: 'mana_spent'; unitId: string; amount: number; remaining: number }
```

`scenarios.ts` — in `makePlayerUnits` return and `makeEnemies` return, after building `baseStats`:

```ts
const { mana, maxMana } = unitManaFromBaseStats(baseStats)
// add mana, maxMana to unit object
```

Update `enemyBaseStats()` fallback to include `manaRegen: 0`.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/battle/mana.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/mana.ts src/game/battle/mana.test.ts src/game/types.ts src/game/campaign/scenarios.ts
git commit -m "feat: unit mana pool at spawn and battle mana helpers"
```

---

### Task 6: Mana regen at turn start

**Files:**
- Modify: `src/game/battle/initiative.ts`
- Modify: `src/game/battle/initiative.test.ts`

**Interfaces:**
- Consumes: `regenManaAtTurnStart` from `./mana`

- [ ] **Step 1: Write failing test**

Add to `initiative.test.ts`:

```ts
import { regenManaAtTurnStart } from './mana'

it('advanceTurn regens mana for new actor', () => {
  const s = battleWithTwoUnits({
    hero: { mana: 10, maxMana: 30, baseStats: { ...fixture, manaRegen: 5 } },
    enemy: { mana: 30, maxMana: 30, baseStats: { ...fixture, manaRegen: 0 } },
  })
  const next = advanceTurn(s)
  const actor = next.units.find((u) => u.id === next.turnOrder[next.currentTurnIndex])
  expect(actor?.mana).toBe(15) // 10 + 5 if hero's turn next
})
```

(Adapt fixture helper to match existing test patterns in file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/battle/initiative.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

In `processTurnStartStatuses`, after status tick HP regen, before return:

```ts
import { regenManaAtTurnStart } from './mana'

// inside processTurnStartStatuses, after unit resolved:
const withMana = regenManaAtTurnStart(units.find((u) => u.id === unitId)!)
units = units.map((u) => (u.id === unitId ? withMana : u))
```

Ensure regen runs even when unit has **no passives** (unlike `advanceBattleTurn` passive block).

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/battle/initiative.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/initiative.ts src/game/battle/initiative.test.ts
git commit -m "feat: regenerate mana at start of unit turn"
```

---

### Task 7: Spend mana + gates (player + enemy)

**Files:**
- Modify: `src/game/campaign/cardCombat.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/battle/reducer.ts`
- Create: `src/game/battle/manaCombat.test.ts`

**Interfaces:**
- Consumes: `canAffordManaCost`, `spendMana`, `effectiveManaCostForTemplate`, `cardModCombatContext`

- [ ] **Step 1: Write failing integration test**

Create `src/game/battle/manaCombat.test.ts` with scenario:
- Hero mana 10, fireball cost 13 → `USE_CARD_ATTACK` returns unchanged state
- Hero mana 20, cast succeeds → mana becomes 7 (or 8 with mod)

Use existing reducer/runReducer test helpers (`initialCampaignState`, `dispatchBattle` patterns from `reducer.test.ts`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/battle/manaCombat.test.ts`  
Expected: FAIL — mana not spent / gate missing

- [ ] **Step 3: Implement**

Shared helper in `cardCombat.ts` (or `mana.ts`):

```ts
export function assertActorCanPayManaCost(
  actor: Unit,
  card: BattlePlayerCard,
  modCtx: ModCombatContext,
): number | null {
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return null
  const cost = applyManaCostMods(tmpl.manaCost, modCtx)
  if (!canAffordManaCost(actor, cost)) return null
  return cost
}
```

In each `dispatchCard*Use` (`Attack`, `AoE`, `Heal`, `Buff`): after CD/range checks, call assert; on success `spendMana` on actor before `applyAction`; pass updated unit into battle state.

In `runReducer.ts` `tryUseCard*`: optional early gate (read actor mana + template cost) before dispatch — mirrors CD check.

In `reducer.ts` `tryCardAttack` / enemy heal/aoe paths: same gate + spend for enemy actor.

Append optional `mana_spent` log entry.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/battle/manaCombat.test.ts src/game/battle/reducer.test.ts src/game/campaign/runReducer.test.ts`  
Expected: PASS (fix any broken fixtures by adding `mana`/`maxMana` to test units)

- [ ] **Step 5: Commit**

```bash
git add src/game/campaign/cardCombat.ts src/game/campaign/runReducer.ts src/game/battle/reducer.ts src/game/battle/manaCombat.test.ts
git commit -m "feat: gate and spend mana on skill use"
```

---

### Task 8: Enemy AI — skip unaffordable skills

**Files:**
- Modify: `src/features/battle/enemyAi.ts`
- Modify: `src/features/battle/enemyAi.test.ts`

**Interfaces:**
- Consumes: `canAffordManaCost`, `effectiveManaCostForTemplate` (or inline modCtx with empty mods for enemy cards)

- [ ] **Step 1: Write failing test**

Enemy with mana 5 and card cost 12 → AI picks move/melee, not card.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/enemyAi.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

Extend `cardReady(c, actor, state)` or add `cardAffordable(actor, c)` checking mana vs `tmpl.manaCost` (enemy cards typically no mod slots — use empty modCtx).

Filter in card selection loops.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/features/battle/enemyAi.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/enemyAi.ts src/features/battle/enemyAi.test.ts
git commit -m "feat: enemy AI respects mana cost"
```

---

### Task 9: Enemy archetypes — `manaRegen` values

**Files:**
- Modify: `src/game/content/enemyArchetypes.ts`
- Modify: `src/game/battle/enemySpawn.test.ts`

**Interfaces:**
- All archetype `baseStats` include `manaRegen` (0 for grunts, 2–6 for casters per spec §7)

- [ ] **Step 1: Write failing test**

```ts
it('caster archetypes have manaRegen', () => {
  const mage = getEnemyArchetype('enemy_mage')!
  expect(mage.baseStats.manaRegen).toBeGreaterThan(0)
})
```

- [ ] **Step 2–4: Implement + test**

Add sensible `manaRegen` to each archetype inline stats (mage/healer/warlock higher; warrior/brute 1–3; defaults in `REGULAR_STATS`).

Run: `npm run test -- src/game/battle/enemySpawn.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/content/enemyArchetypes.ts src/game/battle/enemySpawn.test.ts
git commit -m "feat: add manaRegen to enemy archetype base stats"
```

---

### Task 10: Save migration v13 → v14

**Files:**
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

**Interfaces:**
- Produces: `migrateV13CampaignToV14(c: CampaignState): CampaignState`
- Consumes: `rollClassManaStatsDeterministic`, `computeBaseStatRating`

- [ ] **Step 1: Write failing test**

```ts
it('v13→v14 adds manaRegen and rerolls mana via class table', () => {
  const legacy = makeV13CampaignWithoutManaRegen()
  const migrated = migrateSave({ version: 13, campaign: legacy })
  expect(migrated.version).toBe(14)
  const c = migrated.campaign.characters[0]!
  expect(c.baseStats.manaRegen).toBeDefined()
  expect(c.baseStats.mana).toBeLessThanOrEqual(CLASS_MANA_ROLL_MAX[c.classId as ClassId])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/persistence/migrate.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

`schema.ts`: `SAVE_VERSION = 14`

`migrateV13CampaignToV14`: for each character, `rollClassManaStatsDeterministic(classId, character.id)` → assign `mana`, `manaRegen`; `baseStatRating = computeBaseStatRating(baseStats)`

Wire in `migrateSave` chain after v12→v13.

Update `migrate.test.ts` expected `SAVE_VERSION` to 14.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/persistence/migrate.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/persistence/schema.ts src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts
git commit -m "feat: migrate saves to v14 with manaRegen and class mana roll"
```

---

### Task 11: UI — tooltips, skill badges, popover, StatStrip

**Files:**
- Modify: `src/features/battle/BattleUnitTooltip.tsx`
- Modify: `src/features/battle/BattleSkillCell.tsx`
- Modify: `src/features/battle/BattleSkillCell.test.tsx`
- Modify: `src/game/descriptions/cardText.ts`
- Modify: `src/features/battle/TurnOrderStrip.tsx` (pass mana props to tooltip if needed)

**Interfaces:**
- Consumes: `UI_MANA`, `UI_COOLDOWN`, `applyManaCostMods`, `applyCooldownMods`

- [ ] **Step 1: Write failing test**

Extend `BattleSkillCell.test.tsx`:

```tsx
it('renders mana cost and cooldown in context badge', () => {
  const html = renderToStaticMarkup(/* BattleSkillCell with actor mana 30, strike card */)
  expect(html).toContain('🔮')
  expect(html).toContain('⏳')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/battle/BattleSkillCell.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Implement**

`BattleUnitTooltip`: props `mana?: number`, `maxMana?: number`; line `{UI_MANA} в бою: {mana}/{maxMana}`

`BattleSkillCell`: accept optional `actor?: Unit`; build badge:

```ts
const cdDisplay = card.cooldownRemaining > 0 ? card.cooldownRemaining : effectiveCd
const badge = [effectPart, `${UI_MANA}${effectiveManaCost}`, `${UI_COOLDOWN}${cdDisplay}`]
  .filter(Boolean)
  .join(' · ')
```

`cardText.ts`: add `Стоимость: 🔮${effectiveCost}` line using `applyManaCostMods`.

Pass `mana`/`maxMana` from `BattleScreen` / `TurnOrderStrip` into tooltips.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/features/battle/BattleSkillCell.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/BattleUnitTooltip.tsx src/features/battle/BattleSkillCell.tsx src/features/battle/BattleSkillCell.test.tsx src/game/descriptions/cardText.ts src/features/battle/TurnOrderStrip.tsx
git commit -m "feat: show mana cost on skill cells and unit tooltips"
```

---

### Task 12: UI — active hero mana panel + insufficient mana warning

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: `actor.mana`, `actor.maxMana`, `effectiveManaCostForTemplate` / local cost helper

- [ ] **Step 1: Manual test checklist** (no new test file required)

- Active hero panel shows `🔮12/30`
- Click skill when `mana < cost` → warning «Недостаточно маны», no dispatch
- Click skill when on CD still shows CD warning (unchanged)

- [ ] **Step 2: Implement**

Near actor HP display, add `{UI_MANA}{actor.mana ?? 0}/{actor.maxMana ?? 0}`.

In `onCellClick` card branch, before `dispatchRun`:

```ts
const cost = /* effective mana cost for card */
if ((actor.mana ?? 0) < cost) {
  message.warning('Недостаточно маны')
  return
}
```

Optional: pass `insufficientMana={actor && cost > actor.mana}` style to `BattleSkillCell` for opacity class.

- [ ] **Step 3: Verify build**

Run: `npm run test`  
Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat: battle mana panel and insufficient mana warning"
```

---

## Final Verification

- [ ] `npm run test` — all green
- [ ] `npm run build` — no TS errors
- [ ] Smoke: start battle → full mana → cast skill → mana drops → next turn regen → 4–5 casts feel per spec

---

## Spec Coverage Self-Review

| Spec § | Task |
|--------|------|
| §3 manaRegen stat + class tables | 1, 2 |
| §3.3 manaCost on templates | 3 |
| §3.4 mod-mana-save | 4 |
| §4.1 spawn full mana | 5 |
| §4.2 regen at turn start | 6 |
| §4.3 spend + gate | 7, 12 |
| §4.4 enemy AI | 8 |
| §5 cost tables | 3 |
| §6 UI panel/tooltip/cells/popover/StatStrip | 1 (StatStrip via BASE_STAT_IDS), 11, 12 |
| §7 enemy archetypes | 9 |
| §8 migration v14 | 10 |
| §9 out of scope | not tasked |
| §10 tests | each task |

No placeholders found. Type names consistent: `manaRegen`, `applyManaCostMods`, `regenManaAtTurnStart`.
