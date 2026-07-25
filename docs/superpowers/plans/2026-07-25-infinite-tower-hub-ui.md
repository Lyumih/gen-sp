# Infinite Tower Hub UI + Defeat Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix tower defeat retry (`RETRY_CURRENT_BATTLE`) and unify «Бесконечная башня» with the battle mode tile grid (first card, flex-wrap, equal height, reset on card).

**Architecture:** Add a `towerFloor` branch in `runReducer` retry path mirroring `startTowerBattle` scenario/spawn generation. Replace `InfiniteTowerPanel` with `{ kind: 'tower' }` in `buildBattleModeEntries` and `BattleModeTowerTile` rendered from `BattleModeList`. Layout drops `GameScrollX` for flex-wrap + shared `min-height` on tiles.

**Tech Stack:** Vite 8, React 19, Ant Design v6, Zustand, Vitest, TypeScript strict (`tsconfig.app.json`).

## Global Constraints

- UI messages and confirms via `App.useApp()` (`message`, `modal`), not static `antd` APIs.
- Game logic in `src/game/`; React in `src/features/`.
- `verbatimModuleSyntax`, strict TS, no unused locals/parameters.
- Spec: `docs/superpowers/specs/2026-07-25-infinite-tower-hub-ui-design.md`.
- Tests: `npm run test` or `npx vitest run <file>`.

---

## File map

| File | Responsibility |
|------|----------------|
| `src/game/campaign/runReducer.ts` | Tower branch in `RETRY_CURRENT_BATTLE` |
| `src/game/campaign/towerBattle.test.ts` | Retry regression test |
| `src/features/campaign/towerMode.ts` | `TOWER_PLACEHOLDER_CHAIN` constant |
| `src/features/campaign/BattleModeTowerTile.tsx` | Tower card UI + reset confirm |
| `src/features/campaign/buildBattleModeEntries.ts` | `{ kind: 'tower' }` first when featured |
| `src/features/campaign/BattleModeList.tsx` | Render tower tile; no `GameScrollX` |
| `src/features/campaign/battle-mode-picker.css` | flex-wrap strip, equal-height tiles |
| `src/features/campaign/CampaignBattleTab.tsx` | Wire tower select; remove panel |
| `src/features/campaign/InfiniteTowerPanel.tsx` | **Delete** after migration |

---

### Task 1: Tower defeat retry in reducer

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (case `RETRY_CURRENT_BATTLE`, ~1448–1483)
- Modify: `src/game/campaign/towerBattle.test.ts`

**Interfaces:**
- Consumes: `generateInfiniteTower`, `hashSeed`, `copyBattleAttemptSnapshot`, `battleStateFromScenario`, `withBattleSpecializationFlags`, `restorePartyFromSnapshot` (already imported/used in file)
- Produces: retry works when `snap.towerFloor !== undefined` and `state.tower !== null`

- [ ] **Step 1: Write the failing test**

Add to `src/game/campaign/towerBattle.test.ts`:

```ts
  it('RETRY_CURRENT_BATTLE restarts same tower floor after defeat', () => {
    const heroId = initialCampaignState().squad[0]!
    let s = applyRunAction(initialCampaignState(), {
      type: 'START_TOWER_BATTLE',
      selectedCharacterIds: [heroId],
    })
    const floorBefore = s.tower?.currentFloor
    const runSeedBefore = s.tower?.runSeed
    s = { ...s, battle: s.battle ? { ...s.battle, phase: 'defeat' } : null }

    const retried = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })

    expect(retried).not.toBe(s)
    expect(retried.phase).toBe('battle')
    expect(retried.battle?.phase).not.toBe('defeat')
    expect(retried.tower?.currentFloor).toBe(floorBefore)
    expect(retried.tower?.runSeed).toBe(runSeedBefore)
    expect(retried.battleAttemptSnapshot?.towerFloor).toBe(floorBefore)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/campaign/towerBattle.test.ts -t "RETRY_CURRENT_BATTLE"`

Expected: FAIL (`retried).not.toBe(s)` or phase still `defeat`)

- [ ] **Step 3: Implement tower retry branch**

In `RETRY_CURRENT_BATTLE`, after `if (!snap) return state`, resolve `scenario` with a third path before campaign `SCENARIOS`:

