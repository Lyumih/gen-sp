# Character hub: 3-колоночный экран и отряд на «Бой»

**Дата:** 2026-06-24  
**Статус:** утверждено (brainstorming)  
**Заменяет компоновку:** `docs/superpowers/specs/2026-06-24-character-tab-compact-design.md` (§4–§8 layout; константы `SectionHelp` / `sectionTooltips` переиспользуются)  
**Связь:** `AGENTS.md`, `docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md`, `docs/superpowers/specs/2026-06-24-mvp-ui-layout-design.md`, `src/features/campaign/CampaignCharacterTab.tsx`, `src/features/campaign/CampaignBattleTab.tsx`

---

## 1. Цель

Переработать вкладку **Персонаж** в **browser-RPG layout**:

1. **3 колонки:** rail героев | лист билда | вкладки склада.
2. **Персонаж = мастерская:** экипировка любого героя; **без** редактирования слотов отряда.
3. **Бой = сборка отряда:** кто идёт в кампанию / экспедицию — на вкладке **Бой**.
4. **Клик + drag:** loadout в центре кликабельный (H); склад — клик в focus-слот + drag для переносов (J).

**Вне scope:**

- Редизайн магазина, таверны, боевого экрана (кроме панели отряда на hub «Бой»).
- Paper-doll силуэт; полный отказ от drag.
- Изменение reducer / `campaign.squad` как модели данных.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Макет Персонаж | **3 колонки** @1280px: rail ~88px \| build ~360px \| stash flex |
| Rail (B′) | **Один вертикальный список** всех героев; индикатор «в отряде»; **без** 4 слотов и DnD в отряд |
| Отряд | **Сборка на вкладке «Бой»** (`SquadAssemblyPanel`); `campaign.squad` без изменений |
| Центр (H) | StatStrip + склонность + loadout (экип + карты + пассивки в бою); клик по слоту; мини-delta статов |
| Склад (D) | Вкладки: **Предметы \| Умения \| Навыки \| Сундук (N)** |
| Взаимодействие (J) | Клик по складу → в focus / первый пустой слот; drag — сортировка, сундук, другой герой |
| Архитектура | **`CharacterHubLayout`** в `src/features/character/hub/`; один `DndContext` на вкладку |

---

## 3. Подходы (выбранный — 1)

| # | Подход | Плюсы | Минусы |
|---|--------|-------|--------|
| **1** | `CharacterHubLayout` + `CharacterRail` / `CharacterBuildPanel` / `CharacterStashTabs` + `SquadAssemblyPanel` на Бой | Чёткие границы; переиспользование `InventoryCell`, popover, reducers | ~8–10 файлов |
| 2 | Монолитный `CampaignCharacterTab` | Быстрый прототип | Снова комбайн |
| 3 | Оставить `EquipmentInventoryView` обёрткой | Меньший diff | `dndBeforeContent` не ложится на 3 колонки |

---

## 4. Макет вкладки «Персонаж»

```
┌────────┬──────────────────────┬─────────────────────────────┐
│ RAIL   │ BUILD                │ STASH TABS                  │
│ ~88px  │ ~360px               │ 1fr                         │
│        │                      │                             │
│ [герой]│ ⚔️ Имя · Класс ⭐5   │ Предметы│Умения│Навыки│Сундук(3)│
│ [герой]│ ❤️23 … · ★78%        │ ┌───┬───┬───┬───┐           │
│ [герой]│ Склонность           │ │ □ │ □ │ □ │ □ │           │
│  ●отряд│ ── Надето ──         │ └───┴───┴───┴───┘           │
│        │ [⚔][🛡][💍]         │                             │
│  ✎ ⋮   │ ── В бой ──          │                             │
│        │ [карта][·][·]        │                             │
│        │ ── Навыки в бою ──   │                             │
│        │ [пас][·]             │                             │
│        │  ❤️ 23→25 (+2)       │  ← delta при focus/equip   │
└────────┴──────────────────────┴─────────────────────────────┘
```

### 4.1. CSS grid

Новый класс `game-character-hub` в `game-layout.css`:

