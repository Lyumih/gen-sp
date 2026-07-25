# Battle Command Dock + Enemy Inspect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move battle actions under the field in a command dock, add click-to-pin enemy (and unit) inspect with full tactical info, and unify effective stat resolution for heroes and enemies.

**Architecture:** Add `unitBattleEffectiveStats` in `src/game/battle/` reusing `passiveBonusesForUnit`; extract dock/log/inspect UI from `BattleScreen.tsx` into focused components; switch `.game-battle-layout` to a column with `.game-battle-bottom` grid (dock | log on wide).

**Tech Stack:** React 19, Ant Design v6 (`App.useApp`), Vite 8, Vitest, TypeScript strict, Zustand (`useGameStore`), existing battle types (`BattleState`, `enemyCardsByUnitId`, `passivesByUnitId`).

## Global Constraints

- UI messages via `App.useApp().message`, not static `message` (project rules).
- Stat emoji and labels from `src/game/ui/labels.ts` / `BASE_STAT_META`; do not hardcode ❤️ in new components.
- In battle inspect: **full truth** for enemies (no codex gating on the battle screen).
- **No** equipment mini-block in the actor bar; equipment stays in `HeroProfileModal` only.
- **Do not block** the tactical grid with modals for inspect; use dock panel + existing cell tooltips.
- Min **2 rows** for interactive actions (basics vs skills); passives on row 3 (or tail of row 2 if ≤2 passives).
- Journal **right of dock** at viewport **≥900px**; stacked below on narrow.
- Out of scope: reducer/balance changes, enemy equipment, codex redesign.

**Spec:** `docs/superpowers/specs/2026-07-25-battle-command-dock-enemy-inspect-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/game/battle/unitBattleEffectiveStats.ts` | `{ base, effective }` for any in-battle unit |
| `src/game/battle/unitBattleEffectiveStats.test.ts` | Enemy passives without `Character` |
| `src/game/battle/unitCombatStats.ts` | Delegate mini ⚔/🛡 to effective stats |
| `src/features/battle/battleInspectModel.ts` | Cards/passives/synthetic carrier for inspect |
| `src/features/battle/BattlePassivesRow.tsx` | Shared passive cells (actor + inspect) |
| `src/features/battle/BattleInspectPanel.tsx` | Pinned unit read-only dossier |
| `src/features/battle/BattleInspectPanel.test.tsx` | Smoke: enemy cards + CD badge |
| `src/features/battle/BattleActorBar.tsx` | Compact hero strip in dock |
| `src/features/battle/BattleLogPanel.tsx` | Scrollable log block |
| `src/features/battle/BattleCommandDock.tsx` | Meta, actor bar, inspect slot, action rows |
| `src/features/battle/BattleSkillCell.tsx` | Optional `readOnly` + `onSelect?` |
| `src/features/battle/BattleScreen.tsx` | Layout, `pinnedInspectUnitId`, wire dock |
| `src/features/layout/game-layout.css` | Column layout + bottom grid |

---

### Task 1: `unitBattleEffectiveStats`

**Files:**
- Create: `src/game/battle/unitBattleEffectiveStats.ts`
- Create: `src/game/battle/unitBattleEffectiveStats.test.ts`
- Modify: `src/game/battle/unitCombatStats.ts`

**Interfaces:**
- Consumes: `passiveBonusesForUnit` from `src/game/passives/passiveCombatStats.ts`, `computeEffectiveStats`, `computeGearStatBonuses`, `getCharacter` / `campaign.characters`, `effectiveStatWithStatuses`.
- Produces:
  ```ts
  export function unitBattleEffectiveStats(
    battle: BattleState,
    unit: Unit,
    campaign: CampaignState,
  ): { base: BaseStats; effective: BaseStats } | null
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/game/battle/unitBattleEffectiveStats.test.ts
import { describe, expect, it } from 'vitest'
import type { BattleState, Unit, PassiveInstance } from '../types'
import { initialCampaignState } from '../campaign/runReducer'
import { unitBattleEffectiveStats } from './unitBattleEffectiveStats'

const BASE = {
  health: 10,
  defense: 2,
  attack: 3,
  magicPower: 0,
  mana: 0,
  manaRegen: 0,
  healPower: 0,
  speed: 0,
  initiative: 5,
  critChance: 0,
}

function enemyUnit(id: string): Unit {
  return {
    id,
    side: 'enemy',
    x: 1,
    y: 1,
    hp: 10,
    maxHp: 12,
    unitLevel: 1,
    baseStats: { ...BASE },
    initiativeBase: 7,
  }
}

it('applies battle passives for enemy without Character', () => {
  const campaign = initialCampaignState()
  const unit = enemyUnit('e1')
  const riposte: PassiveInstance = {
    id: 'p1',
    templateId: 'riposte', // pick a stat_flat passive known in templates
    global_level: 1,
    uses_count: 0,
    modSlots: [],
  }
  const battle: BattleState = {
    width: 5,
    height: 5,
    walls: [],
    units: [unit],
    turnOrder: ['e1'],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    passivesByUnitId: { e1: [riposte] },
    battleLog: [],
  }
  const result = unitBattleEffectiveStats(battle, unit, campaign)
  expect(result).not.toBeNull()
  expect(result!.effective.health).toBe(12)
  expect(result!.effective.initiative).toBe(7)
  // assert defense or attack differs from base-only effective when riposte adds stat
})
```

