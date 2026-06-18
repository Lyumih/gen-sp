# Shop Buy, Instant Trades, Quick Sell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Мгновенные «Купить»/«Продать»/«Надеть»/«Снять» в popover, цена `{N} 💰`, продажа только в магазине, режим «Быстрая продажа» с мультивыбором.

**Architecture:** `itemPriceLine` в `itemText.ts`; новый `ItemPopoverActions`; рефакторинг `ShopInventoryView` (без shop DnD) и `EquipmentInventoryView` (equip popover, slot→stash unequip); удаление `StashItemPopoverContent`.

**Tech Stack:** React 19, Ant Design 6, `@dnd-kit` (только Equipment), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-18-shop-buy-quick-sell-design.md`

## Global Constraints

- Reducer без изменений (`BUY_ITEM`, `SELL_ITEM`, `EQUIP_ITEM`, `UNEQUIP_ITEM`)
- Формат цены: **`{N} 💰`** — без «зол.», без «Покупка:/Продажа:»
- Popconfirm **не использовать** — клик по кнопке = действие
- `inBattle` → кнопки и toggle быстрой продажи disabled + tooltip «Доступно после боя»
- Продажа **только** на вкладке «Магазин»
- Batch sell: цикл `onSell(id)`, без нового reducer action

## File Map

| File | Responsibility |
|------|----------------|
| `src/game/descriptions/itemText.ts` | `itemPriceLine`, убрать buy/sell из instance lines |
| `src/game/descriptions/itemText.test.ts` | тесты цены |
| `src/features/inventory/ItemPopoverActions.tsx` | **create** — кнопки popover |
| `src/features/inventory/ShopInventoryView.tsx` | buy popover, sell popover, quick sell, no DnD |
| `src/features/inventory/EquipmentInventoryView.tsx` | equip/unequip popover, slot→stash, no sell |
| `src/features/inventory/inventoryDnD.ts` | `stashEmptyDragId`, убрать `DROP_BUY` |
| `src/features/inventory/inventory.css` | `.inv-cell--selected` |
| `src/features/inventory/InventoryCell.tsx` | optional selected checkmark span |
| `src/features/campaign/CampaignCharacterTab.tsx` | убрать `onSell` |
| `src/features/campaign/CampaignHub.tsx` | `onSell` только в shop tab |
| `src/features/inventory/StashItemPopoverContent.tsx` | **delete** |

---

### Task 1: `itemPriceLine` и очистка описаний

**Files:**
- Modify: `src/game/descriptions/itemText.ts`
- Modify: `src/game/descriptions/itemText.test.ts`

**Interfaces:**
- Produces: `itemPriceLine(amount: number): string` → `"10 💰"`
- Produces: `itemInstanceDescriptionLines` **без** строк buy/sell

- [ ] **Step 1: Write the failing test**

In `itemText.test.ts`, replace buy/sell expectations in `itemInstanceDescriptionLines` test and add:

```ts
import { itemInstanceDescriptionLines, itemPriceLine } from './itemText'

describe('itemPriceLine', () => {
  it('formats amount with money emoji', () => {
    expect(itemPriceLine(10)).toBe('10 💰')
    expect(itemPriceLine(7)).toBe('7 💰')
  })
})

