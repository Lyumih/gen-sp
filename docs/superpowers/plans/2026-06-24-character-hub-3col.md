# Character Hub 3-Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вкладка «Персонаж» — 3 колонки (rail | build | stash tabs); сборка отряда — на вкладке «Бой».

**Architecture:** Новая папка `src/features/character/hub/` с `CharacterHubLayout` (единый `DndContext` + `loadoutFocus`); `SquadAssemblyPanel` на `CampaignBattleTab`; reducer без изменений; ячейки и drag-id из `inventoryDnD.ts`.

**Tech Stack:** React 19, Ant Design 6 (`Tabs`, `Dropdown`, `Modal.confirm`), @dnd-kit, TypeScript strict, Vitest, Vite 8.

**Spec:** `docs/superpowers/specs/2026-06-24-character-hub-3col-design.md`

**Baseline commit:** `dbc82ec` (compact character tab — будет заменён layout-ом).

## Global Constraints

- `campaign.squad` — только UI переносится; данные и actions `SET_SQUAD_SLOT` / `SWAP_SQUAD_SLOTS` без изменений.
- На **Персонаже** нет `SquadSlotRow`, `onAssignToSquad`, `onRemoveFromSquad`, `onSetSquadSlot`, `onSwapSquadSlots`.
- Breakpoint **900px**: `.game-character-hub` → одна колонка (rail → build → stash).
- `AGENTS.md`: emoji из `labels.ts`; tooltip `mouseEnterDelay={0.3}`; `App.useApp().message`; stat delta текстом `+N`.
- `EquipmentInventoryView` остаётся для Shop (если используется) — не ломать публичный API без нужды.
- Expedition / `inBattle`: equip disabled + существующие tooltips.

---

## File map

| File | Action |
|------|--------|
| `src/features/layout/game-layout.css` | Modify — `.game-character-hub`, `.inv-rail-stack` |
| `src/features/inventory/inventory.css` | Modify — `.inv-rail-cell` optional |
| `src/features/character/hub/types.ts` | Create |
| `src/features/character/hub/useLoadoutFocus.ts` | Create |
| `src/features/character/hub/clickEquip.ts` | Create — pure click-to-equip helpers |
| `src/features/character/hub/clickEquip.test.ts` | Create |
| `src/features/character/hub/EquipDeltaStrip.tsx` | Create |
| `src/features/character/hub/CharacterRail.tsx` | Create |
| `src/features/character/hub/CharacterRail.test.tsx` | Create |
| `src/features/character/hub/CharacterBuildPanel.tsx` | Create |
| `src/features/character/hub/CharacterStashTabs.tsx` | Create |
| `src/features/character/hub/characterHubDragEnd.ts` | Create — unified drag-end handler |
| `src/features/character/hub/characterHubDragEnd.test.ts` | Create |
| `src/features/character/hub/CharacterHubLayout.tsx` | Create |
| `src/features/character/hub/index.ts` | Create |
| `src/features/character/SquadAssemblyPanel.tsx` | Create |
| `src/features/character/SquadAssemblyPanel.test.tsx` | Create |
| `src/features/campaign/sectionTooltips.ts` | Modify — rail + squad help |
| `src/features/campaign/CampaignCharacterTab.tsx` | Modify — thin wrapper → `CharacterHubLayout` |
| `src/features/campaign/CampaignBattleTab.tsx` | Modify — `SquadAssemblyPanel`, campaign confirm |
| `src/features/campaign/CampaignHub.tsx` | Modify — squad props to Battle; tavern auto-slot |
| `src/features/campaign/ExpeditionSquadStrip.tsx` | Modify or deprecate — marks on `SquadAssemblyPanel` |

---

### Task 1: Layout CSS + hub types

**Files:**
- Modify: `src/features/layout/game-layout.css`
- Create: `src/features/character/hub/types.ts`

**Interfaces:**
- Produces: `LoadoutFocus`, `StashTabKey` types

- [ ] **Step 1: Add CSS**

