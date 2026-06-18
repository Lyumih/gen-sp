# Дизайн: универсальная сетка инвентаря (экипировка, карты, магазин)

**Дата:** 2026-06-18  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-03-28-shop-equipment-design.md`, `src/game/campaign/runReducer.ts`, `src/game/types.ts`, `src/features/campaign/CampaignCharacterTab.tsx`, `src/features/campaign/CampaignShopTab.tsx`

## 1. Цель

Заменить текущий UI инвентаря (текстовый stash, `Select` для экипировки, список карт, карточки магазина) на **универсальную сетку с эмодзи в клетках**. Одно ядро (`InventoryGrid` + `InventoryCell`) используется в трёх режимах:

1. **Экипировка персонажа** — мини-сетка слотов + stash, drag-and-drop.
2. **Карты умений** — reorder + выбор цели модов за kill.
3. **Магазин** — drag шаблона в stash / drop zone для покупки.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Размер сетки | **C:** базовый минимум **4×3** (12 клеток) + новые ряды при переполнении |
| Экипировка | **C:** мини-сетка 3 слота сверху + stash-сетка снизу, **drag-and-drop** между ними |
| Магазин / карты | **C:** DnD — магазин → stash (покупка); карты — reorder + выбор `modKillTarget` |
| Эмодзи | **C:** дефолт по типу слота/карты + опциональный `emoji?` в шаблоне |
| Содержимое клетки | **C:** эмодзи + бейдж уровня (`UI_LEVEL`) + контекстный бейдж (цена / слот / урон) |
| Архитектура UI | **B:** ядро + режимные view-компоненты (не монолитный `variant`) |
| DnD-библиотека | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` |

## 3. Архитектура компонентов

```
src/features/inventory/
  InventoryGrid.tsx           # CSS-grid, размер, пустые клетки, расширение рядов
  InventoryCell.tsx           # одна клетка: emoji, бейджи, состояния
  inventoryGridUtils.ts       # calcGridRows, slot filling
  inventoryEmoji.ts           # resolveEmoji(template, kind)
  previewEquipDelta.ts        # ΔHP / ΔcardLevel для compare-on-hover
  EquipmentInventoryView.tsx  # слоты + stash + sell zone + sort
  ShopInventoryView.tsx       # товары → drag в stash preview
  CardsInventoryView.tsx      # карты + modKillTarget highlight
  inventory.css               # фикс. размер клетки, состояния рамок
```

### 3.1. Data flow

```
CampaignHub (callbacks + App.useApp().message)
    ↓ dispatchRun
gameStore → applyRunAction (runReducer)
    ↓
CampaignState { items, equipment, cards, modKillTargetCardId, gold }
    ↓ props + callbacks
EquipmentInventoryView / ShopInventoryView / CardsInventoryView
    ↓
InventoryGrid + InventoryCell (presentational)
```

View-компоненты **не** вызывают `useGameStore` напрямую — callbacks из `CampaignHub`, как сейчас `onEquip` / `onBuy`.

### 3.2. Интеграция в табы

| Таб | Изменение |
|-----|-----------|
| `CampaignCharacterTab` | `EquipmentInventoryView` + `CardsInventoryView`; убрать `CampaignStashLine`, `Select`, `<ul>` карт |
| `CampaignShopTab` | `ShopInventoryView` + stash preview grid; убрать `Card` wrap и `CampaignStashLine` |
| `CampaignHub` | Новые callbacks: `reorderCards`, `setModKillTarget`, `sellItem`, `reorderStash` |

### 3.3. Удаляемое

- `CampaignStashLine.tsx` (после миграции всех потребителей)

## 4. Визуал сетки и клетки

### 4.1. Параметры сетки

- **Размер клетки:** 56×56 px (согласовано с боевой сеткой ~58px, но компактнее для 4 колонок в `maxWidth: 720`).
- **Базовый размер:** `minCols = 4`, `minRows = 3`.
- **Расширение:** `rows = max(minRows, ceil(itemCount / minCols))`; пустые клетки в последнем ряду — видимые слоты (пунктирная рамка или `UI_CELL`).
- **Gap:** 4px (как `BattleScreen`).

### 4.2. Слои `InventoryCell`

