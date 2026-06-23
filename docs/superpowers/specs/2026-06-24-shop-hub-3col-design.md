# Shop hub: 3-колоночный экран магазина

**Дата:** 2026-06-24  
**Статус:** утверждено (brainstorming)  
**Связь:** `AGENTS.md`, `docs/superpowers/specs/2026-06-24-character-hub-3col-design.md`, `docs/superpowers/specs/2026-06-24-mvp-ui-layout-design.md`, `src/features/campaign/CampaignShopTab.tsx`

---

## 1. Цель

Переработать вкладку **Магазин** в тот же **browser-RPG layout**, что вкладка **Персонаж**:

1. **3 колонки:** rail героев | контекст билда | вкладки торговли.
2. **Магазин = экономика:** покупка, продажа, сундук; **без** полного loadout и **без** DnD.
3. **Отдельная вкладка хаба** — не сливать с Персонажем (режим «потратить золото» vs «собрать билд»).

**Вне scope:**

- Изменение reducer, цен, `generateShopOffers`, `BUY_SHOP_OFFER`.
- DnD на вкладке магазина (перенос сундук ↔ герой, сортировка stash).
- Toast / авто-переход на Персонаж после покупки (отдельная фича позже).
- Редизайн таверны, Персонажа, Боя.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Вкладка хаба | **Отдельная «Магазин»** (не вкладка внутри Персонажа) |
| Макет | **3 колонки** @1280px: rail ~88px \| build ~360px \| tabs flex |
| Офферы | Правая колонка, вкладка **«Магазин»** (не full-width сверху) |
| Правая колонка | **Магазин \| Продажа \| Сундук (N)** |
| Центр | **Урезанный билд:** StatStrip + склонность + «Надето» (просмотр + снятие) |
| Продажа | Stash grid + popover «Продать» + режим **«Быстрая продажа»** |
| Rail | Тот же **`CharacterRail`**, без ✎ облика и ⋮ «Отпустить» |
| Взаимодействие | **Только клик** — без `DndContext` на вкладке |
| Архитектура | **`ShopHubLayout`** в `src/features/shop/hub/` |

---

## 3. Подходы (выбранный — 1)

| # | Подход | Плюсы | Минусы |
|---|--------|-------|--------|
| **1** | `ShopHubLayout` + `ShopBuildPanel` + `ShopSellPanel`; переиспользование `CharacterRail`, `ShopOffersGrid`, `ChestInventoryView` | Симметрия с Character hub; чёткие границы | 4–6 новых файлов |
| 2 | `CharacterHubLayout` + `mode="shop"` | Один layout | Смешение equip-DnD и shop-click |
| 3 | Монолитный `CampaignShopTab` | Меньше файлов | Снова комбайн, дублирование |

---

## 4. Макет вкладки «Магазин»

```
┌────────┬──────────────────────┬─────────────────────────────┐
│ RAIL   │ BUILD (shop)         │ TABS                        │
│ ~88px  │ ~360px               │ 1fr                         │
│        │                      │                             │
│ [герой]│ ⚔️ Имя · Класс ⭐5   │ Магазин│Продажа│Сундук(3)   │
│ [герой]│ ❤️23 … · ★78%        │ [Обновить (N 💰)]           │
│  ●отряд│ Склонность           │ ┌───┬───┬───┬───┐           │
│        │ ── Надето ──         │ │офф│офф│офф│офф│           │
│        │ [⚔][🛡][💍]         │ └───┴───┴───┴───┘           │
└────────┴──────────────────────┴─────────────────────────────┘
```

### 4.1. CSS grid

Переиспользовать класс **`.game-character-hub`** из `game-layout.css` (тот же grid, что на Персонаже). Отдельный класс не нужен.

Breakpoint **900px** — одна колонка: rail → build → tabs.

### 4.2. Внешняя обёртка

- Убрать верхний `GamePanel` «Магазин» + нижний `GameColumns` (Персонаж | Сундук).
- Три колонки сразу внутри `role="tabpanel"` (как `CampaignCharacterTab` → `CharacterHubLayout`).
- Кнопка **«Обновить (N 💰)»** — в шапке контента вкладки **Магазин** (над `ShopOffersGrid`, `size="small"`).

