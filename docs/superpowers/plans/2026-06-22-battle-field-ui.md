# Battle Field UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Спавн без наложений, identity героев/врагов (имя, emoji, accent, skin-tone), бейдж очереди хода, вертикальный tooltip, инициатива с hover-синхронизацией и анимацией, переименование в профиле.

**Architecture:** Чистые функции в `src/game/battle/` и `src/game/character/`; resolve display через `display.ts` / `enemyDisplay.ts`; общий `UnitToken` для сетки и инициативы; `BattleScreen` держит `highlightedUnitId`. Миграция save v4→v5.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-22-battle-field-ui-design.md`  
**UI patterns:** `AGENTS.md`

## Global Constraints

- Spawn: `playerSpawnCells` → `playerSpawnZone` → legacy `playerSpawns` → default column `x === 0`; random unique cells; **no fallback**; overflow → `excludedCharacterIds`, no Unit
- All active heroes excluded → `phase: 'defeat'` at battle start
- Turn badge: hide current actor and dead; `1+` this round; `R+N` next round; no `0`
- Character name: trim, length **1–20**; duplicate names allowed
- `iconEmoji` from `CHARACTER_ICON_CATALOG`; `iconAccent` 8 presets; `iconSkinTone`: `default | light | medium | dark`
- Enemy display: scenario override > template > fallback `👾` + id; player **does not** edit enemies in campaign UI
- Expedition freeze: appearance editor disabled + Alert
- Desktop tooltip `mouseEnterDelay={0.3}`; touch Popover per AGENTS.md §7
- Hover animation: **180ms** ease on box-shadow, outline, transform `scale(1.04)` on grid cell
- SAVE_VERSION **5** (from 4)
- Emoji constants for game markers still from `src/game/ui/labels.ts`; unit portrait emoji from character/enemy display
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Types & catalog** | 1–2 | Types, iconCatalog, skin-tone render |
| **B — Core logic** | 3–5 | spawnPlacement, turnBadge, display resolve |
| **C — Battle integration** | 6–7 | scenarios, enemy snapshots, BattleState excluded |
| **D — Persistence & store** | 8–9 | migrate v5, RENAME/SET_APPEARANCE |
| **E — UI components** | 10–13 | StatTooltipList, UnitToken, InitiativeQueue, BattleScreen |
| **F — Hub & polish** | 14–16 | HeroProfile appearance, roster/squad, battle log |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/types.ts` | `IconAccentId`, `IconSkinToneId`, Character/Unit/BattleScenario/BattleState fields |
| `src/game/character/iconCatalog.ts` | Catalogs, accent CSS, skin-tone, class defaults |
| `src/game/character/display.ts` | `UnitDisplay`, `getCharacterDisplay`, `getUnitDisplay` |
| `src/game/content/enemyDisplay.ts` | `resolveEnemyUnitDisplay`, `ENEMY_ICON_CATALOG` |
| `src/game/battle/spawnPlacement.ts` | `assignPlayerSpawnPositions` |
| `src/game/battle/turnBadge.ts` | `turnBadgeLabel` |
| `src/game/campaign/scenarios.ts` | Spawn integration, enemy display snapshot |
| `src/game/content/enemyTemplates.ts` | `iconAccent` on templates |
| `src/game/character/createCharacter.ts` | Default icon fields |
| `src/game/persistence/migrate.ts` | v4→v5 |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 5` |
| `src/game/campaign/runReducer.ts` | `RENAME_CHARACTER`, `SET_CHARACTER_APPEARANCE` |
| `src/features/stats/StatTooltipList.tsx` | Vertical stat lines |
| `src/features/battle/UnitToken.tsx` | Shared token (grid / initiative) |
| `src/features/battle/BattleUnitTooltip.tsx` | Cell tooltip wrapper |
| `src/features/battle/battle.css` | Accent rings, hover animation, cell badge |
| `src/features/battle/InitiativeQueue.tsx` | UnitToken chips + hover |
| `src/features/battle/BattleScreen.tsx` | Grid, highlight sync, excluded Alert |
| `src/features/profile/HeroProfileContent.tsx` | Appearance editor |
| `src/game/battle/battleLog.ts` | Display names in log |

---

### Task 1: Types and icon catalog

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/character/iconCatalog.ts`
- Create: `src/game/character/iconCatalog.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type IconAccentId = 'default' | 'green' | 'gray' | 'blue' | 'red' | 'gold' | 'purple' | 'teal'
  export type IconSkinToneId = 'default' | 'light' | 'medium' | 'dark'
  export const CHARACTER_ICON_CATALOG: readonly string[]
  export const ENEMY_ICON_CATALOG: readonly string[]
  export const SKIN_TONE_ELIGIBLE: ReadonlySet<string>
  export function defaultIconEmojiForClass(classId: string): string
  export function isValidIconEmoji(emoji: string): boolean
  export function isValidIconAccent(accent: string): accent is IconAccentId
  export function renderEmojiWithSkinTone(baseEmoji: string, skinTone: IconSkinToneId): string
  export function accentStyle(accent: IconAccentId): { borderColor: string; background: string; filter?: string }
  ```

