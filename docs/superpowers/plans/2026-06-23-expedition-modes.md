# Expedition Modes & Squad UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить пять процедурных режимов экспедиции с генераторами сценариев, переработать UI вкладки «Бой» (отряд 4 ячейки + чекбоксы экспедиций) и русифицировать Expedition → Экспедиция.

**Architecture:** `ExpeditionChainConfig` получает discriminated union `static | procedural`; процедурные режимы строят `BattleScenario` через генераторы с `generationSeed` в snapshot. UI вызывает `resolveExpeditionParty` до dispatch; `startExpeditionBattle` выбирает static scenario или `generateScenario`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5.

**Spec:** `docs/superpowers/specs/2026-06-23-expedition-modes-design.md`

## Global Constraints

- `DEFAULT_SQUAD_SLOTS = 4`; отряд на вкладке «Бой» read-only (DnD только на «Персонажи»)
- Чекбоксы экспедиций — **радио-поведение** (одна активная)
- Не отмечено в отряде → идут все занятые слоты; отмечено > лимита → первые N по слотам 1→4
- Старт blocked если занятых слотов < `partyMin`; `partySize = min(roll, selectedCharacterIds.length)`
- Хаотичная карта: `battleCount` 1–3 на старте; **полная перегенерация** перед каждым боем
- Туннель бой 2: union(`hero` archetypes, `BOSS_ARCHETYPE_IDS`)
- `interBattleReviveAllDowned` только у `campaign-main`
- UI copy: **Экспедиция / экспедиция** (не Expedition)
- Не добавлять зависимости; `App.useApp()` для message
- Дуэль с боссом / Коридор / Осада — **вне скоупа**

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Core** | 1–2 | Config union, `resolveExpeditionParty`, types |
| **B — Generators** | 3–7 | Shared placement + 5 generators + registry |
| **C — Reducer** | 8 | `START_EXPEDITION`, `startExpeditionBattle`, snapshot, migrate |
| **D — UI** | 9–10 | Squad strip, mode list, `CampaignBattleTab` |
| **E — Polish** | 11 | Русификация, help, удаление старого `SquadPicker` usage |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/types.ts` | `generationSeed` на `Expedition` |
| `src/game/expedition/config.ts` | `ExpeditionChainConfig` union, `EXPEDITION_CHAINS`, UI meta |
| `src/game/expedition/resolveExpeditionParty.ts` | отметки → `selectedCharacterIds` |
| `src/game/expedition/snapshot.ts` | `generationSeed` при build |
| `src/game/expedition/generators/types.ts` | `ExpeditionGeneratorContext`, `ExpeditionGenerator` |
| `src/game/expedition/generators/placement.ts` | общие хелперы размещения |
| `src/game/expedition/generators/smallSkirmish.ts` | 1×2 дуэль |
| `src/game/expedition/generators/tunnel.ts` | 1×10, 2 боя |
| `src/game/expedition/generators/ambush.ts` | 10×10 засада |
| `src/game/expedition/generators/bigArena.ts` | 10×20 арена |
| `src/game/expedition/generators/chaoticMap.ts` | полный хаос |
| `src/game/expedition/generators/index.ts` | `getGeneratorById`, `generateScenario` |
| `src/game/content/enemyArchetypes.ts` | 4–6 архетипов с тегом `hero` |
| `src/game/campaign/runReducer.ts` | procedural battle start, новая валидация |
| `src/game/persistence/migrate.ts` | optional `generationSeed` fallback |
| `src/features/campaign/ExpeditionSquadStrip.tsx` | 4 ячейки + toggle участия |
| `src/features/campaign/ExpeditionModeList.tsx` | чекбоксы режимов |
| `src/features/campaign/CampaignBattleTab.tsx` | компоновка UI |
| `src/game/help/articles.ts` | русификация + список режимов |

---

### Task 1: Config discriminated union + `generationSeed` type

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/expedition/config.ts`
- Test: `src/game/expedition/config.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts — add to Expedition
  generationSeed: number

  // config.ts
  export type ExpeditionChainKind = 'static' | 'procedural'

  export type ExpeditionChainConfig = {
    id: string
    label: string
    description: string
    paramPreview: string
    partySize: PartySizeConfig
    partyMin: number
    battleCount: BattleCountConfig
    interBattleReviveAllDowned?: boolean
  } & (
    | { kind: 'static'; battleScenarioIds: readonly string[] }
    | { kind: 'procedural'; generatorId: string }
  )
  ```