```ts
      let scenario: BattleScenario | null = null
      let scenarioSpawnSeed: number | undefined
      if (state.expedition) {
        const chain = getExpeditionChainById(state.expedition.scenarioChainId)
        if (!chain) return state
        const resolved = resolveExpeditionScenario(chain, state.expedition)
        if (!resolved) return state
        scenario = resolved.scenario
      } else if (snap.towerFloor !== undefined) {
        if (!state.tower) return state
        const floor = snap.towerFloor
        const { runSeed } = state.tower
        scenario = generateInfiniteTower({ runSeed, floor })
        scenarioSpawnSeed = hashSeed(`${runSeed}:${floor}:spawn`)
      } else {
        const base = SCENARIOS[snap.scenarioSlotIndex]
        if (!base) return state
        scenario = resolveScenarioForCampaignSlot(base, snap.scenarioSlotIndex)
      }
```

Then pass spawn seed when building battle (only tower needs the third arg — match `startTowerBattle`):

```ts
      const battleFromScenario =
        scenarioSpawnSeed !== undefined
          ? battleStateFromScenario(scenario, snapCopy, scenarioSpawnSeed)
          : battleStateFromScenario(scenario, snapCopy)

      return restorePartyFromSnapshot(
        {
          ...retryState,
          battle: withBattleSpecializationFlags(battleFromScenario, retryState),
        },
        snapCopy,
      )
```

Move `const snapCopy = copyBattleAttemptSnapshot(snap)` above `battleFromScenario` if needed (keep order: build `snapCopy`, then `retryState`, then battle).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/campaign/towerBattle.test.ts`

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/towerBattle.test.ts
git commit -m "fix(tower): retry current battle after defeat on same floor"
```

---

### Task 2: Tower mode tile component

**Files:**
- Create: `src/features/campaign/towerMode.ts`
- Create: `src/features/campaign/BattleModeTowerTile.tsx`
- Delete: `src/features/campaign/InfiniteTowerPanel.tsx` (after Task 3 imports updated)

**Interfaces:**
- Consumes: `previewTowerFloor`, `CampaignState`, `BATTLE_MODE_CATEGORY.trial`
- Produces:
  - `export const TOWER_PLACEHOLDER_CHAIN` from `towerMode.ts`
  - `export function BattleModeTowerTile(props: { campaign; disabled; onStart; onResetTower })`

- [ ] **Step 1: Create `towerMode.ts`**

```ts
import { EXPEDITION_CHAINS } from '../../game/expedition/config'

export const TOWER_PLACEHOLDER_CHAIN = EXPEDITION_CHAINS.find((c) => c.id === 'chaotic-map')!
```

- [ ] **Step 2: Create `BattleModeTowerTile.tsx`**

Use a **`div`** root with `className="game-mode-tile"` (not nested buttons): main card `onClick` → `onStart` when not disabled; footer `Button` «Сбросить башню» with `onClick={(e) => { e.stopPropagation(); handleReset() }}`.

Port copy/layout from `InfiniteTowerPanel.tsx`:
- Category: `BATTLE_MODE_CATEGORY.trial`
- Icon 🗼, title «Бесконечная башня»
- Badge: `Этаж ${currentFloor}` + optional ` · Рекord: ${bestFloor}`
- Desc: 👹 count, boss, affix title (same as panel)
- Params line: first-clear gold or «уже получен»
- Reset: `modal.confirm` identical to panel; `disabled={disabled || tower === null}`

`handleStart` / card click: if `disabled` return; parent (`CampaignBattleTab`) still validates squad count before opening modal.

Example skeleton:

```tsx
export function BattleModeTowerTile({
  campaign,
  disabled,
  onStart,
  onResetTower,
}: BattleModeTowerTileProps) {
  const { modal } = App.useApp()
  // ... preview useMemo same as InfiniteTowerPanel ...

  return (
    <div
      className="game-mode-tile game-mode-tile--tower"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return
        onStart()
      }}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onStart()
        }
      }}
    >
      {/* icon, category, title, badge, desc, params — mirror BattleModeTile structure */}
      <Button
        size="small"
        type="link"
        disabled={disabled || tower === null}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled || tower === null) return
          modal.confirm({ /* same as panel */ onOk: onResetTower })
        }}
      >
        Сбросить башню
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Run build typecheck**

Run: `npm run build`

Expected: PASS (may fail until Task 3 removes old imports — if so, do Task 3 Step 1 first, then re-run)

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/towerMode.ts src/features/campaign/BattleModeTowerTile.tsx
git commit -m "feat(ui): BattleModeTowerTile for infinite tower hub card"
```

---

### Task 3: Entries, list layout, tab wiring

**Files:**
- Modify: `src/features/campaign/buildBattleModeEntries.ts`
- Modify: `src/features/campaign/BattleModeList.tsx`
- Modify: `src/features/campaign/battle-mode-picker.css`
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Delete: `src/features/campaign/InfiniteTowerPanel.tsx`

