# MVP UI: компактная компоновка и игровая шапка

**Дата:** 2026-06-24  
**Статус:** утверждено (brainstorming)  
**Связь:** `AGENTS.md`, `docs/superpowers/specs/2026-06-22-battle-field-ui-design.md`, `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`, `src/App.tsx`, `src/features/campaign/CampaignHub.tsx`, `src/features/battle/BattleScreen.tsx`

---

## 1. Цель

Финишная полировка MVP: сделать интерфейс **компактным, привычным для browser-RPG** и приятным в длительной сессии.

Ключевые изменения:

1. Ширина игры **1280px**, убрать лишние внешние отступы.
2. Горизонтальная компоновка блоков там, где это уместно (Персонаж, Магазин, Бой, Таверна).
3. Единая **компактная шапка**: бренд, icon-nav, ресурсы с подсказками, CTA «Бой».
4. Поле боя с **горизонтальным скроллом** при переполнении; тактическая панель справа.
5. Светлая тема Ant Design без тяжёлых `Card`-обёрток; секции через лёгкие панели.

**Вне scope (MVP):** тёмная тема, редизайн Кодекса (двухколоночный layout — опционально позже), мобильный touch-redesign сверх AGENTS.md.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Breakpoint | **2 колонки** ≥900px; **<900px** — стек в одну колонку |
| Визуальная тема | Светлая Ant Design; убрать лишние `Card`; `GamePanel` с тонкой рамкой |
| Ширина | `maxWidth: 1280`, `padding: 8px`, без `margin: 24px` |
| Отряд в шапке | **Не показывать** — дублирует вкладки Персонаж / Бой |
| Навигация | **Только иконки** + `Tooltip` / `aria-label`; текст табов убрать |
| Бой | Отдельная кнопка **«▶ Бой»** справа в шапке; вкладка `battle` убрать из icon-nav |
| Компоновка шапки | Вариант **1**: бренд + nav слева; `🪙` / `⚡` + CTA справа |
| Архитектура layout | **Shell + примитивы** (`GameShell`, `GameHeader`, `GamePanel`, `GameColumns`, `GameScrollX`) |

---

## 3. Глобальная оболочка

### 3.1. `App.tsx`

```ts
// Было: maxWidth 720, margin 24px auto, padding 16
// Стало:
<div style={{ maxWidth: 1280, margin: '0 auto', padding: 8 }}>
```

### 3.2. Убрать внешние Card

| Файл | Было | Стало |
|------|------|-------|
| `CampaignHub.tsx` | `Card` «Gen — кампания» | `GameShell` + контент вкладки |
| `BattleScreen.tsx` | `Card` «Бой» | `GamePanel` / секции внутри shell; action-кнопки в header extra или панели |

### 3.3. Layout-примитивы

Новая папка: `src/features/layout/`

| Компонент | Назначение |
|-----------|------------|
| `GameShell` | Корневой контейнер вкладки / боя |
| `GameHeader` | Шапка: бренд, nav, ресурсы, CTA «Бой» |
| `GamePanel` | Секция: опциональный `title`, `extra`; border `#f0f0f0`, padding `8px 10px`, без box-shadow |
| `GameColumns` | CSS grid `1fr 1fr`, media `(max-width: 900px)` → `1fr` |
| `GameScrollX` | `overflow-x: auto`, `max-width: 100%` |

Стили: `src/features/layout/game-layout.css` (grid, gap `8px`, panel).

### 3.4. Отступы

| Место | Значение |
|-------|----------|
| Между панелями | `8px` |
| Внутри панелей | `8px` |
| Hub `Space` | `size="small"` вместо `middle` / `large` |
| Dividers между секциями | убрать где заменяет `gap` панелей |

### 3.5. Константы emoji (`src/game/ui/labels.ts`)

```ts
export const UI_GOLD = '🪙'
export const UI_WORLD_POWER = '⚡'
export const UI_DNA = '🧬'  // бренд Gen
```

Использовать в шапке и HUD; в инвентарных ячейках emoji остаётся крупным (28px в `.inv-cell-emoji`).

---

## 4. Шапка (`GameHeader`)

### 4.1. Макет (одна строка)

```
🧬 Gen    [👤] [🛒] [☕] [📖¹] [?]              🪙 42   ⚡ 4   [ ▶ Бой ]
```

- **Слева:** `UI_DNA Gen` (без «кампания»).
- **Центр-лево:** icon-nav (`CampaignHubNav` рефактор).
- **Справа:** ресурсы + primary-кнопка «Бой».

### 4.2. Icon-nav

| Иконка | Вкладка | Tooltip |
|--------|---------|---------|
| `UserOutlined` | `character` | Персонаж |
| `ShoppingOutlined` | `shop` | Магазин |
| `CoffeeOutlined` | `tavern` | Таверна |
| `BookOutlined` | `codex` | Кодекс (+ Badge unread) |
| `QuestionCircleOutlined` | `help` | Справка |