- [ ] **Step 1: Update failing config test**

In `src/game/expedition/config.test.ts`, change chain assertion:

```ts
describe('EXPEDITION_CHAINS', () => {
  it('includes campaign-main as static chain', () => {
    const chain = EXPEDITION_CHAINS.find((c) => c.id === 'campaign-main')
    expect(chain).toBeDefined()
    expect(chain?.kind).toBe('static')
    if (chain?.kind === 'static') {
      expect(chain.battleScenarioIds).toEqual(['tutorial', 'two-front', 'boss-lite'])
    }
    expect(chain?.label).toBeTruthy()
    expect(chain?.partyMin).toBe(1)
  })

  it('has unique ids and procedural entries', () => {
    const ids = EXPEDITION_CHAINS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(EXPEDITION_CHAINS.some((c) => c.id === 'chaotic-map' && c.kind === 'procedural')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/expedition/config.test.ts`  
Expected: FAIL — `kind` / `chaotic-map` undefined

- [ ] **Step 3: Implement config + types**

Add `generationSeed: number` to `Expedition` in `src/game/types.ts`.

Rewrite `EXPEDITION_CHAINS` in `config.ts`:

```ts
export const EXPEDITION_CHAINS: readonly ExpeditionChainConfig[] = [
  {
    id: 'campaign-main',
    kind: 'static',
    label: 'Основная кампания',
    description: 'Три сценария подряд с воскрешением между боями',
    paramPreview: 'Бойцов: 1 · Боёв: 3',
    partySize: 1,
    partyMin: 1,
    battleCount: 3,
    interBattleReviveAllDowned: true,
    battleScenarioIds: ['tutorial', 'two-front', 'boss-lite'],
  },
  {
    id: 'test-single-battle',
    kind: 'static',
    label: 'Тест: один бой',
    description: 'Один бой tutorial (dev)',
    paramPreview: 'Бойцов: 1 · Боёв: 1',
    partySize: 1,
    partyMin: 1,
    battleCount: 1,
    battleScenarioIds: ['tutorial'],
  },
  {
    id: 'chaotic-map',
    kind: 'procedural',
    generatorId: 'chaotic-map',
    label: 'Хаотичная карта',
    description: 'Полный хаос: поле, враги, препятствия',
    paramPreview: 'Отряд 1–4 · Враги 1–20 · Поле 1×2–20×20 · Боёв 1–3',
    partySize: { min: 1, max: 4 },
    partyMin: 1,
    battleCount: { min: 1, max: 3 },
  },
  {
    id: 'tunnel',
    kind: 'procedural',
    generatorId: 'tunnel',
    label: 'Туннель',
    description: 'Узкий коридор, два боя',
    paramPreview: 'Отряд ≤2 · Поле 1×10 · Бой 2: герой-NPC или босс',
    partySize: { min: 1, max: 2 },
    partyMin: 1,
    battleCount: 2,
  },
  {
    id: 'big-arena',
    kind: 'procedural',
    generatorId: 'big-arena',
    label: 'Большая арена',
    description: 'Массовое сражение на широком поле',
    paramPreview: 'Отряд ≤4 · 8–12 врагов + 1–3 босса · 10×20',
    partySize: { min: 1, max: 4 },
    partyMin: 1,
    battleCount: 1,
  },
  {
    id: 'small-skirmish',
    kind: 'procedural',
    generatorId: 'small-skirmish',
    label: 'Малая битва',
    description: 'Дуэль на крошечном поле',
    paramPreview: '1 герой · 1 враг · поле 1×2',
    partySize: 1,
    partyMin: 1,
    battleCount: 1,
  },
  {
    id: 'ambush',
    kind: 'procedural',
    generatorId: 'ambush',
    label: 'Засада',
    description: 'Окружение с флангов',
    paramPreview: 'Отряд ≤4 · ≤8 врагов · 10×10',
    partySize: { min: 1, max: 4 },
    partyMin: 1,
    battleCount: 1,
  },
]
```

Add helper:

```ts
export function getChainMaxParty(config: ExpeditionChainConfig): number {
  return getPartySizeSlotCount(config.partySize)
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/expedition/config.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/expedition/config.ts src/game/expedition/config.test.ts
git commit -m "feat(expedition): discriminated chain config and procedural mode ids"
```

---

### Task 2: `resolveExpeditionParty`

