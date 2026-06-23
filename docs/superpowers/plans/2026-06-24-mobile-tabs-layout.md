# Mobile tabs & header layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile tab and header layout from 390px so nav, resources, and inner `Tabs` never overlap.

**Architecture:** Shared breakpoint constant (`520px`) drives `useNarrowViewport` hook and compact tab labels; `game-layout.css` switches `GameHeader` between one-row grid (desktop) and two-row grid areas (mobile); Ant Design `Tabs` get `game-tabs--scroll` class for touch horizontal scroll.

**Tech Stack:** React 19, Ant Design v6, Vitest, CSS in `game-layout.css`

## Global Constraints

- Target viewport minimum: **390px+**
- Mobile breakpoint: **`max-width: 520px`**
- Header mobile layout: **two rows** — brand + resources + «Бой» on top; icon-nav centered below
- Inner tabs: **compact labels** on narrow + **horizontal touch-scroll** (hidden scrollbar)
- No new `GameTabs` wrapper; no changes to `CodexCategoryNav`
- `aria-label` on hub tabs = **full** Russian text (not compact)
- Icon-only `CampaignHubNav` unchanged (tooltips, Badge)
- Spec: `docs/superpowers/specs/2026-06-24-mobile-tabs-layout-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/features/layout/narrowViewport.ts` | Breakpoint constant + `matchNarrowViewport()` for tests |
| `src/features/layout/tabLabels.ts` | `stashTabLabel`, `shopTabLabel`, `stashTabAriaLabel`, `shopTabAriaLabel` |
| `src/features/layout/useNarrowViewport.ts` | React hook subscribing to `matchMedia` |
| `src/features/layout/game-layout.css` | Header grid + `.game-tabs--scroll` |
| `src/features/campaign/GameHeader.tsx` | Three-zone header markup |
| `src/features/character/hub/CharacterHubLayout.tsx` | Compact stash tab labels + scroll class |
| `src/features/shop/hub/ShopHubLayout.tsx` | Compact shop tab labels + scroll class |
| `src/features/layout/tabLabels.test.ts` | Unit tests for label helpers |

---

### Task 1: Tab label helpers

**Files:**
- Create: `src/features/layout/narrowViewport.ts`
- Create: `src/features/layout/tabLabels.ts`
- Create: `src/features/layout/tabLabels.test.ts`

**Interfaces:**
- Produces:
  - `NARROW_VIEWPORT_MEDIA_QUERY` = `'(max-width: 520px)'`
  - `matchNarrowViewport(): boolean`
  - `stashTabLabel(tab, count, narrow): string`
  - `stashTabAriaLabel(tab, count): string`
  - `shopTabLabel(tab, count, narrow): string` — `count` only used for `'chest'`
  - `shopTabAriaLabel(tab, count): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/layout/tabLabels.test.ts
import { describe, expect, it } from 'vitest'
import { stashTabLabel, shopTabLabel, stashTabAriaLabel, shopTabAriaLabel } from './tabLabels'

describe('stashTabLabel', () => {
  it('returns full labels on desktop', () => {
    expect(stashTabLabel('items', 0, false)).toBe('Предметы (0)')
    expect(stashTabLabel('cards', 2, false)).toBe('Умения (2)')
    expect(stashTabLabel('passives', 3, false)).toBe('Навыки (3)')
    expect(stashTabLabel('chest', 1, false)).toBe('Сундук (1)')
  })

  it('returns compact labels on narrow viewport', () => {
    expect(stashTabLabel('items', 0, true)).toBe('Предм. (0)')
    expect(stashTabLabel('cards', 2, true)).toBe('Ум. (2)')
    expect(stashTabLabel('passives', 3, true)).toBe('Нав. (3)')
    expect(stashTabLabel('chest', 0, true)).toBe('Сунд. (0)')
  })
})

describe('shopTabLabel', () => {
  it('returns full labels on desktop', () => {
    expect(shopTabLabel('offers', null, false)).toBe('Магазин')
    expect(shopTabLabel('sell', null, false)).toBe('Продажа')
    expect(shopTabLabel('chest', 0, false)).toBe('Сундук (0)')
  })

  it('returns compact labels on narrow viewport', () => {
    expect(shopTabLabel('offers', null, true)).toBe('Маг.')
    expect(shopTabLabel('sell', null, true)).toBe('Прод.')
    expect(shopTabLabel('chest', 2, true)).toBe('Сунд. (2)')
  })
})

describe('aria labels', () => {
  it('always uses full text', () => {
    expect(stashTabAriaLabel('items', 0)).toBe('Предметы (0)')
    expect(shopTabAriaLabel('offers', null)).toBe('Магазин')
    expect(shopTabAriaLabel('chest', 1)).toBe('Сундук (1)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/layout/tabLabels.test.ts`
