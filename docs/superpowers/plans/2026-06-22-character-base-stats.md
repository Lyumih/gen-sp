# Character Base Stats & StatStrip UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ввести 9 базовых характеристик с class-based roll в таверне, rating, effective stats в бою (HP + initiative), компактный StatStrip UI.

**Architecture:** Конфиг и чистые функции в `src/game/config/baseStats.ts` + `src/game/stats/**`. `Character.baseStats` — источник правды; в бою `computeUnitStat` + gear. UI — переиспользуемый `StatStrip` по `AGENTS.md`. Миграция save v3→v4.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`  
**UI patterns:** `AGENTS.md`

## Global Constraints

- 9 stat ids: `health`, `defense`, `attack`, `magicPower`, `mana`, `healPower`, `speed`, `initiative`, `critChance`
- Config bounds: HP 1–30, defense 0–5, attack 0–5, magic 0–5, mana 0–30, heal 0–5, speed 1–3, initiative 0–10, crit 0–20
- Roll: primary upper = `round(max×1.5)`, secondary = `round(max×1.25)`, normal = max; **values may exceed config max**
- Rating: `sum(value/configMax)/9`; UI display **`78%`** via `formatBaseStatRatingPercent`
- 8 classes with affinities; **remove `initiativeBase` from class templates and Character**
- Hero HP: `computeUnitStat({ baseStat: baseStats.health, ... }) + gearHp`; **do not use `scenario.heroBaseHpStat` for players**
- Initiative at spawn: effective initiative → stored on `Unit.initiativeBase` (computed snapshot)
- SAVE_VERSION **4** (from 3)
- Phase 2 combat modifiers (attack/defense/crit in damage) — **out of scope**; only wire HP + initiative
- `App.useApp()` for messages; emoji from `src/game/ui/labels.ts`
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Core** | 1–4 | Config, roll, rating, effective stats + tests |
| **B — Model** | 5–7 | Types, classes, tavern roll, createCharacter |
| **C — Persistence** | 8 | Migration v3→v4 |
| **D — Battle** | 9 | Spawn HP/initiative, enemy baseStats |
| **E — UI** | 10–12 | StatStrip, hub screens, battle popover |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/config/baseStats.ts` | bounds, meta, affinities, `BASE_STAT_IDS`, `ClassId` |
| `src/game/stats/rollBaseStats.ts` | `rollUpperBound`, `rollBaseStatsForClass`, `hashSeed` |
| `src/game/stats/computeRating.ts` | `statQuality`, `computeBaseStatRating`, `formatBaseStatRatingPercent` |
| `src/game/stats/effectiveStats.ts` | `computeEffectiveStat`, `computeEffectiveStats`, `computeCharacterMaxHp` |
| `src/game/types.ts` | `StatId`, `BaseStats`, extend Character/TavernCandidate/Unit/PartyMember |
| `src/game/content/characterClasses.ts` | 8 classes, hirePrice, gearPool; no initiativeBase |
| `src/game/character/createCharacter.ts` | accept `baseStats`, drop `initiativeBase` |
| `src/game/tavern/generateCandidates.ts` | roll stats + rating on candidates |
| `src/game/campaign/heroMaxHp.ts` | delegate to `computeCharacterMaxHp` |
| `src/game/campaign/battleSnapshot.ts` | copy `baseStats` not `initiativeBase` |
| `src/game/campaign/scenarios.ts` | player/enemy spawn from baseStats |
| `src/game/content/enemyTemplates.ts` | `baseStats` per archetype |
| `src/game/battle/initiative.ts` | unchanged API; uses computed `unit.initiativeBase` |
| `src/game/persistence/migrate.ts` | v3→v4 |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 4` |
| `src/game/ui/labels.ts` | stat emoji constants |
| `src/features/stats/StatStrip.tsx` | compact row + tooltips |
| `src/features/stats/statTooltipText.ts` | RU tooltip lines |
| `src/features/campaign/CampaignTavernTab.tsx` | StatStrip on candidates |
| `src/features/character/CharacterRosterView.tsx` | StatStrip + rating |
| `src/features/profile/HeroProfileContent.tsx` | StatStrip with effective preview |

---

### Task 1: Base stats config

**Files:**
- Create: `src/game/config/baseStats.ts`
- Create: `src/game/config/baseStats.test.ts`
- Modify: `src/game/ui/labels.ts`

**Interfaces:**
- Produces:
  ```ts
  export type StatId = 'health' | 'defense' | 'attack' | 'magicPower' | 'mana' | 'healPower' | 'speed' | 'initiative' | 'critChance'
  export type BaseStats = Record<StatId, number>
  export type ClassId = 'warrior' | 'mage' | 'ranger' | 'healer' | 'rogue' | 'paladin' | 'warlock' | 'berserker'
  export const BASE_STAT_IDS: readonly StatId[]
  export const BASE_STAT_BOUNDS: Record<StatId, { min: number; max: number }>
  export const BASE_STAT_META: Record<StatId, { labelRu: string; emoji: string; descriptionRu: string }>
  export const CLASS_STAT_AFFINITY: Record<ClassId, { primary: StatId[]; secondary: StatId[] }>
  export function getStatAffinity(classId: string, statId: StatId): 'primary' | 'secondary' | 'normal'
  ```

- [ ] **Step 1: Write failing test**

Create `src/game/config/baseStats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  BASE_STAT_BOUNDS,
  BASE_STAT_IDS,
  CLASS_STAT_AFFINITY,
  getStatAffinity,
} from './baseStats'