**Files:**
- Create: `src/game/expedition/resolveExpeditionParty.ts`
- Create: `src/game/expedition/resolveExpeditionParty.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ResolveExpeditionPartyInput = {
    squad: readonly (string | null)[]
    markedIds: readonly string[]
    maxParty: number
  }

  export function resolveExpeditionParty(input: ResolveExpeditionPartyInput): string[]

  export function countOccupiedSquadSlots(squad: readonly (string | null)[]): number
  ```

- [ ] **Step 1: Write failing tests**

Create `src/game/expedition/resolveExpeditionParty.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { countOccupiedSquadSlots, resolveExpeditionParty } from './resolveExpeditionParty'

describe('resolveExpeditionParty', () => {
  const squad = ['a', 'b', null, 'c'] as const

  it('returns all occupied slots when markedIds empty', () => {
    expect(resolveExpeditionParty({ squad, markedIds: [], maxParty: 4 })).toEqual(['a', 'b', 'c'])
  })

  it('returns marked in slot order', () => {
    expect(resolveExpeditionParty({ squad, markedIds: ['c', 'a'], maxParty: 4 })).toEqual(['a', 'c'])
  })

  it('trims to maxParty among marked', () => {
    expect(resolveExpeditionParty({ squad, markedIds: ['a', 'b', 'c'], maxParty: 2 })).toEqual(['a', 'b'])
  })

  it('ignores marks for empty slots', () => {
    expect(resolveExpeditionParty({ squad, markedIds: ['ghost'], maxParty: 4 })).toEqual([])
  })
})

describe('countOccupiedSquadSlots', () => {
  it('counts non-null squad entries', () => {
    expect(countOccupiedSquadSlots(['a', null, 'b', null])).toBe(2)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/game/expedition/resolveExpeditionParty.test.ts`

- [ ] **Step 3: Implement**

Create `src/game/expedition/resolveExpeditionParty.ts`:

```ts
export type ResolveExpeditionPartyInput = {
  squad: readonly (string | null)[]
  markedIds: readonly string[]
  maxParty: number
}

export function countOccupiedSquadSlots(squad: readonly (string | null)[]): number {
  return squad.filter((id): id is string => id !== null).length
}

export function resolveExpeditionParty(input: ResolveExpeditionPartyInput): string[] {
  const markedSet = new Set(input.markedIds)
  const candidates: string[] = []

  for (const id of input.squad) {
    if (id === null) continue
    if (input.markedIds.length === 0 || markedSet.has(id)) {
      candidates.push(id)
    }
  }

  return candidates.slice(0, input.maxParty)
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- src/game/expedition/resolveExpeditionParty.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/resolveExpeditionParty.ts src/game/expedition/resolveExpeditionParty.test.ts
git commit -m "feat(expedition): resolve party from squad marks"
```

---

### Task 3: Generator primitives

**Files:**
- Create: `src/game/expedition/generators/types.ts`
- Create: `src/game/expedition/generators/placement.ts`
- Create: `src/game/expedition/generators/placement.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  import type { BattleScenario } from '../../campaign/scenarios'

  export type ExpeditionGeneratorContext = {
    seed: number
    battleIndex: number
    expeditionPartySize: number
  }

  export type ExpeditionGenerator = (ctx: ExpeditionGeneratorContext) => BattleScenario

  // placement.ts
  export function makeRng(seed: number, salt: string): () => number
  export function rollInt(rng: () => number, min: number, max: number): number
  export function rollFieldDimensions(rng: () => number, minSide: number, maxSide: number): { width: number; height: number }
  export function shuffleCells<T>(items: T[], seed: number, salt: string): T[]
  export function collectFreeCells(scenario: Pick<BattleScenario, 'width' | 'height' | 'walls'>, occupied: ReadonlySet<string>): { x: number; y: number }[]
  export function placePoolEnemies(input: {
    scenario: BattleScenario
    seed: number
    poolTags: string[]
    count: number
    zone: SpawnZone
    occupied: Set<string>
    unitLevel?: number
  }): ScenarioEnemySpawn[]
  ```

- [ ] **Step 1: Write failing placement tests**