Expected: FAIL — module `./tabLabels` not found

- [ ] **Step 3: Write implementation**

```ts
// src/features/layout/narrowViewport.ts
export const NARROW_VIEWPORT_MEDIA_QUERY = '(max-width: 520px)'

export function matchNarrowViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY).matches
}
```

```ts
// src/features/layout/tabLabels.ts
export type StashTabId = 'items' | 'cards' | 'passives' | 'chest'
export type ShopTabId = 'offers' | 'sell' | 'chest'

const STASH_FULL: Record<StashTabId, string> = {
  items: 'Предметы',
  cards: 'Умения',
  passives: 'Навыки',
  chest: 'Сундук',
}

const STASH_COMPACT: Record<StashTabId, string> = {
  items: 'Предм.',
  cards: 'Ум.',
  passives: 'Нав.',
  chest: 'Сунд.',
}

const SHOP_FULL: Record<ShopTabId, string> = {
  offers: 'Магазин',
  sell: 'Продажа',
  chest: 'Сундук',
}

const SHOP_COMPACT: Record<ShopTabId, string> = {
  offers: 'Маг.',
  sell: 'Прод.',
  chest: 'Сунд.',
}

function withCount(prefix: string, count: number | null): string {
  return count === null ? prefix : `${prefix} (${count})`
}

export function stashTabLabel(tab: StashTabId, count: number, narrow: boolean): string {
  const prefix = narrow ? STASH_COMPACT[tab] : STASH_FULL[tab]
  return withCount(prefix, count)
}

export function stashTabAriaLabel(tab: StashTabId, count: number): string {
  return stashTabLabel(tab, count, false)
}

export function shopTabLabel(tab: ShopTabId, count: number | null, narrow: boolean): string {
  const prefix = narrow ? SHOP_COMPACT[tab] : SHOP_FULL[tab]
  return withCount(prefix, tab === 'chest' ? count : null)
}

export function shopTabAriaLabel(tab: ShopTabId, count: number | null): string {
  return shopTabLabel(tab, count, false)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/layout/tabLabels.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/layout/narrowViewport.ts src/features/layout/tabLabels.ts src/features/layout/tabLabels.test.ts
git commit -m "feat(layout): compact tab label helpers for narrow viewport"
```

---

### Task 2: `useNarrowViewport` hook

**Files:**
- Create: `src/features/layout/useNarrowViewport.ts`

**Interfaces:**
- Consumes: `NARROW_VIEWPORT_MEDIA_QUERY` from `narrowViewport.ts`
- Produces: `useNarrowViewport(): boolean`

- [ ] **Step 1: Create hook**

```ts
// src/features/layout/useNarrowViewport.ts
import { useEffect, useState } from 'react'
import { matchNarrowViewport, NARROW_VIEWPORT_MEDIA_QUERY } from './narrowViewport'

export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(matchNarrowViewport)

  useEffect(() => {
    const media = window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY)
    const onChange = () => setNarrow(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return narrow
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/features/layout/useNarrowViewport.ts
git commit -m "feat(layout): useNarrowViewport hook at 520px breakpoint"
```

---

### Task 3: Layout CSS (header + tab scroll)

**Files:**
- Modify: `src/features/layout/game-layout.css`

**Interfaces:**
- Produces CSS classes: `.game-header__inner`, `.game-header__brand`, `.game-header__nav`, `.game-header__actions`, `.game-tabs--scroll`

- [ ] **Step 1: Replace `.game-header` block and append tab scroll**