```css
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

Breakpoint **900px** — как `GameColumns` в MVP layout spec.

### 4.2. Внешняя обёртка

- Одна лёгкая `GamePanel` с title `Персонаж` + `SectionHelp` **или** без внешней панели (только grid) — **предпочтительно без** лишней рамки: три колонки внутри `GameShell` вкладки.
- Убрать текущую структуру: верхний блок «Персонажи» + `EquipmentInventoryView` 2-col + сундук снизу.

---

## 5. Левая колонка — `CharacterRail` (B′)

### 5.1. Содержимое

- Вертикальный список **всех** `campaign.characters` (порядок: сначала занятые слоты `squad` по индексу, затем резерв — для узнаваемости без отдельной секции «В бой»).
- Ячейка: `InventoryCell` **вертикальный вариант** (~56×72): emoji, badge `⭐N`, имя только в `Tooltip`.
- **Выбранный** герой (для билда): `inv-cell--selected`.
- **В отряде** (`campaign.squad.includes(id)`): `inv-cell--equipped` или зелёная точка в углу — **read-only**, не кликабельно для смены слота.
- Footer на выбранном: `✎` облик (модалка как сейчас), `⋮` dropdown: **Отпустить** (если можно); **без** «Назначить в отряд» / «Снять».

### 5.2. DnD на rail

- **Разрешено:** drop предмета (stash/chest) на ячейку героя → transfer/equip flow как сейчас.
- **Запрещено / убрано:** drag героя между слотами отряда, drop героя в слот отряда.

### 5.3. Удалить с Персонажа

- `SquadSlotRow`, `onSetSquadSlot` / `onSwapSquadSlots` / `onAssignToSquad` / `onRemoveFromSquad` из `CampaignCharacterTab` props wiring (handlers остаются в `CampaignHub`, вызываются с **Бой**).
- `CharacterRosterView` list rows на этой вкладке (компонент может остаться для Shop).

### 5.4. Tooltip секции

Обновить `CHARACTERS_SECTION_HELP`:

> Выберите героя для экипировки. Зелёная метка — в боевом отряде (настраивается на вкладке «Бой»). Перетащите предмет на ячейку героя.

---

## 6. Центр — `CharacterBuildPanel` (H)

### 6.1. Блоки (сверху вниз)

| Блок | Компоненты |
|------|------------|
| Заголовок | emoji, имя, класс, `UI_LEVEL`, `SectionHelp` (опционально дубль короткого help) |
| Статы | `StatStrip` + `effectiveStats` + `showRating` |
| Delta strip | При `loadoutFocus` на экипировке и hover/click stash item — `previewEquipDelta` → `❤️ 23 → 25 (+2)` текстом (не только цвет) |
| Склонность | `SpecializationLine` |
| Надето | 3 ячейки `EQUIPMENT_ROLL_ORDER` |
| В бой | N слотов карт (`maxSkillLoadoutSlots`) |
| Навыки в бою | M слотов пассивок (`maxPassiveEquipSlots`) |

### 6.2. Loadout focus

Состояние в `CharacterHubLayout` (или контекст):

```ts
type LoadoutFocus =
  | { kind: 'equip'; slot: EquipmentSlot }
  | { kind: 'card'; slotIndex: 0 | 1 | 2 | 3 }
  | { kind: 'passive'; slotIndex: 0 | 1 | 2 | 3 | 4 }
  | null
