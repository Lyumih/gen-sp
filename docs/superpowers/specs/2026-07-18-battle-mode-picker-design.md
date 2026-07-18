# Дизайн: экран выбора режима боя (плитки)

**Дата:** 2026-07-18  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-23-expedition-modes-design.md`, `AGENTS.md`, `src/features/campaign/CampaignBattleTab.tsx`, `src/game/expedition/config.ts`

---

## 1. Цель

Переработать вкладку **«Бой»** из двух колонок («Кампания» + «Экспедиция» со списком чекбоксов) в **единый экран выбора режима**:

- один отряд сверху;
- **квадратные плитки** режимов — название, описание и emoji-параметры на самой карточке (без tooltip);
- **клик по плитке** сразу запускает бой/экспедицию;
- при избытке бойцов — **модалка** выбора состава;
- два яруса: основные режимы (верх) и **«Скоро»** (низ) для режимов в стадии доработки.

Отдельной панели «Кампания» нет.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Компоновка | **A** — один отряд на всю ширину, под ним сетка плиток |
| Клик | **C** — клик = старт; детали только на карточке, tooltip не используем |
| Избыток бойцов | Модалка «Состав на бой» (checkbox, до `maxParty`) |
| Нижний ярус | Подпись **«Скоро»** (не «Бета»); плитки кликабельны |
| Компания | Активна — ведёт в текущую кампанию (`campaign-main`); «скоро» = контент/полировка, не блокировка |
| Onboarding | До `first_battle_won` верхний ряд **скрыт**; видна только секция «Скоро» с **Компанией** |
| Тест: один бой | В секции «Скоро»; **скрыт** до `onboarding.graduated \|\| onboarding.skipMode` |
| Визуальный подход | **Плитки режимов** (кастомная сетка, не копия таверны) |

---

## 3. Компоновка страницы

Вертикальный поток внутри `CampaignBattleTab`:

1. **`GamePanel` «Отряд»** — один `SquadAssemblyDnd` (DnD слотов как сейчас; **без** чекбоксов-отметок на этой вкладке).
2. **`Alert`** — если идёт бой или активна экспедиция (`AGENTS.md`: disabled + сообщение, не только opacity).
3. **Основные режимы** — сетка из 5 плиток; блок **не рендерится** до `hasCompletedStep(onboarding, 'first_battle_won')`.
4. **«Скоро»** — подпись-секция + сетка плиток (Компания; + Тест при dev-доступе).

Удаляются:

- колонка `GameColumns` с двумя панелями;
- `ExpeditionModeList` (чекбоксы);
- кнопки «Начать экспедицию», «Начать первый бой», «Играть сценарий» в основном layout (логика переносится в клик по плитке / модалки).

---

## 4. Каталог плиток

### 4.1. Основной ярус (featured)

| ID | UI label | Иконка | Описание (1 строка) |
|----|----------|--------|---------------------|
| `chaotic-map` | **Хаос** | 🌀 | Полный хаос: поле, враги, препятствия |
| `tunnel` | Туннель | 🕳 | Узкий коридор, два боя |
| `big-arena` | Большая арена | 🏟 | Массовое сражение на широком поле |
| `small-skirmish` | **Дуэль** | ⚔ | Дуэль на крошечном поле |
| `ambush` | Засада | 🌲 | Окружение с флангов |

### 4.2. Ярус «Скоро»

| ID | UI label | Иконка | Видимость |
|----|----------|--------|-----------|
| `campaign-main` | **Компания** | 📜 | всегда (onboarding: единственная плитка до первой победы) |
| `test-single-battle` | Тест: один бой | 🧪 | `graduated \|\| skipMode` |

### 4.3. Emoji-строка параметров

Заменяет `paramPreview` на карточке. Формат:

```
👥{party}  👹{enemies}  ⬜{field}  ×{battles}
```

| ID | Строка на карточке |
|----|-------------------|
| `chaotic-map` | `👥1–4  👹1–20  ⬜1×2–20×20  ×1–3` |
| `tunnel` | `👥≤2  ⬜1×10  ×2` |
| `big-arena` | `👥≤4  👹8–12+👑1–3  ⬜10×20  ×1` |
| `small-skirmish` | `👥1  👹1  ⬜1×2  ×1` |
| `ambush` | `👥≤4  👹≤8  ⬜10×10  ×1` |
| `campaign-main` | `👥1  ×3  ♻ между боями` |
| `test-single-battle` | `👥1  ×1  🧪 dev` |

Реализация: поле `paramEmojiLine: string` в конфиге **или** функция `formatModeParamLine(chain)` — один источник для UI и help (help может оставить prose, карточки — emoji).

Шрифт параметров: 12px, secondary color; перенос внутри плитки допустим.

---

## 5. Плитка — структура и состояния

### 5.1. Разметка (сверху вниз)

1. Emoji-иконка режима (крупнее текста, ~28px).
2. **Название** (`strong`, 14px).
3. **Описание** — `Typography.Text type="secondary"`, max 2 строки (`line-clamp: 2`).
4. **Параметры** — emoji-строка (§4.3).

Интерактив: вся плитка — `<button type="button">` с `aria-label="{label}. {description}. {paramEmojiLine}"`.

### 5.2. CSS

Новые классы в `game-layout.css` (или `battle-mode-picker.css` рядом с компонентом):

```css
.game-mode-section { /* отступ между ярусами */ }
.game-mode-section__title { font-size: 12px; font-weight: 600; color: #8c8c8c; margin-bottom: 8px; }
.game-mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.game-mode-tile {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.game-mode-tile:hover:not(:disabled) { border-color: #1677ff; }
.game-mode-tile:disabled { opacity: 0.45; cursor: not-allowed; }
.game-mode-section--soon .game-mode-tile { background: #fafafa; }
```

### 5.3. Responsive

| Breakpoint | Сетка |
|------------|-------|
| ≥901px | `minmax(140px, 1fr)`, обычно 3–5 колонок |
| ≤900px | те же правила, min 2 колонки на узком экране за счёт `minmax(140px, 1fr)` |

Согласовано с breakpoints `game-columns` (900px).

---

## 6. Поведение при клике

### 6.1. Общий алгоритм

```
onTileClick(chainId):
  if inBattle || expeditionActive → return (tile disabled)
  chain = getExpeditionChainById(chainId)
  occupied = countOccupiedSquadSlots(squad)
  if occupied < chain.partyMin → message.error(...); return

  if chain.id === 'campaign-main':
    handleCampaignTileClick()
    return

  maxParty = getChainMaxParty(chain)
  if occupied > maxParty:
    open ExpeditionPartyPickModal(chain, maxParty)
    return

  party = resolveExpeditionParty({ squad, markedIds: [], maxParty })
  if party.length < 1 → message.error(...); return
  onStartExpedition(chainId, party)
```

### 6.2. Модалка «Состав на бой»

**Компонент:** `ExpeditionPartyPickModal`

| Элемент | Поведение |
|---------|-----------|
| Заголовок | `{label} — выберите до {maxParty} бойцов` |
| Список | Занятые слоты отряда: emoji класса, имя, `⭐{level}` |
| Выбор | Checkbox; не больше `maxParty` отмеченных; при попытке сверх лимита — `message.warning` |
| По умолчанию | Отмечены первые `maxParty` по порядку слотов 1→4 |
| Primary | «Начать» → `onStartExpedition(chainId, selectedIdsInSlotOrder)` |
| Cancel | закрыть без старта |

StatStrip в модалке **не** показываем (компактность MVP).

### 6.3. Плитка «Компания»

| Состояние кампании | Клик |
|--------------------|------|
| Не пройдена (`!done`) | Проверка ≥1 боец → `onStartOrContinue()`; label onboarding: «Начать первый бой» / «Начать / продолжить бой» — **на плитке** как subtitle или badge, не отдельная кнопка |
| Пройдена (`done`) | Модалка **«Повтор сценария»**: `Select` по `SCENARIOS` + «Играть» → `onStartReplay(slot)` |

### 6.4. Disabled

Плитки disabled когда:

- `inBattle`;
- `campaign.expedition !== null` (плюс `Alert` с прогрессом экспедиции);
- для onboarding: верхний ярус не рендерится (не disabled — hidden).

---

## 7. Данные и модули

### 7.1. Расширение конфига

```ts
export type ModeTier = 'featured' | 'soon'

export type ExpeditionChainConfig = {
  // ...existing fields...
  tier: ModeTier
  iconEmoji: string
  paramEmojiLine: string
  /** UI label override; id unchanged */
  label: string
}
```

Пример: `chaotic-map` → `label: 'Хаос'`, `tier: 'featured'`, `iconEmoji: '🌀'`.

`EXPEDITION_CHAINS` группируется по `tier` для рендера секций.

### 7.2. Новые / изменённые файлы

| Файл | Назначение |
|------|------------|
| `src/features/campaign/BattleModeTile.tsx` | одна плитка |
| `src/features/campaign/BattleModeGrid.tsx` | секция + сетка |
| `src/features/campaign/ExpeditionPartyPickModal.tsx` | выбор бойцов |
| `src/features/campaign/CampaignReplayModal.tsx` | повтор сценария (или inline в pick modal) |
| `src/features/campaign/CampaignBattleTab.tsx` | новый layout |
| `src/game/expedition/config.ts` | tier, emoji meta, переименования |
| `src/features/layout/game-layout.css` | стили сетки |

Удалить / заменить использование:

- `ExpeditionModeList.tsx` — удалить после миграции (или оставить deprecated один релиз — предпочтительно удалить).

### 7.3. Селекторы onboarding

- `isExpeditionPanelVisible` → переименовать в `isFeaturedBattleModesVisible` (то же условие: `first_battle_won` или graduated/skip).
- Onboarding copy (`WELCOME_COPY`): «Первый шаг: вкладка «Бой» → плитка **Компания**» (вместо «Начать первый бой»).

---

## 8. Вне scope (явно не делаем)

- Новые генераторы или баланс режимов.
- Tooltip / popover на плитках.
- Bento-асимметричная сетка.
- Отметки участников на полоске отряда (только модалка).
- Переработка логики `resolveExpeditionParty` / генераторов.
- Отдельный блок «Кампания» и второй `SquadAssemblyDnd`.

---

## 9. Тестирование

| Кейс | Ожидание |
|------|----------|
| Onboarding, до первой победы | Только «Скоро» + Компания; верхний ряд отсутствует |
| Клик Компания, пустой отряд | `message.error` |
| Клик Хаос, 4 бойца, max 4 | Старт без модалки |
| Клик Хаос, 4 бойца, max 2 | Модалка; выбор 2; старт |
| Модалка: >max отметок | warning, лишние не ставятся |
| Активная экспедиция | Alert + все плитки disabled |
| Кампания пройдена | Клик Компания → модалка replay |
| Тест | Не виден до graduated/skip |
| a11y | Плитка focusable, `aria-label` полный |

Unit-тесты: `formatModeParamLine` (если вынесена), рендер `BattleModeGrid` (featured hidden по onboarding), логика `shouldOpenPartyPickModal(occupied, maxParty)`.

---

## 10. Help / AGENTS

- Обновить help-статью «Бой»: описать плитки и секцию «Скоро», переименования Хаос/Дуэль/Компания.
- AGENTS.md: при необходимости короткая ссылка на паттерн «плитка режима» (emoji на карточке, без tooltip).