---

## 5. Левая колонка — `CharacterRail`

### 5.1. Поведение на магазине

- Тот же компонент `CharacterRail` из `src/features/character/hub/CharacterRail.tsx`.
- **Не передавать** `onEditAppearance`, `onReleaseCharacter`, `canReleaseCharacter` — footer с ✎ и ⋮ не рендерится (уже так устроено).
- `transferDisabled={true}` — droppable на rail **отключён** (нет DnD на вкладке).
- Выбор героя кликом; badge «в отряде» read-only.

### 5.2. Tooltip

Новая константа `SHOP_RAIL_SECTION_HELP` в `sectionTooltips.ts`:

> Выберите героя для покупки на персонажа или продажи из инвентаря. Зелёная метка — в боевом отряде.

Опционально: `SectionHelp` в заголовке build-колонки.

---

## 6. Центр — `ShopBuildPanel`

### 6.1. Блоки (сверху вниз)

| Блок | Компоненты |
|------|------------|
| Заголовок | emoji, имя, класс, `UI_LEVEL` |
| Статы | `StatStrip` + `effectiveStats` + `showRating` (как `CharacterBuildPanel`) |
| Склонность | `SpecializationLine` |
| Надето | 3 ячейки `EQUIPMENT_ROLL_ORDER` — **только просмотр + снятие** |

### 6.2. Экипировка

- Переиспользовать `EquipmentSlotRow` или slim-ячейки с тем же popover, что на магазине сейчас.
- **Нет** equip из stash, **нет** drag, **нет** mod picker на магазине (modsDisabled).
- Клик / popover «Снять» → `onUnequip(characterId, slot)` — чтобы освободить слот и продать предмет из stash.

### 6.3. Чего нет в центре

- Слоты карт и пассивок в бою.
- `EquipDeltaStrip` / loadout focus.
- Текстовый список карт (`Карты: …`).

---

## 7. Правая колонка — вкладки

### 7.1. Вкладка «Магазин»

- `ShopOffersGrid` — без изменения публичного API.
- Props: `offers`, `gold`, `inBattle`, `selectedCharacterId`, `selectedCharacterName`, `onBuy`, `onInsufficientGold`.
- Пустой ассортимент: текст «Ассортимент пуст — нажмите «Обновить»» (как сейчас).
- Покупка предмета: radio **Сундук / Персонаж** в popover (как сейчас).
- Умения и навыки: покупка → сундук (как сейчас).
- Double-click на ячейке оффера — покупка (как сейчас).

### 7.2. Вкладка «Продажа»

Новый компонент **`ShopSellPanel`**:

- Сетка stash выбранного героя (`stashItemsFromCampaign`).
- Popover на ячейке: описание + **«Продать»** (`onSellItem`).
- Кнопка **«Быстрая продажа»** — toggle; в режиме клик по ячейке выделяет (`inv-cell--selected`); внизу «Продать выбранное» + сумма 💰.
- Логика переносится из `ShopInventoryView` (`quickSellMode`, `selectedIds`, `totalSellPriceForIds`).
- Сортировка stash **не** в MVP (нет drag/reorder на магазине).

### 7.3. Вкладка «Сундук (N)»**

- `ChestInventoryView` с `showIntro={false}`, `dndEnabled={false}`.
- `bindCharacterId` = выбранный герой; те же handlers, что в текущем `CampaignShopTab`.
- Badge `N` = `chest.items.length + unboundCards.length + unboundPassives.length`.

### 7.4. Tooltips вкладок

| Константа | Текст (черновик) |
|-----------|------------------|
| `SHOP_OFFERS_SECTION_HELP` | Ассортимент обновляется за золото. Двойной клик — покупка. Предмет можно отправить в сундук или выбранному герою. |
| `SHOP_SELL_SECTION_HELP` | Предметы не в экипировке. Продажа через popover или «Быстрая продажа». |
| `CHEST_SECTION_HELP` | Переиспользовать существующую строку (привязка к выбранному герою). |