In `src/features/layout/game-layout.css`, replace lines 86–88:

```css
.game-header {
  width: 100%;
}
```

with:

```css
.game-header {
  width: 100%;
}

.game-header__inner {
  width: 100%;
  align-items: center;
}

@media (min-width: 521px) {
  .game-header__inner {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
  }

  .game-header__brand {
    justify-self: start;
  }

  .game-header__nav {
    justify-self: center;
  }

  .game-header__actions {
    justify-self: end;
    min-width: 0;
  }
}

@media (max-width: 520px) {
  .game-header__inner {
    display: grid;
    grid-template-areas:
      'brand actions'
      'nav nav';
    grid-template-columns: 1fr auto;
    gap: 4px;
  }

  .game-header__brand {
    grid-area: brand;
    min-width: 0;
  }

  .game-header__nav {
    grid-area: nav;
    display: flex;
    justify-content: center;
  }

  .game-header__actions {
    grid-area: actions;
    justify-self: end;
    min-width: 0;
  }
}

.game-tabs--scroll .ant-tabs-nav-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.game-tabs--scroll .ant-tabs-nav-wrap::-webkit-scrollbar {
  display: none;
}
```

Keep existing `.game-header__brand` and `.game-header__resource-emoji` rules below unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/features/layout/game-layout.css
git commit -m "feat(layout): mobile header grid and tab bar touch scroll"
```

---

### Task 4: `GameHeader` markup

**Files:**
- Modify: `src/features/campaign/GameHeader.tsx`

**Interfaces:**
- Consumes: CSS classes from Task 3
- Produces: static markup with `.game-header__inner` > `__brand` | `__nav` | `__actions`

- [ ] **Step 1: Refactor JSX**

Replace the `return` in `GameHeader` (lines 65–110) with:

```tsx
  return (
    <header className="game-header">
      <div className="game-header__inner">
        <div className="game-header__brand">
          <Typography.Text strong className="game-header__brand">
            {UI_DNA} Gen
          </Typography.Text>
        </div>

        <div className="game-header__nav">
          <CampaignHubNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            unreadCodexCount={unreadCodexCount}
            codexDisabled={codexDisabled}
            shopDisabled={shopDisabled}
            tavernDisabled={tavernDisabled}
            tabsDisabled={tabsDisabled}
          />
        </div>

        <div className="game-header__actions">
          <Space size="middle" align="center" wrap={false}>
            <HeaderResource
              emoji={UI_GOLD}
              value={campaign.gold}
              tooltip={GOLD_TOOLTIP}
            />
            <HeaderResource
              emoji={UI_WORLD_POWER}
              value={campaign.worldPower}
              tooltip={WORLD_POWER_TOOLTIP}
            />
            <Tooltip title={battleTooltip} mouseEnterDelay={0.3}>
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined aria-hidden />}
                disabled={battleScreenActive}
                onClick={onBattleClick}
              >
                Бой
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>
    </header>
  )
```

Remove unused `Flex` import from `antd` if no longer referenced.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success

- [ ] **Step 3: Commit**

```bash
git add src/features/campaign/GameHeader.tsx
git commit -m "feat(campaign): two-row mobile GameHeader layout"
```

---

### Task 5: Character hub stash tabs

**Files:**
- Modify: `src/features/character/hub/CharacterHubLayout.tsx`

**Interfaces:**
- Consumes: `useNarrowViewport`, `stashTabLabel`, `stashTabAriaLabel`
- Produces: `renderStashTabs` with `className="game-tabs--scroll"`, compact labels, `aria-label` on label spans

- [ ] **Step 1: Add imports and hook**

At top of `CharacterHubLayout.tsx`:

```ts
import { useNarrowViewport } from '../../layout/useNarrowViewport'
import { stashTabAriaLabel, stashTabLabel } from '../../layout/tabLabels'
```

Inside component body (after counts are computed):

```ts
  const narrow = useNarrowViewport()

  const stashTabLabelNode = (tab: 'items' | 'cards' | 'passives' | 'chest', count: number) => (
    <span aria-label={stashTabAriaLabel(tab, count)}>
      {stashTabLabel(tab, count, narrow)}
    </span>
  )