**Interfaces:**
- Consumes: `BattleModeTowerTile`, `TOWER_PLACEHOLDER_CHAIN` from `towerMode.ts`
- Produces: `BattleModeListEntry` includes `{ kind: 'tower' }`; list renders tower first

- [ ] **Step 1: Extend `BattleModeListEntry` and builder**

In `buildBattleModeEntries.ts`:

```ts
export type BattleModeListEntry =
  | { kind: 'tower' }
  | { kind: 'chain'; /* unchanged */ }
  | { kind: 'placeholder'; /* unchanged */ }
```

When `showFeaturedModes`, **before** `getTrialChains().forEach`:

```ts
    entries.push({ kind: 'tower' })
```

- [ ] **Step 2: Update `BattleModeList`**

Add props:

```ts
export type BattleModeListProps = {
  entries: readonly BattleModeListEntry[]
  disabled?: boolean
  onSelectChain: (chainId: string) => void
  campaign: CampaignState
  onTowerStart: () => void
  onResetTower: () => void
}
```

Remove `GameScrollX` wrapper. Render:

```tsx
<div className="game-mode-strip" role="list">
  {entries.map((entry) => {
    if (entry.kind === 'tower') {
      return (
        <div key="tower" role="listitem" className="game-mode-strip__item">
          <BattleModeTowerTile
            campaign={campaign}
            disabled={disabled}
            onStart={onTowerStart}
            onResetTower={onResetTower}
          />
        </div>
      )
    }
    // chain / placeholder unchanged, wrap listitem in className="game-mode-strip__item"
  })}
</div>
```

- [ ] **Step 3: CSS flex-wrap + equal height**

In `battle-mode-picker.css`, update:

```css
.game-mode-strip {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.game-mode-strip__item {
  flex: 0 0 140px;
  width: 140px;
  display: flex;
  align-items: stretch;
}

.game-mode-strip .game-mode-tile {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 168px;
  aspect-ratio: auto;
}
```

Tune `min-height` in browser if reset button clips; all tiles share the same rule.

- [ ] **Step 4: Wire `CampaignBattleTab`**

- Remove `InfiniteTowerPanel` import and JSX block (~164–177).
- Import `TOWER_PLACEHOLDER_CHAIN` from `./towerMode`.
- Extract tower start handler (same logic as panel `onOpenPartyPick`):

```ts
  const handleTowerStart = () => {
    if (modeDisabled) return
    if (countOccupiedSquadSlots(campaign.squad) < 1) {
      message.error('Добавьте хотя бы одного бойца в отряд')
      return
    }
    setTowerPartyPickOpen(true)
  }
```

- Pass to `BattleModeList`:

```tsx
        <BattleModeList
          entries={modeEntries}
          disabled={modeDisabled}
          onSelectChain={handleModeSelect}
          campaign={campaign}
          onTowerStart={handleTowerStart}
          onResetTower={onResetTower}
        />
```

- Delete `InfiniteTowerPanel.tsx`.

- [ ] **Step 5: Grep for stale imports**

Run: `rg "InfiniteTowerPanel" src`

Expected: no matches

- [ ] **Step 6: Run verification**

Run: `npx vitest run src/game/campaign/towerBattle.test.ts`
Run: `npm run build`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/campaign/buildBattleModeEntries.ts \
  src/features/campaign/BattleModeList.tsx \
  src/features/campaign/battle-mode-picker.css \
  src/features/campaign/CampaignBattleTab.tsx
git rm src/features/campaign/InfiniteTowerPanel.tsx
git commit -m "feat(ui): infinite tower as first battle mode tile with flex-wrap grid"
```

---

### Task 4: Manual smoke (browser)

**Files:** none

- [ ] **Step 1:** Open `http://localhost:5173/`, graduate onboarding or use save with featured modes visible.
- [ ] **Step 2:** Confirm «Бесконечная башня» is **first** tile; modes **wrap** (no horizontal scroll); tiles in a row share **equal height**.
- [ ] **Step 3:** Start tower battle, lose intentionally, click **«Начать новый бой»** — battle restarts (not stuck on defeat alert).
- [ ] **Step 4:** **«Сбросить башню»** on tile → confirm → floor 1, record preserved.

---

## Spec self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Retry `towerFloor` path | Task 1 |
| flex-wrap, no GameScrollX | Task 3 |
| Equal min-height tiles | Task 3 CSS |
| Tower first in list | Task 3 builder |
| Reset on card (A) | Task 2 |
| Remove InfiniteTowerPanel | Task 3 |
| Vitest retry | Task 1 |

No placeholders; signatures consistent (`onTowerStart`, `onResetTower`, `TOWER_PLACEHOLDER_CHAIN` in `towerMode.ts`).
