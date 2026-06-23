# Character tab: компактная вкладка «Персонаж»

**Дата:** 2026-06-24  
**Статус:** утверждено (brainstorming)  
**Связь:** `AGENTS.md`, `docs/superpowers/specs/2026-06-24-mvp-ui-layout-design.md`, `src/features/campaign/CampaignCharacterTab.tsx`, `src/features/layout/GamePanel.tsx`

---

## 1. Цель

Сделать вкладку **Персонаж** компактной и цельной: убрать дублирующие заголовки, раздутый roster, тройной показ статов и inline-подсказки drag-and-drop. Вместо серых приписок — **`?` в заголовках секций** с полным описанием в tooltip.

**Вне scope (MVP):**

- Редизайн магазина, таверны, боя.
- Chip-вместо-списка для roster.
- Скрытие резерва / отдельная колонка только для roster.
- Touch-popover для stat pills (остаётся по `AGENTS.md` §7).

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Roster rows | **Compact:** `emoji имя · класс ⭐N` + тег отряд/резерв + кнопки; **без StatStrip** в списке |
| Верхняя секция | **Одна панель «Персонажи»:** слоты отряда → compact roster → профиль выбранного |
| Профиль выбранного | Только **StatStrip + SpecializationLine**; без множителей экипировки и ожидаемого HP |
| Подсказки DnD | Убрать inline-тексты; перенести смысл в **`?` tooltips** на заголовках секций |
| Колонка умений | Заголовок панели: **«Умения»** (было «Умения и навыки») |
| Архитектура | **`GamePanel` + `SectionHelp` + props компактности** в существующих view |

---

## 3. Подходы (выбранный — 1)

| # | Подход | Плюсы | Минусы |
|---|--------|-------|--------|
| **1** | `GamePanel` + `SectionHelp` + props (`compact`, `hideSectionTitles`, `hubCharacterSummary`) | Переиспользуемо на других вкладках; минимальный новый код | Несколько точечных props |
| 2 | Правки только в `CampaignCharacterTab` | Быстрее | `?` не переиспользуется |
| 3 | Новый `CharacterHubLayout` | Изоляция | Избыточно для MVP |

---

## 4. Макет вкладки

```
┌─ Персонажи (N) [?] ─────────────────────────────────────────┐
│ [slot1][slot2][slot3][slot4]                                  │
│ ───────────────────────────────────────────────────────────── │
│ ⚔️ Герой · Воин ⭐5  [отряд]     ✎  Снять                     │
│ 🗡️ Разбойник 2 · … ⭐1  [резерв]  ✎  Назначить  Отпустить      │
│ ── выбранный ──                                               │
│ ❤️23 🛡3 … · ★78%                                             │
│ Склонность: …                                                 │
└───────────────────────────────────────────────────────────────┘
┌─ Экипировка [?] ──────────┐  ┌─ Умения [?] ──────────────────┐
│ [слоты]                    │  │ В бой                         │
│ [инвентарь]                │  │ [слоты карт]                  │
│                            │  │ Коллекция                     │
│                            │  │ [сетка]                       │
│                            │  │ Навыки в бою                  │
│                            │  │ [слоты пассивок]              │
│                            │  │ Коллекция навыков             │
└────────────────────────────┘  └───────────────────────────────┘
┌─ Сундук [?] ─────────────────────────────────────────────────┐
│ [сетка]                                                        │
└────────────────────────────────────────────────────────────────┘
```

Колонки **Экипировка | Умения** — через существующий `GameColumns` внутри `EquipmentInventoryView` (≥900px). Сундук — full width под колонками (`dndAfterContent`).

---

## 5. Секция «Персонажи»

### 5.1. Структура (`CampaignCharacterTab`)

Заменить три вложенных `GamePanel` («Отряд», «Состав», отдельный `HeroProfileContent` без обёртки) на **один** `GamePanel`:

```tsx
<GamePanel
  title={
    <>
      Персонажи ({campaign.characters.length}) <SectionHelp content={CHARACTERS_SECTION_HELP} />
    </>
  }
>
  <SquadSlotRow … />
  <Divider style={{ margin: '8px 0' }} />
  <CharacterRosterView variant="compact" showHeading={false} … />
  <Divider plain style={{ margin: '8px 0 4px' }}>выбранный</Divider>
  <HeroProfileContent hubCharacterSummary … />
</GamePanel>
```

- `dndBeforeContent` по-прежнему оборачивает левую колонку DnD; меняется только содержимое.
- Счётчик в title панели: `Персонажи (N)` — **не** дублировать внутри `CharacterRosterView`.