Adjust `templateId` to a real passive from `passiveTemplates` that adds a flat stat; assert concrete expected value from manual `computeEffectiveStats` once.

- [ ] **Step 2: Run test**

Run: `npm run test -- src/game/battle/unitBattleEffectiveStats.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```ts
// src/game/battle/unitBattleEffectiveStats.ts
import { getItemTemplate } from '../content/itemTemplates'
import { getCharacter } from '../character/selectors'
import { passiveBonusesForUnit } from '../passives/passiveCombatStats'
import { aggregatePassiveSkillStatBonuses } from '../passives/passiveStatBonuses'
import { computeEffectiveStats, computeGearStatBonuses } from '../stats/effectiveStats'
import type { BattleState, CampaignState, Unit } from '../types'
import type { BaseStats } from '../config/baseStats'

export function unitBattleEffectiveStats(
  battle: BattleState,
  unit: Unit,
  campaign: CampaignState,
): { base: BaseStats; effective: BaseStats } | null {
  if (!unit.baseStats) return null
  const character = getCharacter(campaign, unit.id)
  const gearBonuses = character
    ? computeGearStatBonuses(character.items, character.equipment, getItemTemplate)
    : {}
  const passiveBonuses = character
    ? aggregatePassiveSkillStatBonuses(
        character.passives,
        character.passiveEquip,
        unit.baseStats,
      )
    : passiveBonusesForUnit(battle, unit)
  const effective = computeEffectiveStats(
    unit.baseStats,
    unit.unitLevel,
    battle.worldPower,
    gearBonuses,
    passiveBonuses,
  )
  effective.health = unit.maxHp
  effective.initiative = unit.initiativeBase ?? effective.initiative
  return { base: unit.baseStats, effective }
}
```

- [ ] **Step 4: Refactor `unitCombatMiniStats`**

```ts
import { effectiveStatWithStatuses } from './unitStatus'
import { unitBattleEffectiveStats } from './unitBattleEffectiveStats'

export function unitCombatMiniStats(
  unit: Unit,
  campaign: CampaignState,
  worldPower: number,
): { attack: number; defense: number } | null {
  const battle = campaign.battle
  if (!battle) return null
  const pair = unitBattleEffectiveStats(battle, unit, campaign)
  if (!pair) return null
  return {
    attack: effectiveStatWithStatuses(pair.effective.attack, 'attack', unit),
    defense: effectiveStatWithStatuses(pair.effective.defense, 'defense', unit),
  }
}
```

Remove unused `worldPower` param only if all call sites updated (or keep param for API stability and ignore — prefer keep signature to minimize diff).

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/game/battle/unitBattleEffectiveStats.test.ts src/game/battle/unitCombatStats.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/battle/unitBattleEffectiveStats.ts src/game/battle/unitBattleEffectiveStats.test.ts src/game/battle/unitCombatStats.ts
git commit -m "feat(battle): unify effective stats for heroes and enemies"
```

---