Create `src/game/expedition/generators/placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { rollFieldDimensions, makeRng, rollInt } from './placement'

describe('rollFieldDimensions', () => {
  it('never returns 1x1', () => {
    const rng = makeRng(42, 'dims')
    for (let i = 0; i < 50; i++) {
      const { width, height } = rollFieldDimensions(rng, 1, 20)
      expect(width * height).toBeGreaterThan(1)
    }
  })
})

describe('rollInt', () => {
  it('is deterministic for same seed', () => {
    const a = rollInt(makeRng(1, 'x'), 1, 10)
    const b = rollInt(makeRng(1, 'x'), 1, 10)
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/game/expedition/generators/placement.test.ts`

- [ ] **Step 3: Implement types + placement**

Implement `types.ts` and `placement.ts` using `hashSeed` from `src/game/stats/rollBaseStats`, `cellKey` from `src/game/battle/grid`, reusing patterns from `scenarios.ts` / `spawnPlacement.ts`.

Key `rollFieldDimensions`:

```ts
export function rollFieldDimensions(
  rng: () => number,
  minSide: number,
  maxSide: number,
): { width: number; height: number } {
  let width = rollInt(rng, minSide, maxSide)
  let height = rollInt(rng, minSide, maxSide)
  if (width === 1 && height === 1) {
    if (rng() < 0.5) width = 2
    else height = 2
  }
  return { width, height }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- src/game/expedition/generators/placement.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/generators/
git commit -m "feat(expedition): generator placement primitives"
```

---

### Task 4: `smallSkirmish` + `ambush` generators

**Files:**
- Create: `src/game/expedition/generators/smallSkirmish.ts`
- Create: `src/game/expedition/generators/smallSkirmish.test.ts`
- Create: `src/game/expedition/generators/ambush.ts`
- Create: `src/game/expedition/generators/ambush.test.ts`

**Interfaces:**
- Produces: `generateSmallSkirmish(ctx): BattleScenario`, `generateAmbush(ctx): BattleScenario`

- [ ] **Step 1: Write failing tests**

`smallSkirmish.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateSmallSkirmish } from './smallSkirmish'
import { enemySpawnCount } from '../../campaign/scenarios'

describe('generateSmallSkirmish', () => {
  it('builds 1x2 or 2x1 field with one enemy', () => {
    const s = generateSmallSkirmish({ seed: 7, battleIndex: 0, expeditionPartySize: 1 })
    expect(s.width * s.height).toBe(2)
    expect(s.playerSpawns).toHaveLength(1)
    expect(enemySpawnCount(s)).toBe(1)
  })
})
```

`ambush.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateAmbush } from './ambush'
import { enemySpawnCount } from '../../campaign/scenarios'

describe('generateAmbush', () => {
  it('is 10x10 with up to 8 enemies', () => {
    const s = generateAmbush({ seed: 99, battleIndex: 0, expeditionPartySize: 4 })
    expect(s.width).toBe(10)
    expect(s.height).toBe(10)
    expect(enemySpawnCount(s)).toBeLessThanOrEqual(8)
    expect(s.playerSpawnZone).toBeDefined()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/game/expedition/generators/smallSkirmish.test.ts src/game/expedition/generators/ambush.test.ts`

- [ ] **Step 3: Implement generators**

`smallSkirmish.ts` — fixed 1×2, hero (0,0), enemy pool `['arena','melee']` count 1 at far cell.

`ambush.ts` — 10×10, `playerSpawnZone` center 4×4 (x 3–6, y 3–6), enemies as `pool` on perimeter via custom zone cells (x=0|9 or y=0|9), count roll 1–8.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/generators/smallSkirmish.ts src/game/expedition/generators/smallSkirmish.test.ts src/game/expedition/generators/ambush.ts src/game/expedition/generators/ambush.test.ts
git commit -m "feat(expedition): small skirmish and ambush generators"
```

---

### Task 5: Hero archetypes + `tunnel` generator

**Files:**
- Modify: `src/game/content/enemyArchetypes.ts`
- Create: `src/game/expedition/generators/tunnel.ts`
- Create: `src/game/expedition/generators/tunnel.test.ts`
- Test: `src/game/battle/enemySpawn.test.ts` (optional tag filter test)

**Interfaces:**
- Produces: `HERO_ARCHETYPE_IDS`, `generateTunnel(ctx): BattleScenario`

- [ ] **Step 1: Write failing tunnel test**

```ts
import { describe, expect, it } from 'vitest'
import { generateTunnel } from './tunnel'
import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'