describe('itemInstanceDescriptionLines', () => {
  it('leather_armor level 2 lists totals without buy/sell lines', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    const lines = itemInstanceDescriptionLines(t, 2)
    expect(lines.some((l) => l.includes('+4'))).toBe(true)
    expect(lines.some((l) => l.includes('За уровень'))).toBe(true)
    expect(lines.some((l) => l.includes('Покупка'))).toBe(false)
    expect(lines.some((l) => l.includes('Продажа'))).toBe(false)
    expect(lines.some((l) => l.includes('💰'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/descriptions/itemText.test.ts`
Expected: FAIL — `itemPriceLine` not exported; old test expects «Покупка»

- [ ] **Step 3: Implement**

In `itemText.ts`:

```ts
export function itemPriceLine(amount: number): string {
  return `${amount} 💰`
}
```

Remove from `itemInstanceDescriptionLines` the two lines:

```ts
lines.push(itemBuyPriceLine(t))
lines.push(itemSellPriceLine(t))
```

Keep `itemBuyPriceLine` / `itemSellPriceLine` / `itemSellPrice` — still used internally or replace call sites in Task 5 with `itemPriceLine(itemSellPrice(t))`. If nothing imports `itemBuyPriceLine` / `itemSellPriceLine` after Task 5, delete those functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/descriptions/itemText.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/descriptions/itemText.ts src/game/descriptions/itemText.test.ts
git commit -m "refactor: itemPriceLine and drop buy/sell from instance description"
```

---

### Task 2: `ItemPopoverActions`

**Files:**
- Create: `src/features/inventory/ItemPopoverActions.tsx`

**Interfaces:**
- Produces:

```tsx
export type PopoverAction = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  type?: 'primary' | 'default'
}

export type ItemPopoverActionsProps = {
  inBattle: boolean
  actions: PopoverAction[]
}

export function ItemPopoverActions(props: ItemPopoverActionsProps): JSX.Element
```

- [ ] **Step 1: Create component**

```tsx
import { Button, Space, Tooltip } from 'antd'
import type { PopoverAction, ItemPopoverActionsProps } from './ItemPopoverActions.types'
// OR inline types in same file:

import { Button, Space, Tooltip } from 'antd'

export type PopoverAction = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  type?: 'primary' | 'default'
}

export type ItemPopoverActionsProps = {
  inBattle: boolean
  actions: PopoverAction[]
}

export function ItemPopoverActions({ inBattle, actions }: ItemPopoverActionsProps) {
  const buttons = (
    <Space wrap size="small">
      {actions.map((a) => (
        <Button
          key={a.key}
          size="small"
          type={a.danger ? 'primary' : (a.type ?? 'default')}
          danger={a.danger}
          disabled={inBattle || a.disabled}
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
    </Space>
  )

  if (inBattle) {
    return <Tooltip title="Доступно после боя">{buttons}</Tooltip>
  }
  return buttons
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS (no consumers yet — component unused is OK)

- [ ] **Step 3: Commit**

```bash
git add src/features/inventory/ItemPopoverActions.tsx
git commit -m "feat: ItemPopoverActions for instant popover buttons"
```

---

### Task 3: `EquipmentInventoryView` — equip/unequip popover, slot→stash

**Files:**
- Modify: `src/features/inventory/EquipmentInventoryView.tsx`
- Modify: `src/features/inventory/inventoryDnD.ts`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

**Interfaces:**
- Consumes: `ItemPopoverActions`, `itemPriceLine`, `itemInstanceDescriptionLinesFromInstance`
- Consumes: `stashEmptyDragId(index: number): string` from `inventoryDnD.ts`
- Removes: `onSell` prop from `EquipmentInventoryViewProps`

- [ ] **Step 1: Add `stashEmptyDragId` to inventoryDnD.ts**

```ts
export function stashEmptyDragId(index: number): string {
  return `stash-empty:${index}`
}
```

Keep `DROP_STASH` export until grep shows zero usages, then remove in this task.

- [ ] **Step 2: Remove `onSell` from character tab chain**

`CampaignCharacterTab.tsx` — remove `onSell` from props type and `EquipmentInventoryView` call.

`CampaignHub.tsx` — remove `onSell={sellItem}` only from `CampaignCharacterTab` (keep on `CampaignShopTab`).

- [ ] **Step 3: Replace stash popover in `SortableStashCell`**

Remove `StashItemPopoverContent` import. Popover content:

```tsx
import { Space, Typography } from 'antd'
import { ItemPopoverActions } from './ItemPopoverActions'
import { itemInstanceDescriptionLinesFromInstance, itemPriceLine } from '../../game/descriptions/itemText'

function characterStashPopover(
  item: ItemInstance,
  inBattle: boolean,
  onEquip: () => void,
) {
  const tmpl = getItemTemplate(item.templateId)
  const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {tmpl ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {itemPriceLine(tmpl.shopPrice)}
        </Typography.Text>
      ) : null}
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[{ key: 'equip', label: 'Надеть', type: 'primary', onClick: onEquip }]}
      />
    </Space>
  )
}
```

Wire in `SortableStashCell`: remove `onSell` prop; `onEquip={() => onEquip(item.id, tmpl!.slot)}`.

- [ ] **Step 4: Equipped slot popover with «Снять»**

In `EquipmentSlotCell`, add props `inBattle`, `onUnequip: () => void`.

When `item` is defined, popover:

```tsx
function characterSlotPopover(
  item: ItemInstance,
  inBattle: boolean,
  onUnequip: () => void,
) {
  const tmpl = getItemTemplate(item.templateId)
  const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {tmpl ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {itemPriceLine(tmpl.shopPrice)}
        </Typography.Text>
      ) : null}
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[{ key: 'unequip', label: 'Снять', onClick: onUnequip }]}
      />
    </Space>
  )
}
```

Pass `onUnequip={() => onUnequip(slot)}` from parent map.

Remove `compareText`-only popover branch conflict: when dragging, keep compare overlay; when not dragging, show slot popover above.

- [ ] **Step 5: Droppable empty stash cells + slot→stash unequip**

Add `StashEmptyCell` component:

```tsx
function StashEmptyCell({ index, inBattle }: { index: number; inBattle: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stashEmptyDragId(index),
    disabled: inBattle,
  })
  return (
    <div ref={setNodeRef} style={{ display: 'inline-block' }}>
      <InventoryCell
        state={isOver ? 'dragOver' : 'empty'}
        ariaLabel="Пустой слот инвентаря"
      />
    </div>
  )
}
```

In `handleDragEnd`, replace slot→`DROP_STASH` branch with:

```tsx
if (active.kind === 'slot' && (over.kind === 'stash' || over.kind === 'stash-empty')) {
  onUnequip(active.value as EquipmentSlot)
  return
}
```

Update `parseDragId` usage — `stash-empty` kind works with existing parser (`kind: 'stash-empty', value: '0'`).

- [ ] **Step 6: Remove DropZone «↩ Снять сюда»**

Delete `DropZone` usage at bottom and `DROP_STASH` import if unused. Remove `DropZone` helper if only used here.

- [ ] **Step 7: Remove `onSell` from `EquipmentInventoryView` props and all internal references**

- [ ] **Step 8: Verify**

Run: `npm run test && npm run build && npm run lint`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/features/inventory/EquipmentInventoryView.tsx src/features/inventory/inventoryDnD.ts src/features/campaign/CampaignCharacterTab.tsx src/features/campaign/CampaignHub.tsx
git commit -m "feat: character equip/unequip popover, slot drag to stash"
```