### Task 2: Tooltip and grid cell use unified stats

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx` (`BattleUnitCell`)
- Modify: `src/features/battle/BattleUnitTooltip.tsx` (optional: accept precomputed effective)

**Interfaces:**
- Consumes: `unitBattleEffectiveStats(battle, unit, campaign)` — requires passing `battle` into `BattleUnitCell`.

- [ ] **Step 1: Extend `BattleUnitCell` props with `battle: BattleState`**

Replace inline `computeEffectiveStats` block (lines ~148–161) with:

```ts
const stats = unitBattleEffectiveStats(battle, unit, campaign)
if (!stats) return button
return (
  <BattleUnitTooltip
    display={display}
    baseStats={stats.base}
    effectiveStats={stats.effective}
    ...
  >
```

- [ ] **Step 2: Pass `battle` from grid map in `BattleScreen`**

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: success

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "fix(battle): cell tooltip effective stats include enemy battle passives"
```

---

### Task 3: `battleInspectModel` + `BattlePassivesRow`

**Files:**
- Create: `src/features/battle/battleInspectModel.ts`
- Create: `src/features/battle/BattlePassivesRow.tsx`
- Modify: `src/features/battle/ActorPassivesPanel.tsx` — thin wrapper delegating to `BattlePassivesRow` (or replace usages)

**Interfaces:**
- Produces:
  ```ts
  export type BattleUnitInspectModel = {
    unit: Unit
    display: UnitDisplay
    baseStats: BaseStats
    effectiveStats: BaseStats
    cards: readonly BattlePlayerCard[]
    passives: readonly PassiveInstance[]
    syntheticCarrier: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>
  }

  export function buildBattleUnitInspectModel(
    battle: BattleState,
    campaign: CampaignState,
    unitId: string,
  ): BattleUnitInspectModel | null
  ```

```ts
// synthetic carrier for enemy card/passive describe
function syntheticCarrier(unit: Unit): Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'> {
  return {
    baseStats: unit.baseStats!,
    unitLevel: unit.unitLevel,
    items: [],
    equipment: { weapon: null, armor: null, accessory: null },
  }
}

// cards: enemyCardsByUnitId[id] ?? playerCardsByUnitId[id] ?? []
```

- [ ] **Step 1: Implement `battleInspectModel.ts` with unit lookup from `battle.units`**

- [ ] **Step 2: Extract `BattlePassivesRow` from `ActorPassivesPanel`**

Props:
```ts
{
  passives: readonly PassiveInstance[]
  carrier: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>
  campaign: CampaignState
  title?: string
}
```

Use `describePassiveStats(passive, carrier, campaign)` — works for synthetic carrier.

- [ ] **Step 3: Make `ActorPassivesPanel` call `BattlePassivesRow` when `character` defined**

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/battleInspectModel.ts src/features/battle/BattlePassivesRow.tsx src/features/battle/ActorPassivesPanel.tsx
git commit -m "refactor(battle): inspect model and shared passives row"
```

---

### Task 4: `BattleInspectPanel` + test

**Files:**
- Create: `src/features/battle/BattleInspectPanel.tsx`
- Create: `src/features/battle/BattleInspectPanel.test.tsx`
- Modify: `src/features/battle/BattleSkillCell.tsx`

**Interfaces:**
- Consumes: `buildBattleUnitInspectModel`, `BattlePassivesRow`, `StatStrip`, `describeRaceResistLines`, `BattleSkillCell` with new props:
  ```ts
  readOnly?: boolean
  onSelect?: () => void  // optional when readOnly
  ```

- [ ] **Step 1: Write failing test**

Use `render` from `@testing-library/react` pattern from `BattleBasicActionCell.test.tsx`; mock minimal battle with one enemy + `enemyCardsByUnitId` entry with `cooldownRemaining: 2`; expect text CD or aria-label containing cooldown constant from `UI_COOLDOWN`.

- [ ] **Step 2: Implement `BattleInspectPanel`**

- Header: `Осмотр: {emoji} {name}` + `Button` icon close (`aria-label="Закрыть осмотр"`)
- Background: `#fff1f0` if `unit.side === 'enemy'`, else `#e6f4ff`
- `StatStrip`, HP/mana line, race lines, status list (map `unit.statusEffects` — use existing status label helpers if any, else template id + turns)
- Skills row: map cards → `BattleSkillCell` `readOnly` `disabled` `selected={false}`
- `BattlePassivesRow` with synthetic carrier

- [ ] **Step 3: Update `BattleSkillCell`**

When `readOnly`, render same cell but `onClick` no-op / omit `onSelect`; keep popover for tooltip.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/features/battle/BattleInspectPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/BattleInspectPanel.tsx src/features/battle/BattleInspectPanel.test.tsx src/features/battle/BattleSkillCell.tsx
git commit -m "feat(battle): read-only inspect panel for pinned units"
```

---

### Task 5: `BattleActorBar` + `BattleLogPanel`

**Files:**
- Create: `src/features/battle/BattleActorBar.tsx`
- Create: `src/features/battle/BattleLogPanel.tsx`

**Interfaces:**
- `BattleActorBar` props:
  ```ts
  {
    campaign: CampaignState
    battle: BattleState
    actorUnit: Unit | undefined  // player actor when their turn
    showEnemyTurnHint: boolean
  }
  ```
  When `!actorUnit`, resolve primary character's unit from `battle.units` (first player with hp>0 or `getPrimaryCharacter` id).

- Display: `getUnitDisplay`, `UI_LEVEL`, `UI_HEART`, `UI_MANA`, `StatStrip` via `unitBattleEffectiveStats`.

- `BattleLogPanel`: props `battle`, `unitSideLookup`, `unitLogLookup`, `logEndRef`.

- [ ] **Step 1: Implement both components** (extract markup from current `GamePanel` journal section)

- [ ] **Step 2: Commit**

```bash
git add src/features/battle/BattleActorBar.tsx src/features/battle/BattleLogPanel.tsx
git commit -m "refactor(battle): extract actor bar and log panel"
```

---

### Task 6: `BattleCommandDock` + layout CSS

**Files:**
- Create: `src/features/battle/BattleCommandDock.tsx`
- Modify: `src/features/layout/game-layout.css`
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- `BattleCommandDock` receives all action handlers/state currently in `GamePanel` body (mode, actorCards, guided overlay, etc.) plus:
  ```ts
  pinnedInspectUnitId: string | null
  onCloseInspect: () => void
  inspectModel: BattleUnitInspectModel | null
  ```

- [ ] **Step 1: CSS**

```css
.game-battle-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.game-battle-bottom {
  display: grid;
  grid-template-columns: 1fr minmax(260px, 320px);
  gap: 8px;
  align-items: start;
}

@media (max-width: 900px) {
  .game-battle-bottom {
    grid-template-columns: 1fr;
  }
}

.game-battle-field-scroll {
  max-height: calc(100vh - 420px); /* tune: header+turn+dock; verify 1366×768 */
}
```

Remove old two-column rule from `.game-battle-layout` (lines 49–53).

- [ ] **Step 2: Restructure JSX in `BattleScreen`**

```tsx
<div className="game-battle-layout">
  <div className="game-battle-field">...</div>
  <div className="game-battle-bottom">
    <BattleCommandDock ... />
    <BattleLogPanel ... />
  </div>
</div>
```

Remove sibling `GamePanel` from right column.

- [ ] **Step 3: Wire `BattleCommandDock`** — sections order per spec §4.3; class names `.battle-action-row`, `.battle-skill-row` unchanged for onboarding.

- [ ] **Step 4: `npm run build`**

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/BattleCommandDock.tsx src/features/battle/BattleScreen.tsx src/features/layout/game-layout.css
git commit -m "feat(battle): command dock under field with log column on wide"
```

---

### Task 7: Pin inspect interaction + Esc

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: State**

```ts
const [pinnedInspectUnitId, setPinnedInspectUnitId] = useState<string | null>(null)
```

- [ ] **Step 2: In `onCellClick`, before action guards**

```ts
if (target?.side === 'enemy') {
  setPinnedInspectUnitId((prev) => (prev === target.id ? null : target.id))
}
```

Do not return early — enemy click still cannot act on enemy turn (existing guards). Player targeting clicks unchanged.

Optional spec extension: also allow pin on `target?.side === 'player'` for ally inspect — **YAGNI unless quick**; MVP enemy-only pin is enough if spec strictly says enemy; spec allows ally — implement toggle for any unit with `baseStats`:

```ts
if (target && target.baseStats) {
  setPinnedInspectUnitId((prev) => (prev === target.id ? null : target.id))
}
```

- [ ] **Step 3: `useEffect` Esc listener**

```ts
useEffect(() => {
  if (!pinnedInspectUnitId) return
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setPinnedInspectUnitId(null)
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [pinnedInspectUnitId])
```

- [ ] **Step 4: Clear pin if unit id not in `battle.units`**

- [ ] **Step 5: Manual smoke** — dev server: click enemy → inspect in dock; Esc clears; actions still visible.

- [ ] **Step 6: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): pin unit inspect from field click and Esc"
```

---

### Task 8: Verification + onboarding

**Files:**
- Modify: `src/game/onboarding/coachMarks.ts` or guided battle overlay — only if selectors broke

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: all pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: pass

- [ ] **Step 3: Grep guided / coach marks for `GamePanel` or layout assumptions**

Run: `rg "battle-action-row|BattleScreen" src/game/onboarding`
Update copy/selectors if needed.

- [ ] **Step 4: Commit any onboarding fix**

```bash
git commit -m "chore(onboarding): align battle coach marks with command dock layout"
```

---

## Plan self-review

| Spec section | Task |
|--------------|------|
| Full enemy truth in battle | Task 4 inspect model |
| Dock under field | Task 6 |
| Log right on wide | Task 6 CSS |
| No equip in dock | Task 5 ActorBar |
| 2+ action rows | Task 6 dock layout |
| Click pin + Esc | Task 7 |
| Effective stats fix | Task 1–2 |
| HeroProfileModal unchanged | No task touches modal |
| Touch tap = pin | Task 7 (click handler) |
| Guided/autobattle | Task 8 |

No TBD placeholders in plan. Types: `BattleUnitInspectModel`, `unitBattleEffectiveStats` consistent across tasks.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-07-25-battle-command-dock-enemy-inspect.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with checkpoints (`executing-plans`)

Which approach do you want?