```
┌──────────────┐
│   emoji      │  центр, fontSize ~28
│         ⭐3  │  правый верх: UI_LEVEL + level
│ 💰10 / ⚔️    │  левый низ: контекстный бейдж
└──────────────┘
```

| Режим | Контекстный бейдж |
|-------|-------------------|
| Магазин | `💰{shopPrice}` |
| Stash / слот экипировки | emoji слота (⚔️ / 🛡️ / 💍) |
| Карты | `{UI_DAMAGE}{expectedDamage}` через `describeCardCombatStats` |

### 4.3. Состояния клетки

| Состояние | Визуал | Поведение |
|-----------|--------|-----------|
| `empty` | пунктир | не draggable |
| `filled` | solid border | draggable (если режим позволяет) |
| `equipped` | зелёная рамка 2px | слот экипировки |
| `modKillTarget` | золотая рамка + 🎯 | карта-цель модов |
| `disabled` | opacity 0.5 | `inBattle` — без DnD |
| `dragOver` | подсветка drop zone | — |
| `invalidDrop` | красная вспышка | неверный слот / нет золота |

**Popover** (hover desktop / click): полное описание через `itemInstanceDescriptionLinesFromInstance` или `describeCardCombatStats`.

### 4.4. Эмодзи (`inventoryEmoji.ts`)

Дефолты:

- `weapon` → ⚔️, `armor` → 🛡️, `accessory` → 💍, `card` → 🃏

Правило: `template.emoji ?? defaultBySlotOrKind`.

Добавить опциональное `emoji?: string` в `ItemTemplate` и `CardAttackTemplate`. Для текущих шаблонов задать явно: 🗡️ (деревянный меч), 🥋 (кожаная броня), 💍 (медное кольцо), 🃏 или ⚔️ (удар).

## 5. Drag-and-drop потоки

### 5.1. Экипировка (`EquipmentInventoryView`)

```
[⚔️ слот] [🛡️ слот] [💍 слот]   ← фикс. 3 клетки, подписи SLOT_LABEL
─────────────────────────────────
[ stash grid 4×N ]                ← getStashItems(campaign)
[ 🗑️ sell drop zone ]             ← SELL_ITEM
```

| Drag from → to | Действие |
|----------------|----------|
| Stash → слот (тип совпадает) | `EQUIP_ITEM { itemId, slot }` |
| Stash → слот (тип не совпадает) | reject + `message.warning` |
| Stash → stash | `REORDER_STASH` |
| Слот → stash (drop zone / пустая область) | `UNEQUIP_ITEM { slot }` |
| Stash → sell zone | `SELL_ITEM { itemId }` |
| Слот → другой слот | reject (разные типы слотов) |

### 5.2. Магазин (`ShopInventoryView`)

```
[ shop grid: шаблоны ]  ──drag──►  [ stash preview drop zone ]
```

- Drag шаблона в drop zone → `BUY_ITEM { templateId }` если `gold >= shopPrice`.
- Double-click на шаблон → покупка (accessibility / quick-buy fallback).
- Недостаточно золота → `message.warning('Недостаточно золота')`.

### 5.3. Карты (`CardsInventoryView`)

- Drag внутри сетки → `REORDER_CARDS { cardIds }`.
- Click или designated drop на карту → `SET_MOD_KILL_TARGET { cardId }`.
- Активная карта (`modKillTargetCardId`): золотая рамка + 🎯; подпись «Моды за kill → {getCardDisplayLabel}».

## 6. UX-улучшения (все в scope v1)

| # | Улучшение | Реализация |
|---|-----------|------------|
| 1 | **Compare-on-hover** | При hover/drag stash-предмета подсветить целевой слот; Popover с `Δ❤️`, `Δ💥` через `previewEquipDelta(campaign, itemId, slot)` |
| 2 | **Sell-back** | Drop zone «🗑️ Продать»; drag stash → zone → `SELL_ITEM`; возврат `floor(shopPrice * 0.5)` золота; tooltip «50% от цены» |
| 3 | **Quick-equip** | Double-click stash → `EQUIP_ITEM` в слот шаблона; занятый слот — атомарная замена (как в reducer) |
| 4 | **Stash sort** | Кнопки «По слоту» / «По уровню» → вычисленный порядок → `REORDER_STASH`; ручной DnD перезаписывает порядок |
| 5 | **In-battle read-only** | `inBattle` → DnD off, opacity 0.5, `Tooltip`: «Доступно после боя» |
| 6 | **Card mod target ↔ бой** | 🎯 на `modKillTargetCardId` в хабе; та же метка у активной карты в `BattleScreen` (если есть UI карт) |
| 7 | **Empty slot hint** | Пустой слот: emoji слота + «перетащи» (`Typography.Text type="secondary"`) |

