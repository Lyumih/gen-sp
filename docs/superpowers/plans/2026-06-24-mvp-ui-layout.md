# MVP UI Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Компактный browser-RPG UI на 1280px: icon-nav + CTA «Бой», двухколоночные вкладки, поле боя со скроллом.

**Architecture:** Общие layout-примитивы в `src/features/layout/`; `GameHeader` заменяет `CampaignHubHud` + `CampaignHubNav`; вкладки оборачивают существующие inventory/battle-компоненты в `GamePanel` / `GameColumns` без изменения reducer.

**Tech Stack:** React 19, Ant Design 6, TypeScript strict, Vitest, Vite 8, CSS modules via plain `.css`.

**Spec:** `docs/superpowers/specs/2026-06-24-mvp-ui-layout-design.md`

## Global Constraints

- `maxWidth: 1280`, outer `padding: 8`, `margin: 0 auto` — без `margin: 24px`.
- Breakpoint **900px**: `GameColumns` → одна колонка.
- Светлая Ant Design; без внешних `Card` на hub/battle.
- Icon-nav без текста; `Tooltip` `mouseEnterDelay={0.3}`; `aria-label` на каждой кнопке.
- `battle` **не** в `TAB_ORDER` nav; вход через CTA «Бой» в `GameHeader`.
- Emoji шапки **16px**; `UI_GOLD`, `UI_WORLD_POWER`, `UI_DNA` из `labels.ts`.
- World Power в UI: только `⚡` + число (без `worldPower:`).
- Отряд **не** показывать в шапке.
- `AGENTS.md`: StatStrip, `App.useApp().message`, freeze expedition через `Alert` + disabled.

---

## File map

| File | Action |
|------|--------|
| `src/game/ui/labels.ts` | Modify — add `UI_GOLD`, `UI_WORLD_POWER`, `UI_DNA` |
| `src/features/layout/game-layout.css` | Create |
| `src/features/layout/GameShell.tsx` | Create |
| `src/features/layout/GamePanel.tsx` | Create |
| `src/features/layout/GameColumns.tsx` | Create |
| `src/features/layout/GameScrollX.tsx` | Create |
| `src/features/layout/index.ts` | Create — re-exports |
| `src/features/campaign/resourceTooltips.ts` | Create — gold / WP tooltip strings |
| `src/features/campaign/GameHeader.tsx` | Create — merges Hud + Nav + Battle CTA |
| `src/features/campaign/CampaignHubNav.tsx` | Modify — icon-only, no battle tab |
| `src/features/campaign/CampaignHubNav.test.ts` | Modify |
| `src/features/campaign/CampaignHubHud.tsx` | Delete — logic moved to GameHeader |
| `src/features/campaign/CampaignHub.tsx` | Modify — GameShell, GameHeader |
| `src/features/campaign/CampaignBattleNav.tsx` | Modify — GameHeader |
| `src/features/campaign/CampaignCharacterTab.tsx` | Modify — columns layout |
| `src/features/campaign/CampaignShopTab.tsx` | Modify |
| `src/features/campaign/CampaignBattleTab.tsx` | Modify |
| `src/features/campaign/CampaignTavernTab.tsx` | Modify |
| `src/features/inventory/EquipmentInventoryView.tsx` | Modify — `sideContent`, remove roster from before |
| `src/features/inventory/CardsInventoryView.tsx` | Modify — remove `maxWidth: 320` |
| `src/features/inventory/ShopOffersGrid.tsx` | Modify — remove `maxWidth: 280` |
| `src/features/inventory/ShopInventoryView.tsx` | Modify — remove narrow maxWidth |
| `src/features/inventory/EquipmentInventoryView.tsx` | Modify — remove narrow maxWidth |
| `src/features/battle/BattleScreen.tsx` | Modify — 2-col + scroll, drop Card |
| `src/App.tsx` | Modify — 1280px container |

---

### Task 1: UI label constants

**Files:**
- Modify: `src/game/ui/labels.ts`
- Test: `src/game/ui/labels.test.ts` (create)