```css
/* game-layout.css */
.game-character-hub {
  display: grid;
  grid-template-columns: 88px minmax(300px, 380px) minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  align-items: start;
}
@media (max-width: 900px) {
  .game-character-hub {
    grid-template-columns: 1fr;
  }
}
```

```css
/* inventory.css */
.inv-rail-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
```

- [ ] **Step 2: Create types**

```ts
// src/features/character/hub/types.ts
import type { EquipmentSlot } from '../../../game/types'

export type StashTabKey = 'items' | 'cards' | 'passives' | 'chest'

export type LoadoutFocus =
  | { kind: 'equip'; slot: EquipmentSlot }
  | { kind: 'card'; slotIndex: 0 | 1 | 2 | 3 }
  | { kind: 'passive'; slotIndex: 0 | 1 | 2 | 3 | 4 }
  | null
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/layout/game-layout.css src/features/inventory/inventory.css src/features/character/hub/types.ts
git commit -m "feat(ui): character hub grid layout and focus types"
```

---

### Task 2: useLoadoutFocus hook

**Files:**
- Create: `src/features/character/hub/useLoadoutFocus.ts`
- Create: `src/features/character/hub/useLoadoutFocus.test.ts`

**Interfaces:**
- Produces: `{ focus, setFocus, clearFocus, toggleEquipSlot(slot) }`

- [ ] **Step 1: Write failing test**

```ts
// useLoadoutFocus.test.ts
import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLoadoutFocus } from './useLoadoutFocus'

describe('useLoadoutFocus', () => {
  it('toggles equip slot focus', () => {
    const { result } = renderHook(() => useLoadoutFocus())
    act(() => result.current.toggleEquipSlot('weapon'))
    expect(result.current.focus).toEqual({ kind: 'equip', slot: 'weapon' })
    act(() => result.current.toggleEquipSlot('weapon'))
    expect(result.current.focus).toBeNull()
  })
})
```

If `@testing-library/react` is not installed, use a minimal pure reducer instead:

```ts
// useLoadoutFocus.ts — export loadoutFocusReducer for tests without RTL
export function loadoutFocusReducer(
  state: LoadoutFocus,
  action: { type: 'set'; focus: LoadoutFocus } | { type: 'toggleEquip'; slot: EquipmentSlot },
): LoadoutFocus { /* ... */ }
```

- [ ] **Step 2: Implement hook** (useState + toggle helpers)

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/features/character/hub/useLoadoutFocus.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/character/hub/useLoadoutFocus.ts src/features/character/hub/useLoadoutFocus.test.ts
git commit -m "feat(ui): loadout focus state for character hub"
```

---

### Task 3: clickEquip pure helpers

**Files:**
- Create: `src/features/character/hub/clickEquip.ts`
- Create: `src/features/character/hub/clickEquip.test.ts`

**Interfaces:**
- Produces: `resolveItemClickEquip`, `resolveFirstEmptyCardSlot`, `resolveFirstEmptyPassiveSlot`

- [ ] **Step 1: Write failing tests**

Test cases:
- item template slot `weapon` → equip slot `weapon` when focus null
- focus `{ kind: 'equip', slot: 'armor' }` + wrong item slot → `invalid`
- battle loadout first empty index

Use `initialCampaignState()` from `runReducer`.

- [ ] **Step 2: Implement**

```ts
export type ClickEquipResult =
  | { type: 'equip'; slot: EquipmentSlot; itemId: string }
  | { type: 'card'; slotIndex: 0 | 1 | 2 | 3; cardId: string }
  | { type: 'passive'; slotIndex: 0 | 1 | 2 | 3 | 4; passiveId: string }
  | { type: 'invalid'; reason: string }
```

- [ ] **Step 3: Run tests** — PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ui): click-to-equip resolution for character hub"
```

---

### Task 4: CharacterRail

**Files:**
- Create: `src/features/character/hub/CharacterRail.tsx`
- Create: `src/features/character/hub/CharacterRail.test.tsx`

