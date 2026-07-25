# Дизайн: башня в сетке режимов + retry после поражения

**Дата:** 2026-07-25  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-07-25-infinite-tower-design.md`, `docs/superpowers/specs/2026-07-18-battle-mode-picker-design.md`, `AGENTS.md`, `src/features/campaign/CampaignBattleTab.tsx`, `src/features/campaign/BattleModeList.tsx`, `src/game/campaign/runReducer.ts`

---

## 1. Цель

1. Исправить **«Начать новый бой»** после поражения в режиме «Бесконечная башня».
2. Перенести башню из отдельной панели в **общую сетку плиток** режимов: **первая** карточка, **flex-wrap** вместо горизонтального скролла, **одинаковая высота** карточек в ряду.

---

## 2. Контекст / баг

`RETRY_CURRENT_BATTLE` в `runReducer` обрабатывает только экспедицию и кампанию (`SCENARIOS[snap.scenarioSlotIndex]`). Башня сохраняет в `BattleAttemptSnapshot` `scenarioSlotIndex: -1` и `towerFloor`. При retry `SCENARIOS[-1]` не даёт сценарий — reducer возвращает **неизменённый state**; кнопка в `BattleScreen` видна, но не перезапускает бой.

Ожидаемое поведение зафиксировано в `docs/superpowers/specs/2026-07-25-infinite-tower-design.md` §2–3: поражение на этаже N, retry с тем же encounter `(runSeed, N)`.

---

## 3. Retry после поражения (§1 design)

При `RETRY_CURRENT_BATTLE`:

- Если `snap.towerFloor !== undefined` (и `state.tower` присутствует):
  - Восстановить мету из снимка (`worldPower`, `gold`, party) — как сейчас через `restorePartyFromSnapshot`.
  - Сгенерировать сценарий: `generateInfiniteTower({ runSeed: state.tower.runSeed, floor: snap.towerFloor })`.
  - Spawn seed — тот же контракт, что в `startTowerBattle` (`hashSeed(\`${runSeed}:${floor}:spawn\`)`).
  - `phase: 'battle'`, новый `battleAttemptId`, свежий `battleLog` через `battleStateFromScenario`.
- **Не** менять `tower.currentFloor`, **не** выдавать награды, **не** трогать expedition.

Покрытие: тест в `src/game/campaign/towerBattle.test.ts` — defeat → `RETRY_CURRENT_BATTLE` → `phase === 'battle'`, фаза боя не `defeat`, этаж без изменений.

---

## 4. Сетка режимов (§2 design)

### 4.1. Layout

- `BattleModeList` **не** использует `GameScrollX`.
- Контейнер списка: `display: flex`, `flex-wrap: wrap`, `gap: 8px`, `width: 100%`.
- Обёртка каждой плитки (`role="listitem"`): базовая ширина **140px** (как в текущем `.game-mode-strip`), `display: flex`, `align-items: stretch`.

### 4.2. Одинаковая высота

- Для плиток внутри списка режимов отключить **`aspect-ratio: 1`** (модификатор в `battle-mode-picker.css`, например `.game-mode-strip .game-mode-tile`).
- `.game-mode-tile`: `width: 100%`, `height: 100%`, общий **`min-height`** (значение подобрать в вёрстке так, чтобы башня с кнопкой «Сбросить» и trial-плитки выглядели ровно).
- Внутренняя колонка плитки: `margin-top: auto` у нижней строки (params / footer) сохраняется.

### 4.3. Onboarding focus

- Скролл к `#hub-battle-mode-trials` в `CampaignBattleTab` без изменений; якорь остаётся на **первой trial**-плитке в entries (башня выше trials — на фокус не влияет).

---

## 5. Карточка «Бесконечная башня» (§3 design)

### 5.1. Порядок и видимость

- При `isFeaturedBattleModesVisible(campaign)` запись **башня — первая** в списке, затем trials, обучение, placeholders, dev — как в `buildBattleModeEntries` сегодня, но без отдельного `InfiniteTowerPanel`.
- До `first_battle_won` featured-блок (включая башню) **не показывается** — как сейчас для trials.

### 5.2. Компонент

- Новый тип entry: `{ kind: 'tower' }` в `BattleModeListEntry`.
- Компонент **`BattleModeTowerTile`** (логика превью из `InfiniteTowerPanel`: `previewTowerFloor`, этаж, рекord, враги/босс/affix, строка first-clear бонуса).
- Структура как у `BattleModeTile`:
  - Категория: **`Испытание`** (`BATTLE_MODE_CATEGORY.trial`).
  - Иконка 🗼, заголовок «Бесконечная башня».
  - **Badge:** `Этаж N` (+ ` · Рекord: M` при `bestFloor > 0`).
  - **Desc:** краткое превью encounter (👹 count, босс, affix title).
  - **Params:** бонус первого прохождения или «уже получен».

### 5.3. Действия (решение A)

- **Клик по карточке** (основная область): проверка отряда → открытие `ExpeditionPartyPickModal` с `TOWER_PLACEHOLDER_CHAIN` → `onStartTowerBattle` (как в `CampaignBattleTab` сейчас).
- **«Сбросить башню»** — вторичная кнопка внизу карточки (`size="small"`), `disabled` при `tower === null` или hub disabled; **`stopPropagation`** на click; тот же `modal.confirm` и `onResetTower`.
- Disabled при `inBattle` или активной экспедиции — как у остальных плиток.

### 5.4. Удаление

- Убрать рендер `InfiniteTowerPanel` из `CampaignBattleTab`.
- Файл `InfiniteTowerPanel.tsx` удалить или свести к экспорту `TOWER_PLACEHOLDER_CHAIN` / перенести константу в `src/features/campaign/towerMode.ts` (минимальный diff — на усмотрение плана).

---

## 6. Тестирование

| Область | Проверка |
|---------|----------|
| Retry | Vitest: tower defeat → retry → новый бой, тот же floor |
| Entries | При featured: первая entry — `tower` (опционально) |
| UI | Ручной smoke: flex-wrap, ровная высота карточек, сброс с confirm, party pick |

---

## 7. Вне scope

- Изменение формул этажа, affix, наград башни.
- Переработка onboarding copy про поражение (уже есть «Начать новый бой»).
- Замена Ant Design / новые emoji вне `labels.ts` для статов боя.