**Interfaces:**
- Produces: `UI_GOLD`, `UI_WORLD_POWER`, `UI_DNA` exported strings.

- [ ] **Step 1: Write the failing test**

```ts
// src/game/ui/labels.test.ts
import { describe, expect, it } from 'vitest'
import { UI_DNA, UI_GOLD, UI_WORLD_POWER } from './labels'

describe('UI resource labels', () => {
  it('exports gold, world power, and brand dna emoji', () => {
    expect(UI_GOLD).toBe('🪙')
    expect(UI_WORLD_POWER).toBe('⚡')
    expect(UI_DNA).toBe('🧬')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/ui/labels.test.ts`
Expected: FAIL — exports not defined

- [ ] **Step 3: Add constants**

```ts
// append to src/game/ui/labels.ts
export const UI_GOLD = '🪙'
export const UI_WORLD_POWER = '⚡'
export const UI_DNA = '🧬'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/ui/labels.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/ui/labels.ts src/game/ui/labels.test.ts
git commit -m "feat(ui): add resource and brand emoji constants"
```

---

### Task 2: Layout primitives

**Files:**
- Create: `src/features/layout/game-layout.css`
- Create: `src/features/layout/GameShell.tsx`
- Create: `src/features/layout/GamePanel.tsx`
- Create: `src/features/layout/GameColumns.tsx`
- Create: `src/features/layout/GameScrollX.tsx`
- Create: `src/features/layout/index.ts`

**Interfaces:**
- Produces:
  - `GameShell({ children })` — `className="game-shell"`
  - `GamePanel({ title?, extra?, children })` — `className="game-panel"`
  - `GameColumns({ children })` — `className="game-columns"`
  - `GameScrollX({ children })` — `className="game-scroll-x"`

- [ ] **Step 1: Create CSS**

```css
/* src/features/layout/game-layout.css */
.game-shell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.game-panel {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fff;
}

.game-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.game-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.game-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

@media (max-width: 900px) {
  .game-columns {
    grid-template-columns: 1fr;
  }
}

.game-scroll-x {
  overflow-x: auto;
  max-width: 100%;
}
```

- [ ] **Step 2: Create components**

```tsx
// src/features/layout/GameShell.tsx
import type { ReactNode } from 'react'
import './game-layout.css'

export function GameShell({ children }: { children: ReactNode }) {
  return <div className="game-shell">{children}</div>
}
```

```tsx
// src/features/layout/GamePanel.tsx
import type { ReactNode } from 'react'
import './game-layout.css'

type GamePanelProps = {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
}

export function GamePanel({ title, extra, children }: GamePanelProps) {
  const hasHead = title !== undefined || extra !== undefined
  return (
    <section className="game-panel">
      {hasHead ? (
        <div className="game-panel__head">
          {title !== undefined ? <h3 className="game-panel__title">{title}</h3> : <span />}
          {extra ?? null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
```

```tsx
// src/features/layout/GameColumns.tsx
import type { ReactNode } from 'react'
import './game-layout.css'

export function GameColumns({ children }: { children: ReactNode }) {
  return <div className="game-columns">{children}</div>
}
```

```tsx
// src/features/layout/GameScrollX.tsx
import type { ReactNode } from 'react'
import './game-layout.css'

export function GameScrollX({ children }: { children: ReactNode }) {
  return <div className="game-scroll-x">{children}</div>
}
```

```ts
// src/features/layout/index.ts
export { GameShell } from './GameShell'
export { GamePanel } from './GamePanel'
export { GameColumns } from './GameColumns'
export { GameScrollX } from './GameScrollX'
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/layout/
git commit -m "feat(ui): add GameShell, GamePanel, GameColumns, GameScrollX"
```

---

### Task 3: Resource tooltips

**Files:**
- Create: `src/features/campaign/resourceTooltips.ts`
- Test: `src/features/campaign/resourceTooltips.test.ts`