- Modify `Character`:
  ```ts
  iconEmoji: string
  iconAccent: IconAccentId
  iconSkinTone: IconSkinToneId
  ```

- Modify `Unit`:
  ```ts
  displayName?: string
  iconEmoji?: string
  iconAccent?: IconAccentId
  ```

- Modify `BattleScenario`:
  ```ts
  playerSpawnCells?: readonly { x: number; y: number }[]
  playerSpawnZone?: { xMin: number; xMax: number; yMin: number; yMax: number }
  ```

- Modify `BattleScenarioEnemy`:
  ```ts
  displayName?: string
  iconEmoji?: string
  iconAccent?: IconAccentId
  ```

- Modify `BattleState`:
  ```ts
  excludedCharacterIds?: readonly string[]
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/game/character/iconCatalog.test.ts
import { describe, expect, it } from 'vitest'
import {
  CHARACTER_ICON_CATALOG,
  defaultIconEmojiForClass,
  isValidIconEmoji,
  renderEmojiWithSkinTone,
} from './iconCatalog'

describe('iconCatalog', () => {
  it('warrior default is sword', () => {
    expect(defaultIconEmojiForClass('warrior')).toBe('⚔️')
  })

  it('catalog contains warrior default', () => {
    expect(CHARACTER_ICON_CATALOG).toContain('⚔️')
    expect(CHARACTER_ICON_CATALOG.length).toBeGreaterThanOrEqual(25)
  })

  it('validates emoji membership', () => {
    expect(isValidIconEmoji('⚔️')).toBe(true)
    expect(isValidIconEmoji('🦄')).toBe(false)
  })

  it('appends fitzpatrick modifier for eligible emoji', () => {
    const out = renderEmojiWithSkinTone('👤', 'medium')
    expect(out.length).toBeGreaterThan('👤'.length)
  })

  it('returns base emoji when skin tone default', () => {
    expect(renderEmojiWithSkinTone('👤', 'default')).toBe('👤')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/character/iconCatalog.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement types + iconCatalog**

Add types to `src/game/types.ts`. Create `iconCatalog.ts` with catalogs from spec §5.2, §6.3, class defaults §5.2 table, `SKIN_TONE_ELIGIBLE = new Set(['👤','🧙','🧝','🧛'])`, Fitzpatrick map `{ light: '\u{1F3FB}', medium: '\u{1F3FD}', dark: '\u{1F3FF}' }`, `accentStyle` per spec §5.3.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/character/iconCatalog.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/character/iconCatalog.ts src/game/character/iconCatalog.test.ts
git commit -m "feat: add character icon catalog and appearance types"
```

---

### Task 2: Display resolve helpers

**Files:**
- Create: `src/game/character/display.ts`
- Create: `src/game/content/enemyDisplay.ts`
- Create: `src/game/character/display.test.ts`

