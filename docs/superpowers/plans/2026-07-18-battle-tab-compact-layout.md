# Battle Tab Compact Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact battle tab — horizontal scrollable mode strip with category tags on tiles, and squad panel with reserve column on the right (always visible, empty state «пусто»).

**Architecture:** Pure `buildBattleModeEntries()` assembles ordered list; new `BattleModeList` renders strip inside `GameScrollX`. Squad layout refactor in `SquadAssemblyPanel` only; `GamePanel` owns single «Отряд» title + help. UI-only, no reducer changes.

**Tech Stack:** TypeScript strict, Vitest, React 19, Ant Design 6, `@dnd-kit`, existing `GameScrollX` / `InventoryCell` patterns.

**Spec:** `docs/superpowers/specs/2026-07-18-battle-tab-compact-layout-design.md`

## Global Constraints

- Remove section `<h4>` titles on battle tab; category on tile only
- Mode strip: horizontal scroll (`GameScrollX`), square tiles ~140px, `flex-shrink: 0`
- Single «Отряд» heading in `GamePanel`; no «Слот N» visible labels
- Reserve column always visible on the **right**; empty → «Резерв» + «пусто»
- Scroll target id: `hub-battle-mode-trials` (not `hub-battle-section-trials`)
- Do not change expedition logic, DnD rules, or save schema
- Messages via `App.useApp().message` where applicable
- No new npm dependencies

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/features/campaign/battleModeCategories.ts` | Category label constants |
| `src/features/campaign/buildBattleModeEntries.ts` | Pure entry list builder |
| `src/features/campaign/buildBattleModeEntries.test.ts` | Builder unit tests |
| `src/features/campaign/BattleModeList.tsx` | Horizontal strip renderer |
| `src/features/campaign/BattleModeList.test.ts` | List render tests |
| `src/features/campaign/BattleModeTile.tsx` | + `categoryLabel`, aria-label |
| `src/features/campaign/BattleModePlaceholderTile.tsx` | + `categoryLabel` |
| `src/features/campaign/battle-mode-picker.css` | `.game-mode-strip`, tile width in strip |
| `src/features/campaign/CampaignBattleTab.tsx` | Wire list, GamePanel extra, scroll id |
| `src/features/character/SquadAssemblyPanel.tsx` | Flex layout, reserve column |
| `src/features/character/SquadAssemblyPanel.test.tsx` | Squad UI tests |
| `src/features/inventory/inventory.css` | `.squad-assembly*` |

---

### Task 1: Category constants + `buildBattleModeEntries`

**Files:**
- Create: `src/features/campaign/battleModeCategories.ts`
- Create: `src/features/campaign/buildBattleModeEntries.ts`
- Create: `src/features/campaign/buildBattleModeEntries.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BATTLE_MODE_CATEGORY = {
    trial: 'Испытание',
    training: 'Обучение',
    roguelike: 'Roguelike',
    pvp: 'PvP',
    dev: 'Разработка',
  } as const

  export type BattleModeListEntry =
    | { kind: 'chain'; chain: ExpeditionChainConfig; categoryLabel: string; badge?: string; scrollTargetId?: string }
    | { kind: 'placeholder'; mode: PlaceholderModeDef; categoryLabel: string }

  export function buildBattleModeEntries(input: {
    campaign: CampaignState
    done: boolean
    showFeaturedModes: boolean
    showDevTestMode: boolean
  }): readonly BattleModeListEntry[]
  ```

- [ ] **Step 1: Write failing tests**

`buildBattleModeEntries.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { completeStep, DEFAULT_ONBOARDING } from '../../game/onboarding/onboardingState'
import { buildBattleModeEntries } from './buildBattleModeEntries'