## 7. Game actions

### 7.1. Существующие (без изменений семантики)

- `BUY_ITEM { templateId }`
- `EQUIP_ITEM { itemId, slot }`
- `UNEQUIP_ITEM { slot }`

### 7.2. Новые

```ts
| { type: 'REORDER_CARDS'; cardIds: string[] }
| { type: 'SET_MOD_KILL_TARGET'; cardId: string | null }
| { type: 'SELL_ITEM'; itemId: string }
| { type: 'REORDER_STASH'; itemIds: string[] }
```

**`REORDER_CARDS`:** `cardIds` — полный список id в новом порядке; должен совпадать по множеству с `state.cards`. No-op при `inBattle` или невалидном наборе.

**`SET_MOD_KILL_TARGET`:** устанавливает `modKillTargetCardId`. No-op при `inBattle` или если `cardId` не в `cards` (кроме `null`).

**`SELL_ITEM`:**

- Предмет должен быть в `items` и **не** экипирован.
- `gold += floor(template.shopPrice * 0.5)`.
- Предмет удаляется из `items`.
- No-op при `inBattle`, отсутствии предмета, экипированном предмете.

**`REORDER_STASH`:**

- `itemIds` — порядок только stash-предметов (не экипированных); множество id должно совпадать с `getStashItems(state)`.
- Результирующий `items`: сначала экипированные в порядке `EQUIPMENT_ROLL_ORDER` (по занятым слотам), затем stash-id **строго** в порядке `itemIds`.
- No-op при `inBattle` или невалидном наборе.

Все новые actions отражаются в `BattleAttemptSnapshot` через `buildBattleAttemptSnapshot` (retry откатывает порядок, продажи, mod target).

## 8. Error handling (UI)

| Ситуация | Feedback |
|----------|----------|
| Недостаточно золота | `message.warning('Недостаточно золота')` |
| Неверный слот | `message.warning('Не подходит к этому слоту')` + `invalidDrop` |
| Продажа экипированного | `message.warning('Сначала снимите предмет')` |
| Action в бою | блок + tooltip, без message spam |
| Reducer no-op | UI без ложного success |

**Accessibility:** Enter/Space на focused cell → Popover; double-click → quick-equip / quick-buy.

## 9. Зависимости

```json
"@dnd-kit/core": "^6.x",
"@dnd-kit/sortable": "^10.x",
"@dnd-kit/utilities": "^3.x"
```

## 10. Тесты

### 10.1. Game logic (`runReducer.test.ts`)

- `REORDER_CARDS` — valid reorder, invalid ids, inBattle no-op
- `SET_MOD_KILL_TARGET` — set/clear, invalid id
- `SELL_ITEM` — gold +50%, removal, equipped no-op, inBattle no-op
- `REORDER_STASH` — order persisted; snapshot restore on `RETRY_CURRENT_BATTLE`

### 10.2. Utils

- `inventoryGridUtils.test.ts` — `calcGridRows`
- `inventoryEmoji.test.ts` — defaults + override
- `previewEquipDelta.test.ts` — delta HP / card level bonus

UI smoke-тесты — опционально, не блокер v1.

## 11. Миграция и persistence

- `emoji?` в шаблонах — опционально, миграция не нужна.
- Порядок `items` / `cards` сохраняется через существующий localStorage debounce.
- Старые сейвы: порядок как в массивах; `modKillTargetCardId` уже мигрируется в `migrate.ts`.

## 12. Связь с боем (п. 6 UX)

В `BattleScreen` при отображении карт (или в HUD) показать метку 🎯 у карты с `id === modKillTargetCardId` из snapshot/боя — визуальная связь хаб ↔ бой.

---

**Следующий шаг:** implementation plan (`writing-plans` skill) после ревью этого файла пользователем.
