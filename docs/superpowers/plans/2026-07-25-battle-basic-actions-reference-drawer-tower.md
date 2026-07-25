# Battle Basic Actions, Reference Drawer, Tower Start — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace battle basic-action radio buttons with skill-style cells (expected stats + tooltips), expose Codex/Help via a global header Drawer (including in battle), and start infinite tower using the hub squad without a party modal.

**Architecture:** Game-layer `describeBasicActionStats` mirrors reducer damage helpers; `BattleBasicActionCell` reuses `InventoryCell` like `BattleSkillCell`; reference UI lives in `CampaignReferenceDrawer` mounted from `App.tsx` with Zustand drawer state; tower calls `onStartTowerBattle(getOccupiedSquadCharacterIds(squad).slice(0, 4))` directly.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand, React Compiler.

**Spec:** `docs/superpowers/specs/2026-07-25-battle-basic-actions-reference-drawer-tower-design.md`  
**UI patterns:** `AGENTS.md`

## Global Constraints

- Emoji stat markers from `src/game/ui/labels.ts`; add `UI_BASIC_RANGED = '🏹'` for basic ranged center icon
- Basic action badge uses `UI_SPEED`, `UI_ATTACK`, `UI_DAMAGE`, `UI_CELL`, `UI_COOLDOWN` — no Ant Design icons on cells
- Expected melee/ranged damage via `applyPassiveAttackBonus(battle, actor, baseConstant)` — same as reducer pre-mitigation flat bonus
- Selected basic action: `inv-cell--selected`; disabled/CD: `inv-cell--disabled`
- Popover/tooltip: `mouseEnterDelay={0.3}` (match `BattleCardPopover`)
- UI messages: `App.useApp().message`, not static `message`
- Codex/Help: **no** hub content panels; header buttons only; **codex available in battle** (`codexDisabled` removed)
- Tower party: `getOccupiedSquadCharacterIds(campaign.squad).slice(0, 4)` in squad slot order
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Basic actions core** | 1–3 | Stats helper + cells + BattleScreen |
| **B — Reference drawer** | 4–5 | Global drawer + nav wiring |
| **C — Tower** | 6 | Direct tower start |
| **D — Verify** | 7 | build + test |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/ui/labels.ts` | `UI_BASIC_RANGED` |
| `src/game/descriptions/basicActionText.ts` | `describeBasicActionStats`, labels for badge/tooltip |
| `src/game/descriptions/basicActionText.test.ts` | Passive bonus on expected damage |
| `src/features/battle/BattleBasicActionPopover.tsx` | Hover popover for basic actions |
| `src/features/battle/BattleBasicActionCell.tsx` | Selectable move/melee/ranged cell |
| `src/features/battle/BattleBasicActionCell.test.tsx` | Render/selected/disabled smoke |
| `src/features/battle/BattleScreen.tsx` | Wire basic row; remove Radio.Group |
| `src/store/gameStore.ts` | `referenceDrawer` slice + open/close |
| `src/store/gameStore.test.ts` | Drawer state (optional small test) |
| `src/features/campaign/CampaignReferenceDrawer.tsx` | Drawer + Segmented + tab bodies |
| `src/App.tsx` | Mount reference drawer |
| `src/features/campaign/campaignHubShared.ts` | Narrow `CampaignHubTab` / content tab type |
| `src/features/campaign/CampaignHubNav.tsx` | Content vs reference clicks; no codexDisabled |
| `src/features/campaign/CampaignHubNav.test.ts` | Update expectations |
| `src/features/campaign/GameHeader.tsx` | Pass reference callbacks |
| `src/features/campaign/CampaignHub.tsx` | Remove codex/help panels; open drawer |
| `src/features/campaign/CampaignBattleNav.tsx` | Remove local help drawer |
| `src/features/campaign/CampaignBattleTab.tsx` | Direct tower start |
| `src/features/campaign/CampaignBattleTab.test.tsx` | Tower starts without modal (if file exists or create) |

---

### Task 1: `UI_BASIC_RANGED` and `describeBasicActionStats`

**Files:**
- Modify: `src/game/ui/labels.ts`
- Create: `src/game/descriptions/basicActionText.ts`
- Create: `src/game/descriptions/basicActionText.test.ts`

**Interfaces:**
- Produces: `export type BasicActionKind = 'move' | 'melee' | 'ranged'`
- Produces: `export type BasicActionStatsDescription = { title: string; contextBadge: string; lines: string[]; expectedDamage: number | null; moveRange: number | null; effectiveRange: number | null }`
- Produces: `export function describeBasicActionStats(input: { kind: BasicActionKind; battle: BattleState; actor?: Unit; effectiveRangedRange: number; rangedCooldownRemaining: number }): BasicActionStatsDescription`

- [ ] **Step 1: Write failing test**

Create `src/game/descriptions/basicActionText.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import { HERO_BASIC_MELEE_DAMAGE } from '../battle/combat'
import { describeBasicActionStats } from './basicActionText'