**Interfaces:**
- Produces: `GOLD_TOOLTIP`, `WORLD_POWER_TOOLTIP` — readonly Russian strings from spec §4.3.

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { GOLD_TOOLTIP, WORLD_POWER_TOOLTIP } from './resourceTooltips'

describe('resourceTooltips', () => {
  it('describes gold and world power for header tooltips', () => {
    expect(GOLD_TOOLTIP).toContain('Золото')
    expect(GOLD_TOOLTIP).toContain('магазине')
    expect(WORLD_POWER_TOOLTIP).toContain('Сила мира')
    expect(WORLD_POWER_TOOLTIP).toContain('+1%')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/features/campaign/resourceTooltips.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/features/campaign/resourceTooltips.ts
export const GOLD_TOOLTIP =
  'Золото — валюта кампании. Тратится в магазине и таверне; получаете за продажу предметов и умений.'

export const WORLD_POWER_TOOLTIP =
  'Сила мира — глобальный множитель характеристик (+1% за единицу к базовым статам). Растёт за убийства врагов в боях кампании.'
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/resourceTooltips.ts src/features/campaign/resourceTooltips.test.ts
git commit -m "feat(ui): add gold and world power tooltip copy"
```

---

### Task 4: Icon-only CampaignHubNav

**Files:**
- Modify: `src/features/campaign/CampaignHubNav.tsx`
- Modify: `src/features/campaign/CampaignHubNav.test.ts`

**Interfaces:**
- Consumes: `CampaignHubTab` from `campaignHubShared.ts`
- Produces: nav with `TAB_ORDER = ['character','shop','tavern','codex','help']`; buttons icon-only wrapped in `Tooltip`; `battleTabHighlighted` prop **removed** (battle moves to GameHeader).

- [ ] **Step 1: Update tests first**

Replace `CampaignHubNav.test.ts` contents:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CampaignHubNav } from './CampaignHubNav'

describe('CampaignHubNav', () => {
  it('renders icon-only tabs with aria-labels', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'shop',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )
    expect(html).toContain('aria-label="Персонаж"')
    expect(html).toContain('aria-label="Магазин"')
    expect(html).not.toContain('>Персонаж<')
    expect(html).not.toContain('>Бой<')
  })

  it('renders codex badge count', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 3,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )
    expect(html).toContain('aria-label="Кодекс"')
    expect(html).toContain('3')
  })

  it('disables shop and tavern during expedition', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: true,
        tavernDisabled: true,
      }),
    )
    const disabledCount = html.match(/disabled/g)?.length ?? 0
    expect(disabledCount).toBeGreaterThanOrEqual(2)
  })

  it('keeps help enabled when tabsDisabled', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'character',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: true,
        shopDisabled: true,
        tavernDisabled: true,
        tabsDisabled: true,
      }),
    )
    const helpPos = html.indexOf('aria-label="Справка"')
    expect(helpPos).toBeGreaterThanOrEqual(0)
    const helpSlice = html.slice(helpPos, helpPos + 300)
    expect(helpSlice).not.toContain('disabled')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test -- src/features/campaign/CampaignHubNav.test.ts`

- [ ] **Step 3: Refactor CampaignHubNav**

Key changes:
- `TAB_ORDER`: remove `'battle'`
- Remove `battleTabHighlighted` prop and `tabButtonType` battle branch
- Each tab: `Tooltip title={TAB_LABEL[tab]} mouseEnterDelay={0.3}` wrapping `Button type={activeTab===tab?'primary':'text'} size="small" icon={...} aria-label={TAB_LABEL[tab]}`
- Remove children text from Button (icon only)
- Remove `justifyContent: 'center'` — left-aligned in header

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/CampaignHubNav.tsx src/features/campaign/CampaignHubNav.test.ts
git commit -m "feat(ui): icon-only campaign hub nav without battle tab"
```

---

### Task 5: GameHeader

**Files:**
- Create: `src/features/campaign/GameHeader.tsx`
- Delete: `src/features/campaign/CampaignHubHud.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/campaign/CampaignBattleNav.tsx`

**Interfaces:**
- Consumes: `CampaignHubNav`, `resourceTooltips`, `UI_GOLD`, `UI_WORLD_POWER`, `UI_DNA`, `isBattleContextActive`
- Produces:

```ts
type GameHeaderProps = {
  campaign: CampaignState
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
  unreadCodexCount: number
  codexDisabled: boolean
  shopDisabled: boolean
  tavernDisabled: boolean
  tabsDisabled?: boolean
  onBattleClick: () => void
  battleScreenActive?: boolean
}
```

- [ ] **Step 1: Implement GameHeader**

Layout (flex row, `justifyContent: space-between`, `alignItems: center`, `gap: 8`, `flexWrap: wrap`):

```tsx
// Left cluster
<span><UI_DNA /> Gen</span>
<CampaignHubNav ... />

// Right cluster
<Tooltip title={GOLD_TOOLTIP} mouseEnterDelay={0.3}>
  <span><span style={{ fontSize: 16 }}>{UI_GOLD}</span> <strong>{campaign.gold}</strong></span>
</Tooltip>
<Tooltip title={WORLD_POWER_TOOLTIP} mouseEnterDelay={0.3}>
  <span><span style={{ fontSize: 16 }}>{UI_WORLD_POWER}</span> <strong>{campaign.worldPower}</strong></span>
</Tooltip>
<Tooltip title={battleTooltip} mouseEnterDelay={0.3}>
  <Button
    type={battleActive ? 'primary' : 'default'}
    size="small"
    icon={<PlayCircleOutlined />}
    disabled={battleScreenActive}
    onClick={onBattleClick}
  >
    Бой
  </Button>
</Tooltip>
```

`battleActive = activeTab === 'battle' || isBattleContextActive(campaign)`
`battleTooltip` = battleScreenActive ? 'Вы в бою' : battleActive ? 'Экспедиция или бой в процессе' : 'Раздел боя и экспедиций'

- [ ] **Step 2: Wire CampaignHub**

```tsx
// CampaignHub.tsx — replace Card + Hud + Divider + Nav with:
<GameShell>
  <GameHeader
    campaign={campaign}
    activeTab={activeTab}
    onTabChange={handleTabChange}
    unreadCodexCount={unreadCodexCount}
    codexDisabled={inBattle}
    shopDisabled={expeditionActive}
    tavernDisabled={expeditionActive}
    onBattleClick={() => handleTabChange('battle')}
  />
  {/* tab panels unchanged */}
</GameShell>
```

Remove imports: `Card`, `Divider`, `CampaignHubHud`, `FlagOutlined`.

- [ ] **Step 3: Wire CampaignBattleNav**

Replace Hud + Divider + Nav with `GameHeader` (`activeTab="battle"`, `tabsDisabled`, `battleScreenActive`, `onBattleClick` noop or `() => {}`).

- [ ] **Step 4: Delete CampaignHubHud.tsx**; grep repo for imports — none left.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/campaign/GameHeader.tsx src/features/campaign/CampaignHub.tsx src/features/campaign/CampaignBattleNav.tsx
git rm src/features/campaign/CampaignHubHud.tsx
git commit -m "feat(ui): GameHeader with resources, icon nav, and battle CTA"
```

---

### Task 6: App container 1280px

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update container**

```tsx
<div style={{ maxWidth: 1280, margin: '0 auto', padding: 8 }}>
```

- [ ] **Step 2: Tighten battle wrapper Space**

In `AppContent`, change `size="middle"` → `size="small"` on vertical `Space` around battle views.

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): widen game container to 1280px with compact padding"
```

---

### Task 7: Character tab — two columns

**Files:**
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/inventory/EquipmentInventoryView.tsx`

**Interfaces:**
- Consumes: `GamePanel`, `GameColumns` from `src/features/layout`
- Adds to `EquipmentInventoryViewProps`:

```ts
sideContent?: ReactNode
```

Render order inside `DndContext`: `dndBeforeContent` → `GameColumns(content, sideContent)` → `dndAfterContent`.

- [ ] **Step 1: Add sideContent to EquipmentInventoryView**

Between `{content}` and `{dndAfterContent}`:

```tsx
{sideContent !== undefined ? (
  <GameColumns>
    <div>{inBattle ? <Tooltip ...>{content}</Tooltip> : content}</div>
    <div>{sideContent}</div>
  </GameColumns>
) : (
  inBattle ? <Tooltip ...>{content}</Tooltip> : content
)}
```

Import `GameColumns` from layout.

- [ ] **Step 2: Refactor CampaignCharacterTab**

```tsx
<Space orientation="vertical" size="small" style={{ width: '100%' }}>
  <GamePanel title="Отряд">
    <SquadSlotRow ... />
  </GamePanel>
  <GamePanel title={`Состав (${campaign.characters.length})`}>
    <CharacterRosterView ... />
  </GamePanel>
  <HeroProfileContent mode="hub" ... />

  <EquipmentInventoryView
    ...
    dndBeforeContent={undefined}
    sideContent={
      <GamePanel title="Умения и навыки">
        <CardsInventoryView ... />
      </GamePanel>
    }
    dndAfterContent={(activeDragId) => (
      <GamePanel title="Сундук">
        <ChestInventoryView ... dndEnabled activeDragId={activeDragId} />
      </GamePanel>
    )}
  />
</Space>
```

Move `SquadSlotRow`, `CharacterRosterView`, `HeroProfileContent` **out** of `dndBeforeContent`.
Remove duplicate title «Инвентарь и экипировка» and `Divider` from old `dndBeforeContent`.
Wrap equipment body in `GamePanel title="Экипировка"` via wrapping left column:

```tsx
sideContent={...}
// and pass leftPanel wrapper — OR wrap content inside EquipmentInventoryView with optional leftTitle

// Simpler: pass prop leftPanelTitle="Экипировка" to EquipmentInventoryView
// wrapping content in <GamePanel title={leftPanelTitle}>
```

Add optional `panelTitle?: string` to EquipmentInventoryView — when set, wrap `content` in `GamePanel`.

- [ ] **Step 3: Manual smoke**

Dev server: Character tab — squad top, two columns equipment|skills, chest full width below. DnD stash↔equip↔chest still works.

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/CampaignCharacterTab.tsx src/features/inventory/EquipmentInventoryView.tsx
git commit -m "feat(ui): two-column character tab layout"
```

---

### Task 8: Remove narrow maxWidth from inventory views

**Files:**
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/features/inventory/ShopOffersGrid.tsx`
- Modify: `src/features/inventory/ShopInventoryView.tsx`
- Modify: `src/features/inventory/EquipmentInventoryView.tsx`
- Modify: `src/features/campaign/CampaignShopTab.tsx`

- [ ] **Step 1: Replace `style={{ maxWidth: 320 }}` / `280` with `style={{ width: '100%' }}` on root `Space` elements in inventory components.**

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/features/inventory/ src/features/campaign/CampaignShopTab.tsx
git commit -m "feat(ui): let inventory panels use full column width"
```

---

### Task 9: Shop, Battle hub, Tavern layouts

**Files:**
- Modify: `src/features/campaign/CampaignShopTab.tsx`
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/features/campaign/CampaignTavernTab.tsx`

- [ ] **Step 1: CampaignShopTab**

```tsx
<GameShell> // or fragment if already inside hub shell — use fragment + panels only
  <GamePanel title="Магазин" extra={<Button ...>Обновить</Button>}>
    <ShopOffersGrid ... />
  </GamePanel>
  <GameColumns>
    <GamePanel title="Персонаж">
      <CharacterRosterView ... />
      <StatStrip ... />
      <EquipmentSlotRow ... />
      <InventoryGrid ... />
    </GamePanel>
    <GamePanel title="Сундук">
      <ChestInventoryView ... />
    </GamePanel>
  </GameColumns>
</>
```

Remove standalone `Typography.Title` headers replaced by `GamePanel title`.
`Space size="small"`.

- [ ] **Step 2: CampaignBattleTab**

```tsx
<GameColumns>
  <GamePanel title="Кампания">
    {/* start/replay CTA + scenario progress */}
  </GamePanel>
  <GamePanel title="Экспедиция">
    <ExpeditionSquadStrip ... />
    <ExpeditionModeList ... />
    <Button ...>Начать экспедицию</Button>
  </GamePanel>
</GameColumns>
```

Remove `Divider` between sections.

- [ ] **Step 3: CampaignTavernTab**

Add to `game-layout.css`:

```css
.game-tavern-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
  width: 100%;
}
```

Wrap candidate cards:

```tsx
<div className="game-tavern-grid">
  {candidates.map(...)}
</div>
```

- [ ] **Step 4: Verify build + manual smoke** on all three tabs.

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/CampaignShopTab.tsx src/features/campaign/CampaignBattleTab.tsx src/features/campaign/CampaignTavernTab.tsx src/features/layout/game-layout.css
git commit -m "feat(ui): column layouts for shop, battle hub, and tavern grid"
```

---

### Task 10: BattleScreen — field scroll + action sidebar

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/layout/game-layout.css` (add `.game-battle-layout`)

- [ ] **Step 1: Add battle layout CSS**

```css
.game-battle-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  gap: 8px;
  width: 100%;
}

@media (max-width: 900px) {
  .game-battle-layout {
    grid-template-columns: 1fr;
  }
}

.game-battle-field {
  min-width: 0;
}
```

- [ ] **Step 2: Remove outer Card** from `BattleScreen`; use `GamePanel` sections.

- [ ] **Step 3: Split return JSX**

Full-width alerts stay above grid.

**Left `game-battle-field`:**
- Initiative queue
- HP line
- `GameScrollX` wrapping grid (`width: max-content` on inner grid)
- Overlay legend

**Right panel `GamePanel title="Действия"`:**
- Turn / round / `⚡ {battle.worldPower}` with `WORLD_POWER_TOOLTIP`
- Profile + abandon buttons (compact `Space wrap` at top)
- Autobattle switch
- Move/melee/ranged radios
- Card radios
- Battle log scroll box

**Remove** entire «Карты» `Collapse` block (lines ~1112–1150).

- [ ] **Step 4: Manual smoke**

Wide scenario: horizontal scroll on field. Narrow viewport: field above actions.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run test`

- [ ] **Step 6: Commit**

```bash
git add src/features/battle/BattleScreen.tsx src/features/layout/game-layout.css
git commit -m "feat(ui): battle screen two-column layout with field scroll"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: all PASS

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 3: Browser smoke checklist**

| Viewport | Check |
|----------|-------|
| 1280px | Character 2-col; shop 2-col; tavern 3 cards/row; battle field+sidebar |
| 900px | Columns stack |
| 600px | Header wraps; field scrolls horizontally |

| Flow | Check |
|------|-------|
| Header | Icon tooltips; gold/WP tooltips; «Бой» opens battle tab |
| Expedition | shop/tavern nav disabled |
| In battle | nav disabled; help drawer works |
| DnD | equip / chest / cards on character tab |

- [ ] **Step 4: Commit any fixups**

```bash
git commit -m "chore(ui): mvp layout polish fixups"  # only if needed
```

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| 3.1 App 1280px | Task 6 |
| 3.2 Remove Card | Tasks 5, 10 |
| 3.3 Layout primitives | Task 2 |
| 3.5 labels | Task 1 |
| 4 Header | Tasks 3–5 |
| 5 Character | Tasks 7–8 |
| 6 Shop | Tasks 8–9 |
| 7 Battle hub | Task 9 |
| 8 Battle screen | Task 10 |
| 9 Tavern | Task 9 |
| 10 Codex/Help | Task 5 (same header, no layout change) |
| 11 Polish | Tasks 8, 10 |
| 12 Testing | Tasks 1, 3, 4, 11 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-24-mvp-ui-layout.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach?