### 5.2. Compact roster (`CharacterRosterView`)

Новые props:

| Prop | Тип | По умолчанию | Назначение |
|------|-----|--------------|------------|
| `variant` | `'full' \| 'compact'` | `'full'` | Compact — без StatStrip и SpecializationLine в строке |
| `showHeading` | `boolean` | `true` | Скрыть внутренний `Состав (N)` когда title в `GamePanel` |

**Compact row (title line):**

```
{display.emoji} {character.name} · {classLabel} {UI_LEVEL}{unitLevel}
```

- Теги: `отряд` (blue) / `резерв` (default) — как сейчас.
- **Убрать:** `← перетащи предмет`, `предметов: N` в description, `StatStrip`, `SpecializationLine` в строке.
- Визуальная подсветка drop при drag предмета (**outline dashed**) — **сохранить**; текстовая подсказка не нужна.
- Кнопки: `EditOutlined`, Снять/Назначить, Отпустить — `size="small"`, без изменений логики.
- `List` `size="small"` `bordered` — оставить; padding строки можно уменьшить до `4px 8px` в compact.

**Обратная совместимость:** `variant="full"` — текущее поведение (для shop tab и др., если используется).

### 5.3. Профиль выбранного (`HeroProfileContent`)

Новый prop:

```ts
/** Только StatStrip + SpecializationLine (вкладка Персонаж). */
hubCharacterSummary?: boolean
```

Когда `hubCharacterSummary === true` (и `mode === 'hub'`):

- **Показывать:** `StatStrip` (с `effectiveStats`), `SpecializationLine`.
- **Не показывать:** параграф множителей экипировки (`Экипировка: ❤️ ×…`), ожидаемый max HP, `includeResourceStats`, `includeEquipmentReadout`, `includeCardsCollapse`, `includeAppearance`.

Разделитель «выбранный» — в `CampaignCharacterTab`, не внутри `HeroProfileContent`.

---

## 6. Секция «Экипировка»

### 6.1. Дубли заголовков

`EquipmentInventoryView` при `panelTitle="Экипировка"` оборачивает контент в `GamePanel`. Внутри остаётся `Typography.Text strong` «Экипировка» — **убрать**, если задан `panelTitle`.

Новый prop:

```ts
hideInnerSectionTitles?: boolean  // default false; true на Character tab
```

При `hideInnerSectionTitles`:

- Не рендерить внутренний заголовок «Экипировка».
- Подзаголовок **«Инвентарь»** — оставить (`strong`, 12–13px).

### 6.2. Tooltip

`GamePanel title`:

```tsx
<>
  Экипировка <SectionHelp content={EQUIPMENT_SECTION_HELP} />
</>
```

Передавать через prop `panelTitle` как `ReactNode` или отдельный `panelTitleHelp` — на усмотрение плана; итог: один `?` рядом с «Экипировка».

**Текст `EQUIPMENT_SECTION_HELP` (черновик):**

> Слоты оружия, брони и аксессуара. Инвентарь — предметы героя; перетащите на слот или на другого героя в списке. Пустые слоты принимают предметы перетаскиванием. Сортировка инвентаря — перетаскиванием ячеек.

---

## 7. Секция «Умения»

### 7.1. Заголовок панели

`GamePanel title="Умения и навыки"` → **`Умения`** + `SectionHelp`.

### 7.2. Убрать inline-подсказки (`CardsInventoryView`)

Удалить строки:

- `В бой (N слот/слота/слотов) — перетащите карту из коллекции`
- `Навыки в бою (N …) — перетащите из коллекции`

**Оставить** короткие подзаголовки секций:

| Было | Стало |
|------|-------|
| secondary hint + slots | **`strong` «В бой»** + slots |
| secondary «Коллекция» | **`strong` «Коллекция»** (без type secondary) |
| secondary hint + passive slots | **`strong` «Навыки в бою»** + slots |
| secondary «Коллекция навыков» | **`strong` «Коллекция навыков»** |

Опциональный prop `hideDragHints?: boolean` (default `true` на Character tab, `false` не нужен — просто удалить hints глобально для этого view, т.к. shop использует другой layout).

Число слотов — только в **`SKILLS_SECTION_HELP`** tooltip, не в UI.

**Текст `SKILLS_SECTION_HELP` (черновик):**

> Карты и пассивные навыки для боя. «В бой» и «Навыки в бою» — активные слоты (лимит зависит от героя). «Коллекция» — запас; перетащите в слот боя. Модификаторы на картах и навыках — по клику на ячейку.

### 7.3. Поведение DnD

Без изменений: слоты, коллекции, моды, sell — как сейчас.