---

## 8. `ShopHubLayout` и wiring

### 8.1. Файлы

| Файл | Действие |
|------|----------|
| `src/features/shop/hub/types.ts` | Create — `ShopTabKey`: `'offers' \| 'sell' \| 'chest'` |
| `src/features/shop/hub/ShopBuildPanel.tsx` | Create |
| `src/features/shop/hub/ShopSellPanel.tsx` | Create |
| `src/features/shop/hub/ShopHubLayout.tsx` | Create |
| `src/features/shop/hub/index.ts` | Create |
| `src/features/campaign/CampaignShopTab.tsx` | Modify — тонкая обёртка → `ShopHubLayout` |
| `src/features/campaign/sectionTooltips.ts` | Modify — shop help strings |
| `src/features/inventory/ShopInventoryView.tsx` | Deprecate / удалить, если нигде не импортируется |

### 8.2. Props `ShopHubLayout`

Те же callbacks, что у текущего `CampaignShopTab` (без новых reducer actions):

```ts
campaign, inBattle
onRefreshShop, onBuyOffer, onInsufficientGold
onSellChestItem, onSellChestCard, onSellChestPassive
onSellItem, onBindChestCard, onBindChestPassive
onMoveChestItemToCharacter?, onUnequip
```

### 8.3. Локальное состояние

- `selectedCharacterId` — `useState`, синхронизация при исчезновении героя (как на Персонаже).
- `stashTab` / `activeTab` — default `'offers'`.
- Авто `onRefreshShop(true)` при `shopOffers === null` и не inBattle / не expedition — сохранить из текущего `CampaignShopTab`.

---

## 9. Freeze и доступность

| Условие | Поведение |
|---------|-----------|
| `inBattle` | Вкладка магазина disabled в header (как сейчас); ячейки `state="disabled"` |
| `expedition !== null` | `shopDisabled` в header; `inventoryLocked` на сундуке |
| Expedition / бой | Кнопка «Обновить» disabled |

Сообщения — `App.useApp().message` из `CampaignHub`, не static.

---

## 10. Удалить / не дублировать

- `CharacterRosterView` на вкладке магазина.
- Двойной `GamePanel` + `GameColumns` в `CampaignShopTab`.
- Inline stash grid и `shopStashItemPopover` в `CampaignShopTab` (переезд в `ShopSellPanel`).
- `EquipmentSlotRow` + текст карт в tab body (заменяет `ShopBuildPanel`).

---

## 11. Тестирование

| Тест | Ожидание |
|------|----------|
| `sectionTooltips.test.ts` | Новые константы содержат ключевые слова |
| `ShopSellPanel.test.tsx` (опционально) | Quick-sell toggle выделяет ячейки |
| `npm run build` | PASS |
| Ручной smoke @1280px | rail → build → три вкладки; покупка в сундук/героя; продажа; bind из сундука |

---

## 12. Критерии готовности

1. Вкладка «Магазин» использует `.game-character-hub` (3 колонки).
2. `CharacterRail` без облика/отпустить; выбор героя влияет на buy destination и bind.
3. Центр: StatStrip + надето + unequip; без карт/пассивок в бою.
4. Вкладки: Магазин (офферы + обновить) | Продажа (popover + quick-sell) | Сундук (N).
5. Нет `DndContext` на вкладке.
6. Reducer и цены без изменений.
7. `CampaignHub` wiring props без изменений семантики.

---

## 13. Self-review (2026-06-24)

- **Placeholders:** нет TBD; toast/auto-nav отложены явно в §1.
- **Consistency:** grid и rail согласованы с character-hub spec; shop без DnD явно отличен от Персонажа.
- **Scope:** один implementation plan; merge с Персонажем отклонён в §2.
- **Ambiguity:** `EquipmentSlotRow` vs slim cells — оставлено «переиспользовать EquipmentSlotRow или slim»; в плане выбрать один путь (предпочтение: `EquipmentSlotRow` для минимального diff).
