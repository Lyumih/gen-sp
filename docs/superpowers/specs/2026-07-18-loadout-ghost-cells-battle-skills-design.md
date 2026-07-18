# Loadout ghost-слоты, «Экипировка» в хабе, умения-ячейки в бою

**Дата:** 2026-07-18  
**Статус:** утверждено после brainstorming  
**Связь:** `AGENTS.md`, `2026-06-24-character-hub-3col-design.md`, `2026-07-17-battle-ui-improvements-design.md`, `src/features/inventory/InventoryCell.tsx`, `src/features/battle/BattleScreen.tsx`

---

## 1. Цель

Улучшить читаемость loadout и боевой панели действий:

1. **Вкладка «Персонаж»** — переименовать «Надето» → «Экипировка» и поднять блок экипировки **над** «Активные умения».
2. **Пустые слоты** (умения, навыки, экипировка) — ghost-стиль: приглушённый emoji, серый фон; не выглядят как занятые.
3. **Единый emoji loadout** — проверить и сохранить emoji умений в магазине, активных умениях и хабе; **в бою** заменить текстовые `Radio.Button` на ячейки как в инвентаре.
4. **Бой** — «Умения и карты» → «Умения»; пассивы — ячейки с уровнем; поле боя — больше отступ от очереди хода + вертикальный скролл по viewport.

**Вне scope:**

- Изменение reducer, формул урона, loadout caps.
- Пустые слоты пассивов в бою (показываем только надетые).
- Редизайн коллекции/сундука beyond ghost empty grid cells (generic `InventoryCell state="empty"` без emoji — без изменений).

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| «Надето» → «Экипировка» | **Везде:** хаб, магазин (`ShopBuildPanel`), `sectionTooltips` |
| Порядок в центральной колонке | Профиль → **Экипировка** → Активные умения → Пассивные навыки |
| Пустые слоты | **Ghost A:** emoji opacity ~28%, фон `#f0f0f0`, пунктир; без badge и без «перетащи» |
| Архитектура | **Подход 1:** общий CSS + `InventoryCell` ghost; боевые обёртки `BattleSkillCell` / reuse CSS |
| Скролл поля боя | **Viewport A:** `max-height: calc(100vh - 280px)`, `overflow: auto` (обе оси) |
| Отступ очередь → поле | **16px** под блоком «Очерёдность хода» |

---

## 3. Архитектурный подход

**DECIDED: Вариант 1** — общий CSS и badge-раскладка; боевые компоненты без DnD.

| Модуль | Назначение |
|--------|------------|
| `inventory.css` | `.inv-cell--empty-ghost`; `.game-battle-field-scroll` |
| `InventoryCell.tsx` | Ghost при `state === 'empty'` и переданном `emoji` (или явный prop) |
| `EquipmentInventoryView.tsx` | Порядок `buildHeader` → equip → `loadoutPanel`; переименование; ghost equip slots |
| `CharacterHubLayout.tsx` | `buildHeader` + `loadoutPanel` вместо единого `buildColumn` |
| `CardsInventoryView.tsx` | Ghost empty loadout/passive slots |
| `ShopBuildPanel.tsx`, `sectionTooltips.ts` | «Экипировка» |
| `BattleSkillCell.tsx` | Selectable skill cell для боя |
| `ActorPassivesPanel.tsx` | Row ячеек вместо `List` |
| `BattleScreen.tsx` | Интеграция ячеек, scroll wrapper, отступ |

| Альтернатива | Почему отклонена |
|--------------|------------------|
| 2 — бой с нуля, только похожие стили | Дублирование badge-логики |
| 3 — один `LoadoutCell` с many variants | Раздувание props |

---

## 4. Ghost-пустые слоты (`InventoryCell`)

### 4.1. CSS

```css
.inv-cell--empty-ghost {
  background: #f0f0f0;
  border-style: dashed;
  cursor: default;
}

.inv-cell--empty-ghost .inv-cell-emoji {
  opacity: 0.28;
}
```

