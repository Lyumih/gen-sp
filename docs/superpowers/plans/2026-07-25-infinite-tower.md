# Infinite Tower (Бесконечная башня) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the persistent «Бесконечная башня» mode (one floor = one battle, hub between wins, retry/reset, first-clear rewards, affix from floor 11) plus shared encounter scaling primitives.

**Architecture:** `TowerProgress` lives on `CampaignState` (not `Expedition`). Floor encounters are deterministic from `(runSeed, floor)` via `encounterSpecForTowerFloor` + `generateInfiniteTower`. Tower battles mark `BattleAttemptSnapshot.towerFloor`; reducer branches mirror expedition for merge-on-victory but return to `hub` without shop lock. Affixes attach to `BattleScenario.towerAffixId` and apply at battle assembly.

**Tech Stack:** Vite 8, React 19, Ant Design v6, Zustand, Vitest, TypeScript strict (`tsconfig.app.json`).

## Global Constraints

- UI messages via `App.useApp().message`, not static `antd` `message`.
- Game logic in pure TS under `src/game/`; React in `src/features/`.
- `verbatimModuleSyntax`, no unused locals/parameters.
- Stat emoji from `src/game/ui/labels.ts` / `AGENTS.md`; compact UI + tooltips.
- Tests: `npm run test` (Vitest).
- Save schema bump + migration when extending `CampaignState` (current `SAVE_VERSION = 14`).
- Spec source of truth: `docs/superpowers/specs/2026-07-25-infinite-tower-design.md`.

---

## File map

| File | Responsibility |
|------|----------------|
| `src/game/types.ts` | `TowerProgress`, `CampaignState.tower`, `BattleAttemptSnapshot.towerFloor` |
| `src/game/encounter/encounterSpec.ts` | Floor → counts, levels, pools, affix tier, layout profile |
| `src/game/encounter/encounterSpec.test.ts` | Table + cycle tests |
| `src/game/tower/rewards.ts` | First-clear gold / worldPower |
| `src/game/tower/rewards.test.ts` | First-clear idempotency |
| `src/game/tower/towerProgress.ts` | init, reset, victory bump, preview helpers |
| `src/game/tower/towerProgress.test.ts` | reset / victory / bestFloor |
| `src/game/tower/towerAffixes.ts` | Affix defs + apply to units/stats/field |
| `src/game/expedition/generators/infiniteTower.ts` | Build `BattleScenario` from spec + seed |
| `src/game/expedition/generators/infiniteTower.test.ts` | Determinism + spawn counts |
| `src/game/campaign/scenarios.ts` | Optional scenario fields; affix hook in `battleStateFromScenario` |
| `src/game/battle/enemyCards.ts` | Skill tier bump helper |
| `src/game/campaign/battleSnapshot.ts` | `buildTowerBattleSnapshot` |
| `src/game/campaign/runReducer.ts` | `START_TOWER_BATTLE`, `RESET_TOWER`, tower victory/defeat paths |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 15` |
| `src/game/persistence/migrate.ts` | `migrateV14CampaignToV15` |
| `src/features/campaign/InfiniteTowerPanel.tsx` | Floor UI, preview, reset, start |
| `src/features/campaign/buildBattleModeEntries.ts` | Remove tower placeholder / wire panel |
| `src/features/campaign/CampaignBattleTab.tsx` | Panel + party pick for tower |

---

### Task 1: Types, save migration, tower progress helpers

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/campaign/runReducer.ts` (`initialCampaignState`)
- Create: `src/game/tower/towerProgress.ts`
- Create: `src/game/tower/towerProgress.test.ts`
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/persistence.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type TowerProgress = { currentFloor: number; bestFloor: number; runSeed: number; floorsFirstCleared: number[] }`
  - `export function createInitialTowerProgress(runSeed: number): TowerProgress`
  - `export function resetTowerProgress(prev: TowerProgress, newRunSeed: number): TowerProgress`
  - `export function applyTowerFloorVictory(prev: TowerProgress, clearedFloor: number): TowerProgress`
  - `export function ensureTowerProgress(state: CampaignState, runSeed: number): TowerProgress`

- [ ] **Step 1: Write failing tests**

```ts
// src/game/tower/towerProgress.test.ts
import { describe, expect, it } from 'vitest'
import {
  applyTowerFloorVictory,
  createInitialTowerProgress,
  resetTowerProgress,
} from './towerProgress'