**Interfaces:**
- Consumes: `campaign`, `selectedCharacterId`, `onSelectCharacter`, `onEditAppearance`, `onReleaseCharacter`, `canReleaseCharacter`, `activeDragId`, `transferDisabled`
- Produces: ordered character ids (squad order then reserve); droppable `rosterCharacterDropId`

- [ ] **Step 1: Write failing test**

Static markup: contains emoji; squad member has `inv-cell--equipped`; no `Слот 1` label (not squad slots).

- [ ] **Step 2: Implement**

Helper `orderCharactersForRail(campaign)`:
1. Map `campaign.squad` ids in slot order (skip null)
2. Append `characters` not in squad

Each row: `useDroppable(rosterCharacterDropId)`; `InventoryCell` with `Tooltip` title = name + class; `inv-cell--selected` when selected; `inv-cell--equipped` when `inSquad`.

Footer when selected: `EditOutlined` button; `Dropdown` with «Отпустить».

**No** `useDraggable` for characters on this tab.

- [ ] **Step 3: Run tests** — PASS

- [ ] **Step 4: Commit**

---

### Task 5: EquipDeltaStrip + CharacterBuildPanel

**Files:**
- Create: `src/features/character/hub/EquipDeltaStrip.tsx`
- Create: `src/features/character/hub/CharacterBuildPanel.tsx`

**Interfaces:**
- Consumes: `campaign`, `characterId`, `focus`, `onFocusChange`, `previewItemId` (optional hover), lock props, mod handlers
- Reuses: `StatStrip`, `SpecializationLine`, `EquipmentSlotCell` pattern from `EquipmentInventoryView` (copy or extract `BuildEquipSlotCell` inline first)

- [ ] **Step 1: EquipDeltaStrip**

When `previewItemId` + equip focus set, call `previewEquipDelta` and render:

```tsx
<Typography.Text style={{ fontSize: 12 }}>
  {UI_HEART} {before} → {after} ({delta >= 0 ? '+' : ''}{delta})
</Typography.Text>
```

- [ ] **Step 2: CharacterBuildPanel sections**

Header: `getCharacterDisplay`, class, `UI_LEVEL`.
Loadout rows with `Typography.Text strong` 12px: «Надето», «В бой», «Навыки в бою».
Slot click → `onFocusChange`; filled slot second click opens existing popover pattern (copy from `EquipmentInventoryView` / `CardsInventoryView`).

- [ ] **Step 3: Build** — PASS

- [ ] **Step 4: Commit**

---

### Task 6: CharacterStashTabs

**Files:**
- Create: `src/features/character/hub/CharacterStashTabs.tsx`

**Interfaces:**
- Props: `activeTab`, `onTabChange`, `characterId`, chest count, render props for grids OR embed existing sortable grids

- [ ] **Step 1: Tabs shell**

```tsx
<Tabs
  size="small"
  activeKey={activeTab}
  onChange={onTabChange}
  items={[
    { key: 'items', label: 'Предметы', children: <ItemsStashGrid ... /> },
    { key: 'cards', label: 'Умения', children: <CardsCollectionGrid ... /> },
    { key: 'passives', label: 'Навыки', children: <PassivesCollectionGrid ... /> },
    { key: 'chest', label: `Сундук (${chestCount})`, children: <ChestInventoryView showIntro={false} ... /> },
  ]}
/>
```

- [ ] **Step 2: Extract grid-only subviews**