---

## 8. Секция «Сундук»

### 8.1. Intro-текст

`ChestInventoryView` сейчас показывает:

> Общий сундук — предметы… · перетащите предмет на персонажа…

Новый prop:

```ts
showIntro?: boolean  // default true; false на Character tab
```

При `showIntro={false}` — не рендерить intro `Typography.Text`; сетка и DnD без изменений.

### 8.2. Tooltip

```tsx
<GamePanel title={<>Сундук <SectionHelp content={CHEST_SECTION_HELP} /></>}>
```

**Текст `CHEST_SECTION_HELP` (черновик):**

> Общий склад кампании: предметы, непривязанные карты и навыки. Перетащите предмет на героя в списке или из инвентаря в сундук. Привязка карт/навыков — к выбранному герою.

---

## 9. Компонент `SectionHelp`

**Файл:** `src/features/layout/SectionHelp.tsx`

```tsx
type SectionHelpProps = { content: string }
```

- Иконка: `QuestionCircleOutlined` из `@ant-design/icons`.
- Обёртка: Ant Design `Tooltip`, `mouseEnterDelay={0.3}` (согласно `AGENTS.md` §7).
- `aria-label` = полный текст `content`.
- Размер иконки: `12px`, цвет `rgba(0,0,0,0.45)`, `marginInlineStart: 4`.

**Тексты секций:** `src/features/campaign/sectionTooltips.ts` (аналог `resourceTooltips.ts`):

```ts
export const CHARACTERS_SECTION_HELP = '…'
export const EQUIPMENT_SECTION_HELP = '…'
export const SKILLS_SECTION_HELP = '…'
export const CHEST_SECTION_HELP = '…'
```

`GamePanel` **не** расширять отдельным `helpTooltip` prop — title остаётся `ReactNode`, help вставляется в title снаружи.

---

## 10. Что не менять

| Элемент | Причина |
|---------|---------|
| `inv-cell-hint` «перетащи» на пустых слотах экипировки/отряда | Краткая подсказка на пустой ячейке — не дублирует секционные hints |
| Логика DnD, expedition freeze, `modsDisabled` | Только presentation |
| `HeroProfileContent` в бою / shop / полный hub elsewhere | `hubCharacterSummary` — opt-in |
| StatStrip tooltips (stat pills) | По `AGENTS.md` |

---

## 11. Файлы (ожидаемые изменения)

| Файл | Изменение |
|------|-----------|
| `CampaignCharacterTab.tsx` | Одна панель «Персонажи»; help в titles; props дочерним view |
| `CharacterRosterView.tsx` | `variant`, `showHeading`; compact row |
| `HeroProfileContent.tsx` | `hubCharacterSummary` |
| `EquipmentInventoryView.tsx` | `hideInnerSectionTitles`; `panelTitle` как `ReactNode` при необходимости |
| `CardsInventoryView.tsx` | Убрать drag hints; strong подзаголовки |
| `ChestInventoryView.tsx` | `showIntro` |
| `SectionHelp.tsx` | новый |
| `sectionTooltips.ts` | новый |

---

## 12. Критерии приёмки

1. На вкладке Персонаж **нет** дубля «Состав» / «Экипировка» (внутренний strong при внешнем `GamePanel`).
2. Roster: **4+ героя** помещаются заметно компактнее (без StatStrip в строках).
3. Выбранный герой: **один** StatStrip + склонность под списком.
4. **Нет** серых строк «перетащите из коллекции» / «← перетащи предмет» / intro сундука на Character tab.
5. У секций **Персонажи, Экипировка, Умения, Сундук** есть `?` с осмысленным tooltip.
6. `npm run build` и существующие тесты проходят.
7. Shop tab и другие потребители `CharacterRosterView` / `HeroProfileContent` не сломаны (`variant="full"` по умолчанию).

---

## 13. Тестирование

| Область | Проверка |
|---------|----------|
| Manual | Character tab @1280px: высота верхней секции, выбор героя, DnD предмет/карта/пассив |
| Manual | Expedition active: disabled UI + Alert без регрессии |
| Unit | При необходимости: snapshot/рендер `CharacterRosterView` compact без StatStrip (опционально, не блокер MVP) |
| Regression | `CampaignShopTab` roster/profile если использует те же компоненты |

---

## 14. Связь с MVP layout spec

Дополняет `2026-06-24-mvp-ui-layout-design.md` §7 (вкладка Персонаж): колонки Equipment|Skills и full-width Chest уже есть; этот spec **сжимает верх** и **чистит подсказки** внутри существующей сетки.