describe('baseStats config', () => {
  it('has 9 stats in display order', () => {
    expect(BASE_STAT_IDS).toHaveLength(9)
  })

  it('warrior has health and defense as primary', () => {
    expect(CLASS_STAT_AFFINITY.warrior.primary).toEqual(['health', 'defense'])
    expect(getStatAffinity('warrior', 'health')).toBe('primary')
    expect(getStatAffinity('warrior', 'attack')).toBe('secondary')
    expect(getStatAffinity('warrior', 'mana')).toBe('normal')
  })

  it('health bounds are 1..30', () => {
    expect(BASE_STAT_BOUNDS.health).toEqual({ min: 1, max: 30 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/config/baseStats.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement config + labels**

Create `src/game/config/baseStats.ts` with bounds/meta/affinities from spec §3–§5. Implement `getStatAffinity`.

Add to `src/game/ui/labels.ts`:

```ts
export const UI_DEFENSE = '🛡'
export const UI_ATTACK = '⚔'
export const UI_MAGIC = '✨'
export const UI_MANA = '🔮'
export const UI_HEAL = '💚'
export const UI_SPEED = '👟'
export const UI_INITIATIVE = '⚡'
export const UI_CRIT = '🎯'
export const UI_RATING = '★'
```

Map emojis in `BASE_STAT_META` to same constants (import from labels to avoid drift).

- [ ] **Step 4: Run test**

Run: `npm run test -- src/game/config/baseStats.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/config/baseStats.ts src/game/config/baseStats.test.ts src/game/ui/labels.ts
git commit -m "feat: add base stats config and stat emoji labels"
```

---

### Task 2: Roll base stats

**Files:**
- Create: `src/game/stats/rollBaseStats.ts`
- Create: `src/game/stats/rollBaseStats.test.ts`

**Interfaces:**
- Consumes: `BASE_STAT_BOUNDS`, `BASE_STAT_IDS`, `getStatAffinity` from Task 1
- Produces:
  ```ts
  export type StatAffinityKind = 'primary' | 'secondary' | 'normal'
  export function rollUpperBound(configMax: number, affinity: StatAffinityKind): number
  export function rollStatInRange(min: number, upper: number, rng: () => number): number
  export function rollBaseStatsForClass(classId: string, rng: () => number): BaseStats
  export function hashSeed(input: string): number
  ```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { seededRng } from '../tavern/generateCandidates'
import { rollBaseStatsForClass, rollUpperBound } from './rollBaseStats'

describe('rollUpperBound', () => {
  it('primary extends to max*1.5', () => {
    expect(rollUpperBound(30, 'primary')).toBe(45)
    expect(rollUpperBound(5, 'secondary')).toBe(6)
    expect(rollUpperBound(10, 'normal')).toBe(10)
  })
})

describe('rollBaseStatsForClass', () => {
  it('warrior health can exceed config max', () => {
    let sawAboveMax = false
    for (let seed = 0; seed < 500; seed++) {
      const stats = rollBaseStatsForClass('warrior', seededRng(seed))
      if (stats.health > 30) sawAboveMax = true
    }
    expect(sawAboveMax).toBe(true)
  })

  it('is deterministic for same rng sequence', () => {
    const a = rollBaseStatsForClass('mage', seededRng(42))
    const b = rollBaseStatsForClass('mage', seededRng(42))
    expect(a).toEqual(b)
  })
})
```

Fix import: `seededRng` from `../tavern/generateCandidates`.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test -- src/game/stats/rollBaseStats.test.ts`

- [ ] **Step 3: Implement**

```ts
import type { BaseStats, StatId } from '../config/baseStats'
import {
  BASE_STAT_BOUNDS,
  BASE_STAT_IDS,
  getStatAffinity,
} from '../config/baseStats'

export type StatAffinityKind = 'primary' | 'secondary' | 'normal'

export function rollUpperBound(configMax: number, affinity: StatAffinityKind): number {
  if (affinity === 'primary') return Math.round(configMax * 1.5)
  if (affinity === 'secondary') return Math.round(configMax * 1.25)
  return configMax
}

export function rollStatInRange(min: number, upper: number, rng: () => number): number {
  if (upper < min) return min
  return min + Math.floor(rng() * (upper - min + 1))
}

export function rollBaseStatsForClass(classId: string, rng: () => number): BaseStats {
  const stats = {} as BaseStats
  for (const id of BASE_STAT_IDS) {
    const { min, max } = BASE_STAT_BOUNDS[id]
    const affinity = getStatAffinity(classId, id)
    const upper = rollUpperBound(max, affinity)
    stats[id] = rollStatInRange(min, upper, rng)
  }
  return stats
}

export function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/stats/rollBaseStats.ts src/game/stats/rollBaseStats.test.ts
git commit -m "feat: roll base stats with class affinity ranges"
```

---

### Task 3: Rating

**Files:**
- Create: `src/game/stats/computeRating.ts`
- Create: `src/game/stats/computeRating.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function statQuality(value: number, configMax: number): number
  export function computeBaseStatRating(baseStats: BaseStats): number
  export function formatBaseStatRatingPercent(rating: number): string
  ```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { BASE_STAT_IDS, BASE_STAT_BOUNDS } from '../config/baseStats'
import type { BaseStats } from '../config/baseStats'
import { computeBaseStatRating, formatBaseStatRatingPercent, statQuality } from './computeRating'

function allStats(value: number): BaseStats {
  return Object.fromEntries(BASE_STAT_IDS.map((id) => [id, value])) as BaseStats
}

describe('computeBaseStatRating', () => {
  it('statQuality for initiative 12 vs cap 10 is 1.2', () => {
    expect(statQuality(12, 10)).toBe(1.2)
  })

  it('all mins yields low rating', () => {
    const stats = {} as BaseStats
    for (const id of BASE_STAT_IDS) stats[id] = BASE_STAT_BOUNDS[id].min
    expect(computeBaseStatRating(stats)).toBeLessThan(0.2)
  })

  it('format as percent rounds', () => {
    expect(formatBaseStatRatingPercent(0.784)).toBe('78%')
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

```ts
import type { BaseStats } from '../config/baseStats'
import { BASE_STAT_BOUNDS, BASE_STAT_IDS } from '../config/baseStats'

export function statQuality(value: number, configMax: number): number {
  if (configMax <= 0) return value <= 0 ? 1 : 0
  return value / configMax
}

export function computeBaseStatRating(baseStats: BaseStats): number {
  const sum = BASE_STAT_IDS.reduce(
    (acc, id) => acc + statQuality(baseStats[id], BASE_STAT_BOUNDS[id].max),
    0,
  )
  return sum / BASE_STAT_IDS.length
}

export function formatBaseStatRatingPercent(rating: number): string {
  return `${Math.round(rating * 100)}%`
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

---

### Task 4: Effective stats & max HP

**Files:**
- Create: `src/game/stats/effectiveStats.ts`
- Create: `src/game/stats/effectiveStats.test.ts`
- Modify: `src/game/campaign/heroMaxHp.ts`
- Modify: `src/game/campaign/heroMaxHp.test.ts`

**Interfaces:**
- Consumes: `computeUnitStat` from `src/game/balance.ts`, `aggregateGearHpBonus`
- Produces:
  ```ts
  export function computeEffectiveStat(
    baseStats: BaseStats,
    statId: StatId,
    unitLevel: number,
    worldPower: number,
    gearBonus?: number,
  ): number
  export function computeEffectiveStats(
    baseStats: BaseStats,
    unitLevel: number,
    worldPower: number,
    gearBonuses?: Partial<Record<StatId, number>>,
  ): BaseStats
  export function computeCharacterMaxHp(
    member: { baseStats: BaseStats; unitLevel: number; items: ...; equipment: ... },
    worldPower: number,
    getTemplate: ...,
  ): number
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { computeCharacterMaxHp } from './effectiveStats'
import { getItemTemplate } from '../content/itemTemplates'
import type { BaseStats } from '../config/baseStats'

const baseStats: BaseStats = {
  health: 20, defense: 2, attack: 3, magicPower: 1, mana: 10,
  healPower: 1, speed: 2, initiative: 8, critChance: 5,
}

describe('computeCharacterMaxHp', () => {
  it('uses character base health not scenario heroBaseHpStat', () => {
    const hp = computeCharacterMaxHp(
      { baseStats, unitLevel: 1, items: [], equipment: { weapon: null, armor: null, accessory: null } },
      0,
      getItemTemplate,
    )
    expect(hp).toBe(Math.round(20 * (1 + 0.02 + 0)))
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `effectiveStats.ts`**

Use `computeUnitStat({ baseStat: baseStats.health, unitLevel, worldPower }) + aggregateGearHpBonus(...)`.

Update `heroMaxHp.ts`:

```ts
export function computeCharacterMaxHpForScenario(
  member: Pick<PartyMemberBattleSnapshot, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>,
  _scenario: BattleScenario,
  worldPower: number,
): number {
  return computeCharacterMaxHp(member, worldPower, getItemTemplate)
}
```

Remove `scenario.heroBaseHpStat` from player HP path (keep param for signature compat or mark unused with `_scenario`).

- [ ] **Step 4: Fix `heroMaxHp.test.ts`** — pass `baseStats` on members instead of relying on scenario base.

- [ ] **Step 5: Run** `npm run test -- src/game/stats/effectiveStats.test.ts src/game/campaign/heroMaxHp.test.ts`

- [ ] **Step 6: Commit**

---

### Task 5: Types — BaseStats on Character

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/character/createCharacter.ts`
- Modify: `src/game/character/createCharacter.test.ts`

**Interfaces:**
- Produces updated types:
  ```ts
  // Re-export StatId/BaseStats from config in types OR import in consumers directly
  export type Character = {
    // ...
    baseStats: BaseStats
    baseStatRating: number
    // REMOVE initiativeBase
  }
  export type PartyMemberBattleSnapshot = {
    // ...
    baseStats: BaseStats
    // REMOVE initiativeBase
  }
  export type Unit = {
    // ...
    baseStats?: BaseStats  // snapshot for UI
    initiativeBase?: number  // effective at spawn
  }
  ```

- [ ] **Step 1: Update types.ts** — import `BaseStats` from config; extend Character, TavernCandidate (in generateCandidates), PartyMemberBattleSnapshot, Unit.

- [ ] **Step 2: Update createCharacter**

```ts
export type CreateCharacterInput = {
  id: string
  name: string
  classId: string
  baseStats: BaseStats
  baseStatRating: number
  unitLevel?: number
}

export function createCharacter(input: CreateCharacterInput): Character {
  // ... no initiativeBase
  return { ..., baseStats: { ...input.baseStats }, baseStatRating: input.baseStatRating }
}
```

- [ ] **Step 3: Fix createCharacter.test.ts** — pass sample `baseStats` + rating.

- [ ] **Step 4: Run** `npm run test -- src/game/character/createCharacter.test.ts`  
  Expect compile errors elsewhere — note for Task 7/8/9.

- [ ] **Step 5: Commit**

---

### Task 6: Eight character classes

**Files:**
- Modify: `src/game/content/characterClasses.ts`
- Create: `src/game/content/characterClasses.test.ts`

- [ ] **Step 1: Test all 8 class ids exist and lack initiativeBase**

```ts
import { describe, expect, it } from 'vitest'
import { CHARACTER_CLASS_IDS, getCharacterClass } from './characterClasses'

const EXPECTED = ['warrior','mage','ranger','healer','rogue','paladin','warlock','berserker']

describe('characterClasses', () => {
  it('has 8 classes', () => {
    expect([...CHARACTER_CLASS_IDS].sort()).toEqual([...EXPECTED].sort())
  })

  it('each class has hirePrice and gearPool', () => {
    for (const id of CHARACTER_CLASS_IDS) {
      const cls = getCharacterClass(id)!
      expect(cls.hirePrice).toBeGreaterThan(0)
      expect(cls.gearPool.length).toBeGreaterThan(0)
      expect('initiativeBase' in cls).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Rewrite characterClasses.ts** — 8 classes per spec; copy/adapt gear pools from warrior/ranger for new classes (YAGNI: same starter items, different weights OK).

- [ ] **Step 3: Run test — PASS**

- [ ] **Step 4: Commit**

---

### Task 7: Tavern generation with stats

**Files:**
- Modify: `src/game/tavern/generateCandidates.ts`
- Modify: `src/game/tavern/generateCandidates.test.ts`
- Modify: `src/game/campaign/runReducer.ts` (hire path ~line 965)

- [ ] **Step 1: Extend tests**

```ts
it('each candidate has baseStats and baseStatRating', () => {
  const candidates = generateTavernCandidates(seededRng(3))
  for (const c of candidates) {
    expect(c.baseStats.health).toBeGreaterThanOrEqual(1)
    expect(c.baseStatRating).toBeGreaterThan(0)
  }
})
```

- [ ] **Step 2: Implement in generateCandidates**

After picking classId:

```ts
const baseStats = rollBaseStatsForClass(classId, rng)
const baseStatRating = computeBaseStatRating(baseStats)
```

- [ ] **Step 3: Update runReducer hire** — copy `baseStats` + `baseStatRating` from candidate to `createCharacter`; remove `initiativeBase: cls.initiativeBase`.

- [ ] **Step 4: Run** `npm run test -- src/game/tavern/generateCandidates.test.ts` and fix reducer tests referencing initiativeBase.

- [ ] **Step 5: Commit**

---

### Task 8: Save migration v3→v4

**Files:**
- Modify: `src/game/persistence/schema.ts` — `SAVE_VERSION = 4`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts` or `persistence.test.ts`

- [ ] **Step 1: Write failing migration test**

```ts
it('v3 character without baseStats gets deterministic baseStats on migrate to v4', () => {
  const legacy = makeV3CampaignWithCharacter({ id: 'c1', classId: 'warrior', initiativeBase: 10 })
  const migrated = migrateSave({ version: 3, campaign: legacy })
  expect(migrated.version).toBe(4)
  const ch = migrated.campaign.characters[0]!
  expect(ch.baseStats.initiative).toBe(10)
  expect(ch.baseStatRating).toBeGreaterThan(0)
  expect(ch.initiativeBase).toBeUndefined()
})
```

- [ ] **Step 2: Implement migrateV3ToV4**

For each character missing `baseStats`:
- If `initiativeBase` present → seed stats with `initiative = initiativeBase`, roll rest via `rollBaseStatsForClass(classId, seededRng(hashSeed(id + classId)))` then override initiative
- Else full roll from hash
- Set `baseStatRating = computeBaseStatRating(baseStats)`
- Strip `initiativeBase`

Regenerate `tavernCandidates` if any candidate lacks `baseStats` (set to `null` to force refresh, or map candidates).

- [ ] **Step 3: Run** `npm run test -- src/game/persistence/`

- [ ] **Step 4: Commit**

---

### Task 9: Battle spawn — HP, initiative, enemies

**Files:**
- Modify: `src/game/campaign/battleSnapshot.ts`
- Modify: `src/game/campaign/scenarios.ts`
- Modify: `src/game/content/enemyTemplates.ts`
- Modify: `src/game/campaign/scenarios.test.ts`
- Modify: `src/game/battle/initiative.test.ts` (only if spawn values change)

**Interfaces:**
- Consumes: `computeCharacterMaxHp`, `computeEffectiveStat` from Task 4

- [ ] **Step 1: battleSnapshot** — replace `initiativeBase` with `baseStats: { ...character.baseStats }` in `partyMemberFromCharacter` and expedition snapshot.

- [ ] **Step 2: makePlayerUnits**

```ts
const maxHp = computeCharacterMaxHp(member, snapshot.worldPower, getItemTemplate)
const initiativeBase = computeEffectiveStat(
  member.baseStats, 'initiative', member.unitLevel, snapshot.worldPower, 0,
)
return {
  ...,
  maxHp, hp: maxHp,
  initiativeBase,
  baseStats: { ...member.baseStats },
}
```

- [ ] **Step 3: enemyTemplates** — add full `baseStats`; grunt example:

```ts
baseStats: {
  health: 8, defense: 1, attack: 2, magicPower: 0, mana: 0,
  healPower: 0, speed: 2, initiative: 6, critChance: 2,
}
```

- [ ] **Step 4: makeEnemies** — use `template.baseStats.health` instead of `e.baseHpStat`; keep `e.baseHpStat` as fallback during transition or migrate scenario enemies to use template only.

```ts
const tmpl = getEnemyTemplate(e.archetypeId)
const healthBase = tmpl?.baseStats.health ?? e.baseHpStat
const maxHp = computeUnitStat({ baseStat: healthBase, unitLevel: e.unitLevel, worldPower: snapshot.worldPower })
const initBase = tmpl?.baseStats.initiative ?? 10
```

- [ ] **Step 5: Run full test suite** `npm run test` — fix broken tests passing initiativeBase on characters.

- [ ] **Step 6: Commit**

---

### Task 10: StatStrip component

**Files:**
- Create: `src/features/stats/statTooltipText.ts`
- Create: `src/features/stats/StatStrip.tsx`
- Create: `src/features/stats/StatStrip.test.tsx`

**Interfaces:**
- Consumes: `BASE_STAT_IDS`, `BASE_STAT_META`, `formatBaseStatRatingPercent`, `CLASS_STAT_AFFINITY`, `getCharacterClass`

- [ ] **Step 1: statTooltipText.ts**

```ts
export function statTooltipLines(
  statId: StatId,
  baseValue: number,
  effectiveValue?: number,
): string[]
```

Lines: title `Здоровье (❤️)`, description from meta, `База: N → с экипировкой: M`.

```ts
export function classAffinityTooltipLines(classId: string): string[]
```

- [ ] **Step 2: StatStrip.tsx** — map `BASE_STAT_IDS` to `<Tooltip>` spans; optional `effectiveStats`; rating with `UI_RATING`; `mouseEnterDelay={0.3}`.

- [ ] **Step 3: Test render**

```tsx
import { render, screen } from '@testing-library/react'
import { StatStrip } from './StatStrip'

it('renders health emoji and rating', () => {
  render(<StatStrip baseStats={sample} baseStatRating={0.78} showRating classId="warrior" />)
  expect(screen.getByText(/❤️/)).toBeTruthy()
  expect(screen.getByText(/78%/)).toBeTruthy()
})
```

- [ ] **Step 4: Run test — PASS**

- [ ] **Step 5: Commit**

---

### Task 11: Hub UI integration

**Files:**
- Modify: `src/features/campaign/CampaignTavernTab.tsx`
- Modify: `src/features/character/CharacterRosterView.tsx`
- Modify: `src/features/profile/HeroProfileContent.tsx`

- [ ] **Step 1: CampaignTavernTab** — import StatStrip; for each candidate compute preview effective stats:

```ts
const effective = computeEffectiveStats(
  candidate.baseStats,
  1,
  campaign.worldPower,
  previewGearHpBonuses(candidate.previewGear),
)
```

Show StatStrip with `mode="tavern"`, `showRating`, wrap class name in Tooltip with `classAffinityTooltipLines`.

- [ ] **Step 2: CharacterRosterView** — add StatStrip + rating in description row (compact, single line).

- [ ] **Step 3: HeroProfileContent** — replace legacy HP-only paragraphs with StatStrip; compute effective from selected character + optional battle state.

- [ ] **Step 4: Manual check** — `npm run start`, tavern refresh, hire, roster, profile.

- [ ] **Step 5: Commit**

---

### Task 12: Battle unit stat popover

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: On unit cell click/hover** — Popover with StatStrip using `unit.baseStats` and effective recomputed from battle snapshot (or store effective on unit at spawn).

- [ ] **Step 2: Show current HP** under strip: `❤️ hp/maxHp`.

- [ ] **Step 3: Verify in dev** — enter battle, open popover on player and enemy.

- [ ] **Step 4: Run** `npm run test && npm run build`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: StatStrip in battle unit popover"
```

---

## Spec Coverage Self-Review

| Spec § | Task |
|--------|------|
| §3 bounds & 9 stats | Task 1 |
| §4 roll C | Task 2 |
| §5 8 classes | Task 6 |
| §6 rating | Task 3 |
| §7 effective / HP | Task 4, 9 |
| §8 data model | Task 5, 7 |
| §9 config file | Task 1 |
| §10 StatStrip UI | Tasks 10–12 |
| §11 phase 1 battle | Task 9 |
| §12 migration v4 | Task 8 |
| §13 MVP scope | Phases A–E; phase 2 excluded |
| §15 AGENTS.md | Already committed; Task 10 follows |
| Codex enemies | Task 9 templates; codex UI optional follow-up |

**Out of scope (explicit):** gear bonuses beyond HP for non-health stats; combat damage from attack/defense; mana resource; codex StatStrip unless time permits in Task 11.

---

## Final Verification

```bash
npm run test
npm run build
npm run lint
```

Manual: refresh tavern → jackpot HP > 30 visible → hire → roster rating → battle HP matches effective → initiative order reflects rolled initiative.