describe('buildBattleModeEntries', () => {
  it('before first win only includes training chain', () => {
    const entries = buildBattleModeEntries({
      campaign: initialCampaignState(),
      done: false,
      showFeaturedModes: false,
      showDevTestMode: false,
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]?.kind).toBe('chain')
    if (entries[0]?.kind === 'chain') {
      expect(entries[0].chain.id).toBe('campaign-main')
      expect(entries[0].categoryLabel).toBe('Обучение')
    }
  })

  it('after first win puts trials first with scroll target on first trial', () => {
    let onboarding = completeStep(DEFAULT_ONBOARDING, 'first_battle_won')
    const entries = buildBattleModeEntries({
      campaign: { ...initialCampaignState(), onboarding },
      done: false,
      showFeaturedModes: true,
      showDevTestMode: false,
    })
    expect(entries[0]?.kind).toBe('chain')
    if (entries[0]?.kind === 'chain') {
      expect(entries[0].scrollTargetId).toBe('hub-battle-mode-trials')
      expect(entries[0].categoryLabel).toBe('Испытание')
    }
    expect(entries.some((e) => e.kind === 'chain' && e.chain.id === 'campaign-main')).toBe(true)
    expect(entries.some((e) => e.kind === 'placeholder')).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/features/campaign/buildBattleModeEntries.test.ts`

- [ ] **Step 3: Implement**

Move `trainingBadge()` from `CampaignBattleTab.tsx` into `buildBattleModeEntries.ts` (or export from small helper file).

Order per spec §3.4:
1. trials (if `showFeaturedModes`) — first gets `scrollTargetId: 'hub-battle-mode-trials'`
2. training chain + badge
3. roguelike placeholders
4. pvp placeholders
5. dev chains if `showDevTestMode`

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/battleModeCategories.ts src/features/campaign/buildBattleModeEntries.ts src/features/campaign/buildBattleModeEntries.test.ts
git commit -m "feat: add battle mode entry builder for horizontal strip"
```

---

### Task 2: Tile category tags

**Files:**
- Modify: `src/features/campaign/BattleModeTile.tsx`
- Modify: `src/features/campaign/BattleModePlaceholderTile.tsx`
- Modify: `src/features/campaign/BattleModeTile.test.ts`

**Interfaces:**
- Consumes: `categoryLabel: string` prop
- Produces: tiles render category as first line; `aria-label` prefix `{categoryLabel}. …`

- [ ] **Step 1: Extend BattleModeTile test**

```ts
it('renders categoryLabel and includes it in aria-label', () => {
  const chain = getExpeditionChainById('chaotic-map')!
  const html = renderToStaticMarkup(
    createElement(BattleModeTile, {
      chain,
      categoryLabel: 'Испытание',
      onClick: () => {},
    }),
  )
  expect(html).toContain('Испытание')
  expect(html).toContain('aria-label="Испытание.')
})
```

- [ ] **Step 2: Implement both tiles**

Add optional `categoryLabel?: string` (required from `BattleModeList`).

`BattleModeTile`:

```tsx
{categoryLabel ? (
  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
    {categoryLabel}
  </Typography.Text>
) : null}
```

Update `ariaLabel`:

```ts
const ariaLabel = categoryLabel
  ? `${categoryLabel}. ${chain.label}. ${chain.description}. ${chain.paramEmojiLine}`
  : `${chain.label}. ${chain.description}. ${chain.paramEmojiLine}`
```

Same pattern for `BattleModePlaceholderTile`.

- [ ] **Step 3: Run tests — expect PASS**

Run: `npm run test -- src/features/campaign/BattleModeTile.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/BattleModeTile.tsx src/features/campaign/BattleModePlaceholderTile.tsx src/features/campaign/BattleModeTile.test.ts
git commit -m "feat: show battle mode category tag on mode tiles"
```

---

### Task 3: `BattleModeList` + strip CSS

**Files:**
- Create: `src/features/campaign/BattleModeList.tsx`
- Create: `src/features/campaign/BattleModeList.test.ts`
- Modify: `src/features/campaign/battle-mode-picker.css`

**Interfaces:**
- Consumes: `BattleModeListEntry[]`, `onSelectChain(chainId)`
- Produces: `BattleModeList` component

- [ ] **Step 1: Test list renders strip without section titles**

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getExpeditionChainById } from '../../game/expedition/config'
import { BattleModeList } from './BattleModeList'
import { BATTLE_MODE_CATEGORY } from './battleModeCategories'

describe('BattleModeList', () => {
  it('renders horizontal strip with category on tile, no section h4', () => {
    const chain = getExpeditionChainById('chaotic-map')!
    const html = renderToStaticMarkup(
      createElement(BattleModeList, {
        entries: [{ kind: 'chain', chain, categoryLabel: BATTLE_MODE_CATEGORY.trial }],
        onSelectChain: () => {},
      }),
    )
    expect(html).toContain('game-mode-strip')
    expect(html).toContain('game-scroll-x')
    expect(html).toContain('Испытание')
    expect(html).toContain('Хаос')
    expect(html).not.toContain('game-mode-section__title')
  })
})
```

- [ ] **Step 2: Implement `BattleModeList.tsx`**

```tsx
import { GameScrollX } from '../layout/GameScrollX'
import { BattleModeTile } from './BattleModeTile'
import { BattleModePlaceholderTile } from './BattleModePlaceholderTile'
import type { BattleModeListEntry } from './buildBattleModeEntries'
import './battle-mode-picker.css'

export type BattleModeListProps = {
  entries: readonly BattleModeListEntry[]
  disabled?: boolean
  onSelectChain: (chainId: string) => void
}

export function BattleModeList({ entries, disabled = false, onSelectChain }: BattleModeListProps) {
  if (entries.length === 0) return null
  return (
    <GameScrollX>
      <div className="game-mode-strip" role="list">
        {entries.map((entry) => {
          if (entry.kind === 'chain') {
            return (
              <div key={entry.chain.id} id={entry.scrollTargetId} role="listitem">
                <BattleModeTile
                  chain={entry.chain}
                  categoryLabel={entry.categoryLabel}
                  badge={entry.badge}
                  disabled={disabled}
                  onClick={() => onSelectChain(entry.chain.id)}
                />
              </div>
            )
          }
          return (
            <div key={entry.mode.id} role="listitem">
              <BattleModePlaceholderTile mode={entry.mode} categoryLabel={entry.categoryLabel} />
            </div>
          )
        })}
      </div>
    </GameScrollX>
  )
}
```

- [ ] **Step 3: CSS**

Add to `battle-mode-picker.css`:

```css
.game-mode-strip {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-bottom: 4px;
}

.game-mode-strip .game-mode-tile {
  flex: 0 0 140px;
  width: 140px;
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/BattleModeList.tsx src/features/campaign/BattleModeList.test.ts src/features/campaign/battle-mode-picker.css
git commit -m "feat: add horizontal BattleModeList with GameScrollX"
```

---

### Task 4: Wire `CampaignBattleTab` modes

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`

- [ ] **Step 1: Replace grids with single list**

Remove imports: `BattleModeGrid`, `BattleModePlaceholderGrid`, `getTrialChains`, `getTrainingChain`, `getDevChains`, `getPlaceholderModesBySection` (if only used for grids).

Add:

```tsx
import { BattleModeList } from './BattleModeList'
import { buildBattleModeEntries } from './buildBattleModeEntries'

const modeEntries = useMemo(
  () =>
    buildBattleModeEntries({
      campaign,
      done,
      showFeaturedModes,
      showDevTestMode,
    }),
  [campaign, done, showFeaturedModes, showDevTestMode],
)
```

Replace all `BattleModeGrid` / `BattleModePlaceholderGrid` blocks with:

```tsx
<BattleModeList
  entries={modeEntries}
  disabled={modeDisabled}
  onSelectChain={handleModeSelect}
/>
```

Remove `trainingBadge` function from tab (now in builder).

- [ ] **Step 2: Update scroll effect**

```tsx
document.getElementById('hub-battle-mode-trials')?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
```

- [ ] **Step 3: Run full test suite**

Run: `npm run test`

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/CampaignBattleTab.tsx
git commit -m "refactor: use horizontal BattleModeList on battle tab"
```

---

### Task 5: Squad panel — reserve right + no slot labels

**Files:**
- Modify: `src/features/character/SquadAssemblyPanel.tsx`
- Modify: `src/features/inventory/inventory.css`
- Create: `src/features/character/SquadAssemblyPanel.test.tsx`

- [ ] **Step 1: Write failing squad tests**

Use `renderToStaticMarkup` + minimal campaign fixture from `initialCampaignState()`:

```ts
it('does not render Слот 1 label', () => {
  const html = renderToStaticMarkup(
    createElement(SquadAssemblyPanel, { campaign: initialCampaignState(), onSetSquadSlot: () => {}, onSwapSquadSlots: () => {} }),
  )
  expect(html).not.toContain('Слот 1')
  expect(html).not.toContain('>Отряд<')
})

it('shows reserve column with пусто when no reserve characters', () => {
  const html = renderToStaticMarkup(/* same */)
  expect(html).toContain('Резерв')
  expect(html).toContain('пусто')
})
```

- [ ] **Step 2: Refactor layout**

Remove internal «Отряд» header block (lines 167–169).

Remove `<Typography.Text className="inv-slot-label">` from `SquadAssemblySlot`.

Wrap body:

```tsx
<div className="squad-assembly">
  <div className="squad-assembly__active">
    <div className="inv-slot-row">{/* slots */}</div>
  </div>
  <div className="squad-assembly__reserve">
    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
      Резерв
    </Typography.Text>
    {reserve.length > 0 ? (
      <div className="squad-assembly__reserve-cells">
        {reserve.map(/* ReserveCell */)}
      </div>
    ) : (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>пусто</Typography.Text>
    )}
  </div>
</div>
```

Add CSS to `inventory.css` per spec §4.1.

- [ ] **Step 3: Run tests — expect PASS**

Run: `npm run test -- src/features/character/SquadAssemblyPanel.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/features/character/SquadAssemblyPanel.tsx src/features/inventory/inventory.css src/features/character/SquadAssemblyPanel.test.tsx
git commit -m "feat: squad panel reserve column on the right, drop slot labels"
```

---

### Task 6: GamePanel header + cleanup

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/features/campaign/CampaignBattleTab` imports for `SectionHelp`, `SQUAD_SECTION_HELP`

- [ ] **Step 1: Move help to GamePanel**

```tsx
import { SectionHelp } from '../layout/SectionHelp'
import { SQUAD_SECTION_HELP } from './sectionTooltips'

<GamePanel
  title="Отряд"
  extra={<SectionHelp content={SQUAD_SECTION_HELP} />}
>
  <SquadAssemblyDnd ... />
</GamePanel>
```

- [ ] **Step 2: Manual smoke**

Run: `npm run dev` — verify:
- One «Отряд» title
- Reserve on right with «пусто»
- Modes in one horizontal row, category on tiles, no section headers

- [ ] **Step 3: Commit**

```bash
git add src/features/campaign/CampaignBattleTab.tsx
git commit -m "fix: single squad panel header with SectionHelp in GamePanel"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full test + build**

Run: `npm run test && npm run build`

- [ ] **Step 2: Optional — keep or deprecate `BattleModeGrid`**

If `BattleModeGrid` / `BattleModePlaceholderGrid` unused after refactor, leave files (no dead import errors) or add comment; **do not delete** unless grep shows zero imports outside tests.

- [ ] **Step 3: Commit fixes if any**

---

## Spec Coverage Self-Review

| Spec section | Task |
|--------------|------|
| §3 Horizontal mode strip | Tasks 1–4 |
| §3 category on tile | Task 2 |
| §3 scroll id | Tasks 1, 4 |
| §4 Squad layout | Tasks 5–6 |
| §4 empty reserve A | Task 5 |
| §6 Tests | All tasks |
| §7 a11y aria-label | Task 2 |

No TBD placeholders.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-battle-tab-compact-layout.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with checkpoints

Which approach?