- `Button` `type="text"` / `ghost`, `size="small"`, только `icon`.
- Активная вкладка: `type="primary"`.
- `mouseEnterDelay={0.3}` на `Tooltip` (AGENTS.md).
- `aria-label` = полный текст (accessibility).

**`battle` убран** из `TAB_ORDER` icon-nav.

### 4.3. Ресурсы

Компактный блок справа:

```
🪙 {gold}    ⚡ {worldPower}
```

- Emoji **16px** в шапке (не 28px).
- Число — `Typography.Text strong`.
- Каждый ресурс обёрнут в `Tooltip`:

| Ресурс | Tooltip (RU) |
|--------|----------------|
| Золото | «Золото — валюта кампании. Тратится в магазине и таверне; получаете за продажу предметов и умений.» |
| World Power | «Сила мира — глобальный множитель характеристик (+1% за единицу к базовым статам). Растёт за убийства врагов в боях кампании.» |

Текст worldPower в UI: **без** латиницы `worldPower:` — только `⚡` + число; полное имя в tooltip.

### 4.4. Кнопка «Бой»

- `Button type="primary"`, `icon={<PlayCircleOutlined />}`, label **«Бой»** (единственная текстовая кнопка в шапке кроме бренда).
- **Действие:** `setHubActiveTab('battle')` в хабе; на `BattleScreen` / `inter_battle` — визуально активна (`primary`), табы disabled как сейчас.
- **`isBattleContextActive`:** `primary` + tooltip «Экспедиция или бой в процессе».
- Во время активного `BattleScreen` навигация disabled; кнопка может показывать tooltip «Вы в бою».

### 4.5. Общий header для хаба и боя

`CampaignHubHud` + `CampaignHubNav` → объединить в `GameHeader`.

`CampaignBattleNav` использует тот же `GameHeader` (help → `Drawer`, как сейчас).

### 4.6. Disabled-состояния (без изменений логики)

| Вкладка | Условие |
|---------|---------|
| Магазин, Таверна | `expedition !== null` |
| Кодекс | `battle !== null` |
| Все кроме Справки | `BattleScreen` active (`tabsDisabled`) |

---

## 5. Вкладка «Персонаж»

### 5.1. Макет

```
┌─ Отряд (SquadSlotRow) ─────────────────────────────────────────┐
┌─ Состав (CharacterRosterView, size=small) ─────────────────────┐
┌─ Профиль (HeroProfileContent: StatStrip, склонность) ──────────┘

┌─ Экипировка + инвентарь ──────┐  ┌─ Умения и навыки ──────────┐
│ EquipmentInventoryView        │  │ CardsInventoryView         │
│ (slots + stash, без roster)   │  │ loadout + коллекция карт   │
│                               │  │ loadout + коллекция навыков│
└───────────────────────────────┘  └────────────────────────────┘

┌─ Сундук (ChestInventoryView, full width) ──────────────────────┘
```

### 5.2. Рефакторинг `CampaignCharacterTab`

- `dndBeforeContent`: только `SquadSlotRow` + `CharacterRosterView` + `HeroProfileContent` (вне колонок, full width).
- `EquipmentInventoryView`: убрать дублирующий заголовок «Инвентарь и экипировка — {имя}».
- Левая колонка `GamePanel title="Экипировка"`: тело `EquipmentInventoryView` (экипировка + stash).
- Правая колонка `GamePanel title="Умения и навыки"`: `CardsInventoryView`.
- Сундук — отдельный `GamePanel` под `GameColumns`.
- **DnD:** один `DndContext` на всю вкладку (сохранить текущую обёртку в `EquipmentInventoryView` или поднять контекст в tab).

### 5.3. Ширина колонок

Убрать `maxWidth: 320` у внутренних `Space` в inventory-views — панели на `width: 100%`.

---

## 6. Вкладка «Магазин»

### 6.1. Макет

```
┌─ GamePanel «Магазин» + [Обновить] ─────────────────────────────┐
│ ShopOffersGrid (горизонтальная сетка офферов)                   │
└─────────────────────────────────────────────────────────────────┘

┌─ Персонаж ────────────────────┐  ┌─ Сундук ─────────────────────┐
│ roster (выбор, compact)       │  │ ChestInventoryView          │
│ StatStrip + EquipmentSlotRow  │  │ bind → selected character   │
│ InventoryGrid (продажа)       │  │                             │
└───────────────────────────────┘  └─────────────────────────────┘
```

- Офферы — full width сверху (главное действие).
- Нижний ряд: персонаж для покупки/продажи | сундук.

---

## 7. Вкладка «Бой» (хаб)

Контент `CampaignBattleTab` — две колонки:

```
┌─ Кампания ────────────────────┐  ┌─ Экспедиция ─────────────────┐
│ CTA Начать/продолжить           │  │ ExpeditionSquadStrip         │
│ прогресс сценария               │  │ ExpeditionModeList           │
│ повтор (после прохождения)      │  │ [Начать экспедицию]          │
└───────────────────────────────┘  └──────────────────────────────┘
```

Кнопка «Бой» в шапке ведёт на эту вкладку.

---

## 8. Экран боя (`BattleScreen`)

### 8.1. Макет (≥900px)

```
┌─ alerts (full width) ────────────────────────────────────────────┐

┌─ Поле (flex ~1, GameScrollX) ─┐  ┌─ Панель (~min 320px, max 380px) ┐
│ Инициатива (1 строка)         │  │ Ход / раунд / ⚡ WP (tooltip)    │
│ HP (компактная строка)        │  │ Автобой                          │
│ ┌ grid overflow-x: auto ────┐ │  │ Radio: ход / удар / выстрел      │
│ │ CELL_PX = 58              │ │  │ Карты (Radio + Tooltip)          │
│ └───────────────────────────┘ │  │ Журнал (max-height 200, scroll)  │
│ легенда оверлея               │  │ Профиль / Выйти (compact)        │
└───────────────────────────────┘  └──────────────────────────────────┘
```

### 8.2. Поле и скролл

```tsx
<GameScrollX>
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${battle.width}, ${CELL_PX}px)`,
    gap: 4,
    width: 'max-content',
  }}>
```

- Контейнер `overflow-x: auto`, `max-width: 100%`.
- Широкие сценарии не раздувают layout.

### 8.3. Упрощения

- Убрать дублирующий блок **«Карты»** (`Collapse` под действиями) — детали в tooltip кнопок карт.
- `Space size="large"` → `small` / панели.
- Кнопки «Профиль героя», «Выйти», «Завершить экспедицию» — в верх панели действий или compact `extra` (не отдельный Card title).

### 8.4. `<900px`

Поле сверху, панель действий снизу (стек через `GameColumns`).

---

## 9. Вкладка «Таверна»

```
┌─ toolbar: [Обновить] · кандидаты N/M ────────────────────────────┐
┌─ grid: repeat(auto-fill, minmax(280px, 1fr)) ───────────────────┐
│ Card size=small на кандидата                                      │
└───────────────────────────────────────────────────────────────────┘
```

- 2–3 карточки в ряд на 1280px.
- Alerts (expedition / roster full) — над сеткой.
- Существующая структура карточки (класс, StatStrip, экип, «Нанять») без изменений логики.

---

## 10. Кодекс / Справка

- Тот же `GameHeader` и icon-nav.
- Layout **без крупного рефакторинга** в MVP.
- Опционально позже: категории слева, записи справа.

---

## 11. Полировка

| Элемент | Правило |
|---------|---------|
| Emoji в шапке | 16px |
| Emoji в `InventoryCell` | 28px (`.inv-cell-emoji`) |
| Roster | `List size="small"`, плотные actions |
| StatStrip | без изменений формата (AGENTS.md) |
| Tooltips stats | существующий паттерн StatStrip / Popover |
| `hubActiveTab: 'battle'` | сохраняется; вход через header CTA |

---

## 12. Тестирование

| Область | Проверка |
|---------|----------|
| `CampaignHubNav.test.ts` | обновить под icon-only + отсутствие battle в TAB_ORDER |
| Layout | ручной smoke: 1280 / 900 / 600px viewport |
| DnD Персонаж | drag stash ↔ equip ↔ chest ↔ cards между колонками |
| Бой | широкое поле → горизонтальный скролл; узкий → стек |
| A11y | `aria-label` на icon-кнопках; tooltip = тот же текст |
| Expedition lock | shop/tavern disabled; alerts на месте |

---

## 13. Порядок реализации (для implementation plan)

1. `labels.ts` + `game-layout.css` + примитивы layout.
2. `GameHeader` (объединить Hud + Nav + Battle CTA).
3. `App.tsx` 1280px; `CampaignHub` без Card.
4. `CampaignCharacterTab` — колонки.
5. `CampaignShopTab`, `CampaignTavernTab`, `CampaignBattleTab`.
6. `BattleScreen` — двухколоночный layout + scroll.
7. `CampaignBattleNav` → `GameHeader`.
8. Тесты nav; smoke в браузере.

---

## 14. Альтернативы (отклонены)

| Вариант | Почему отклонён |
|---------|-----------------|
| Inline grid в каждой вкладке без shell | дублирование breakpoint и шапки |
| Отряд emoji в шапке | дублирует SquadSlotRow / ExpeditionSquadStrip |
| Тёмная тема | вне scope MVP; больше работы |
| Горизонтальный скролл секций на mobile | выбран стек колонок <900px |