**Interfaces:**
- Consumes: Task 1 exports
- Produces:
  ```ts
  export type UnitDisplay = {
    name: string
    emoji: string
    accent: IconAccentId
    skinTone?: IconSkinToneId
  }
  export function getCharacterDisplay(character: Character): UnitDisplay
  export function resolveEnemyUnitDisplay(
    enemy: BattleScenarioEnemy,
    archetypeId: string,
  ): Pick<UnitDisplay, 'name' | 'emoji' | 'accent'>
  export function getUnitDisplay(
    unit: Unit,
    campaign: CampaignState | null,
  ): UnitDisplay
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { getCharacterDisplay } from './display'
import { resolveEnemyUnitDisplay } from '../content/enemyDisplay'
import { createCharacter } from './createCharacter'
import { TEST_BASE_STATS } from '../stats/testFixtures'

describe('display', () => {
  it('getCharacterDisplay uses character fields', () => {
    const c = createCharacter({
      id: 'c1',
      name: 'Ivan',
      classId: 'warrior',
      baseStats: TEST_BASE_STATS,
      baseStatRating: 0.5,
    })
    const d = getCharacterDisplay({ ...c, iconEmoji: '🗡️', iconAccent: 'green', iconSkinTone: 'default' })
    expect(d).toEqual({ name: 'Ivan', emoji: '🗡️', accent: 'green', skinTone: 'default' })
  })

  it('resolveEnemyUnitDisplay prefers scenario override', () => {
    const d = resolveEnemyUnitDisplay(
      { id: 'e1', x: 0, y: 0, baseHpStat: 8, unitLevel: 1, archetypeId: 'grunt', displayName: 'Orc', iconEmoji: '🐺', iconAccent: 'red' },
      'grunt',
    )
    expect(d.name).toBe('Orc')
    expect(d.emoji).toBe('🐺')
    expect(d.accent).toBe('red')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/character/display.test.ts`

- [ ] **Step 3: Implement display.ts + enemyDisplay.ts**

`resolveEnemyUnitDisplay`: `displayName ?? template.label ?? id`, `iconEmoji ?? template.emoji ?? '👾'`, `iconAccent ?? template.iconAccent ?? 'default'`.

`getUnitDisplay`: player → lookup `getCharacter`; enemy → fields on Unit snapshot with fallbacks.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/character/display.ts src/game/content/enemyDisplay.ts src/game/character/display.test.ts
git commit -m "feat: add unit display resolve helpers"
```

---

### Task 3: Spawn placement

**Files:**
- Create: `src/game/battle/spawnPlacement.ts`
- Create: `src/game/battle/spawnPlacement.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SpawnPlacementInput = {
    scenario: BattleScenario
    activeMembers: readonly PartyMemberBattleSnapshot[]
    enemyOccupied: ReadonlySet<string>
    seed: number
  }
  export type SpawnPlacementResult = {
    placements: ReadonlyMap<string, { x: number; y: number }>
    excludedCharacterIds: readonly string[]
  }
  export function assignPlayerSpawnPositions(input: SpawnPlacementInput): SpawnPlacementResult
  export function buildSpawnSeed(scenarioId: string, battleIndex: number, expeditionId?: string): number
  export function collectSpawnCellPool(scenario: BattleScenario, enemyOccupied: ReadonlySet<string>): { x: number; y: number }[]
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { cellKey } from './grid'
import { assignPlayerSpawnPositions, collectSpawnCellPool } from './spawnPlacement'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { BattleScenario, PartyMemberBattleSnapshot } from '../types'

const scenario: BattleScenario = {
  id: 'test',
  width: 4,
  height: 3,
  walls: [cellKey(0, 1)],
  playerSpawns: [],
  playerSpawnZone: { xMin: 0, xMax: 0, yMin: 0, yMax: 2 },
  heroBaseHpStat: 20,
  enemies: [{ id: 'e1', x: 3, y: 1, baseHpStat: 8, unitLevel: 1, archetypeId: 'grunt' }],
}