describe('generateTunnel', () => {
  it('battle 0 uses melee pool, battle 1 uses hero or boss', () => {
    const b0 = generateTunnel({ seed: 1, battleIndex: 0, expeditionPartySize: 2 })
    const b1 = generateTunnel({ seed: 1, battleIndex: 1, expeditionPartySize: 2 })
    expect(b0.width === 1 || b0.height === 1).toBe(true)
    expect(Math.max(b0.width, b0.height)).toBe(10)
    expect(b1.enemySpawns).toHaveLength(1)
    const archId =
      b1.enemySpawns[0]?.kind === 'fixed' ? b1.enemySpawns[0].archetypeId : ''
    const allowed = new Set([...BOSS_ARCHETYPE_IDS])
    // hero ids added in implementation — test imports HERO_ARCHETYPE_IDS
    expect(archId).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Add 4 hero archetypes**

In `enemyArchetypes.ts` add entries like `hero_knight`, `hero_paladin`, `hero_ranger`, `hero_battle_mage` with `threatTags: ['hero', 'arena']`, export:

```ts
export const HERO_ARCHETYPE_IDS = [
  'hero_knight',
  'hero_paladin',
  'hero_ranger',
  'hero_battle_mage',
] as const
```

Implement `tunnel.ts`:
- roll orientation 1×10 or 10×1
- battle 0: fixed pool spawn at far end
- battle 1: `kind: 'fixed'` with `pickUniform([...HERO_ARCHETYPE_IDS, ...BOSS_ARCHETYPE_IDS])`
- `playerSpawnZone` at near end

- [ ] **Step 4: Run tunnel test — expect PASS**

Run: `npm run test -- src/game/expedition/generators/tunnel.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/content/enemyArchetypes.ts src/game/expedition/generators/tunnel.ts src/game/expedition/generators/tunnel.test.ts
git commit -m "feat(expedition): tunnel generator and hero NPC archetypes"
```

---

### Task 6: `bigArena` + `chaoticMap` generators

**Files:**
- Create: `src/game/expedition/generators/bigArena.ts`
- Create: `src/game/expedition/generators/bigArena.test.ts`
- Create: `src/game/expedition/generators/chaoticMap.ts`
- Create: `src/game/expedition/generators/chaoticMap.test.ts`
- Create: `src/game/expedition/generators/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export function getGeneratorById(id: string): ExpeditionGenerator | undefined
  export function generateScenario(generatorId: string, ctx: ExpeditionGeneratorContext): BattleScenario
  ```

- [ ] **Step 1: Write failing tests**

`bigArena.test.ts` — width 10, height 20, enemy count in range 9–15 (8–12 + 1–3 bosses via spawns).

`chaoticMap.test.ts`:

```ts
it('is deterministic and within bounds', () => {
  const a = generateChaoticMap({ seed: 5, battleIndex: 0, expeditionPartySize: 3 })
  const b = generateChaoticMap({ seed: 5, battleIndex: 0, expeditionPartySize: 3 })
  expect(a).toEqual(b)
  expect(a.width).toBeGreaterThanOrEqual(1)
  expect(a.height).toBeGreaterThanOrEqual(1)
  expect(a.width * a.height).toBeGreaterThan(1)
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

`bigArena.ts`:
- fixed 10×20
- player zone x 0–3, enemy zone x 16–19
- 8–12 pool enemies + 1–3 fixed boss spawns from `BOSS_ARCHETYPE_IDS`
- 1–10 wall blocks (2×2 or 1×N clusters)

`chaoticMap.ts`:
- roll dimensions, walls, enemy count 1–20
- active spawns = roll 1..min(4, expeditionPartySize) → `playerSpawnCells`
- bosses: up to 3 based on enemy count
- id: `chaotic-map-${seed}-${battleIndex}`

`index.ts` registry map all five generatorIds.

- [ ] **Step 4: Run all generator tests**

Run: `npm run test -- src/game/expedition/generators/`

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/generators/
git commit -m "feat(expedition): big arena, chaotic map, generator registry"
```

---

### Task 7: Snapshot + reducer integration

**Files:**
- Modify: `src/game/expedition/snapshot.ts`
- Modify: `src/game/expedition/snapshot.test.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`
- Modify: `src/game/persistence/migrate.ts` (if expedition serialized)

**Interfaces:**
- Consumes: `generateScenario`, `getGeneratorById`, `ExpeditionChainConfig.kind`
- Modifies `startExpeditionBattle` to branch static/procedural
- Modifies `START_EXPEDITION` validation:
  ```ts
  const occupied = countOccupiedSquadSlots(state.squad)
  if (occupied < chain.partyMin) return state
  const rolledParty = resolvePartySize(chain.partySize, rng)
  const partySize = Math.min(rolledParty, action.selectedCharacterIds.length)
  if (partySize < 1) return state
  ```

- [ ] **Step 1: Update snapshot test for generationSeed**

In `snapshot.test.ts` assert `expedition.generationSeed` is a number > 0.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement snapshot**

In `buildExpeditionSnapshot`, add:

```ts
import { hashSeed } from '../stats/rollBaseStats'

// inside buildExpeditionSnapshot return:
generationSeed: hashSeed(`${chain.id}:${rng()}:${Date.now()}`),
```

Use expedition rng only (no Date.now) for determinism in tests — use `hashSeed(\`${chain.id}:${rng()}\`)` .

Trim `selectedCharacterIds` to `partySize` before building squad snapshot loop.

- [ ] **Step 4: Update `startExpeditionBattle`**

```ts
import { generateScenario } from '../expedition/generators'
import { hashSeed } from '../stats/rollBaseStats'

function startExpeditionBattle(state: CampaignState, expedition: Expedition): CampaignState {
  const chain = getExpeditionChainById(expedition.scenarioChainId)
  if (!chain) return state

  let scenario: BattleScenario
  let scenarioSlotIndex: number

  if (chain.kind === 'static') {
    const scenarioId = chain.battleScenarioIds[expedition.battleIndex]
    if (!scenarioId) return state
    const base = getScenarioById(scenarioId)
    scenarioSlotIndex = getScenarioIndexById(scenarioId)
    if (!base || scenarioSlotIndex < 0) return state
    scenario = resolveScenarioForCampaignSlot(base, scenarioSlotIndex)
  } else {
    const seed = hashSeed(`${expedition.generationSeed}:${expedition.battleIndex}`)
    scenario = generateScenario(chain.generatorId, {
      seed,
      battleIndex: expedition.battleIndex,
      expeditionPartySize: expedition.partySize,
    })
    scenarioSlotIndex = -1
  }

  const snapshot = buildExpeditionBattleSnapshot(state, expedition, scenarioSlotIndex)
  // ... rest unchanged, use `scenario` variable
}
```

- [ ] **Step 5: Update START_EXPEDITION + tests**

Fix `runReducer.test.ts` expedition tests — pass `selectedCharacterIds` matching new partySize logic; add test:

```ts
it('START_EXPEDITION procedural stores generationSeed and starts battle', () => {
  const s = /* hub with squad */
  const next = applyRunAction(s, {
    type: 'START_EXPEDITION',
    chainId: 'small-skirmish',
    selectedCharacterIds: [heroId],
  })
  expect(next.expedition?.generationSeed).toBeGreaterThan(0)
  expect(next.expedition?.scenarioChainId).toBe('small-skirmish')
  expect(next.battle).not.toBeNull()
})
```

- [ ] **Step 6: Migrate optional generationSeed**

In migrate/normalize expedition: `generationSeed: exp.generationSeed ?? hashSeed(exp.scenarioChainId)`

- [ ] **Step 7: Run tests**

Run: `npm run test -- src/game/expedition/ src/game/campaign/runReducer.test.ts`

- [ ] **Step 8: Commit**

```bash
git add src/game/expedition/snapshot.ts src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts src/game/persistence/migrate.ts
git commit -m "feat(expedition): procedural battle start and generation seed"
```

---

### Task 8: `ExpeditionSquadStrip` component

**Files:**
- Create: `src/features/campaign/ExpeditionSquadStrip.tsx`
- Create: `src/features/campaign/ExpeditionSquadStrip.test.ts` (pure helper test if needed)

**Interfaces:**
- Props:
  ```ts
  type ExpeditionSquadStripProps = {
    campaign: CampaignState
    markedIds: readonly string[]
    disabled?: boolean
    onToggleMark: (characterId: string) => void
  }
  ```

- [ ] **Step 1: Implement component**

Reuse `InventoryCell` styling from `SquadSlotRow`; 4 cells from `campaign.squad`; click toggles mark on occupied slots; visual: check badge or blue outline when marked; show hint text from spec.

No DnD on this tab.

- [ ] **Step 2: Manual smoke**

Run: `npm run start` — verify cells render on Battle tab after Task 9 wiring.

- [ ] **Step 3: Commit**

```bash
git add src/features/campaign/ExpeditionSquadStrip.tsx
git commit -m "feat(ui): expedition squad strip with participation marks"
```

---

### Task 9: `ExpeditionModeList` + `CampaignBattleTab` refactor

**Files:**
- Create: `src/features/campaign/ExpeditionModeList.tsx`
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx` (if props change)
- Remove usage: `src/features/campaign/SquadPicker.tsx` from Battle tab (keep file if used elsewhere)

**Interfaces:**
- `CampaignBattleTab` state: `selectedChainId`, `markedIds: string[]`
- On start:
  ```ts
  const maxParty = getChainMaxParty(chain)
  const selectedCharacterIds = resolveExpeditionParty({
    squad: campaign.squad,
    markedIds,
    maxParty,
  })
  onStartExpedition(selectedChainId, selectedCharacterIds)
  ```

- [ ] **Step 1: Implement ExpeditionModeList**

Checkbox group with radio behavior:

```tsx
<Checkbox
  checked={selectedChainId === chain.id}
  onChange={() => onSelect(chain.id)}
  disabled={disabled}
>
  <Typography.Text strong>{chain.label}</Typography.Text>
  <Typography.Text type="secondary"> — {chain.description}</Typography.Text>
  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
    {chain.paramPreview}
  </Typography.Text>
</Checkbox>
```

- [ ] **Step 2: Refactor CampaignBattleTab**

Order: `ExpeditionSquadStrip` → divider → title «Экспедиция» → `ExpeditionModeList` → button «Начать экспедицию».

`canStartExpedition`:
```ts
const occupied = countOccupiedSquadSlots(campaign.squad)
const squadOk = occupied >= chain.partyMin
const selectedCharacterIds = resolveExpeditionParty({ squad: campaign.squad, markedIds, maxParty: getChainMaxParty(chain) })
const hasFighters = selectedCharacterIds.length >= 1
```

- [ ] **Step 3: Run build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/ExpeditionModeList.tsx src/features/campaign/CampaignBattleTab.tsx src/features/campaign/CampaignHub.tsx
git commit -m "feat(ui): expedition mode checkboxes and squad strip on battle tab"
```

---

### Task 10: Русификация + help

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx` (remaining strings)
- Modify: `src/features/campaign/InterBattleScreen.tsx`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/campaign/CampaignShopTab.tsx`
- Modify: `src/features/campaign/CampaignTavernTab.tsx`
- Modify: `src/features/profile/HeroProfileContent.tsx`
- Modify: `src/game/help/articles.ts`
- Modify: `src/game/help/renderHelpText.test.ts` (if asserts expedition strings)

- [ ] **Step 1: Replace user-facing Expedition/expedition strings**

Grep: `rg -i expedition src/features src/game/help` — replace UI copy with Экспедиция/экспедиция.

Update help article `Отряд и expedition` → `Отряд и экспедиция`; add bullet list of five new modes.

- [ ] **Step 2: Run tests**

Run: `npm run test`

- [ ] **Step 3: Commit**

```bash
git add src/features/ src/game/help/
git commit -m "chore(ui): русификация экспедиции и help-статья режимов"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 2: Production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Manual checklist**

- [ ] Выбрать «Малая битва», старт с 1 героем в отряде
- [ ] Отметить 3 героев, старт «Засада» (max 4) — идут первые 3 по слотам
- [ ] Не отмечать никого — идут все занятые
- [ ] «Туннель» — 2 боя, второй с hero/boss
- [ ] «Хаотичная карта» — 1–3 inter-battle, поле меняется
- [ ] `campaign-main` по-прежнему работает
- [ ] Во время экспедиции — Alert freeze на вкладке

- [ ] **Step 4: Commit (if fixes needed)**

```bash
git commit -m "fix(expedition): address verification findings"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| 5 процедурных режимов | Tasks 4–6 |
| Статические цепочки | Task 1 |
| UI отряд + чекбоксы | Tasks 8–9 |
| resolveExpeditionParty | Task 2 |
| generationSeed + procedural start | Task 7 |
| Hero NPC + tunnel бой 2 | Task 5 |
| Корневые случаи | Tasks 3–6 placement fallbacks |
| Русификация | Task 10 |
| Миграция save | Task 7 |
| Help | Task 10 |

## Out of Scope (confirmed)

- Дуэль с боссом, Коридор, Осада
- Изменение наград / inter-battle revive для новых режимов