From `EquipmentInventoryView` — stash `SortableContext` + `InventoryGrid` (no equip row).
From `CardsInventoryView` — collection grids only (no loadout rows).
Pass `onCellClick` for click-equip (J).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ui): tabbed stash column for character hub"
```

---

### Task 7: characterHubDragEnd

**Files:**
- Create: `src/features/character/hub/characterHubDragEnd.ts`
- Create: `src/features/character/hub/characterHubDragEnd.test.ts`

**Interfaces:**
- Consumes: callbacks mirroring `CampaignCharacterTab` handlers
- Produces: `handleCharacterHubDragEnd(ctx)` — port branches from `EquipmentInventoryView.handleDragEnd` + `CardsInventoryView` drag end

- [ ] **Step 1: Copy drag-end branches**

Minimum parity:
- stash → slot equip
- stash → roster-drop transfer
- stash → chest-drop
- chest-item → roster-drop / stash
- card → loadout / reorder
- passive → passive-equip / reorder
- squad interactions **excluded** (not on character tab)

- [ ] **Step 2: Unit test** one stash→slot and one roster-drop case with mock callbacks

- [ ] **Step 3: Commit**

---

### Task 8: CharacterHubLayout

**Files:**
- Create: `src/features/character/hub/CharacterHubLayout.tsx`
- Create: `src/features/character/hub/index.ts`
- Modify: `src/features/campaign/sectionTooltips.ts` — update `CHARACTERS_SECTION_HELP`

**Interfaces:**
- Props: same callbacks as current `CampaignCharacterTab` **minus** squad assign/remove/set/swap

- [ ] **Step 1: State**

```ts
const [selectedCharacterId, setSelectedCharacterId] = useState(...)
const [appearanceCharacterId, setAppearanceCharacterId] = useState<string | null>(null)
const [stashTab, setStashTab] = useState<StashTabKey>('items')
const [hoverPreviewItemId, setHoverPreviewItemId] = useState<string | null>(null)
const { focus, setFocus, toggleEquipSlot, clearFocus } = useLoadoutFocus()
const [activeDragId, setActiveDragId] = useState<string | null>(null)
```

- [ ] **Step 2: DndContext** wrapping `.game-character-hub` three children

Wire `handleDragStart` / `handleDragEnd` → `characterHubDragEnd`.

- [ ] **Step 3: Click handler on stash cells**

Call `resolveItemClickEquip` / card / passive helpers → dispatch `onEquip`, `onSetBattleLoadout`, etc.; `onInvalidSlot` + message on invalid.

- [ ] **Step 4: Appearance Modal** (move from `CampaignCharacterTab`)

- [ ] **Step 5: Export from index.ts**

- [ ] **Step 6: Commit**

---

### Task 9: Wire CampaignCharacterTab

**Files:**
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: Replace body with `<CharacterHubLayout ... />`**

Remove `EquipmentInventoryView`, `SquadSlotRow`, `CharacterRosterView`, nested `GamePanel`s.

- [ ] **Step 2: Trim props** on `CampaignCharacterTab` and `CampaignHub` wiring:

Remove from Character tab: `onSetSquadSlot`, `onSwapSquadSlots`, `onAssignToSquad`, `onRemoveFromSquad`.

- [ ] **Step 3: Run tests + build** — PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ui): replace character tab with 3-column hub layout"
```

---

### Task 10: SquadAssemblyPanel

**Files:**
- Create: `src/features/character/SquadAssemblyPanel.tsx`
- Create: `src/features/character/SquadAssemblyPanel.test.tsx`
- Create: `SQUAD_SECTION_HELP` in `sectionTooltips.ts`

- [ ] **Step 1: Test** — renders 4 squad cells + reserve cells; `resolveSquadDragDrop` wired

- [ ] **Step 2: Implement**

Top row: map `campaign.squad` — reuse `SquadSlotCell` logic from `SquadSlotRow.tsx` (extract shared `SquadSlotCell.tsx` if needed).

Reserve row: `Typography.Text` «Резерв»; draggable `rosterCharacterDragId` for non-squad heroes; click reserve → `onSetSquadSlot(firstEmpty, id)`; click filled squad → `onSetSquadSlot(i, null)`.

Optional expedition: `markedIds` + `onToggleMark` → `inv-cell--selected` overlay (port from `ExpeditionSquadStrip`).

- [ ] **Step 3: Commit**

---

### Task 11: CampaignBattleTab integration

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: Add props** to `CampaignBattleTab`:

```ts
onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
onSwapSquadSlots: (from: number, to: number) => void
```

Pass from `CampaignHub` (move handlers from Character tab).

