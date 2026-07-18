# Дизайн: компактная вкладка «Бой» — режимы в строку и отряд с резервом

**Дата:** 2026-07-18  
**Статус:** утверждено (brainstorming)  
**Связь:** [mvp-game-loop-closure](./2026-07-18-mvp-game-loop-closure-design.md), [battle-mode-picker](./2026-07-18-battle-mode-picker-design.md), `CampaignBattleTab.tsx`, `SquadAssemblyPanel.tsx`, `AGENTS.md`

---

## 1. Цель

Убрать визуальное «разъезжание» вкладки **«Бой»**:

1. **Режимы боя** — одна горизонтальная полоса квадратных плиток со скроллом; категория на карточке, без заголовков секций.
2. **Отряд** — убрать дублирование «Отряд» / «Слот N»; **резерв** справа от слотов, колонка **всегда видима** (пустое состояние — «пусто»).

**Не цель:** изменение логики экспедиций, DnD-правил, onboarding visibility, баланса.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Секции режимов | **Убрать** `<h4>` «Испытания», «Обучение», «Roguelike», «PvP», «Разработка» |
| Категория режима | Tag на плитке: `Испытание` / `Обучение` / `Roguelike` / `PvP` / `Разработка` |
| Layout режимов | **A** — одна строка, `GameScrollX`, квадратные плитки ~140px, `flex-shrink: 0` |
| Порядок плиток | Испытания → Обучение → Roguelike placeholders → PvP placeholders → Dev (если виден) |
| Дубль «Отряд» | Один заголовок в `GamePanel`; внутренний заголовок `SquadAssemblyPanel` **удалить** |
| Подписи слотов | **Убрать** «Слот 1/2/…»; `aria-label` + tooltip на ячейке |
| Резерв | **Справа** от активных слотов; **не** под отрядом |
| Пустой резерв | **A** — подпись «Резерв» + вторичный текст «пусто» |
| Help отряда | `SectionHelp` в `GamePanel` `extra`, не внутри panel body |

---

## 3. Режимы боя

### 3.1. Компонент `BattleModeList`

Заменяет несколько `BattleModeGrid` / `BattleModePlaceholderGrid` на вкладке «Бой».

**Props (ориентир):**

```ts
type BattleModeListEntry =
  | {
      kind: 'chain'
      chain: ExpeditionChainConfig
      categoryLabel: string
      badge?: string
      scrollTargetId?: string
    }
  | {
      kind: 'placeholder'
      mode: PlaceholderModeDef
      categoryLabel: string
    }

type BattleModeListProps = {
  entries: readonly BattleModeListEntry[]
  disabled?: boolean
  onSelectChain: (chainId: string) => void
}
```

**Рендер:**

- Обёртка `GameScrollX` (существующий паттерн из `TurnOrderStrip` / `BattleScreen`)
- Внутри: `div.game-mode-strip` — `display: flex; flex-direction: row; gap: 8px;`
- Каждая entry → `BattleModeTile` или `BattleModePlaceholderTile` с `categoryLabel`

**Константы категорий** — `src/features/campaign/battleModeCategories.ts` (или рядом с `chainSections.ts`):

```ts
export const BATTLE_MODE_CATEGORY = {
  trial: 'Испытание',
  training: 'Обучение',
  roguelike: 'Roguelike',
  pvp: 'PvP',
  dev: 'Разработка',
} as const
```

### 3.2. Плитка режима

Добавить в `BattleModeTile` / placeholder:

| Элемент | Правило |
|---------|---------|
| **categoryLabel** | Первая строка, `Typography.Text type="secondary"`, 11px |
| iconEmoji | без изменений |
| **label** | название режима («Хаос», «Компания») |
| badge | прогресс обучения / «Скоро» для disabled |
| description, paramEmojiLine | без изменений |

Disabled placeholder: `categoryLabel` + badge «Скоро» (не дублировать категорию в title).

### 3.3. CSS режимов

```css
.game-mode-strip {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-bottom: 4px; /* место под scrollbar */
}

.game-mode-tile {
  flex: 0 0 140px;
  width: 140px;
  aspect-ratio: 1;
  /* убрать width: 100% из grid-контекста */
}
```

Удалить использование `.game-mode-grid` на вкладке «Бой» (grid может остаться в CSS для других экранов, если не используется — не трогать без нужды).

### 3.4. Сборка списка в `CampaignBattleTab`

Pure helper `buildBattleModeEntries(campaign, flags): BattleModeListEntry[]`:

1. Если `isFeaturedBattleModesVisible` — все `getTrialChains()`, category `Испытание`; **первая** entry получает `scrollTargetId: 'hub-battle-mode-trials'`
2. `getTrainingChain()` — одна entry, category `Обучение`, badge из `trainingBadge()`
3. `getPlaceholderModesBySection('roguelike')` — category `Roguelike`
4. `getPlaceholderModesBySection('pvp')` — category `PvP`
5. Если `isDevTestModeVisible` — `getDevChains(true)`, category `Разработка`

Onboarding до `first_battle_won`: только training entry (как сейчас скрыты испытания).

### 3.5. Scroll после «Обучение завершено»

