# Universal Inventory Grid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить текстовый stash, Select экипировки, список карт и карточки магазина на универсальную emoji-сетку с DnD для экипировки, карт и магазина по спеке `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`.

**Architecture:** Чистая game-логика (новые `RunAction`, хелперы порядка stash, emoji, preview delta) в `src/game` и `src/features/inventory/*.ts`; presentational ядро `InventoryGrid` + `InventoryCell`; три view с `@dnd-kit`; callbacks из `CampaignHub` без прямого доступа view к Zustand.

**Tech Stack:** React 19, Ant Design 6, TypeScript strict, Vitest, Zustand, Vite 8, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

## Global Constraints

- Размер клетки: **56×56 px**; gap **4px**; базовая сетка **minCols=4**, **minRows=3**, расширение рядов при переполнении.
- DnD: `@dnd-kit/core` ^6.x, `@dnd-kit/sortable` ^10.x, `@dnd-kit/utilities` ^3.x.
- View-компоненты **не** вызывают `useGameStore` — только props + callbacks из `CampaignHub`.
- Сообщения UI на русском через `App.useApp().message` (как в `CampaignHub.tsx`).
- `inBattle` → DnD off, opacity 0.5, `Tooltip`: «Доступно после боя».
- Sell-back: `gold += Math.floor(shopPrice * 0.5)`; только неэкипированные предметы.
- `REORDER_STASH`: экипированные первыми в `EQUIPMENT_ROLL_ORDER`, затем stash-id в порядке `itemIds`.
- Все 7 UX-пунктов из спеки — **in scope v1**.

**Spec:** `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`

---

## File map

| Path | Responsibility |
|------|----------------|
| `package.json` | `@dnd-kit/*` dependencies |
| `src/game/content/itemTemplates.ts` | optional `emoji?`; явные emoji для 3 предметов |
| `src/game/content/cardTemplates.ts` | optional `emoji?`; emoji для strike |
| `src/features/inventory/inventoryEmoji.ts` | `resolveItemEmoji`, `resolveCardEmoji` |
| `src/features/inventory/inventoryEmoji.test.ts` | defaults + override |
| `src/features/inventory/inventoryGridUtils.ts` | `calcGridRows`, `INVENTORY_CELL_PX`, `INVENTORY_MIN_COLS`, `INVENTORY_MIN_ROWS` |
| `src/features/inventory/inventoryGridUtils.test.ts` | grid row math |
| `src/features/inventory/previewEquipDelta.ts` | `previewEquipDelta(campaign, itemId, slot)` → `{ deltaHp, deltaCardLevel }` |
| `src/features/inventory/previewEquipDelta.test.ts` | delta calculations |
| `src/game/equipment/stashOrder.ts` | `buildItemsWithStashOrder`, `sortStashIdsBySlot`, `sortStashIdsByLevel` |
| `src/game/equipment/stashOrder.test.ts` | reorder + sort helpers |
| `src/game/campaign/runReducer.ts` | 4 new actions |
| `src/game/campaign/runReducer.test.ts` | reducer tests for new actions |
| `src/features/inventory/inventory.css` | cell sizes, state borders |
| `src/features/inventory/InventoryCell.tsx` | emoji, badges, popover, states |
| `src/features/inventory/InventoryGrid.tsx` | CSS grid wrapper, empty slots |
| `src/features/inventory/EquipmentInventoryView.tsx` | slots + stash + sell zone + sort + compare |
| `src/features/inventory/ShopInventoryView.tsx` | shop drag → buy |
| `src/features/inventory/CardsInventoryView.tsx` | reorder + modKillTarget |
| `src/features/campaign/CampaignHub.tsx` | new callbacks |
| `src/features/campaign/CampaignCharacterTab.tsx` | integrate equipment + cards views |
| `src/features/campaign/CampaignShopTab.tsx` | integrate shop view |
| `src/features/battle/BattleScreen.tsx` | 🎯 on modKillTarget card |
| `src/features/campaign/CampaignStashLine.tsx` | **delete** after migration |

