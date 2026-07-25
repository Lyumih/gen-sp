# Бой: базовые действия-ячейки, Reference Drawer (Кодекс/Справка), старт башни без модалки

**Дата:** 2026-07-25  
**Статус:** утверждено после brainstorming  
**Связь:** `AGENTS.md`, `2026-07-18-loadout-ghost-cells-battle-skills-design.md`, `src/features/battle/BattleScreen.tsx`, `src/features/battle/BattleSkillCell.tsx`, `src/features/campaign/CampaignHub.tsx`, `src/features/campaign/CampaignBattleTab.tsx`

---

## 1. Цель

Три связанных улучшения UX:

1. **Базовые действия в бою** — заменить `Radio.Button` («Перемещение и базовая атака») на ряд selectable-ячеек в стиле `BattleSkillCell` / `InventoryCell`, с emoji, expected-параметрами и tooltip.
2. **Кодекс и Справка** — оставить кнопки в шапке, убрать полноэкранные вкладки хаба; один боковой `Drawer` с переключателем «Кодекс | Справка», доступный **в том числе во время боя** (не влияет на геймплей).
3. **Бесконечная башня** — при клике сразу начинать бой с составом из блока «Отряд» (до 4 бойцов по порядку слотов), без модалки выбора героев.

**Вне scope:**

- Preview урона базовых действий **по наведённой цели** на поле (фаза 2).
- UI базовых действий врагов.
- Изменение reducer, формул боя, правил этажей башни, party pick для экспедиций.
- Редизайн содержимого Кодекса/Справки beyond переноса в Drawer.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Урон на ячейках базовых действий | **Expected** для текущего актора (как у карт); tooltip — цепочка «база → пассивы → до 🛡 цели» |
| Кодекс/Справка в хабе | **Нет** отдельных content-вкладок; только кнопки шапки → Drawer |
| Drawer UX | **Один Drawer**, внутри «Кодекс \| Справка»; кнопка шапки открывает нужную панель |
| Башня | Party = `getOccupiedSquadCharacterIds(squad).slice(0, 4)` |

---

## 3. Архитектурный подход

**DECIDED: Вариант 1** — отдельные боевые ячейки + game-layer stats + глобальный Reference Drawer в `App.tsx`.

| Модуль | Назначение |
|--------|------------|
| `src/game/ui/labels.ts` | Константа `UI_BASIC_RANGED = '🏹'` (единый источник emoji выстрела) |
| `src/game/descriptions/basicActionText.ts` | `describeBasicActionStats(state, actor, kind)` — expected damage/range/CD для badge и tooltip |
| `src/features/battle/BattleBasicActionCell.tsx` | Selectable ячейка move/melee/ranged |
| `src/features/battle/BattleBasicActionPopover.tsx` | Tooltip/popover (паттерн `BattleCardPopover`) |
| `src/features/battle/BattleScreen.tsx` | Ряд базовых ячеек; убрать `Radio.Group`; «Завершить ход» у ряда |
| `src/features/campaign/CampaignReferenceDrawer.tsx` | Drawer + внутренний переключатель; рендер `CampaignCodexTab` / `CampaignHelpTab` |
| `src/store/gameStore.ts` | `referenceDrawer` state, `openReferenceDrawer` / `closeReferenceDrawer` |
| `src/App.tsx` | Монтирование `CampaignReferenceDrawer` |
| `src/features/campaign/GameHeader.tsx`, `CampaignHubNav.tsx` | Codex/Help → drawer callbacks; убрать `codexDisabled` |
| `src/features/campaign/CampaignHub.tsx` | Убрать tab panels codex/help; onboarding → `openReferenceDrawer` |
| `src/features/campaign/CampaignBattleNav.tsx` | Убрать локальный help Drawer |
| `src/features/campaign/campaignHubShared.ts` | `CampaignHubTab` без `'codex' \| 'help'` для content routing |
| `src/features/campaign/CampaignBattleTab.tsx` | Прямой старт башни; удалить tower party modal |

| Альтернатива | Почему отклонена |
|--------------|------------------|
| Единый `BattleActionCell` для basic + card | Разная доменная модель (нет `BattlePlayerCard`) |
| Inline-only в `BattleScreen` | Файл уже перегружен |
| Два независимых Drawer | Дублирование shell и состояния |
| Drawer только в hub/battle по отдельности | Третий экран inter-battle без доступа |

---

## 4. Базовые действия в бою

### 4.1. Layout