- `hubBattleFocusSection: 'trials'` → scroll к элементу `#hub-battle-mode-trials` (id на wrapper первой trial-плитки)
- Убрать `sectionId` на секции «Испытания» (секций больше нет)

---

## 4. Отряд и резерв

### 4.1. Layout `SquadAssemblyPanel`

```
┌ game-panel ─────────────────────────────────────┐
│ h3: Отряд                    [SectionHelp]        │
├─────────────────────────────────────────────────┤
│ .squad-assembly (flex row, align-items: flex-start) │
│   .squad-assembly__active                       │
│     .inv-slot-row — 4 слота без inv-slot-label  │
│   .squad-assembly__reserve                      │
│     «Резерв» (12px secondary)                   │
│     ячейки ИЛИ «пусто»                          │
└─────────────────────────────────────────────────┘
```

**Flex:**

```css
.squad-assembly {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
}

.squad-assembly__active {
  flex: 1 1 auto;
  min-width: 0;
}

.squad-assembly__reserve {
  flex: 0 0 auto;
  min-width: 72px;
  max-width: 120px;
}
```

Резерв: вертикальный `flex-direction: column; gap: 4px` для `ReserveCell`; при переполнении — `max-height` + `overflow-y: auto` (например 3–4 ячейки видимо).

### 4.2. Убрать дублирование

| Удалить | Оставить |
|---------|----------|
| `Typography.Text strong` «Отряд» внутри `SquadAssemblyPanel` | `GamePanel title="Отряд"` в `CampaignBattleTab` |
| `inv-slot-label` «Слот N» | `aria-label` на `InventoryCell`: «Пустой слот N» / «{name}, {class}» |

`SectionHelp` с `SQUAD_SECTION_HELP` — в `GamePanel extra`:

```tsx
<GamePanel
  title="Отряд"
  extra={<SectionHelp content={SQUAD_SECTION_HELP} />}
>
```

### 4.3. Пустой резерв (решение A)

Когда `getReserveCharacters(campaign).length === 0`:

```tsx
<Typography.Text type="secondary" style={{ fontSize: 12 }}>
  пусто
</Typography.Text>
```

Заголовок «Резерв» над колонкой **всегда** показывается.

### 4.4. Поведение

- DnD reserve → squad slot: без изменений (`inventoryDnD`, `SquadAssemblyDnd`)
- Click reserve → first empty slot: без изменений
- `disabled` при экспедиции: обе колонки disabled, как сейчас
- `markedIds` / party pick modal: не используются на battle tab сейчас — не трогать API panel

---

## 5. Область изменений (файлы)

| Файл | Изменение |
|------|-----------|
| `src/features/campaign/CampaignBattleTab.tsx` | `BattleModeList`, GamePanel extra, `buildBattleModeEntries` |
| `src/features/campaign/BattleModeList.tsx` | **новый** |
| `src/features/campaign/BattleModeTile.tsx` | + `categoryLabel` |
| `src/features/campaign/BattleModePlaceholderTile.tsx` | + `categoryLabel` |
| `src/features/campaign/battleModeCategories.ts` | **новый** |
| `src/features/campaign/battle-mode-picker.css` | strip + tile width |
| `src/features/layout/game-layout.css` | опционально перенос `.game-mode-*` если нужно |
| `src/features/character/SquadAssemblyPanel.tsx` | flex layout, no slot labels, reserve column |
| `src/features/inventory/inventory.css` | `.squad-assembly*` |
| `src/features/campaign/CampaignBattleTab` scroll effect | id target update |

**Не менять:** `runReducer`, expedition config, onboarding selectors (кроме scroll id).

---

## 6. Тесты

| Область | Минимум |
|---------|---------|
| `buildBattleModeEntries` | порядок, onboarding скрывает trials, scrollTarget только на первом trial |
| `BattleModeList` | рендерит N плиток, categoryLabel в DOM (testing-library) |
| `SquadAssemblyPanel` | нет «Слот 1» в document; «Резерв» + «пусто» при пустом reserve |
| Регрессия | существующие `BattleModeGrid.test.tsx` — обновить или перенести на `BattleModeList` |

---

## 7. Accessibility

- Плитка режима: `aria-label` включает категорию: «Испытание. Хаос. …»
- Горизонтальный скролл: контейнер с `role="list"` / items `role="listitem"` или сохранить button semantics
- Слоты отряда: `aria-label` без видимого «Слот N» сохраняет доступность

---

## 8. Связь с mvp-game-loop-closure

| Было (closure spec §3) | Стало |
|------------------------|-------|
| 5 секций с заголовками | 1 горизонтальная полоса |
| `BattleModeGrid title="Испытания"` | category tag на плитке |
| `hub-battle-section-trials` на section | `hub-battle-mode-trials` на первой trial-плитке |

Иерархия режимов (trial first, training, placeholders) **сохраняется** — меняется только presentation.

---

## 9. Вне объёма

- Редизайн `InventoryCell` / размер 56px
- Отряд на других экранах (character hub использует другие компоненты)
- Вертикальный список режимов или multi-row grid без скролла

---

## 10. Следующий шаг

После ревью spec — skill **writing-plans**: план реализации (UI-only PR, без миграций save).