---

### Task 4: `ShopInventoryView` — buy popover, instant sell, no shop DnD

**Files:**
- Modify: `src/features/inventory/ShopInventoryView.tsx`

**Interfaces:**
- Consumes: `ItemPopoverActions`, `itemPriceLine`, `itemSellPrice`, `itemInstanceDescriptionLinesFromInstance`, `itemPerLevelBonusesLines`, `equipmentSlotLabelRu`

- [ ] **Step 1: Remove DnD imports and shop drag**

Delete: `DndContext`, `DragOverlay`, `useDraggable`, `useDroppable`, `DROP_BUY`, `shopDragId`, `parseDragId`, drag sensors/state/handlers, buy drop zone, `DragOverlay` block.

- [ ] **Step 2: Simplify `ShopTemplateCell` — no drag**

Plain div wrapper; popover content:

```tsx
function shopTemplatePopover(
  templateId: string,
  inBattle: boolean,
  canBuy: boolean,
  onBuy: () => void,
) {
  const t = getItemTemplate(templateId)!
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 280 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        <li>
          <Typography.Text style={{ fontSize: 12 }}>
            {equipmentSlotLabelRu(t.slot)} · {itemPerLevelBonusesLines(t).join(' · ')}
          </Typography.Text>
        </li>
      </ul>
      <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(t.shopPrice)}</Typography.Text>
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[
          {
            key: 'buy',
            label: 'Купить',
            type: 'primary',
            disabled: !canBuy,
            onClick: onBuy,
          },
        ]}
      />
    </Space>
  )
}
```

Update `contextBadge={`${t.shopPrice} 💰`}` (was `` `💰${t.shopPrice}` ``).

- [ ] **Step 3: Replace `StashPreviewCell` popover — instant sell**

Remove `StashItemPopoverContent`. Use:

```tsx
function shopStashPopover(
  item: ItemInstance,
  inBattle: boolean,
  onSell: () => void,
) {
  const tmpl = getItemTemplate(item.templateId)
  const sellPrice = tmpl ? itemSellPrice(tmpl) : 0
  const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {tmpl ? (
        <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(sellPrice)}</Typography.Text>
      ) : null}
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[
          {
            key: 'sell',
            label: 'Продать',
            danger: true,
            disabled: sellPrice <= 0,
            onClick: onSell,
          },
        ]}
      />
    </Space>
  )
}
```

Badge: `` contextBadge={t ? `${itemSellPrice(t)} 💰` : undefined} ``

- [ ] **Step 4: Update help text**

Replace paragraph with:

```tsx
<Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
  Двойной клик по товару — покупка. Продажа — через popover или «Быстрая продажа» ниже.
</Typography.Paragraph>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/inventory/ShopInventoryView.tsx
git commit -m "feat: shop buy/sell popover, remove shop drag-to-buy"
```

---

### Task 5: Quick sell mode + selected cell styling

**Files:**
- Modify: `src/features/inventory/ShopInventoryView.tsx`
- Modify: `src/features/inventory/inventory.css`
- Modify: `src/features/inventory/InventoryCell.tsx` (optional `selected?: boolean`)

**Interfaces:**
- Produces: quick sell toggle + multi-select + batch bar in `ShopInventoryView`

- [ ] **Step 1: Add CSS for selected cells**

In `inventory.css`:

```css
.inv-cell--selected {
  border: 2px solid #1677ff;
  box-shadow: inset 0 0 0 1px #1677ff;
}

.inv-cell--selected::after {
  content: '✓';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  line-height: 1;
  color: #1677ff;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 2px;
  padding: 0 2px;
}
```