describe('towerProgress', () => {
  it('createInitialTowerProgress starts at floor 1', () => {
    const t = createInitialTowerProgress(42)
    expect(t).toEqual({
      currentFloor: 1,
      bestFloor: 0,
      runSeed: 42,
      floorsFirstCleared: [],
    })
  })

  it('applyTowerFloorVictory increments floor and bestFloor', () => {
    const t = createInitialTowerProgress(1)
    const next = applyTowerFloorVictory(t, 1)
    expect(next.currentFloor).toBe(2)
    expect(next.bestFloor).toBe(1)
  })

  it('resetTowerProgress keeps first-clear and best, resets floor and seed', () => {
    const t = applyTowerFloorVictory(
      { ...createInitialTowerProgress(1), floorsFirstCleared: [1, 2] },
      5,
    )
    const reset = resetTowerProgress(t, 999)
    expect(reset.currentFloor).toBe(1)
    expect(reset.runSeed).toBe(999)
    expect(reset.bestFloor).toBe(5)
    expect(reset.floorsFirstCleared).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/tower/towerProgress.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement types + helpers + migration**

Add to `types.ts`:

```ts
export type TowerProgress = {
  currentFloor: number
  bestFloor: number
  runSeed: number
  floorsFirstCleared: number[]
}

// CampaignState — add:
tower: TowerProgress | null

// BattleAttemptSnapshot — add:
towerFloor?: number
```

Implement `towerProgress.ts` with the four exported functions above (`applyTowerFloorVictory` uses `clearedFloor` argument = floor fought this battle).

`initialCampaignState`: `tower: null`.

`schema.ts`: `SAVE_VERSION = 15`.

`migrate.ts`:

```ts
export function migrateV14CampaignToV15(c: CampaignState): CampaignState {
  return { ...c, tower: c.tower ?? null }
}
```

Wire in the migrate chain after v14. Extend `persistence.test.ts` with load v14 → v15 adds `tower: null`.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/tower/towerProgress.test.ts src/game/persistence/persistence.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/tower/towerProgress.ts src/game/tower/towerProgress.test.ts src/game/campaign/runReducer.ts src/game/persistence/schema.ts src/game/persistence/migrate.ts src/game/persistence/persistence.test.ts
git commit -m "feat(tower): add TowerProgress types, helpers, save v15"
```

---

### Task 2: Encounter spec (floor math)

**Files:**
- Create: `src/game/encounter/encounterSpec.ts`
- Create: `src/game/encounter/encounterSpec.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type EncounterLayoutProfile = 'compact' | 'wide'`
  - `export type EncounterSpec = { gruntCount: number; bossCount: number; enemyUnitLevel: number; skillTier: number; poolTags: readonly string[]; affixId?: string; layoutProfile: EncounterLayoutProfile }`
  - `export function towerCycleIndex(floor: number): { cycle: number; indexInCycle: number }`
  - `export function enemyUnitLevelForTowerCycle(cycle: number): number` → `1 + (cycle - 1) * 2`
  - `export function encounterSpecForTowerFloor(floor: number, affixId?: string): EncounterSpec`

- [ ] **Step 1: Write failing tests**

```ts
// src/game/encounter/encounterSpec.test.ts
import { describe, expect, it } from 'vitest'
import { encounterSpecForTowerFloor, towerCycleIndex } from './encounterSpec'

describe('towerCycleIndex', () => {
  it('maps floor 10 and 11', () => {
    expect(towerCycleIndex(10)).toEqual({ cycle: 1, indexInCycle: 10 })
    expect(towerCycleIndex(11)).toEqual({ cycle: 2, indexInCycle: 1 })
  })
})

describe('encounterSpecForTowerFloor', () => {
  it('floor 1 has one grunt, no affix', () => {
    const s = encounterSpecForTowerFloor(1)
    expect(s.gruntCount).toBe(1)
    expect(s.bossCount).toBe(0)
    expect(s.enemyUnitLevel).toBe(1)
    expect(s.skillTier).toBe(0)
    expect(s.affixId).toBeUndefined()
    expect(s.layoutProfile).toBe('compact')
  })

  it('floor 10 has 8 grunts and 2 bosses', () => {
    const s = encounterSpecForTowerFloor(10)
    expect(s.gruntCount).toBe(8)
    expect(s.bossCount).toBe(2)
    expect(s.layoutProfile).toBe('wide')
  })

  it('floor 11 includes affixId when provided', () => {
    const s = encounterSpecForTowerFloor(11, 'tower_affix_enemy_initiative')
    expect(s.affixId).toBe('tower_affix_enemy_initiative')
    expect(s.enemyUnitLevel).toBe(3)
    expect(s.poolTags).toContain('ranged')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/encounter/encounterSpec.test.ts`

- [ ] **Step 3: Implement encounterSpec.ts**

Implement grunt/boss table from spec §5.1. `poolTags`: cycle 1 → `['arena','melee']`; cycle ≥ 2 add `'ranged'`. `skillTier = cycle - 1`. `layoutProfile`: indexInCycle ≤ 4 → `'compact'`, else `'wide'`. `affixId` only passed in when `floor >= 11` (generator supplies roll).

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/encounter/encounterSpec.ts src/game/encounter/encounterSpec.test.ts
git commit -m "feat(encounter): tower floor EncounterSpec"
```

---

### Task 3: First-clear rewards

**Files:**
- Create: `src/game/tower/rewards.ts`
- Create: `src/game/tower/rewards.test.ts`

**Interfaces:**
- Produces:
  - `export function towerFirstClearGold(floor: number): number` → `50 + 10 * floor`
  - `export function towerFirstClearWorldPowerBonus(floor: number): number` → `floor % 10 === 0 ? 1 : 0`
  - `export function applyTowerFirstClearRewards(progress: TowerProgress, clearedFloor: number): { progress: TowerProgress; gold: number; worldPower: number }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { applyTowerFirstClearRewards } from './rewards'
import { createInitialTowerProgress } from './towerProgress'

describe('applyTowerFirstClearRewards', () => {
  it('grants gold once for first clear', () => {
    const t = createInitialTowerProgress(1)
    const r = applyTowerFirstClearRewards(t, 3)
    expect(r.gold).toBe(80)
    expect(r.worldPower).toBe(0)
    expect(r.progress.floorsFirstCleared).toEqual([3])
  })

  it('skips gold on repeat clear', () => {
    const t = { ...createInitialTowerProgress(1), floorsFirstCleared: [3] }
    const r = applyTowerFirstClearRewards(t, 3)
    expect(r.gold).toBe(0)
    expect(r.progress.floorsFirstCleared).toEqual([3])
  })

  it('adds worldPower on floor 10', () => {
    const t = createInitialTowerProgress(1)
    const r = applyTowerFirstClearRewards(t, 10)
    expect(r.worldPower).toBe(1)
    expect(r.gold).toBe(150)
  })
})
```

- [ ] **Step 2–4: Implement, run tests, PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/tower/rewards.ts src/game/tower/rewards.test.ts
git commit -m "feat(tower): first-clear reward helpers"
```

---

### Task 4: Infinite tower scenario generator

**Files:**
- Create: `src/game/expedition/generators/infiniteTower.ts`
- Create: `src/game/expedition/generators/infiniteTower.test.ts`
- Modify: `src/game/campaign/scenarios.ts` (extend `BattleScenario`)
- Modify: `src/game/expedition/generators/index.ts` (export helper, not necessarily registry)

**Interfaces:**
- Consumes: `encounterSpecForTowerFloor`, `makeRng`, `placePoolEnemies`, `BOSS_ARCHETYPE_IDS`, `shuffleCells`
- Produces:
  - `export type InfiniteTowerGeneratorInput = { runSeed: number; floor: number }`
  - `export function rollTowerAffixId(runSeed: number, floor: number): string | undefined`
  - `export function generateInfiniteTower(input: InfiniteTowerGeneratorInput): BattleScenario`

Extend `BattleScenario`:

```ts
defaultEnemyUnitLevel?: number
enemySkillTierGrunt?: number
enemySkillTierBoss?: number
towerAffixId?: string
```

- [ ] **Step 1: Write failing tests**

Test floor 5 spawn count (4 grunts + 1 boss archetype), floor 1 compact dimensions, same `(runSeed,floor)` → same boss id, floor 10 → two boss spawns.

```ts
import { describe, expect, it } from 'vitest'
import { generateInfiniteTower } from './infiniteTower'

describe('generateInfiniteTower', () => {
  it('is deterministic for same seed and floor', () => {
    const a = generateInfiniteTower({ runSeed: 123, floor: 5 })
    const b = generateInfiniteTower({ runSeed: 123, floor: 5 })
    expect(a.enemySpawns).toEqual(b.enemySpawns)
    expect(a.towerAffixId).toBe(b.towerAffixId)
  })

  it('floor 1 has one enemy spawn', () => {
    const s = generateInfiniteTower({ runSeed: 1, floor: 1 })
    expect(s.enemySpawns.length).toBe(1)
    expect(s.width).toBeLessThanOrEqual(8)
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement generator**

- Affix: if `floor >= 11`, `rollTowerAffixId` picks from `['tower_affix_enemy_initiative','tower_affix_heal_down','tower_affix_narrow_field']` using tier `(cycle - 1)` capped to pool size.
- Grunts via `placePoolEnemies` with `unitLevel: spec.enemyUnitLevel`.
- Bosses: fixed spawns at `unitLevel: spec.enemyUnitLevel`, archetype from shuffled `BOSS_ARCHETYPE_IDS` with salt `tower:${floor}:boss:${slot}`.
- Set `defaultEnemyUnitLevel`, `enemySkillTierGrunt = max(0, skillTier - 1)`, `enemySkillTierBoss = skillTier` on scenario.

- [ ] **Step 4: Run tests PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/generators/infiniteTower.ts src/game/expedition/generators/infiniteTower.test.ts src/game/campaign/scenarios.ts
git commit -m "feat(tower): procedural infinite tower scenario generator"
```

---

### Task 5: Enemy skill tier + scenario unit levels

**Files:**
- Modify: `src/game/campaign/scenarios.ts` (`resolveScenarioEnemies`, `battleStateFromScenario`)
- Modify: `src/game/battle/enemyCards.ts`

**Interfaces:**
- Produces:
  - `export function bumpPresetLevels<T extends { global_level: number }>(presets: readonly T[], add: number): T[]`
  - `enemyCardsByUnitFromScenario` accepts optional per-unit tier map OR reads archetype `isBoss` + scenario tier fields

- [ ] **Step 1: Write failing test**

```ts
// src/game/battle/enemyCards.test.ts (append)
import { bumpPresetLevels } from './enemyCards'

it('bumpPresetLevels adds to global_level', () => {
  const out = bumpPresetLevels([{ global_level: 2, templateId: 'x', modSlots: [] }], 3)
  expect(out[0]!.global_level).toBe(5)
})
```

Add test in `scenarios.test.ts`: scenario with `defaultEnemyUnitLevel: 5` and pool spawn → resolved enemies level 5.

- [ ] **Step 2–3: Implement**

In `resolveScenarioEnemies`, for pool spawns use `spawn.unitLevel ?? scenario.defaultEnemyUnitLevel ?? 1`.

In `battleStateFromScenario`, when building enemy cards/passives, if scenario has tier fields, pass `gruntTier = scenario.enemySkillTierGrunt ?? 0`, `bossTier = scenario.enemySkillTierBoss ?? 0`, pick tier by `getEnemyArchetype(id)?.isBoss`.

- [ ] **Step 4: Run `npm run test -- src/game/battle/enemyCards.test.ts src/game/campaign/scenarios.test.ts`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(encounter): scenario default enemy level and skill tier"
```

---

### Task 6: Tower affixes in battle assembly

**Files:**
- Create: `src/game/tower/towerAffixes.ts`
- Create: `src/game/tower/towerAffixes.test.ts`
- Modify: `src/game/campaign/scenarios.ts` (`battleStateFromScenario`)

**Interfaces:**
- Produces:
  - `export const TOWER_AFFIX_IDS = [...] as const`
  - `export function getTowerAffixLabel(id: string): { title: string; description: string }`
  - `export function applyTowerAffixToUnits(units: Unit[], affixId: string): Unit[]`

- [ ] **Step 1: Test initiative affix adds +2 initiativeBase on enemies**

- [ ] **Step 2: Implement affix apply after `makeEnemies` in `battleStateFromScenario` when `scenario.towerAffixId` set**

- `tower_affix_narrow_field`: generator already shrinks field; affix hook no-op or validate width.

- [ ] **Step 3: Run tests PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(tower): apply tower affixes at battle start"
```

---

### Task 7: Reducer — start, victory, defeat, reset

**Files:**
- Modify: `src/game/campaign/battleSnapshot.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Create: `src/game/campaign/towerBattle.test.ts`

**Interfaces:**
- Produces:
  - `buildTowerBattleSnapshot(state, selectedCharacterIds, scenarioSlotIndex): BattleAttemptSnapshot | null` — same pattern as expedition party list from ids (max 4), `towerFloor` = `tower.currentFloor`
  - Run actions: `{ type: 'START_TOWER_BATTLE'; selectedCharacterIds: readonly string[] }`, `{ type: 'RESET_TOWER' }`
  - `TOWER_BATTLE_SCENARIO_SLOT = -1` constant for gold (use `BASE_SCENARIO_GOLD + gruntCount*5` via helper in `victoryRewards.ts`)

**Guards:**
- `START_TOWER_BATTLE`: `phase === 'hub'`, `battle === null`, `expedition === null`, ≥1 valid character id, ≤4 ids.
- `RESET_TOWER`: `phase === 'hub'`, `battle === null`; requires existing `tower` or no-op init.

**Victory path:**
- In battle sync (where expedition branch exists), add `else if (state.battleAttemptSnapshot?.towerFloor !== undefined)`:
  - On victory: `mergeExpeditionBattleProgress`-style merge for all party members (reuse `mergeBattleCardsToParty`), `applyTowerFloorVictory` on `tower`, set `phase: 'victory'`, keep `battle` for finalize screen.
  - On defeat: `phase: 'defeat'`, floor unchanged.
- In `finalizeVictory`: if `snapshot.towerFloor` defined, call `applyTowerFirstClearRewards`, add gold/worldPower, do **not** increment `scenarioIndex`, do **not** clear `tower`, set `expedition` stays null.

Extend `computeVictoryGoldGain` or branch in finalize: tower uses `goldForScenarioVictory(0)` baseline or dedicated `towerVictoryBaseGold(gruntCount)`.

- [ ] **Step 1: Write integration tests in `towerBattle.test.ts`**

```ts
import { applyRunAction, initialCampaignState } from './runReducer'

it('START_TOWER_BATTLE sets towerFloor on snapshot', () => { /* ... */ })
it('victory then FINALIZE advances currentFloor and first-clear gold once', () => { /* ... */ })
it('defeat keeps currentFloor', () => { /* ... */ })
it('RESET_TOWER rolls new seed and floor 1', () => { /* ... */ })
```

- [ ] **Step 2–4: Implement, run `npm run test -- src/game/campaign/towerBattle.test.ts`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(tower): campaign reducer battle flow and reset"
```

---

### Task 8: UI — Infinite Tower panel + party pick

**Files:**
- Create: `src/features/campaign/InfiniteTowerPanel.tsx`
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/store/gameStore.ts` (wire actions if needed)
- Modify: `src/features/campaign/buildBattleModeEntries.ts` (optional: hide `roguelike-run` placeholder or leave)

**UI copy (RU):**
- Title: «Бесконечная башня»
- Lines: `Этаж {currentFloor}` · `Рекord: {bestFloor}` · preview `{gruntCount} 👹 · {bossCount} босс(ов)` · affix from floor 11
- Buttons: «В бой», «Сбросить башню»
- First-clear hint per spec

Party pick: when «В бой» clicked, open `ExpeditionPartyPickModal` with `maxParty={4}`, `partyMin={1}`, on confirm dispatch `START_TOWER_BATTLE`.

Reset: `Modal.confirm` via `App.useApp().modal`.

Disable when `inBattle || expeditionActive` (same as other modes).

Unlock: `isFeaturedBattleModesVisible(campaign)`.

- [ ] **Step 1: Manual smoke — `npm run start`**, verify panel renders after first battle won.

- [ ] **Step 2: Commit**

```bash
git add src/features/campaign/InfiniteTowerPanel.tsx src/features/campaign/CampaignBattleTab.tsx src/store/gameStore.ts
git commit -m "feat(ui): infinite tower panel and party pick"
```

---

### Task 9: Preview helper + polish

**Files:**
- Modify: `src/game/tower/towerProgress.ts` or `src/game/tower/preview.ts`
- Modify: `InfiniteTowerPanel.tsx`

**Interfaces:**
- `export function previewTowerFloor(runSeed: number, floor: number): { spec: EncounterSpec; affixLabel?: string }`

Use `generateInfiniteTower` + `getTowerAffixLabel` for UI; no duplicate tables.

- [ ] **Step 1: Unit test preview matches generator counts**

- [ ] **Step 2: Wire panel**

- [ ] **Step 3: Run full test suite**

Run: `npm run test`  
Expected: all PASS

Run: `npm run build`  
Expected: success

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(tower): floor preview helper and polish"
```

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| TowerProgress save | 1 |
| Deterministic encounter | 4 |
| Floor table / cycle | 2, 4 |
| Affix floor ≥ 11 | 2, 4, 6 |
| First-clear D | 3, 7 |
| Full hub, no expedition | 7, 8 |
| Reset tower | 1, 7, 8 |
| Party pick ≤4 | 7, 8 |
| EncounterSpec layer | 2, 4, 5 |
| resolveScenarioEnemies levels | 5 |
| Tests §10 | 1–7, 9 |

## Out of scope (do not implement)

- Weekly leaderboard seed
- Chaotic grunt on cycle ≥ 3
- Refactoring `big-arena` to EncounterSpec
- New expedition chain entry for tower

---

## Self-review notes

- Abandon mid-tower battle: treat as defeat (spec §8.2); add reducer test if abandon action exists for hub battles.
- `finalizeVictory` currently clears `expedition: null` — tower path must preserve `tower` and skip scenario index advance.
- Multi-hero tower: reuse expedition merge helpers, not solo `getPrimaryCharacter` only for card merge (verify `mergeBattleCardsToParty` covers all party).