- Подпись секции: **«Базовые действия»** (вместо «Перемещение и базовая атака»).
- Ряд `.battle-action-row` — `display: flex`, `flex-wrap: wrap`, `gap: 4` (как `.battle-skill-row` у умений).
- Три ячейки слева направо: **Ход**, **Удар**, **Выстрел**.
- **«Завершить ход»** — `Button` справа от ряда на одной линии (`Space` / flex); на узкой ширине допускается перенос под ряд.
- Секция **«Умения»** без изменений по смыслу; визуально тот же gap между ячейками.

### 4.2. Компонент `BattleBasicActionCell`

Props (ориентир):

```ts
type BasicActionKind = 'move' | 'melee' | 'ranged'

type BattleBasicActionCellProps = {
  kind: BasicActionKind
  battle: BattleState
  actor: Unit | undefined
  selected: boolean
  disabled: boolean
  rangedOnCooldown: boolean
  onSelect: () => void
}
```

Поведение:

- Обёртка `InventoryCell`: `state={disabled || (kind==='ranged' && rangedOnCooldown) ? 'disabled' : 'filled'}`.
- `className={selected ? 'inv-cell--selected' : undefined}`.
- Клик → `onSelect()` если не disabled.
- Guided tutorial: те же `guidedModeBlocked(kind)` и `heroRangedOnCd`, что сейчас у `Radio.Button`.

### 4.3. Emoji и badge

| Kind | Центр (emoji) | contextBadge |
|------|---------------|--------------|
| move | `UI_SPEED` (`👟`) | `⬜≤{HERO_MOVE_RANGE}` |
| melee | `UI_ATTACK` (`⚔`) | `💥{expectedMelee} · ⬜1` |
| ranged | `UI_BASIC_RANGED` (`🏹`) | `💥{expectedRanged} · ⬜≤{effectiveRange}`; на CD добавить `⏳{remaining}` |

`effectiveRange` = `HERO_BASIC_RANGED_MAX_RANGE + passiveRangedRangeBonus` (как в `BattleScreen` сейчас).

### 4.4. `describeBasicActionStats`

Файл: `src/game/descriptions/basicActionText.ts`.

- **move:** `moveRange: HERO_MOVE_RANGE`, строки tooltip с правилами хода (Manhattan, стены, занятость).
- **melee / ranged:** `expectedDamage = applyPassiveAttackBonus(battle, actor, HERO_BASIC_MELEE_DAMAGE | HERO_BASIC_RANGED_DAMAGE)` при наличии `actor`; иначе базовая константа.
- Tooltip lines: базовая константа урона → вклад пассивов (если > 0) → примечание, что 🛡 цели уменьшит итог (без расчёта по конкретной цели в MVP).
- **ranged:** включить CD (`HERO_BASIC_RANGED_COOLDOWN_TURNS` / текущий `heroRangedCooldown` с unit state).

Использовать `UI_*` из `labels.ts` в текстах badge (не Ant Design icons в ячейке).

### 4.5. Popover

`BattleBasicActionPopover` — по аналогии с `BattleCardPopover`: desktop hover delay 0.3s; touch — controlled popover при tap (если уже есть общий паттерн для battle cells, переиспользовать).

`aria-label` на кнопке ячейки = краткое имя действия + badge-текст.

### 4.6. Интеграция в `BattleScreen`

- Удалить `Radio.Group` и импорты `DragOutlined`, `ThunderboltOutlined`, `AimOutlined` для этой секции.
- `setMode('move' | 'melee' | 'ranged')` при выборе ячейки (логика overlay/cell click без изменений).
- Тесты: unit-тест `describeBasicActionStats` (passive bonus); опционально render-тест ячейки selected/disabled/CD.

---

## 5. Reference Drawer (Кодекс + Справка)

### 5.1. Поведение

- Кнопки **Кодекс** и **Справка** в `CampaignHubNav` остаются.
- Клик открывает **один** Ant Design `Drawer` (`size="large"`, `destroyOnHidden`).
- В шапке Drawer или сразу под ней — **Segmented** (или `Tabs`) «Кодекс | Справка»; при открытии с шапки активна панель, соответствующая нажатой кнопке.
- Повторный клик по **той же** кнопке шапки при открытом Drawer — **закрывает** Drawer (toggle).
- Клик по другой кнопке (Кодекс ↔ Справка) при открытом Drawer — переключает панель без закрытия.
- **В бою, inter-battle и hub** — одинаково; **`codexDisabled` удалить** из props и логики.

### 5.2. Zustand

```ts
referenceDrawer: {
  open: boolean
  pane: 'codex' | 'help'
  helpFocusArticleId: string | null
}

openReferenceDrawer(pane: 'codex' | 'help', helpFocusArticleId?: string | null): void
closeReferenceDrawer(): void
```