```

- **Клик по слоту loadout** → установить focus; повторный клик на заполненный → popover (детали, моды, **Снять**).
- **Клик по ячейке склада** (активная вкладка соответствует kind):
  - с focus → equip в этот слот;
  - без focus → первый пустой слот соответствующего типа;
  - невалидно → flash `inv-cell--invalid` + `App.useApp().message.warning`.
- **Expedition / inBattle:** слоты disabled + tooltip как сейчас.

### 6.3. Убрать из центра

- Множители экипировки paragraph, ожидаемый max HP (`hubCharacterSummary` поведение сохраняется).
- Дублирующие сетки коллекций (только в правых вкладках).

---

## 7. Правая колонка — `CharacterStashTabs` (D + J)

### 7.1. Вкладки

Ant Design `Tabs` `size="small"` `tabBarGutter={8}`:

| Key | Label | Контент |
|-----|-------|---------|
| `items` | Предметы | Stash героя (не equipped), `SortableContext` |
| `cards` | Умения | Коллекция карт (не в battle loadout) |
| `passives` | Навыки | Коллекция пассивок (не в passive equip) |
| `chest` | Сундук (N) | `ChestInventoryView` grid; N = total items in chest |

Переключение вкладки **не сбрасывает** `loadoutFocus`, но клик equip с неподходящей вкладки игнорируется с подсказкой.

### 7.2. Клик (J)

- Предметы → focus `equip` или auto-slot по `item.template.slot`.
- Умения → battle loadout card slots.
- Навыки → passive equip slots.
- Сундук → bind/move по текущим правилам `ChestInventoryView`; клик по непривязанной карте/пассивке → bind к **выбранному** герою.

### 7.3. Drag (J)

Один `DndContext` на `CharacterHubLayout`:

| Drag | Drop |
|------|------|
| Stash item | Equip slot, другой герой (rail), chest |
| Card / passive | Loadout slots, reorder в коллекции |
| Chest item | Rail hero, stash |
| Sort | Внутри той же вкладки |

Переиспользовать `inventoryDnD.ts` ids; рефактор `EquipmentInventoryView` / `CardsInventoryView` — вынести ячейки в presentational subcomponents, логику DnD в hub.

### 7.4. Tooltips вкладок

Обновить `EQUIPMENT_SECTION_HELP`, `SKILLS_SECTION_HELP`, `CHEST_SECTION_HELP` под вкладки (без inline «перетащите…» в теле).

---

## 8. Вкладка «Бой» — `SquadAssemblyPanel`

### 8.1. Назначение

Единственное место редактирования `campaign.squad` в hub UI.

### 8.2. Размещение

- **Над** кнопкой «Начать / продолжить бой» в панели **Кампания**.
- **Над** `ExpeditionSquadStrip` в панели **Экспедиция** — **заменить** дублирующий read-only strip на тот же `SquadAssemblyPanel` в режиме редактирования; expedition mark — второй ряд или чекбоксы на занятых ячейках (сохранить текущую семантику `markedIds`).

### 8.3. UI

```
Отряд [?]
[□1][□2][□3][□4]   ← горизонтальный ряд InventoryCell (как SquadSlotRow)
Резерв: [□][□]     ← клик → заполнить первый пустой слот; drag героя между слотами
```

- Пустой слот: клик → ничего; drop героя из резерва или drag из резерва.
- Заполненный: клик → снять в резерв (или кнопка × в popover).
- Drag: reorder слотов отряда (как `onSwapSquadSlots`).
- **Валидация** перед «Начать бой»: если все слоты пусты → `message.error`; если частично пусто → `Modal.confirm` «N пустых слотов — начать?» (MVP: допускается бой неполным отрядом по текущей логике snapshot).

### 8.4. После найма в таверне

- `CampaignHub` при `HIRE_CHARACTER`: если есть пустой слот `squad` → **авто-добавить** нового героя (опционально `message.info` «Добавлен в отряд»).
- Иначе герой только в резерве; игрок собирает отряд на **Бой**.

### 8.5. Компонент

`src/features/character/SquadAssemblyPanel.tsx` — props:

```ts
type SquadAssemblyPanelProps = {
  campaign: CampaignState
  disabled?: boolean
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots: (from: number, to: number) => void
  /** Опционально для экспедиции */
  markedIds?: readonly string[]
  onToggleMark?: (characterId: string) => void
}
```

Переиспользовать логику из `SquadSlotRow` + reserve pool cells.

---

## 9. Состояния и freeze

| Состояние | Rail | Build | Stash | SquadAssembly |
|-----------|------|-------|-------|---------------|
| `inBattle` | select ok, equip locked | disabled | disabled | disabled |
| `expeditionActive` | select ok, equip locked | disabled | disabled | disabled |
| normal | full | full | full | full |

`Alert` expedition на Бой — без изменений.

---

## 10. Файлы

| Файл | Действие |
|------|----------|
| `src/features/character/hub/CharacterHubLayout.tsx` | Create — DndContext, focus state, columns |
| `src/features/character/hub/CharacterRail.tsx` | Create |
| `src/features/character/hub/CharacterBuildPanel.tsx` | Create |
| `src/features/character/hub/CharacterStashTabs.tsx` | Create |
| `src/features/character/hub/useLoadoutFocus.ts` | Create |
| `src/features/character/hub/EquipDeltaStrip.tsx` | Create — optional thin wrapper |
| `src/features/character/SquadAssemblyPanel.tsx` | Create |
| `src/features/layout/game-layout.css` | Modify — `.game-character-hub` |
| `src/features/campaign/CampaignCharacterTab.tsx` | Modify — render `CharacterHubLayout` only |
| `src/features/campaign/CampaignBattleTab.tsx` | Modify — `SquadAssemblyPanel` |
| `src/features/campaign/sectionTooltips.ts` | Modify — тексты rail / squad |
| `src/features/inventory/EquipmentInventoryView.tsx` | Deprecate для Character tab / extract cells |
| `src/features/inventory/inventory.css` | Modify — `.inv-rail-cell` при необходимости |

---

## 11. Критерии приёмки

1. Вкладка **Персонаж** — 3 колонки @1280px, без вертикального стека «Персонажи + 2 col + сундук».
2. На **Персонаже** нельзя менять состав `campaign.squad` (нет слотов отряда).
3. На **Бой** можно собрать 4 слота + резерв; кампания и экспедиция используют обновлённый `squad`.
4. Центр: loadout кликабелен; delta при смене экипировки видна текстом.
5. Склад: 4 вкладки; Сундук с badge count; клик equip работает с focus.
6. Drag: предмет на другого героя, в сундук, сортировка — без регрессии.
7. Shop tab не сломан (`CharacterRosterView` full variant).
8. `npm run test`, `npm run build` проходят.

---

## 12. Тестирование

| Область | Проверка |
|---------|----------|
| Unit | `useLoadoutFocus` reducer; `SquadAssemblyPanel` render (static markup) |
| Unit | click-to-equip handler (pure function с mock state) |
| Manual | 1280px: rail → build → tab switch → equip |
| Manual | Бой: собрать отряд → начать кампанию / экспедицию |
| Manual | Найм в таверне → авто-слот / экипировка на Персонаже |
| Regression | Expedition freeze, inBattle lock |

---

## 13. Миграция от compact-design

| Compact spec | 3-col hub |
|--------------|-----------|
| Панель «Персонажи» + compact roster | `CharacterRail` |
| `hubCharacterSummary` | Логика в `CharacterBuildPanel` |
| 2 col equipment \| skills | build \| stash tabs |
| Сундук снизу | Вкладка Сундук |
| Squad на Персонаже | `SquadAssemblyPanel` на Бой |

Компоненты `SectionHelp`, `sectionTooltips`, `InventoryCell`, `previewEquipDelta` — **сохранить**.