```

- [ ] **Step 2: Update `renderStashTabs`**

```tsx
  const renderStashTabs = (itemsPanel: ReactNode) => (
    <Tabs
      className="game-tabs--scroll"
      size="small"
      tabBarGutter={8}
      activeKey={stashTab}
      onChange={(key) => setStashTab(key as StashTabKey)}
      items={[
        { key: 'items', label: stashTabLabelNode('items', itemCount), children: itemsPanel },
        {
          key: 'cards',
          label: stashTabLabelNode('cards', cardCount),
          children: (
            // ... existing CardsInventoryView unchanged
          ),
        },
        {
          key: 'passives',
          label: stashTabLabelNode('passives', passiveCount),
          children: (
            // ... existing CardsInventoryView unchanged
          ),
        },
        {
          key: 'chest',
          label: stashTabLabelNode('chest', chestCount),
          children: (
            // ... existing ChestInventoryView unchanged
          ),
        },
      ]}
    />
  )
```

- [ ] **Step 3: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/features/character/hub/CharacterHubLayout.tsx
git commit -m "feat(character): compact mobile stash tab labels"
```

---

### Task 6: Shop hub tabs

**Files:**
- Modify: `src/features/shop/hub/ShopHubLayout.tsx`

**Interfaces:**
- Consumes: `useNarrowViewport`, `shopTabLabel`, `shopTabAriaLabel`

- [ ] **Step 1: Add imports and hook**

```ts
import { useNarrowViewport } from '../../layout/useNarrowViewport'
import { shopTabAriaLabel, shopTabLabel } from '../../layout/tabLabels'
```

Inside component:

```ts
  const narrow = useNarrowViewport()

  const shopTabLabelNode = (tab: 'offers' | 'sell' | 'chest', count: number | null) => (
    <span aria-label={shopTabAriaLabel(tab, count)}>
      {shopTabLabel(tab, count, narrow)}
    </span>
  )
```

- [ ] **Step 2: Update `<Tabs>`**

```tsx
      <Tabs
        className="game-tabs--scroll"
        size="small"
        tabBarGutter={8}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ShopTabKey)}
        items={[
          { key: 'offers', label: shopTabLabelNode('offers', null), children: offersPanel },
          {
            key: 'sell',
            label: shopTabLabelNode('sell', null),
            children: (
              // ... existing ShopSellPanel unchanged
            ),
          },
          {
            key: 'chest',
            label: shopTabLabelNode('chest', chestCount),
            children: (
              // ... existing ChestInventoryView unchanged
            ),
          },
        ]}
      />
```

- [ ] **Step 3: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/features/shop/hub/ShopHubLayout.tsx
git commit -m "feat(shop): compact mobile shop tab labels"
```

---

### Task 7: Manual smoke verification

**Files:** none (browser only)

- [ ] **Step 1: Start dev server**

Run: `npm run start` (if not already running)

- [ ] **Step 2: Check viewports in DevTools**

| Viewport | Screen | Check |
|----------|--------|-------|
| 390×844 | Персонаж | Header 2 rows; nav centered; no overlap; stash tabs show `Предм.` etc.; swipe tab bar if needed |
| 390×844 | Магазин | Shop tabs `Маг.` / `Прод.` / `Сунд.` |
| 390×844 | Кодекс | Category buttons wrap — no regression |
| 1280×800 | Персонаж | Header 1 row; full tab labels |

- [ ] **Step 3: Final commit if any fixups needed**

Only if smoke reveals issues; otherwise skip.

---

## Self-review

| Spec requirement | Task |
|------------------|------|
| Breakpoint 520px | Task 1 `narrowViewport.ts`, Task 3 CSS |
| Two-row header mobile | Task 3 + Task 4 |
| Desktop one-row header | Task 3 + Task 4 |
| Compact tab labels | Task 1, 5, 6 |
| Touch scroll on tabs | Task 3, 5, 6 |
| aria-label full text | Task 5, 6 (`stashTabLabelNode` / `shopTabLabelNode`) |
| Codex unchanged | — (no task) |
| No GameTabs wrapper | — (followed) |
| 390px target | Task 7 smoke |

No placeholders found. Types consistent across tasks.
