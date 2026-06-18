# Дизайн: кнопки Купить/Надеть/Снять, мгновенные сделки, быстрая продажа

**Дата:** 2026-06-18  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`, `docs/superpowers/specs/2026-06-18-shop-sell-popover-design.md`, `src/features/inventory/ShopInventoryView.tsx`, `src/features/inventory/EquipmentInventoryView.tsx`, `src/game/descriptions/itemText.ts`, `SELL_ITEM` / `BUY_ITEM` в `runReducer.ts`

## 1. Цель

Упростить торговлю и экипировку: **мгновенные действия без подтверждений**, симметричные кнопки «Купить» / «Продать» / «Надеть» / «Снять» в popover, **одна строка цены** (`10 💰`), продажа **только в магазине**, режим **«Быстрая продажа»** с мультивыбором.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Быстрая продажа | **C:** режим + клик по клетке toggle выделения; вне режима — одиночная продажа через popover |
| Зона покупки drag | **A:** убрать drop-зону и drag shop→buy; остаются popover «Купить» + double-click |
| Цена на «Персонаже» | **B:** справочная цена покупки (`10 💰`), secondary, без акцента на продаже |
| Снятие экипировки | **C:** popover «Снять» + drag слот → клетка stash; отдельная drop-зона не нужна |
| Формат цены | **`{N} 💰`** — число + emoji, без «зол.» и без «Покупка:/Продажа:» |
| Подтверждения | **Нет** — Popconfirm убрать для покупки и продажи |
| Продажа на «Персонаже» | **Убрать** — только магазин |
| Архитектура UI | **B:** общее описание + `ItemPopoverActions` (composable popover) |
| Batch sell | Цикл `onSell(id)` по выделенным; reducer без изменений |

## 3. Game logic

Без изменений reducer. Используются существующие actions:

- `BUY_ITEM { templateId }` — `gold >= shopPrice`, новый предмет в stash
- `SELL_ITEM { itemId }` — stash only, `gold += floor(shopPrice * 0.5)`
- `EQUIP_ITEM { itemId, slot }`
- `UNEQUIP_ITEM { slot }`

Batch sell в UI: последовательный dispatch `SELL_ITEM` для каждого выбранного id (React batching). No-op для экипированных / в бою — предметы в stash preview не экипированы по определению.

## 4. Тексты (`itemText.ts`)

### 4.1. Единая строка цены

```ts
export function itemPriceLine(amount: number): string {
  return `${amount} 💰`
}
```

Контекстные хелперы (или параметр `kind`):

| Контекст | amount |
|----------|--------|
| Магазин → товар (popover, бейдж) | `t.shopPrice` |
| Магазин → stash (popover, бейдж) | `itemSellPrice(t)` |
| Персонаж (popover, secondary) | `t.shopPrice` |

### 4.2. Описание экземпляра

В `itemInstanceDescriptionLines`:

- **Убрать** `itemBuyPriceLine` и `itemSellPriceLine` из дефолтного набора строк
- Цена добавляется **view-слоем** через `itemPriceLine` с нужным amount (не две строки buy+sell)

Для popover товара магазина (шаблон, не экземпляр) — отдельный список строк без цены + `itemPriceLine(t.shopPrice)` в конце.

**Deprecate / удалить** из публичного API (если не используются):

- `itemBuyPriceLine` → заменить на `itemPriceLine(shopPrice)`
- `itemSellPriceLine` → заменить на `itemPriceLine(sellPrice)` где нужно

### 4.3. Бейджи на клетках

Формат `{price} 💰` (было `💰{price}`):

- Магазин, товар: `{shopPrice} 💰`
- Магазин, stash: `{sellPrice} 💰`
- Персонаж, stash/слот: emoji слота (без цены на клетке)

## 5. Компоненты popover

### 5.1. `ItemPopoverActions`

**Путь:** `src/features/inventory/ItemPopoverActions.tsx`

```tsx
type ItemPopoverActionsProps = {
  inBattle: boolean
  actions: Array<{
    key: string
    label: string
    onClick: () => void
    disabled?: boolean
    danger?: boolean
    primary?: boolean
  }>
}
```

- Без Popconfirm — `Button` с прямым `onClick`
- `inBattle` → все кнопки disabled + обёртка `Tooltip` «Доступно после боя»

### 5.2. Сборка popover по контекстам

| View | Popover content |
|------|-----------------|
| Shop template | `<ul>` stats + `{shopPrice} 💰` + actions `[Купить]` |
| Shop stash | `<ul>` instance lines (без buy/sell) + `{sellPrice} 💰` + actions `[Продать]` |
| Character stash | `<ul>` instance lines + `{shopPrice} 💰` (Typography secondary) + actions `[Надеть]` |
| Character slot (equipped) | `<ul>` instance lines + `{shopPrice} 💰` (secondary) + actions `[Снять]` |
| Character slot (empty) | hint «перетащи» — без кнопок |

### 5.3. Замена `StashItemPopoverContent`

Рефакторинг или удаление: логика распределяется между shop/character popover builders. Shop stash использует sell action; character — equip/unequip без sell.

## 6. Вкладка «Персонаж» (`EquipmentInventoryView`)

### 6.1. Удалить

- Drop-зона «↩ Снять сюда» (`DROP_STASH` как отдельный UI)
- `onSell` prop и `StashItemPopoverContent` с кнопкой «Продать»
- `CampaignCharacterTab` / `CampaignHub`: не передавать `onSell` в character tab

### 6.2. Popover actions

- **Stash cell:** «Надеть» → `onEquip(item.id, tmpl.slot)`
- **Equipped slot cell:** «Снять» → `onUnequip(slot)`

### 6.3. DnD

| Drag from → to | Действие |
|----------------|----------|
| Stash → слот (тип совпадает) | `EQUIP_ITEM` |
| Stash → слот (тип не совпадает) | reject + warning |
| Stash → stash | `REORDER_STASH` |
| **Слот → stash-клетка** | `UNEQUIP_ITEM` *(новый target вместо DROP_STASH zone)* |
| Double-click stash | `EQUIP_ITEM` |

Compare-on-hover, sort buttons — без изменений.

## 7. Вкладка «Магазин» (`ShopInventoryView`)

### 7.1. Удалить

- Drop-зона «Перетащи сюда для покупки» (`DROP_BUY`)
- `DndContext` для shop→buy (если больше нет draggable shop cells — убрать DnD целиком из shop view)
- Drag с товаров магазина
- Подсказка про «перетащи в зону покупки»

### 7.2. Popover товара

- Описание шаблона + `{shopPrice} 💰`
- Кнопка **«Купить»** — мгновенно `onBuy(templateId)`; disabled если `gold < shopPrice` или `inBattle`
- Double-click на клетке — та же покупка

### 7.3. Popover stash (в магазине)

- Описание экземпляра + `{sellPrice} 💰`
- Кнопка **«Продать»** — мгновенно `onSell(itemId)`

### 7.4. Быстрая продажа

**UI:**

- Toggle `Button` «Быстрая продажа» над stash-сеткой (type toggle / primary when active)
- В активном режиме:
  - Клик по stash-клетке → toggle `selectedIds: Set<string>`
  - Визуал: класс `inv-cell--selected` (рамка + ✓ в углу)
  - Popover на hover **не блокируется** — одиночная «Продать» доступна параллельно
  - Sticky bar под сеткой: `Выбрано: {n} · {totalSellPrice} 💰` + кнопка **«Продать выбранное»**
- «Продать выбранное»: мгновенно, без confirm; после — очистить selection, **остаться в режиме** (удобно для нескольких партий)
- Toggle off → сброс selection
- `inBattle` → toggle disabled

**Подсчёт totalSellPrice:** sum `itemSellPrice(tmpl)` по выбранным.

## 8. Error handling

| Ситуация | UI |
|----------|-----|
| Недостаточно золота | «Купить» disabled; double-click → `message.warning('Недостаточно золота')` |
| Неверный слот | warning + invalidDrop flash |
| `inBattle` | кнопки disabled, toggle быстрой продажи disabled |
| Reducer no-op | без ложного success |

## 9. Тесты

- `itemText.test.ts`: `itemPriceLine`, удаление/замена buy/sell lines; character description без двойной цены
- `inventoryDnD` / slot→stash unequip: обновить id droppable если меняется с `DROP_STASH` на stash cell ids
- Manual: buy/sell instant; quick sell multi; character equip/unequip via button + drag; no sell on character

## 10. Out of scope

- Продажа экипированных из popover слота
- Изменение формулы 50%
- Undo / «Вы уверены?» для любых сделок
- Новый reducer action `SELL_ITEMS` batch
- Ctrl+click shortcuts (web без onboarding)

---

**Следующий шаг:** implementation plan (`writing-plans` skill) после ревью этого файла пользователем.