Класс добавляется когда `state === 'empty'` **и** передан `emoji` (слот типизированный: equip / skill / passive).  
Generic empty grid cells (коллекция, сундук, магазин без offer) — **без** ghost emoji, только `.inv-cell--empty` как сейчас.

### 4.2. Поведение по контекстам

| Контекст | Пустой слот | Изменения |
|----------|-------------|-----------|
| Экипировка (`EquipmentSlotCell`) | emoji слота | ghost; **убрать** `contextBadge` и `hintText: 'перетащи'` |
| Активное умение (`LoadoutSlotCell`) | ⚔️ placeholder | ghost |
| Пассивный слот (`PassiveEquipSlotCell`) | ✨ placeholder | ghost |
| dragOver / invalidDrop | — | Поверх ghost, без изменений |

Заполненные ячейки — без изменений: emoji, `⭐level`, `💥`/`❤️` или slot badge, mod dots, green border equipped.

---

## 5. Вкладка «Персонаж» — порядок и переименование

### 5.1. Центральная колонка (`buildColumn`)

**Было:**

```
CharacterBuildPanel
CardsInventoryView (loadout: умения + пассивы)
---
equipSection («Надето»)  // ниже в Space, после buildColumn
```

**Стало:**

```
CharacterBuildPanel          (профиль, статы)
equipSection («Экипировка»)
CardsInventoryView (loadout) (активные + пассивные)
```

Реализация: разделить `characterHub.buildColumn` на два фрагмента в `CharacterHubLayout`:

- `buildHeader` — только `CharacterBuildPanel`
- `loadoutPanel` — `CardsInventoryView` с `hubSection="loadout"`

В `EquipmentInventoryView` для `characterHub` порядок в центральном `Space`:

```tsx
{characterHub.buildHeader}
{equipSection}
{characterHub.loadoutPanel}
```

Droppable слотов остаются в `equipSection` внутри того же `DndContext`.

### 5.2. Переименование «Надето» → «Экипировка»

| Файл | Было | Стало |
|------|------|-------|
| `EquipmentInventoryView.tsx` | подзаголовок «Надето» | «Экипировка» |
| `EquipmentInventoryView.tsx` | внешний «Экипировка» при `!characterHub` | оставить один заголовок «Экипировка» |
| `ShopBuildPanel.tsx` | «Надето» | «Экипировка» |
| `sectionTooltips.ts` `EQUIPMENT_SECTION_HELP` | «слот «Надето»» | «слот «Экипировка»» |

Подписи под слотами (`SLOT_LABEL`: Оружие, Броня, …) — без изменений.

### 5.3. Emoji умений — аудит (без изменений логики)

| Место | Emoji | Статус |
|-------|-------|--------|
| Магазин (`ShopOffersGrid`, skill offer) | `resolveCardEmoji` | OK |
| Активные умения / коллекция (`SortableCardCell`) | `resolveCardEmoji` | OK |
| Магазин passive | `resolvePassiveEmoji` | OK |
| **Бой** (`BattleScreen`) | `CreditCardOutlined`, текст | **Заменить** (§6) |

---

## 6. Бой — панель «Умения»

### 6.1. Заголовок и layout

- Label: **«Умения»** (type secondary).
- Убрать: `Radio.Group` + `Radio.Button`, `CreditCardOutlined`, дублирующий `Typography.Text` под группой.

### 6.2. `BattleSkillCell`

Компонент `src/features/battle/BattleSkillCell.tsx`:

| Prop | Назначение |
|------|------------|
| `card`, `character`, `campaign`, `actor` | stats via `describeCardCombatStats` |
| `selected` | `inv-cell--selected` |
| `disabled` | CD или `actionsDisabled` → `inv-cell--disabled`, opacity 0.5 |
| `onSelect` | клик → выбор умения |

**Содержимое ячейки (56×56, классы `inv-cell`):**

| Угол | Значение |
|------|----------|
| Центр | `resolveCardEmoji(tmpl)` |
| top-right | `⭐{global_level}` |
| bottom-left | `💥N` или `❤️N` если `expectedDamage !== null` |