- [ ] **Step 2: Campaign panel** — insert before start button:

```tsx
<SquadAssemblyPanel
  campaign={campaign}
  disabled={inBattle || expeditionActive}
  onSetSquadSlot={onSetSquadSlot}
  onSwapSquadSlots={onSwapSquadSlots}
/>
```

- [ ] **Step 3: Expedition panel** — replace `ExpeditionSquadStrip` with:

```tsx
<SquadAssemblyPanel
  ...
  markedIds={markedIds}
  onToggleMark={handleToggleMark}
  disabled={expeditionDisabled}
/>
```

Remove duplicate «Отряд» heading from old strip.

- [ ] **Step 4: Empty squad guard** before `onStartOrContinue`:

```tsx
if (countOccupiedSquadSlots(campaign.squad) === 0) {
  message.error('Добавьте хотя бы одного бойца в отряд')
  return
}
```

Partial empty: `Modal.confirm` with empty count (optional MVP).

- [ ] **Step 5: Commit**

---

### Task 12: Tavern auto-squad on hire

**Files:**
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: After successful `HIRE_TAVERN_CANDIDATE`**

In handler or reducer listener: if `findFirstEmptySquadSlotIndex(campaign.squad) !== null`, dispatch `SET_SQUAD_SLOT` with new character id (read returned id from action result or select last character).

If reducer doesn't return id, use effect: compare `characters.length` before/after or select newly added character by snapshot.

```tsx
message.info('Новый боец добавлен в отряд')
```

Only when slot was filled automatically.

- [ ] **Step 2: Test** — unit test on reducer `HIRE_TAVERN_CANDIDATE` + manual slot if exists in `runReducer.test.ts` (optional one case)

- [ ] **Step 3: Commit**

---

### Task 13: Section tooltips cleanup

**Files:**
- Modify: `src/features/campaign/sectionTooltips.ts`
- Modify: `src/features/campaign/sectionTooltips.test.ts`

- [ ] **Step 1: Update strings** per spec §5.4, §7.4, §8

Add:

```ts
export const SQUAD_SECTION_HELP =
  'Соберите отряд для кампании и экспедиции. Перетащите героя из резерва в слот или нажмите на героя в резерве. Пустые слоты допускаются, но в бою участвуют только занятые.'
```

- [ ] **Step 2: Run tests** — PASS

- [ ] **Step 3: Commit**

---

### Task 14: Final verification

- [ ] **Step 1:** `npm run test` — all pass
- [ ] **Step 2:** `npm run build` — pass
- [ ] **Step 3: Manual checklist @1280px**

- [ ] Персонаж: 3 columns; rail select; equip via click + drag; tabs switch
- [ ] Персонаж: нет UI смены отряда
- [ ] Бой: squad assembly; start campaign; expedition marks
- [ ] Таверна: hire → auto slot when empty
- [ ] Shop tab: roster still works

- [ ] **Step 4: Commit** if fixups needed

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| §4 Layout grid | 1, 8 |
| §5 CharacterRail B′ | 4, 8, 9 |
| §6 Build panel H | 5, 8 |
| §7 Stash tabs D+J | 3, 6, 7, 8 |
| §8 Squad on Battle | 10, 11, 12 |
| §9 Freeze states | 8, 11 |
| §11 Acceptance | 14 |

## Implementation notes

1. **Incremental milestone:** After Task 9, Character tab should be usable even if click-equip polish (Task 3) is minimal — drag must work first (Task 7).
2. **Extract vs copy:** Prefer extracting `SquadSlotCell` to `src/features/character/SquadSlotCell.tsx` shared by `SquadSlotRow` (deprecated) and `SquadAssemblyPanel` in Task 10.
3. **`@testing-library/react`:** If not in package.json, use pure reducer tests for `useLoadoutFocus` (noted in Task 2).
4. **CardsInventoryView DnD:** Read `handleDragEnd` in `CardsInventoryView.tsx` (~line 450+) when implementing Task 7.