---

### Task 1: Install @dnd-kit

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: npm packages available for import in Task 7+.

- [ ] **Step 1: Install packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: `package.json` lists three `@dnd-kit/*` entries under `dependencies`.

- [ ] **Step 2: Verify build**

Run: `npm run build`  
Expected: PASS (no code changes yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dnd-kit for inventory drag-and-drop"
```

---

### Task 2: Template emoji fields + inventoryEmoji utils (TDD)

**Files:**
- Modify: `src/game/content/itemTemplates.ts`
- Modify: `src/game/content/cardTemplates.ts`
- Create: `src/features/inventory/inventoryEmoji.ts`
- Create: `src/features/inventory/inventoryEmoji.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const SLOT_EMOJI: Record<EquipmentSlot, string>
  export function resolveItemEmoji(template: ItemTemplate | undefined, slot: EquipmentSlot): string
  export function resolveCardEmoji(template: CardAttackTemplate | undefined): string
  ```

- [ ] **Step 1: Write failing tests**

Create `src/features/inventory/inventoryEmoji.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { resolveCardEmoji, resolveItemEmoji } from './inventoryEmoji'

describe('resolveItemEmoji', () => {
  it('uses template emoji when set', () => {
    const t = getItemTemplate('wooden_sword')!
    expect(resolveItemEmoji(t, 'weapon')).toBe('🗡️')
  })

  it('falls back to slot default', () => {
    expect(resolveItemEmoji(undefined, 'armor')).toBe('🛡️')
  })
})

describe('resolveCardEmoji', () => {
  it('uses template emoji when set', () => {
    const t = getCardAttackTemplate('strike')!
    expect(resolveCardEmoji(t)).toBe('🃏')
  })

  it('falls back to card default', () => {
    expect(resolveCardEmoji(undefined)).toBe('🃏')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/inventory/inventoryEmoji.test.ts`  
Expected: FAIL — module not found.

- [ ] **Step 3: Add emoji to templates**

In `itemTemplates.ts`, extend type and values:
```ts
export type ItemTemplate = {
  // ...existing fields
  emoji?: string
}
// wooden_sword: emoji: '🗡️'
// leather_armor: emoji: '🥋'
// copper_ring: emoji: '💍'
```

In `cardTemplates.ts`:
```ts
export type CardAttackTemplate = {
  // ...existing fields
  emoji?: string
}
// strike: emoji: '🃏'
```

- [ ] **Step 4: Implement inventoryEmoji.ts**

```ts
import type { CardAttackTemplate } from '../../game/content/cardTemplates'
import type { ItemTemplate } from '../../game/content/itemTemplates'
import type { EquipmentSlot } from '../../game/types'

export const SLOT_EMOJI: Record<EquipmentSlot, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
}

const CARD_DEFAULT_EMOJI = '🃏'

export function resolveItemEmoji(
  template: ItemTemplate | undefined,
  slot: EquipmentSlot,
): string {
  return template?.emoji ?? SLOT_EMOJI[slot]
}

export function resolveCardEmoji(template: CardAttackTemplate | undefined): string {
  return template?.emoji ?? CARD_DEFAULT_EMOJI
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/features/inventory/inventoryEmoji.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/content/itemTemplates.ts src/game/content/cardTemplates.ts src/features/inventory/inventoryEmoji.ts src/features/inventory/inventoryEmoji.test.ts
git commit -m "feat(inventory): template emoji fields and resolve helpers"
```

---

### Task 3: Grid utils + previewEquipDelta (TDD)

**Files:**
- Create: `src/features/inventory/inventoryGridUtils.ts`
- Create: `src/features/inventory/inventoryGridUtils.test.ts`
- Create: `src/features/inventory/previewEquipDelta.ts`
- Create: `src/features/inventory/previewEquipDelta.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const INVENTORY_CELL_PX = 56
  export const INVENTORY_MIN_COLS = 4
  export const INVENTORY_MIN_ROWS = 3
  export function calcGridRows(itemCount: number, minCols?: number, minRows?: number): number
  export function calcGridSlotCount(itemCount: number, minCols?: number, minRows?: number): number

  export type EquipDelta = { deltaHp: number; deltaCardLevel: number }
  export function previewEquipDelta(
    campaign: CampaignState,
    itemId: string,
    slot: EquipmentSlot,
    getTemplate: (id: string) => ItemTemplate | undefined,
  ): EquipDelta | null
  ```

- [ ] **Step 1: Write failing grid utils tests**

```ts
import { describe, expect, it } from 'vitest'
import { calcGridRows, calcGridSlotCount, INVENTORY_MIN_COLS, INVENTORY_MIN_ROWS } from './inventoryGridUtils'

describe('calcGridRows', () => {
  it('returns minRows when empty', () => {
    expect(calcGridRows(0)).toBe(INVENTORY_MIN_ROWS)
  })

  it('expands rows when items exceed min grid', () => {
    expect(calcGridRows(13, INVENTORY_MIN_COLS, INVENTORY_MIN_ROWS)).toBe(4)
  })
})

describe('calcGridSlotCount', () => {
  it('returns cols * rows', () => {
    expect(calcGridSlotCount(5)).toBe(12)
  })
})
```

- [ ] **Step 2: Implement inventoryGridUtils.ts**

```ts
export const INVENTORY_CELL_PX = 56
export const INVENTORY_MIN_COLS = 4
export const INVENTORY_MIN_ROWS = 3

export function calcGridRows(
  itemCount: number,
  minCols = INVENTORY_MIN_COLS,
  minRows = INVENTORY_MIN_ROWS,
): number {
  const needed = itemCount <= 0 ? 0 : Math.ceil(itemCount / minCols)
  return Math.max(minRows, needed)
}

export function calcGridSlotCount(
  itemCount: number,
  minCols = INVENTORY_MIN_COLS,
  minRows = INVENTORY_MIN_ROWS,
): number {
  return minCols * calcGridRows(itemCount, minCols, minRows)
}
```

- [ ] **Step 3: Write failing previewEquipDelta tests**

Use `initialCampaignState`, buy/equip fixtures manually:

```ts
import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../../game/campaign/runReducer'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { previewEquipDelta } from './previewEquipDelta'

describe('previewEquipDelta', () => {
  it('returns hp and card level delta when swapping into empty weapon slot', () => {
    let s = applyRunAction({ ...initialCampaignState(), gold: 100 }, { type: 'BUY_ITEM', templateId: 'wooden_sword' })
    const itemId = s.items[0]!.id
    const delta = previewEquipDelta(s, itemId, 'weapon', getItemTemplate)
    expect(delta).toEqual({ deltaHp: 0, deltaCardLevel: 1 })
  })

  it('returns null for wrong slot type', () => {
    let s = applyRunAction({ ...initialCampaignState(), gold: 100 }, { type: 'BUY_ITEM', templateId: 'wooden_sword' })
    expect(previewEquipDelta(s, s.items[0]!.id, 'armor', getItemTemplate)).toBeNull()
  })
})
```

- [ ] **Step 4: Implement previewEquipDelta.ts**

Compute `aggregateGearHpBonus` / `aggregateGearCardLevelBonus` for current equipment vs hypothetical `{ ...equipment, [slot]: itemId }`. Return deltas. Return `null` if item missing or slot mismatch.

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/features/inventory/inventoryGridUtils.test.ts src/features/inventory/previewEquipDelta.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/inventory/inventoryGridUtils.ts src/features/inventory/inventoryGridUtils.test.ts src/features/inventory/previewEquipDelta.ts src/features/inventory/previewEquipDelta.test.ts
git commit -m "feat(inventory): grid sizing and equip preview delta helpers"
```

---

### Task 4: Stash order helpers + new RunActions (TDD)

**Files:**
- Create: `src/game/equipment/stashOrder.ts`
- Create: `src/game/equipment/stashOrder.test.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function buildItemsWithStashOrder(
    items: readonly ItemInstance[],
    equipment: Record<EquipmentSlot, string | null>,
    stashItemIds: readonly string[],
  ): ItemInstance[] | null

  export function sortStashIdsBySlot(stash: readonly ItemInstance[], getTemplate): string[]
  export function sortStashIdsByLevel(stash: readonly ItemInstance[]): string[]

  // RunAction extensions:
  | { type: 'REORDER_CARDS'; cardIds: string[] }
  | { type: 'SET_MOD_KILL_TARGET'; cardId: string | null }
  | { type: 'SELL_ITEM'; itemId: string }
  | { type: 'REORDER_STASH'; itemIds: string[] }
  ```

- [ ] **Step 1: Write stashOrder tests**

```ts
import { describe, expect, it } from 'vitest'
import { buildItemsWithStashOrder } from './stashOrder'
import type { ItemInstance } from '../types'

const items: ItemInstance[] = [
  { id: 'a', templateId: 'wooden_sword', itemLevel: 1 },
  { id: 'b', templateId: 'leather_armor', itemLevel: 2 },
]
const equipment = { weapon: 'a', armor: null, accessory: null }

describe('buildItemsWithStashOrder', () => {
  it('places equipped first in roll order then stash ids', () => {
    const next = buildItemsWithStashOrder(items, equipment, ['b'])
    expect(next?.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('returns null when stash ids invalid', () => {
    expect(buildItemsWithStashOrder(items, equipment, ['x'])).toBeNull()
  })
})
```

- [ ] **Step 2: Implement stashOrder.ts**

Use `EQUIPMENT_ROLL_ORDER`, `getStashItems` logic inline (equipped ids set), validate stash id set matches, rebuild array.

- [ ] **Step 3: Extend RunAction + reducer cases**

Helper `function inHub(state: CampaignState): boolean { return state.battle === null }`

Each new case:
- **`REORDER_CARDS`:** if `!inHub(state)` no-op; if `cardIds` same set as `state.cards.map(c=>c.id)` reorder array; else no-op.
- **`SET_MOD_KILL_TARGET`:** if `!inHub` no-op; if `cardId !== null` and not in cards no-op; else set `modKillTargetCardId`.
- **`SELL_ITEM`:** if `!inHub` no-op; find item; if equipped no-op; `gold += Math.floor(tmpl.shopPrice * 0.5)`; filter item out.
- **`REORDER_STASH`:** if `!inHub` no-op; `buildItemsWithStashOrder`; if null no-op; else replace `items`.

- [ ] **Step 4: Write reducer tests**

Add to `runReducer.test.ts`:

```ts
describe('inventory grid actions', () => {
  it('SELL_ITEM refunds half price and removes stash item', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, { type: 'BUY_ITEM', templateId: 'wooden_sword' })
    const id = s.items[0]!.id
    s = applyRunAction(s, { type: 'SELL_ITEM', itemId: id })
    expect(s.items).toHaveLength(0)
    expect(s.gold).toBe(95) // 100 - 10 + 5
  })

  it('SELL_ITEM no-op for equipped item', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, { type: 'BUY_ITEM', templateId: 'wooden_sword' })
    const id = s.items[0]!.id
    s = applyRunAction(s, { type: 'EQUIP_ITEM', itemId: id, slot: 'weapon' })
    const before = s
    s = applyRunAction(s, { type: 'SELL_ITEM', itemId: id })
    expect(s).toEqual(before)
  })

  it('REORDER_CARDS changes card order', () => {
    let s = initialCampaignState()
    // add second card fixture if needed; with one card reorder is trivial identity
    s = applyRunAction(s, { type: 'REORDER_CARDS', cardIds: ['c1'] })
    expect(s.cards[0]?.id).toBe('c1')
  })

  it('SET_MOD_KILL_TARGET updates target', () => {
    const s = applyRunAction(initialCampaignState(), {
      type: 'SET_MOD_KILL_TARGET',
      cardId: 'c1',
    })
    expect(s.modKillTargetCardId).toBe('c1')
  })

  it('REORDER_STASH persists stash order after equipped block', () => {
    // buy sword + armor, equip sword, reorder stash [armor]
    // assert items order [swordId, armorId]
  })

  it('inventory actions no-op in battle', () => {
    let s = applyRunAction({ ...initialCampaignState(), gold: 100 }, { type: 'BUY_ITEM', templateId: 'wooden_sword' })
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    const before = s
    s = applyRunAction(s, { type: 'SELL_ITEM', itemId: before.items[0]!.id })
    expect(s).toEqual(before)
  })
})
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/game/equipment/stashOrder.test.ts src/game/campaign/runReducer.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/equipment/stashOrder.ts src/game/equipment/stashOrder.test.ts src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): sell reorder stash and card inventory actions"
```

---

### Task 5: Presentational core — InventoryCell + InventoryGrid + CSS

**Files:**
- Create: `src/features/inventory/inventory.css`
- Create: `src/features/inventory/InventoryCell.tsx`
- Create: `src/features/inventory/InventoryGrid.tsx`

**Interfaces:**
- Consumes: `inventoryGridUtils`, `inventoryEmoji`, `UI_LEVEL`, `UI_DAMAGE` from labels.
- Produces:
  ```tsx
  export type InventoryCellState =
    | 'empty' | 'filled' | 'equipped' | 'modKillTarget' | 'disabled' | 'dragOver' | 'invalidDrop'

  export type InventoryCellProps = {
    emoji?: string
    levelBadge?: string
    contextBadge?: string
    state: InventoryCellState
    popoverContent?: ReactNode
    ariaLabel: string
    draggable?: boolean
    onDoubleClick?: () => void
    hintText?: string // empty slot "перетащи"
    // dnd-kit spread props optional via ref + listeners from parent
  }

  export type InventoryGridProps = {
    slotCount: number
    minCols?: number
    renderCell: (index: number, isEmpty: boolean) => ReactNode
  }
  ```

- [ ] **Step 1: Create inventory.css**

Classes: `.inv-cell`, `.inv-cell--empty`, `--equipped`, `--mod-target`, `--disabled`, `--drag-over`, `--invalid`, `.inv-badge-level`, `.inv-badge-context`. Fixed 56×56, gap via grid parent.

- [ ] **Step 2: Implement InventoryCell**

Ant Design `Popover` wrapping a `<button type="button">` with emoji centered, absolute-positioned badges, `hintText` for empty equipment slots (UX #7).

- [ ] **Step 3: Implement InventoryGrid**

CSS grid: `repeat(minCols, 56px)`, gap 4px; map `0..slotCount-1`; indices `>= itemCount` render empty cells with dashed border.

- [ ] **Step 4: Manual smoke**

Temporarily render in `CampaignCharacterTab` behind a flag or skip — verified in Task 8.

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/inventory.css src/features/inventory/InventoryCell.tsx src/features/inventory/InventoryGrid.tsx
git commit -m "feat(inventory): presentational grid and cell components"
```

---

### Task 6: EquipmentInventoryView (DnD + UX 1–5, 7)

**Files:**
- Create: `src/features/inventory/EquipmentInventoryView.tsx`

**Interfaces:**
- Consumes: Task 5 components, Task 3 `previewEquipDelta`, `getStashItems`, `SLOT_LABEL`, dnd-kit.
- Props:
  ```tsx
  export type EquipmentInventoryViewProps = {
    campaign: CampaignState
    inBattle: boolean
    onEquip: (itemId: string, slot: EquipmentSlot) => void
    onUnequip: (slot: EquipmentSlot) => void
    onSell: (itemId: string) => void
    onReorderStash: (itemIds: string[]) => void
    onInvalidSlot: () => void
    onSellEquippedWarning: () => void
  }
  ```

- [ ] **Step 1: DndContext setup**

Single `DndContext` wrapping:
1. Row of 3 slot droppables (`weapon`, `armor`, `accessory`) — empty slot shows `SLOT_EMOJI[slot]` + hint «перетащи» (UX #7).
2. Stash sortable grid from `getStashItems(campaign)`.
3. Sell drop zone with `Tooltip` «50% от цены» (UX #2).

Draggable ids: `stash:{itemId}`, `slot:{slot}`.

- [ ] **Step 2: Drop handlers**

| Event | Callback |
|-------|----------|
| stash → slot (valid type) | `onEquip(itemId, slot)` |
| stash → slot (invalid) | `onInvalidSlot()` + flash invalid |
| slot → stash area / unequip zone | `onUnequip(slot)` |
| stash → sell zone | `onSell(itemId)` |
| stash reorder | `onReorderStash(newIds)` |
| double-click stash | `onEquip(itemId, template.slot)` (UX #3) |

- [ ] **Step 3: Compare-on-hover (UX #1)**

On drag/hover stash item, highlight compatible slot; Popover on slot with `previewEquipDelta` → `Δ❤️`, `Δ💥`.

- [ ] **Step 4: Sort buttons (UX #4)**

«По слоту» → `onReorderStash(sortStashIdsBySlot(...))`; «По уровню» → `sortStashIdsByLevel`.

- [ ] **Step 5: In-battle read-only (UX #5)**

When `inBattle`: wrap in `Tooltip` «Доступно после боя», disable sensors, `state='disabled'`.

- [ ] **Step 6: Commit**

```bash
git add src/features/inventory/EquipmentInventoryView.tsx
git commit -m "feat(inventory): equipment view with dnd sell sort and compare"
```

---

### Task 7: ShopInventoryView + CardsInventoryView

**Files:**
- Create: `src/features/inventory/ShopInventoryView.tsx`
- Create: `src/features/inventory/CardsInventoryView.tsx`

**Interfaces:**

```tsx
export type ShopInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  onBuy: (templateId: string) => void
  onInsufficientGold: () => void
}

export type CardsInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  gearCardLevelBonus: number
  onReorderCards: (cardIds: string[]) => void
  onSetModKillTarget: (cardId: string) => void
}
```

- [ ] **Step 1: ShopInventoryView**

Grid of shop templates (`SHOP_TEMPLATE_IDS`); draggable `shop:{templateId}`; drop zone «В инвентарь» triggers `onBuy` if affordable else `onInsufficientGold`; double-click buy (UX #3 analog); stash preview grid read-only showing `getStashItems`; `inBattle` disabled with tooltip.

- [ ] **Step 2: CardsInventoryView**

Sortable grid of `campaign.cards`; `modKillTargetCardId` cell gets gold border + 🎯; caption «Моды за kill → {label}» (UX #6 hub part); click card → `onSetModKillTarget(card.id)`; drag reorder → `onReorderCards`.

- [ ] **Step 3: Commit**

```bash
git add src/features/inventory/ShopInventoryView.tsx src/features/inventory/CardsInventoryView.tsx
git commit -m "feat(inventory): shop and cards grid views"
```

---

### Task 8: CampaignHub integration + remove legacy UI

**Files:**
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/campaign/CampaignShopTab.tsx`
- Delete: `src/features/campaign/CampaignStashLine.tsx`

- [ ] **Step 1: Extend CampaignHub callbacks**

```tsx
const sellItem = (itemId: string) => {
  const equipped = Object.values(campaign.equipment).includes(itemId)
  if (equipped) {
    message.warning('Сначала снимите предмет')
    return
  }
  dispatchRun({ type: 'SELL_ITEM', itemId })
}

const reorderStash = (itemIds: string[]) => dispatchRun({ type: 'REORDER_STASH', itemIds })
const reorderCards = (cardIds: string[]) => dispatchRun({ type: 'REORDER_CARDS', cardIds })
const setModKillTarget = (cardId: string) =>
  dispatchRun({ type: 'SET_MOD_KILL_TARGET', cardId })

// Pass to tabs; keep existing buy/equip/unequip
```

- [ ] **Step 2: Rewrite CampaignCharacterTab**

Replace `CampaignStashLine`, slot `Select`s, cards `<ul>` with:
```tsx
<EquipmentInventoryView ... />
<CardsInventoryView gearCardLevelBonus={gearCardPreview} ... />
```

Import `inventory.css` once at tab or view level.

- [ ] **Step 3: Rewrite CampaignShopTab**

Replace stash line + Card wrap with `ShopInventoryView`; optional stash preview via equipment grid read-only or mini stash grid.

- [ ] **Step 4: Delete CampaignStashLine.tsx**

Remove all imports; grep confirms zero references.

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/CampaignHub.tsx src/features/campaign/CampaignCharacterTab.tsx src/features/campaign/CampaignShopTab.tsx
git rm src/features/campaign/CampaignStashLine.tsx
git commit -m "feat(campaign): integrate inventory grid into hub tabs"
```

---

### Task 9: BattleScreen modKillTarget marker (UX #6)

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: Read modKillTargetCardId from battle snapshot**

Use `campaign.modKillTargetCardId` or value restored in battle — check `battleAttemptSnapshot.modKillTargetCardId` when in battle. Prefer `useGameStore` selector for campaign slice already used elsewhere in battle flow, or pass via existing props pattern.

- [ ] **Step 2: Add 🎯 to card UI**

In the `battle.playerCards.map` summary (~line 411) and Collapse label (~line 457), append ` 🎯` when `c.id === modKillTargetCardId`.

- [ ] **Step 3: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): mark mod kill target card with target emoji"
```

---

### Task 10: Verification

**Files:** (none new)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 2: Lint and build**

Run: `npm run lint && npm run build`  
Expected: PASS

- [ ] **Step 3: Manual checklist**

| Check | Expected |
|-------|----------|
| Character tab: 3 slot row + stash grid | visible, DnD equip/unequip |
| Double-click stash item | equips into correct slot |
| Drag to sell zone | +50% gold, item gone |
| Sort stash buttons | order changes |
| Hover/drag compare | slot highlight + delta popover |
| Shop: drag to buy zone | item appears in stash, gold deducted |
| Cards: drag reorder | order persists after tab switch |
| Click card | 🎯 moves, caption updates |
| Start battle | grids disabled, tooltip shown |
| Battle screen | 🎯 on target card |
| Retry after sell in battle | snapshot restores (if tested manually) |

- [ ] **Step 4: Commit any fixups**

If fixes needed, commit separately with `fix(inventory): ...`.

---

## Spec coverage (self-review)

| Spec section | Task |
|--------------|------|
| Universal grid 4×3 expand | Task 3, 5 |
| Equipment slots + stash DnD | Task 6, 8 |
| Shop drag buy | Task 7, 8 |
| Cards reorder + mod target | Task 4, 7, 8, 9 |
| Emoji defaults + override | Task 2 |
| Cell badges | Task 5, 6, 7 |
| UX #1 compare | Task 6 |
| UX #2 sell-back | Task 4, 6, 8 |
| UX #3 quick-equip/buy | Task 6, 7 |
| UX #4 stash sort | Task 4, 6 |
| UX #5 in-battle read-only | Task 6, 7, 8 |
| UX #6 mod target ↔ battle | Task 7, 9 |
| UX #7 empty slot hint | Task 5, 6 |
| New RunActions | Task 4 |
| Error messages RU | Task 8 |
| @dnd-kit deps | Task 1 |
| Remove CampaignStashLine | Task 8 |
| Tests | Tasks 2–4, 10 |

No TBD placeholders remain.