**Tooltip / Popover** (`mouseEnterDelay={0.3}`):

- Title: `getCardDisplayLabel(templateId)`
- Body: строки `describeCardCombatStats`; при CD — «CD {n}»; AoE — в описании

**Выбор:** клик по ячейке → `setMode('card')`, `setSelectedCardPickId(card.id)`; selected cell — `inv-cell--selected`.

**Keyboard / a11y:** `aria-label` = «{название}, ⭐{level}, {effect}»; `aria-pressed` при selected.

### 6.3. Ряд умений

```tsx
<div className="battle-skill-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
  {actorCards.map(... BattleSkillCell)}
</div>
```

При `actorCards.length === 0` — не показывать row (заголовок «Умения» можно оставить с пустым состоянием или скрыть — **скрыть row**, label остаётся).

---

## 7. Бой — пассивные навыки

### 7.1. `ActorPassivesPanel`

Заменить `List` на flex row ячеек (read-only):

| Элемент | Правило |
|---------|---------|
| Emoji | `resolvePassiveEmoji(tmpl)` |
| Badge | `⭐{global_level}` |
| Tooltip | название + все `describePassiveStats.lines` |
| Клик | только popover; без selection |

Использовать `InventoryCell` с `state="filled"`, popover, **без** drag listeners — или тонкая обёртка `BattlePassiveCell` с теми же CSS-классами.

`passives.length === 0` → `return null` (как сейчас).

---

## 8. Поле боя — отступ и скролл

### 8.1. Отступ

Блок «Очерёдность хода» (обёртка `TurnOrderStrip`):

```css
.game-battle-turn-order {
  margin-bottom: 16px;
}
```

### 8.2. Scroll wrapper

Заменить отдельный `GameScrollX` вокруг поля на:

```html
<div class="game-battle-field-scroll">
  <div class="battle-field-root">...</div>
</div>
```

```css
.game-battle-field-scroll {
  max-height: calc(100vh - 280px);
  overflow: auto;
  max-width: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}
```

Константа `280px` — оценка шапки + очередь + legend + нижние блоки; комментарий в CSS для последующей подстройки.

`TurnOrderStrip` по-прежнему использует свой `GameScrollX` (горизонтальная очередь).

---

## 9. Тестирование

| Сценарий | Ожидание |
|----------|----------|
| Персонаж: пустые слоты equip/skill/passive | Ghost emoji, нет badge «перетащи» |
| Персонаж: порядок секций | Экипировка выше «Активные умения» |
| Магазин rail | Заголовок «Экипировка» |
| Бой: умения | Ячейки с emoji, level, damage; название в tooltip |
| Бой: выбор умения | Синяя рамка selected; клик меняет mode card |
| Бой: CD | Ячейка полупрозрачна, не кликается |
| Бой: пассивы | Row ячеек с level + tooltip |
| Бой: высокое поле | Вертикальный скролл внутри `.game-battle-field-scroll` |
| Бой: широкое поле | Горизонтальный скролл в той же обёртке |

Существующие тесты `CardsInventoryView` / hub — обновить только если ломаются snapshot строк «Надето».

---

## 10. Файлы (чеклист реализации)

- [ ] `src/features/inventory/inventory.css`
- [ ] `src/features/inventory/InventoryCell.tsx`
- [ ] `src/features/inventory/EquipmentInventoryView.tsx`
- [ ] `src/features/inventory/CardsInventoryView.tsx`
- [ ] `src/features/character/hub/CharacterHubLayout.tsx`
- [ ] `src/features/shop/hub/ShopBuildPanel.tsx`
- [ ] `src/features/campaign/sectionTooltips.ts`
- [ ] `src/features/layout/game-layout.css` (turn-order margin, battle scroll)
- [ ] `src/features/battle/BattleSkillCell.tsx` (new)
- [ ] `src/features/battle/ActorPassivesPanel.tsx`
- [ ] `src/features/battle/BattleScreen.tsx`