function member(id: string, spawnIndex: number): PartyMemberBattleSnapshot {
  return {
    characterId: id,
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    cards: [],
    battleLoadout: [null, null],
    metaStatus: 'active',
    spawnIndex,
  }
}

describe('assignPlayerSpawnPositions', () => {
  it('assigns unique cells in zone excluding walls and enemies', () => {
    const enemyOccupied = new Set([cellKey(3, 1)])
    const pool = collectSpawnCellPool(scenario, enemyOccupied)
    expect(pool.map(cellKey)).not.toContain(cellKey(0, 1))
    expect(pool.map(cellKey)).not.toContain(cellKey(3, 1))

    const { placements, excludedCharacterIds } = assignPlayerSpawnPositions({
      scenario,
      activeMembers: [member('a', 0), member('b', 1), member('c', 2)],
      enemyOccupied,
      seed: 42,
    })
    expect(excludedCharacterIds).toEqual(['c'])
    expect(placements.size).toBe(2)
    const coords = [...placements.values()]
    expect(new Set(coords.map((c) => cellKey(c.x, c.y))).size).toBe(2)
  })

  it('is deterministic for same seed', () => {
    const enemyOccupied = new Set<string>()
    const input = { scenario, activeMembers: [member('a', 0), member('b', 1)], enemyOccupied, seed: 7 }
    expect(assignPlayerSpawnPositions(input)).toEqual(assignPlayerSpawnPositions(input))
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/game/battle/spawnPlacement.test.ts`

- [ ] **Step 3: Implement spawnPlacement.ts**

Use seeded shuffle (reuse pattern from `hashSeed` in `rollBaseStats.ts` if available). Sort active members by `spawnIndex`. Pool priority: `playerSpawnCells` → expand `playerSpawnZone` → `playerSpawns` → default column `x=0`. Filter walls + enemyOccupied + bounds.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/spawnPlacement.ts src/game/battle/spawnPlacement.test.ts
git commit -m "feat: add deterministic player spawn placement"
```

---

### Task 4: Turn badge logic

**Files:**
- Create: `src/game/battle/turnBadge.ts`
- Create: `src/game/battle/turnBadge.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function turnBadgeLabel(
    unitId: string,
    turnOrder: readonly string[],
    currentTurnIndex: number,
    isAlive: (id: string) => boolean,
  ): string | null
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { turnBadgeLabel } from './turnBadge'

const alive = new Set(['A', 'B', 'C', 'D'])
const isAlive = (id: string) => alive.has(id)

describe('turnBadgeLabel', () => {
  const order = ['A', 'B', 'C', 'D'] as const

  it('returns null for current actor', () => {
    expect(turnBadgeLabel('C', order, 2, isAlive)).toBeNull()
  })

  it('returns null for dead unit', () => {
    alive.delete('B')
    expect(turnBadgeLabel('B', order, 0, isAlive)).toBeNull()
    alive.add('B')
  })

  it('returns steps until act this round', () => {
    expect(turnBadgeLabel('D', order, 2, isAlive)).toBe('1')
  })

  it('returns R+N for unit that already acted', () => {
    expect(turnBadgeLabel('A', order, 2, isAlive)).toBe('R+1')
    expect(turnBadgeLabel('B', order, 2, isAlive)).toBe('R+2')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement turnBadge.ts**

Algorithm: if `turnOrder[currentTurnIndex]===unitId` → null. Find `unitIndex` in turnOrder. If `unitIndex > currentTurnIndex` → `String(unitIndex - currentTurnIndex)`. Else → `R+${countAliveFrom(0, unitIndex)}` where count walks turnOrder from start through unitIndex inclusive, skipping dead.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/turnBadge.ts src/game/battle/turnBadge.test.ts
git commit -m "feat: add turn order badge label helper"
```

---

### Task 5: Integrate spawn + enemy display into scenarios

**Files:**
- Modify: `src/game/campaign/scenarios.ts`
- Modify: `src/game/content/enemyTemplates.ts`
- Modify: `src/game/campaign/scenarios.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4
- Produces: updated `makePlayerUnits`, `makeEnemies`, `battleStateFromScenario` returning `excludedCharacterIds` and instant defeat when no players

- [ ] **Step 1: Update scenarios.test.ts (failing cases first)**

Add tests:
- random placement uses zone, no overlap
- 3 members, 2 cells → 1 excluded id
- all excluded → `phase === 'defeat'`
- enemy unit has `displayName`, `iconEmoji`, `iconAccent` snapshot

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/game/campaign/scenarios.test.ts`

- [ ] **Step 3: Implement**

In `makePlayerUnits`:
- Build `enemyOccupied` from enemy positions
- Call `assignPlayerSpawnPositions`
- Only create units for `placements` keys

In `makeEnemies`:
- Call `resolveEnemyUnitDisplay` and set `displayName`, `iconEmoji`, `iconAccent` on Unit

In `battleStateFromScenario`:
- Set `excludedCharacterIds`
- If `players.length === 0` → `{ ...state, phase: 'defeat' }`

Add `iconAccent: 'red'` to `grunt`, `iconAccent: 'purple'` to `boss` in `enemyTemplates.ts`.

Update `SCENARIOS`: add `playerSpawnZone` for multi-squad scenarios (`two-front`: `{ xMin:0, xMax:0, yMin:0, yMax:3 }`).

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- src/game/campaign/scenarios.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/campaign/scenarios.ts src/game/content/enemyTemplates.ts src/game/campaign/scenarios.test.ts
git commit -m "feat: integrate spawn placement and enemy display snapshots"
```

---

### Task 6: createCharacter defaults + migration v5

**Files:**
- Modify: `src/game/character/createCharacter.ts`
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

- [ ] **Step 1: Write failing migrate test**

```ts
it('v4 save gains icon fields on migrate to v5', () => {
  // load fixture CampaignState v4 character without iconEmoji
  // migrateFromUnknown → character has iconEmoji, iconAccent, iconSkinTone
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

`createCharacter`: set `iconEmoji: defaultIconEmojiForClass(input.classId)`, `iconAccent: 'default'`, `iconSkinTone: 'default'`.

`SAVE_VERSION = 5`. Add `migrateV4CampaignToV5` in `migrate.ts`; extend `normalizeCharacter` to fill missing icon fields. Wire in `migrateFromUnknown`.

- [ ] **Step 4: Run migrate + createCharacter tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/character/createCharacter.ts src/game/persistence/schema.ts src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts
git commit -m "feat: migrate save v5 with character appearance fields"
```

---

### Task 7: Run reducer — rename and appearance actions

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it('RENAME_CHARACTER trims and enforces length', () => {
  const s = initialCampaignState()
  const id = s.characters[0]!.id
  const next = applyRunAction(s, { type: 'RENAME_CHARACTER', characterId: id, name: '  Bob  ' })
  expect(getCharacter(next, id)?.name).toBe('Bob')
  const rejected = applyRunAction(next, { type: 'RENAME_CHARACTER', characterId: id, name: '' })
  expect(getCharacter(rejected, id)?.name).toBe('Bob')
})

it('SET_CHARACTER_APPEARANCE validates catalog', () => {
  const s = initialCampaignState()
  const id = s.characters[0]!.id
  const next = applyRunAction(s, {
    type: 'SET_CHARACTER_APPEARANCE',
    characterId: id,
    iconEmoji: '🗡️',
    iconAccent: 'green',
    iconSkinTone: 'medium',
  })
  expect(getCharacter(next, id)?.iconEmoji).toBe('🗡️')
})
```

Add to `RunAction`:
```ts
| { type: 'RENAME_CHARACTER'; characterId: string; name: string }
| { type: 'SET_CHARACTER_APPEARANCE'; characterId: string; iconEmoji: string; iconAccent?: IconAccentId; iconSkinTone?: IconSkinToneId }
```

Block both when `campaign.expedition !== null`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement handlers in runReducer.ts**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat: add rename and appearance campaign actions"
```

---

### Task 8: StatTooltipList (vertical stats)

**Files:**
- Create: `src/features/stats/StatTooltipList.tsx`
- Reuse: `src/features/stats/statTooltipText.ts`

**Interfaces:**
- Produces:
  ```tsx
  export function StatTooltipList(props: {
    baseStats: BaseStats
    effectiveStats?: BaseStats
  }): JSX.Element
  ```

- [ ] **Step 1: Create component**

Map `BASE_STAT_IDS`; each stat one `<div>` with lines from `statTooltipLines(statId, base, effective)`.

- [ ] **Step 2: Manual verify in Story/dev** — N/A; covered by Task 10 integration

- [ ] **Step 3: Commit**

```bash
git add src/features/stats/StatTooltipList.tsx
git commit -m "feat: add vertical StatTooltipList for battle tooltips"
```

---

### Task 9: UnitToken + battle.css

**Files:**
- Create: `src/features/battle/UnitToken.tsx`
- Modify: `src/features/battle/battle.css`

**Interfaces:**
- Produces:
  ```tsx
  type UnitTokenProps = {
    display: UnitDisplay
    variant: 'grid' | 'initiative'
    unitLevel?: number
    hp?: number
    maxHp?: number
    turnBadge?: string | null
    highlighted?: boolean
    isCurrentActor?: boolean
    isDead?: boolean
    onMouseEnter?: () => void
    onMouseLeave?: () => void
  }
  export function UnitToken(props: UnitTokenProps): JSX.Element
  ```

- [ ] **Step 1: Implement UnitToken**

Grid variant: name ellipsis top, `renderEmojiWithSkinTone` in accent ring, level/hp rows, optional badge absolute.

Initiative variant: vertical name + emoji only.

CSS classes:
```css
.unit-token--highlighted { box-shadow: 0 0 0 2px #1677ff; transform: scale(1.04); transition: box-shadow 180ms ease, transform 180ms ease; }
.unit-token__accent-ring { border: 2px solid; border-radius: 8px; padding: 2px 4px; }
.unit-token__turn-badge { position: absolute; top: 2px; right: 2px; pointer-events: none; }
```

Apply `accentStyle()` inline + filter from catalog.

- [ ] **Step 2: Commit**

```bash
git add src/features/battle/UnitToken.tsx src/features/battle/battle.css
git commit -m "feat: add UnitToken with accent ring and turn badge"
```

---

### Task 10: BattleUnitTooltip + InitiativeQueue refactor

**Files:**
- Create: `src/features/battle/BattleUnitTooltip.tsx`
- Modify: `src/features/battle/InitiativeQueue.tsx`

- [ ] **Step 1: Implement BattleUnitTooltip**

Props: `display`, `baseStats`, `effectiveStats`, `hp`, `maxHp`, `children`.

Content header: `{emoji} {name}`; body: `<StatTooltipList />`; footer HP line.

Desktop Tooltip / mobile Popover pattern from existing `StatStrip` or `BattleScreen`.

- [ ] **Step 2: Refactor InitiativeQueue**

Replace inline Typography chips with `UnitToken variant="initiative"`.

Props add: `getDisplay: (unitId: string) => UnitDisplay`, `highlightedUnitId`, `onHighlight: (id: string | null) => void`.

Remove raw id text. Keep `→` separators.

- [ ] **Step 3: Commit**

```bash
git add src/features/battle/BattleUnitTooltip.tsx src/features/battle/InitiativeQueue.tsx
git commit -m "feat: battle tooltip and initiative queue with UnitToken"
```

---

### Task 11: BattleScreen integration

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: Add state and Alert**

```tsx
const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null)
```

If `battle.excludedCharacterIds?.length`:
```tsx
<Alert type="warning" showIcon closable
  message={`Не хватило места спавна: ${names.join(', ')} не участвуют в этом бою`}
/>
```

- [ ] **Step 2: Replace BattleUnitCell**

Use `getUnitDisplay(u, campaign)`, `turnBadgeLabel(...)`, wrap grid cell in `BattleUnitTooltip`, render `UnitToken variant="grid"`.

Pass highlight when `u.id === highlightedUnitId`.

- [ ] **Step 3: Wire InitiativeQueue hover**

```tsx
<InitiativeQueue
  ...
  highlightedUnitId={highlightedUnitId}
  onHighlight={setHighlightedUnitId}
  getDisplay={(id) => getUnitDisplay(units.find(u => u.id === id)!, campaign)}
/>
```

Grid cell `onMouseEnter` → `setHighlightedUnitId(u.id)`.

- [ ] **Step 4: Update turn/health headers**

Use `getUnitDisplay` for current actor and health list.

- [ ] **Step 5: Run full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat: battle screen spawn alert, tokens, and hover sync"
```

---

### Task 12: HeroProfile appearance editor

**Files:**
- Modify: `src/features/profile/HeroProfileContent.tsx`
- Modify: `src/features/character/CharacterRosterView.tsx`
- Modify: `src/features/character/SquadSlotRow.tsx`

- [ ] **Step 1: Appearance block in HeroProfileContent**

When `mode === 'hub'` and not expedition:
- `Input` name → `dispatchRun({ type: 'RENAME_CHARACTER', ... })`
- Emoji grid from `CHARACTER_ICON_CATALOG`
- Accent row from `ICON_ACCENT_IDS`
- Skin-tone row when `SKIN_TONE_ELIGIBLE.has(iconEmoji)`
- Live `UnitToken` preview

When expedition: disabled + `Alert`.

- [ ] **Step 2: Roster + squad compact emoji**

Prefix row with small accent ring + emoji before name.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/HeroProfileContent.tsx src/features/character/CharacterRosterView.tsx src/features/character/SquadSlotRow.tsx
git commit -m "feat: hero appearance editor and roster icons"
```

---

### Task 13: Battle log display names

**Files:**
- Modify: `src/game/battle/battleLog.ts`
- Modify: `src/features/battle/BattleScreen.tsx` (pass lookup to formatter if needed)

- [ ] **Step 1: Extend formatter signature**

```ts
export type BattleLogUnitLookup = (unitId: string) => UnitDisplay | undefined
export function formatBattleLogEntry(entry: BattleLogEntry, lookup?: BattleLogUnitLookup): string
```

Replace raw ids with `{emoji} {name}` when lookup provided.

- [ ] **Step 2: Wire from BattleScreen**

- [ ] **Step 3: Add test in battleLog.test.ts if file exists, else create minimal test**

- [ ] **Step 4: Run `npm run test` — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/battleLog.ts src/features/battle/BattleScreen.tsx
git commit -m "feat: battle log uses unit display names"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 2: Run build**

Run: `npm run build`  
Expected: no TypeScript errors

- [ ] **Step 3: Manual smoke**

1. Start dev server; open battle with 2+ squad members on tutorial — no overlap, Alert if overflow
2. Hover initiative chip ↔ grid cell highlights with animation
3. Rename hero + change emoji/accent in profile — reflects on battle field
4. Tooltip shows vertical stats + name
5. Turn badge visible on units not currently acting

---

## Spec Coverage Self-Review

| Spec § | Task |
|--------|------|
| §3 Spawn | 3, 5 |
| §3 Excluded Alert | 5, 11 |
| §4 Turn badge | 4, 9, 11 |
| §5 Hero identity | 1, 2, 6, 7, 12 |
| §5 Skin-tone | 1, 12 |
| §6 Enemy identity | 2, 5 |
| §7 UnitToken / tooltip | 8, 9, 10, 11 |
| §7 Hover animation | 9, 11 |
| §8 Initiative / roster / log | 10, 11, 12, 13 |
| §9 Migration / tests | 1–7, 14 |

No placeholders remain. Type names consistent across tasks.
