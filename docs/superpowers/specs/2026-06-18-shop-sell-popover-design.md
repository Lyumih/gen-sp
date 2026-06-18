# Дизайн: продажа предметов в магазине через popover

**Дата:** 2026-06-18  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`, `src/features/inventory/ShopInventoryView.tsx`, `src/features/inventory/EquipmentInventoryView.tsx`, `src/game/descriptions/itemText.ts`, `SELL_ITEM` в `runReducer.ts`

## 1. Цель

Добавить **продажу предметов из stash в магазине** и унифицировать UX продажи: popover с полным описанием, ценами покупки/продажи и кнопкой «Продать» с подтверждением. Убрать drag-зону продажи на вкладке «Персонаж».

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Продажа в магазине | **C:** popover + кнопка «Продать» (без drag) |
| Стоимость в описании | **C:** строки покупки и продажи в popover + бейдж `💰{sellPrice}` на stash-клетке в магазине |
| Вкладка «Персонаж» | **B:** только popover; drag-зону «🗑️ Продать» убрать |
| Подтверждение | **B:** Popconfirm «Продать за X зол.?» для каждой продажи |
| Архитектура UI | **B:** общий компонент `StashItemPopoverContent` |

## 3. Game logic

Без изменений reducer. Используется существующий `SELL_ITEM { itemId }`:

- Предмет в `items`, не экипирован
- `gold += floor(shopPrice * 0.5)`
- No-op в бою, для экипированных, при отсутствии предмета

## 4. Тексты (`itemText.ts`)

Добавить:

```ts
export function itemBuyPriceLine(t: ItemTemplate): string {
  return `Покупка: ${t.shopPrice} зол.`
}
```

В `itemInstanceDescriptionLines` в конце, в фиксированном порядке:

1. `itemBuyPriceLine(t)`
2. `itemSellPriceLine(t)` — `Продажа: X зол. (50% от Y)`

Popover stash использует `itemInstanceDescriptionLinesFromInstance` — buy/sell попадают автоматически.

## 5. Компонент `StashItemPopoverContent`

**Путь:** `src/features/inventory/StashItemPopoverContent.tsx`

**Props:**

```tsx
type StashItemPopoverContentProps = {
  item: ItemInstance
  inBattle: boolean
  onSell: (itemId: string) => void
}
```

**Разметка:**

1. `<ul>` со строками из `itemInstanceDescriptionLinesFromInstance`
2. `Popconfirm` + `Button danger` «Продать»
   - `title`: `Продать за {itemSellPrice(tmpl)} зол.?`
   - `okText`: «Продать», `cancelText`: «Отмена»
   - `onConfirm`: `onSell(item.id)`
3. `inBattle` → кнопка `disabled`; при необходимости `Tooltip` «Доступно после боя»

Кнопка показывается **только для stash-предметов** (компонент не используется для экипированных слотов).

## 6. Интеграция

### 6.1. `ShopInventoryView`

- Новый prop: `onSell: (itemId: string) => void`
- `StashPreviewCell` → popover с `StashItemPopoverContent`
- Контекстный бейдж клетки stash: `💰{itemSellPrice(tmpl)}` (вместо emoji слота)
- Stash **не** draggable для продажи

### 6.2. `EquipmentInventoryView`

- Stash-клетки: popover через `StashItemPopoverContent` (заменить inline `<ul>`)
- **Удалить:** drop zone `DROP_SELL`, обработку stash → sell в `handleDragEnd`, tooltip «50% от цены»
- Сохранить: drag equip, reorder stash, compare-on-hover, sort buttons

### 6.3. `CampaignHub` / `CampaignShopTab`

- `CampaignShopTab`: prop `onSell`, передать в `ShopInventoryView`
- `CampaignHub`: `onSell={sellItem}` в оба таба (Character уже имеет)
- `sellItem`: при экипированном — `message.warning('Сначала снимите предмет')`

## 7. Error handling

| Ситуация | UI |
|----------|-----|
| Экипированный предмет | Кнопки «Продать» нет (не в stash) |
| `inBattle` | Кнопка disabled + tooltip |
| Reducer no-op | Без ложного success; состояние без изменений |

## 8. Тесты

- `itemText.test.ts`: `itemBuyPriceLine`, наличие buy+sell в `itemInstanceDescriptionLines`
- `runReducer.test.ts`: без изменений
- Manual: popover + Popconfirm в магазине и на персонаже; drag-зоны продажи нет

## 9. Out of scope

- Продажа экипированных предметов из popover слота
- Изменение формулы 50%
- Drag-продажа

---

**Следующий шаг:** implementation plan (`writing-plans` skill) после ревью этого файла.