- `openReferenceDrawer('codex')` → `open: true`, `pane: 'codex'`, сброс focus article; **`dispatchRun({ type: 'MARK_CODEX_SEEN' })`**.
- `openReferenceDrawer('help', articleId?)` → `pane: 'help'`, `helpFocusArticleId: articleId ?? null`.
- `closeReferenceDrawer()` → `open: false`, очистить `helpFocusArticleId`.

### 5.3. `CampaignReferenceDrawer`

- Проп: `campaign: CampaignState` (из store в `App.tsx`).
- Контент:
  - `pane === 'codex'` → `<CampaignCodexTab campaign={campaign} />`
  - `pane === 'help'` → `<CampaignHelpTab focusArticleId={helpFocusArticleId} />`
- Заголовок Drawer: «Справочник» или динамический по pane — на усмотрение реализации (единый заголовок + Segmented предпочтительнее).

### 5.4. Монтирование и wiring

- `App.tsx`: `<CampaignReferenceDrawer campaign={campaign} />` рядом с `AppContent`.
- `GameHeader`: новые props `onCodexClick`, `onHelpClick`; убрать `codexDisabled`.
- `CampaignHubNav`: для codex/help вызывать callbacks вместо `onTabChange`; **`aria-expanded`** когда drawer open и pane совпадает; badge unread codex без изменений.
- `CampaignHub`: удалить `{activeTab === 'codex'}` / `{activeTab === 'help'}` panels; debrief / checklist `onGoHelp` → `openReferenceDrawer('help', 'memento')` (или актуальный id статьи).
- `CampaignBattleNav`: удалить локальный `Drawer` + `helpOpen` state; header callbacks как в hub.

### 5.5. Тип `CampaignHubTab`

Content-вкладки: **`'character' | 'shop' | 'tavern'`** (+ `'battle'` для highlight в header, без panel body).

Удалить использование `'codex'` / `'help'` как `hubActiveTab`. Обновить `initialHubTab`, тесты, любые `setHubActiveTab('help'|'codex')`.

### 5.6. Тесты

- `CampaignHubNav.test.ts`: codex и help **не** disabled при `tabsDisabled: true`; badge codex сохраняется.
- При необходимости — тест store: `openReferenceDrawer` выставляет pane/open.

---

## 6. Бесконечная башня

### 6.1. Flow

В `CampaignBattleTab.handleTowerStart`:

1. Если `modeDisabled` → return.
2. Если `countOccupiedSquadSlots(squad) < 1` → `message.error` (как сейчас).
3. `const party = getOccupiedSquadCharacterIds(campaign.squad).slice(0, 4)`.
4. `onStartTowerBattle(party)` — **без модалки**.

### 6.2. Cleanup

- Удалить state `towerPartyPickOpen`.
- Удалить второй `ExpeditionPartyPickModal` для башни (`TOWER_PLACEHOLDER_CHAIN`, `titleOverride` tower).
- Импорт `TOWER_PLACEHOLDER_CHAIN` из `CampaignBattleTab` убрать, если больше не используется в этом файле.

### 6.3. Тесты

- Unit или component test: `handleTowerStart` / клик по tower tile вызывает `onStartTowerBattle` с ids из squad в порядке слотов (max 4), без открытия modal.

---

## 7. Error handling и accessibility

- Drawer не блокирует бой (non-modal overlay Ant Design Drawer по умолчанию — mask кликабелен; игрок может закрыть и продолжить ход).
- Базовые ячейки: `tabIndex={0}`, keyboard activate = click; disabled + CD — `aria-disabled` через disabled button state.
- Не использовать только цвет для selected — сохранить `inv-cell--selected` ring.

---

## 8. Verification

- `npm run build` без ошибок TypeScript.
- `npm test` — затронутые тесты (`CampaignHubNav`, tower flow, `basicActionText` если добавлен).
- Ручная проверка:
  - Бой: выбор move/melee/ranged ячейками, overlay, guided tutorial, CD выстрела.
  - Hub + бой: Кодекс/Справка из шапки, переключение внутри Drawer, unread badge.
  - Башня: один клик → бой с отрядом из панели «Отряд».

---

## 9. Связанные документы

- [Loadout ghost + battle skills](2026-07-18-loadout-ghost-cells-battle-skills-design.md)
- [Battle UI improvements](2026-07-17-battle-ui-improvements-design.md)
- [Battle mode picker](2026-07-18-battle-mode-picker-design.md)