function battleFixture() {
  const started = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
  const battle = started.battle
  if (!battle) throw new Error('expected battle')
  return battle
}

describe('describeBasicActionStats', () => {
  it('melee expectedDamage includes passive attack flat', () => {
    const battle = battleFixture()
    const hero = battle.units.find((u) => u.side === 'player')!
    const desc = describeBasicActionStats({
      kind: 'melee',
      battle,
      actor: hero,
      effectiveRangedRange: 6,
      rangedCooldownRemaining: 0,
    })
    expect(desc.expectedDamage).toBeGreaterThanOrEqual(HERO_BASIC_MELEE_DAMAGE)
    expect(desc.contextBadge).toContain('💥')
  })

  it('move contextBadge shows move range', () => {
    const battle = battleFixture()
    const desc = describeBasicActionStats({
      kind: 'move',
      battle,
      effectiveRangedRange: 6,
      rangedCooldownRemaining: 0,
    })
    expect(desc.moveRange).toBe(3)
    expect(desc.contextBadge).toContain('⬜')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/descriptions/basicActionText.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

In `src/game/ui/labels.ts` add:

```ts
export const UI_BASIC_RANGED = '🏹'
```

Create `src/game/descriptions/basicActionText.ts` (minimal working version):

```ts
import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_COOLDOWN_TURNS,
  HERO_MOVE_RANGE,
} from '../battle/combat'
import { applyPassiveAttackBonus } from '../passives/passiveCombatStats'
import type { BattleState, Unit } from '../types'
import {
  UI_ATTACK,
  UI_BASIC_RANGED,
  UI_CELL,
  UI_COOLDOWN,
  UI_DAMAGE,
  UI_SPEED,
} from '../ui/labels'

export type BasicActionKind = 'move' | 'melee' | 'ranged'

export type BasicActionStatsDescription = {
  title: string
  centerEmoji: string
  contextBadge: string
  lines: string[]
  expectedDamage: number | null
  moveRange: number | null
  effectiveRange: number | null
}

const TITLES: Record<BasicActionKind, string> = {
  move: 'Ход',
  melee: 'Удар',
  ranged: 'Выстрел',
}

export function describeBasicActionStats(input: {
  kind: BasicActionKind
  battle: BattleState
  actor?: Unit
  effectiveRangedRange: number
  rangedCooldownRemaining: number
}): BasicActionStatsDescription {
  const { kind, battle, actor, effectiveRangedRange, rangedCooldownRemaining } = input
  const title = TITLES[kind]

  if (kind === 'move') {
    const contextBadge = `${UI_CELL}≤${HERO_MOVE_RANGE}`
    return {
      title,
      centerEmoji: UI_SPEED,
      contextBadge,
      lines: [
        `До ${HERO_MOVE_RANGE} клеток по Manhattan.`,
        'Нельзя ходить на занятую клетку или сквозь стены.',
      ],
      expectedDamage: null,
      moveRange: HERO_MOVE_RANGE,
      effectiveRange: null,
    }
  }

  const base =
    kind === 'melee' ? HERO_BASIC_MELEE_DAMAGE : HERO_BASIC_RANGED_DAMAGE
  const expected = actor
    ? applyPassiveAttackBonus(battle, actor, base)
    : base
  const rangePart =
    kind === 'melee' ? `${UI_CELL}1` : `${UI_CELL}≤${effectiveRangedRange}`
  const cdPart =
    kind === 'ranged' && rangedCooldownRemaining > 0
      ? ` · ${UI_COOLDOWN}${rangedCooldownRemaining}`
      : kind === 'ranged' && HERO_BASIC_RANGED_COOLDOWN_TURNS > 0
        ? ` · ${UI_COOLDOWN}${HERO_BASIC_RANGED_COOLDOWN_TURNS}`
        : ''
  const contextBadge = `${UI_DAMAGE}${expected} · ${rangePart}${cdPart}`

  const lines = [
    `Базовый урон: ${base}.`,
    expected > base
      ? `С пассивами атакующего: ${expected}.`
      : 'Пассивы атакующего не меняют урон.',
    'Итог по цели уменьшается защитой и статусами цели.',
  ]
  if (kind === 'ranged' && rangedCooldownRemaining > 0) {
    lines.push(`Перезарядка: ${rangedCooldownRemaining} ход(ов).`)
  }

  return {
    title,
    centerEmoji: kind === 'melee' ? UI_ATTACK : UI_BASIC_RANGED,
    contextBadge,
    lines,
    expectedDamage: expected,
    moveRange: null,
    effectiveRange: kind === 'ranged' ? effectiveRangedRange : 1,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/descriptions/basicActionText.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/ui/labels.ts src/game/descriptions/basicActionText.ts src/game/descriptions/basicActionText.test.ts
git commit -m "feat(battle): describeBasicActionStats for basic action cells"
```

---

### Task 2: `BattleBasicActionCell` and popover

**Files:**
- Create: `src/features/battle/BattleBasicActionPopover.tsx`
- Create: `src/features/battle/BattleBasicActionCell.tsx`
- Create: `src/features/battle/BattleBasicActionCell.test.tsx`

**Interfaces:**
- Consumes: `describeBasicActionStats`, `BasicActionKind` from `src/game/descriptions/basicActionText.ts`
- Produces: `BattleBasicActionCell` with props `{ kind, battle, actor, effectiveRangedRange, rangedCooldownRemaining, selected, disabled, onSelect }`

- [ ] **Step 1: Write failing test**

Create `src/features/battle/BattleBasicActionCell.test.tsx`:

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../../game/campaign/runReducer'
import { BattleBasicActionCell } from './BattleBasicActionCell'

function battleFixture() {
  const started = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
  const battle = started.battle
  if (!battle) throw new Error('expected battle')
  return battle
}

describe('BattleBasicActionCell', () => {
  it('renders inv-cell with move emoji', () => {
    const battle = battleFixture()
    const html = renderToStaticMarkup(
      createElement(BattleBasicActionCell, {
        kind: 'move',
        battle,
        effectiveRangedRange: 6,
        rangedCooldownRemaining: 0,
        selected: false,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('👟')
  })

  it('adds selected class when selected', () => {
    const battle = battleFixture()
    const html = renderToStaticMarkup(
      createElement(BattleBasicActionCell, {
        kind: 'melee',
        battle,
        effectiveRangedRange: 6,
        rangedCooldownRemaining: 0,
        selected: true,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell--selected')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/features/battle/BattleBasicActionCell.test.tsx`

- [ ] **Step 3: Implement popover and cell**

`BattleBasicActionPopover.tsx` — copy structure from `BattleCardPopover.tsx`, use `describeBasicActionStats` lines.

`BattleBasicActionCell.tsx`:

```tsx
import type { BasicActionKind } from '../../game/descriptions/basicActionText'
import { describeBasicActionStats } from '../../game/descriptions/basicActionText'
import type { BattleState, Unit } from '../../game/types'
import { InventoryCell } from '../inventory/InventoryCell'
import { BattleBasicActionPopover } from './BattleBasicActionPopover'

export type BattleBasicActionCellProps = {
  kind: BasicActionKind
  battle: BattleState
  actor?: Unit
  effectiveRangedRange: number
  rangedCooldownRemaining: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

export function BattleBasicActionCell(props: BattleBasicActionCellProps) {
  const stats = describeBasicActionStats({
    kind: props.kind,
    battle: props.battle,
    actor: props.actor,
    effectiveRangedRange: props.effectiveRangedRange,
    rangedCooldownRemaining: props.rangedCooldownRemaining,
  })
  const cellDisabled =
    props.disabled ||
    (props.kind === 'ranged' && props.rangedCooldownRemaining > 0)
  const ariaLabel = `${stats.title}, ${stats.contextBadge}`

  return (
    <BattleBasicActionPopover stats={stats}>
      <InventoryCell
        emoji={stats.centerEmoji}
        contextBadge={stats.contextBadge}
        state={cellDisabled ? 'disabled' : 'filled'}
        className={props.selected ? 'inv-cell--selected' : undefined}
        ariaLabel={ariaLabel}
        onClick={() => {
          if (cellDisabled) return
          props.onSelect()
        }}
      />
    </BattleBasicActionPopover>
  )
}
```

Export `BasicActionStatsDescription` from popover props or import type from basicActionText.

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/features/battle/BattleBasicActionCell.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/BattleBasicActionPopover.tsx src/features/battle/BattleBasicActionCell.tsx src/features/battle/BattleBasicActionCell.test.tsx
git commit -m "feat(battle): BattleBasicActionCell with popover"
```

---

### Task 3: Wire basic actions in `BattleScreen`

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: `BattleBasicActionCell`, `BasicActionKind` mapping to existing `ActionMode` (`move` | `melee` | `ranged`)

- [ ] **Step 1: Replace Radio.Group block**

Remove imports: `Radio`, `DragOutlined`, `ThunderboltOutlined`, `AimOutlined` (if unused elsewhere in file).

Replace section (~lines 1140–1190) with:

```tsx
<Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
  Базовые действия
</Typography.Text>
<div className="battle-action-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
  {(['move', 'melee', 'ranged'] as const).map((kind) => (
    <BattleBasicActionCell
      key={kind}
      kind={kind}
      battle={battle}
      actor={actor}
      effectiveRangedRange={effectiveRangedRange}
      rangedCooldownRemaining={heroRangedCooldown}
      selected={mode === kind}
      disabled={
        actionsDisabled ||
        guidedModeBlocked(kind) ||
        (kind === 'ranged' && heroRangedOnCd)
      }
      onSelect={() => setMode(kind)}
    />
  ))}
  {actor && !autoBattleEnabled ? (
    <Button
      disabled={actionsDisabled || animationPlaying}
      onClick={() => {
        dispatchBattle({ type: 'end_turn' })
        if (guidedActive && guidedBattleStep === 4) {
          setGuidedBattleStep(5)
        }
      }}
    >
      Завершить ход
    </Button>
  ) : null}
</div>
```

Keep `basicMode` variable only if still used elsewhere; otherwise remove.

- [ ] **Step 2: Run build**

Run: `npm run build`  
Expected: success

- [ ] **Step 3: Run battle-related tests**

Run: `npm run test -- src/features/battle/`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): basic action cells replace radio buttons"
```

---

### Task 4: Reference drawer state and component

**Files:**
- Modify: `src/store/gameStore.ts`
- Create: `src/features/campaign/CampaignReferenceDrawer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `referenceDrawer: { open: boolean; pane: 'codex' | 'help'; helpFocusArticleId: string | null }`
- Produces: `openReferenceDrawer(pane: 'codex' | 'help', helpFocusArticleId?: string | null): void`
- Produces: `closeReferenceDrawer(): void`
- Produces: `setReferenceDrawerPane(pane: 'codex' | 'help'): void` (for Segmented inside drawer)

- [ ] **Step 1: Extend gameStore**

Add to `GameStoreState`:

```ts
referenceDrawer: {
  open: boolean
  pane: 'codex' | 'help'
  helpFocusArticleId: string | null
}
openReferenceDrawer: (pane: 'codex' | 'help', helpFocusArticleId?: string | null) => void
closeReferenceDrawer: () => void
setReferenceDrawerPane: (pane: 'codex' | 'help') => void
```

Initial state: `{ open: false, pane: 'codex', helpFocusArticleId: null }`.

`openReferenceDrawer` implementation:

```ts
openReferenceDrawer: (pane, helpFocusArticleId = null) => {
  const { referenceDrawer, dispatchRun } = get()
  if (referenceDrawer.open && referenceDrawer.pane === pane) {
    set({ referenceDrawer: { ...referenceDrawer, open: false, helpFocusArticleId: null } })
    return
  }
  if (pane === 'codex') {
    dispatchRun({ type: 'MARK_CODEX_SEEN' })
  }
  set({
    referenceDrawer: {
      open: true,
      pane,
      helpFocusArticleId: pane === 'help' ? helpFocusArticleId : null,
    },
  })
},
closeReferenceDrawer: () =>
  set((s) => ({
    referenceDrawer: { ...s.referenceDrawer, open: false, helpFocusArticleId: null },
  })),
setReferenceDrawerPane: (pane) =>
  set((s) => ({
    referenceDrawer: {
      ...s.referenceDrawer,
      pane,
      helpFocusArticleId: pane === 'help' ? s.referenceDrawer.helpFocusArticleId : null,
    },
  })),
```

- [ ] **Step 2: Create CampaignReferenceDrawer**

```tsx
import { Drawer, Segmented } from 'antd'
import type { CampaignState } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { CampaignCodexTab } from '../codex/CampaignCodexTab'
import { CampaignHelpTab } from '../help/CampaignHelpTab'

type CampaignReferenceDrawerProps = {
  campaign: CampaignState
}

export function CampaignReferenceDrawer({ campaign }: CampaignReferenceDrawerProps) {
  const { open, pane, helpFocusArticleId } = useGameStore((s) => s.referenceDrawer)
  const closeReferenceDrawer = useGameStore((s) => s.closeReferenceDrawer)
  const setReferenceDrawerPane = useGameStore((s) => s.setReferenceDrawerPane)

  return (
    <Drawer
      title="Справочник"
      open={open}
      onClose={closeReferenceDrawer}
      size="large"
      destroyOnHidden
    >
      <Segmented
        block
        value={pane}
        options={[
          { label: 'Кодекс', value: 'codex' },
          { label: 'Справка', value: 'help' },
        ]}
        onChange={(v) => setReferenceDrawerPane(v as 'codex' | 'help')}
        style={{ marginBottom: 16 }}
      />
      {pane === 'codex' ? <CampaignCodexTab campaign={campaign} /> : null}
      {pane === 'help' ? (
        <CampaignHelpTab
          focusArticleId={helpFocusArticleId}
          onFocusConsumed={() =>
            useGameStore.setState((s) => ({
              referenceDrawer: { ...s.referenceDrawer, helpFocusArticleId: null },
            }))
          }
        />
      ) : null}
    </Drawer>
  )
}
```

Prefer extracting `clearHelpFocus` action on store instead of inline `setState` in component if linter complains.

- [ ] **Step 3: Mount in App.tsx**

```tsx
import { CampaignReferenceDrawer } from './features/campaign/CampaignReferenceDrawer'

function AppContent() {
  const campaign = useGameStore((s) => s.campaign)
  // ... existing branches
}

function AppShellWithReference() {
  const campaign = useGameStore((s) => s.campaign)
  return (
    <>
      <AppContent />
      <CampaignReferenceDrawer campaign={campaign} />
    </>
  )
}
```

Use `AppShellWithReference` inside `AntdApp` instead of bare `AppContent`.

- [ ] **Step 4: Run build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts src/features/campaign/CampaignReferenceDrawer.tsx src/App.tsx
git commit -m "feat(ui): global CampaignReferenceDrawer with zustand state"
```

---

### Task 5: Header/nav wiring and hub cleanup

**Files:**
- Modify: `src/features/campaign/campaignHubShared.ts`
- Modify: `src/features/campaign/CampaignHubNav.tsx`
- Modify: `src/features/campaign/CampaignHubNav.test.ts`
- Modify: `src/features/campaign/GameHeader.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/campaign/CampaignBattleNav.tsx`

**Interfaces:**
- `CampaignHubTab` becomes `'character' | 'shop' | 'tavern' | 'battle'` (battle for highlight only)
- Nav reference buttons call `openReferenceDrawer('codex' | 'help')`

- [ ] **Step 1: Update campaignHubShared.ts**

```ts
export type CampaignHubTab = 'character' | 'shop' | 'tavern' | 'battle'
export type CampaignReferencePane = 'codex' | 'help'
```

Remove `'codex' | 'help'` from hub content routing everywhere.

- [ ] **Step 2: Refactor CampaignHubNav**

Replace props:

```ts
type CampaignHubNavProps = {
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
  unreadCodexCount: number
  shopDisabled: boolean
  tavernDisabled: boolean
  tabsDisabled?: boolean
  referenceDrawerOpen: boolean
  referencePane: CampaignReferencePane
  onCodexClick: () => void
  onHelpClick: () => void
}
```

Split render: `CONTENT_TAB_ORDER = ['character', 'shop', 'tavern']` with `onTabChange`; then codex/help buttons with `onCodexClick`/`onHelpClick`.

`isTabDisabled`: remove codex/help branches; for content tabs `tabsDisabled` still disables character/shop/tavern.

Codex/help buttons: **never** disabled (including in battle).

`aria-expanded={referenceDrawerOpen && referencePane === 'codex'}` on codex button; same for help.

Remove `codexDisabled` prop entirely.

- [ ] **Step 3: Update GameHeader**

Remove `codexDisabled` prop. Pass through `referenceDrawerOpen`, `referencePane`, `onCodexClick`, `onHelpClick` to nav.

Wire `onTabChange` only for content tabs.

- [ ] **Step 4: Update CampaignHub**

Remove codex/help tab panels. In `handleTabChange`, only character/shop/tavern.

Remove `codexDisabled={inBattle}`.

Connect header:

```ts
const referenceDrawer = useGameStore((s) => s.referenceDrawer)
const openReferenceDrawer = useGameStore((s) => s.openReferenceDrawer)

onCodexClick={() => openReferenceDrawer('codex')}
onHelpClick={() => openReferenceDrawer('help')}
```

Replace `setHubActiveTab('help')` in debrief/onboarding with `openReferenceDrawer('help', 'memento')` (verify article id in `game/help/articles.ts`).

- [ ] **Step 5: Update CampaignBattleNav**

Remove local `helpOpen` Drawer. Pass same reference props to `GameHeader`. Remove `codexDisabled={inBattle}`.

- [ ] **Step 6: Fix tests**

Update `CampaignHubNav.test.ts`:

```ts
// Replace codexDisabled with referenceDrawer props
createElement(CampaignHubNav, {
  activeTab: 'character',
  onTabChange: () => {},
  unreadCodexCount: 3,
  shopDisabled: false,
  tavernDisabled: false,
  tabsDisabled: true,
  referenceDrawerOpen: false,
  referencePane: 'codex',
  onCodexClick: () => {},
  onHelpClick: () => {},
})
```

Assert codex and help buttons exist and are not disabled when `tabsDisabled: true`.

Grep repo for `codexDisabled`, `activeTab === 'codex'`, `setHubActiveTab('help')`, `'codex'` hub tab — fix all.

- [ ] **Step 7: Run tests and build**

Run: `npm run test -- src/features/campaign/CampaignHubNav.test.ts`  
Run: `npm run build`

- [ ] **Step 8: Commit**

```bash
git add src/features/campaign/campaignHubShared.ts src/features/campaign/CampaignHubNav.tsx src/features/campaign/CampaignHubNav.test.ts src/features/campaign/GameHeader.tsx src/features/campaign/CampaignHub.tsx src/features/campaign/CampaignBattleNav.tsx
git commit -m "feat(ui): codex and help open in global reference drawer"
```

---

### Task 6: Tower direct start

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`

**Interfaces:**
- Consumes: `getOccupiedSquadCharacterIds` from `src/game/expedition/resolveExpeditionParty.ts`

- [ ] **Step 1: Replace handleTowerStart**

```ts
import { getOccupiedSquadCharacterIds } from '../../game/expedition/resolveExpeditionParty'

const handleTowerStart = () => {
  if (modeDisabled) return
  if (countOccupiedSquadSlots(campaign.squad) < 1) {
    message.error('Добавьте хотя бы одного бойца в отряд')
    return
  }
  const party = getOccupiedSquadCharacterIds(campaign.squad).slice(0, 4)
  onStartTowerBattle(party)
}
```

- [ ] **Step 2: Remove tower modal**

Delete `towerPartyPickOpen` state and tower `ExpeditionPartyPickModal` block. Remove unused `TOWER_PLACEHOLDER_CHAIN` import if unused.

- [ ] **Step 3: Run build + campaign tests**

Run: `npm run build`  
Run: `npm run test -- src/features/campaign/`  
Expected: PASS (add a focused test if tower modal was previously asserted)

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/CampaignBattleTab.tsx
git commit -m "feat(tower): start battle with hub squad without party modal"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm run test`  
Expected: PASS

- [ ] **Step 2: Production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Manual smoke (dev server)**

- Hub: Codex/Help drawer, toggle same button closes, Segmented switches pane
- Battle: basic cells select modes, overlays work, Codex opens during fight
- Tower: one click starts battle with squad members in slot order

---

## Spec Coverage (self-review)

| Spec § | Task |
|--------|------|
| §4 Basic action cells | 1–3 |
| §5 Reference drawer | 4–5 |
| §6 Tower | 6 |
| §8 Verification | 7 |

No TBD steps. Types `BasicActionKind`, `describeBasicActionStats`, `openReferenceDrawer` consistent across tasks.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-25-battle-basic-actions-reference-drawer-tower.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  

**2. Inline Execution** — implement in this session with executing-plans checkpoints  

**Which approach?**