If checkmark conflicts with level badge, use top-left for ✓.

- [ ] **Step 2: Add state in `ShopInventoryView`**

```tsx
const [quickSellMode, setQuickSellMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

function toggleQuickSell() {
  setQuickSellMode((v) => {
    if (v) setSelectedIds(new Set())
    return !v
  })
}

function toggleSelected(itemId: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(itemId)) next.delete(itemId)
    else next.add(itemId)
    return next
  })
}

function totalSellPrice(ids: Set<string>): number {
  let sum = 0
  for (const id of ids) {
    const item = stash.find((i) => i.id === id)
    if (!item) continue
    const t = getItemTemplate(item.templateId)
    if (t) sum += itemSellPrice(t)
  }
  return sum
}

function sellSelected() {
  for (const id of selectedIds) onSell(id)
  setSelectedIds(new Set())
}
```

- [ ] **Step 3: UI above stash grid**

```tsx
<Space wrap style={{ marginBottom: 8 }}>
  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
    В инвентаре (не экипировано)
  </Typography.Text>
  <Button
    size="small"
    type={quickSellMode ? 'primary' : 'default'}
    disabled={inBattle || stash.length === 0}
    onClick={toggleQuickSell}
  >
    Быстрая продажа
  </Button>
</Space>
```

- [ ] **Step 4: Wire `StashPreviewCell` click + selected class**

Add props: `quickSellMode`, `selected`, `onCellClick`.

```tsx
<InventoryCell
  ...
  className={selected ? 'inv-cell--selected' : undefined}
  onClick={
    quickSellMode
      ? (e) => {
          e.stopPropagation()
          onCellClick()
        }
      : undefined
  }
/>
```

When `quickSellMode`, pass `onCellClick={() => toggleSelected(item.id)}`.

- [ ] **Step 5: Batch bar below stash grid**

```tsx
{quickSellMode && selectedIds.size > 0 ? (
  <Space style={{ marginTop: 8 }}>
    <Typography.Text style={{ fontSize: 12 }}>
      Выбрано: {selectedIds.size} · {totalSellPrice(selectedIds)} 💰
    </Typography.Text>
    <Button size="small" type="primary" danger onClick={sellSelected}>
      Продать выбранное
    </Button>
  </Space>
) : null}
```

- [ ] **Step 6: Verify manually + build**

Run: `npm run build && npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/inventory/ShopInventoryView.tsx src/features/inventory/inventory.css
git commit -m "feat: quick sell multi-select mode in shop"
```

---

### Task 6: Cleanup dead code

**Files:**
- Delete: `src/features/inventory/StashItemPopoverContent.tsx`
- Modify: `src/features/inventory/inventoryDnD.ts` — remove `DROP_BUY`, `DROP_SELL`, `DROP_STASH` if unused
- Modify: `src/game/descriptions/itemText.ts` — remove `itemBuyPriceLine` / `itemSellPriceLine` if zero imports

- [ ] **Step 1: Delete StashItemPopoverContent**

```bash
git rm src/features/inventory/StashItemPopoverContent.tsx
```

- [ ] **Step 2: Grep and remove unused exports**

Run: `rg "DROP_BUY|DROP_SELL|DROP_STASH|itemBuyPriceLine|itemSellPriceLine|StashItemPopoverContent" src`

Remove any remaining dead constants/functions.

- [ ] **Step 3: Final verification**

Run: `npm run test && npm run build && npm run lint`
Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove StashItemPopoverContent and unused dnd constants"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|------------------|------|
| `itemPriceLine` `{N} 💰` | Task 1 |
| No buy/sell in instance description | Task 1 |
| `ItemPopoverActions` no Popconfirm | Task 2 |
| Character «Надеть» / «Снять» | Task 3 |
| Remove character sell + drop zone | Task 3 |
| Slot → stash unequip | Task 3 |
| Shop «Купить» popover + double-click | Task 4 |
| Remove shop DnD / buy zone | Task 4 |
| Shop stash instant «Продать» | Task 4 |
| Badge `{price} 💰` | Task 4 |
| Quick sell mode + batch | Task 5 |
| Character reference price secondary | Task 3 |

## Manual Test Plan

1. **Магазин:** popover товара → «Купить» без confirm; double-click покупает; недостаток золота → disabled + warning на double-click.
2. **Магазин stash:** popover → «Продать» мгновенно.
3. **Быстрая продажа:** toggle → выделить 2 предмета → «Продать выбранное» → золото суммируется; режим остаётся активным; toggle off сбрасывает выделение.
4. **Персонаж:** stash popover «Надеть»; slot popover «Снять»; drag slot → stash cell снимает; **нет** «Продать».
5. **Бой:** все кнопки disabled.
