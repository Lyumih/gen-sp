# Дизайн: закрытие MVP-цикла, иерархия режимов и product vision

**Дата:** 2026-07-18  
**Статус:** утверждено (brainstorming)  
**Связь:** [gen-game-design](./2026-03-28-gen-game-design.md), [battle-mode-picker](./2026-07-18-battle-mode-picker-design.md), [newcomer-onboarding](./2026-06-24-newcomer-onboarding-design.md), [expedition-modes](./2026-06-23-expedition-modes-design.md), `AGENTS.md`

---

## 1. Цель

Сделать Gen **ощущающимся законченным MVP**, не elevating встроенную «Компанию» в главный режим:

1. **A — финал onboarding:** понятный момент «обучение завершено», не credits всей игры.
2. **C — связность режимов:** один корректный путь через «Обучение», испытания — основной loop после выпуска; убрать секцию «Скоро» как маркер недоделки.
3. **D — Memento Mori в UX:** `worldPower`, level-up карт и смерть героев видны в бою и хабе, не только в справке.
4. **Product vision (design-only + неактивные секции UI):** Roguelike (Slay the Spire–style), online PvP, async PvP против билдов из БД, UGC-кампании — зафиксировать направление; в UI показать **неактивные** плитки «скоро», без gameplay и без backend.

**Не цель:** качественная сюжетная кампания, roguelike-run, matchmaking, UGC-редактор.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Роль «Компании» | Tutorial + onboarding closure; **не** hero-режим, **не** центр прогрессии |
| Основной loop после graduation | **Испытания** — 5 procedural expedition modes |
| Solo vs expedition (баг) | После `first_battle_won` плитка «Обучение» → `START_EXPEDITION`, не `START_OR_CONTINUE_BATTLE` |
| Первый бой | Solo `tutorial` + guided overlay (исключение для onboarding) |
| Секция «Скоро» | **Удалить**; dev-тест — отдельная скрытая секция «Разработка» |
| Будущие режимы | Секции **Roguelike**, **PvP** — видимы, **disabled**, подпись «Скоро»; без роутов и reducer |
| UGC-кампании | Только в spec §10; архитектурный hook `kind: 'custom'` — не в первом PR |
| Scope первого PR | **A:** MVP close (фиксы + milestones + Memento UI + неактивные плитки) |
| Modal финала | «Обучение завершено» + CTA к испытаниям; один раз (`tutorialCompleteSeen`) |
| Post-graduation | Milestones в drawer «Цели» (не «пройди компанию снова») |

---

## 3. Иерархия вкладки «Бой»

Вертикальный порядок секций в `CampaignBattleTab`:

| # | Секция | Содержимое | Активность |
|---|--------|------------|------------|
| 1 | **Испытания** | 5 procedural chains (`tier: 'featured'`) | Кликабельны после `first_battle_won` (как сейчас); **до** первой победы секция скрыта |
| 2 | **Обучение** | `campaign-main` — одна плитка, badge прогресса `Бой N / 3` | Кликабельна по правилам §4 |
| 3 | **Roguelike** | Placeholder-плитка(и) — см. §9 | **Disabled**, `soon` styling |
| 4 | **PvP** | Placeholder: «Онлайн», «Арена билдов» | **Disabled**, `soon` styling |
| 5 | **Разработка** | `test-single-battle` | Только `graduated \|\| skipMode`; кликабельна |

Секция «Скоро» как отдельный ярус **не используется**.

### 3.1. Конфиг `campaign-main`

- `tier`: `'featured'` → секция «Обучение», не «Скоро».
- `label` в UI секции: плитка остаётся **«Компания»** (контент), заголовок секции — **«Обучение»**.
- После `scenarioIndex >= SCENARIOS.length`: клик → `CampaignReplayModal` (как сейчас).

### 3.2. Badge прогресса (Обучение)

Пока `!done`:

```text
Бой {scenarioIndex + 1} / {SCENARIOS.length} — {scenarioId label}
```

После `done`:

```text
Пройдено · повторить
```

---

## 4. Единый путь «Обучение» (фикс C)

### 4.1. Проблема

`CampaignBattleTab.handleModeSelect` для `campaign-main` при `!done` вызывает `START_OR_CONTINUE_BATTLE` (solo). Coach mark `expedition-start` обещает экспедицию. Игрок может пройти бои 2–3 solo без лагеря и без `graduateOnboarding`.

### 4.2. Правила клика по «Компания»

| Условие | Действие |
|---------|----------|
| `scenarioIndex === 0` и нет `first_battle_won` | `START_OR_CONTINUE_BATTLE` (solo `tutorial`, guided) |
| `0 < scenarioIndex < SCENARIOS.length` | `START_EXPEDITION` `campaign-main` с **оставшимися** боями |
| `scenarioIndex >= SCENARIOS.length` | Открыть `CampaignReplayModal` |

### 4.3. Ядро: `battleIndex` / `battleCount` для `campaign-main`

Расширить логику в `START_EXPEDITION` (сейчас только onboarding shortcut):

```text
battleIndex = scenarioIndex
battleCount = SCENARIOS.length - scenarioIndex
```

Примеры при `SCENARIOS.length === 3`: `scenarioIndex 0` → 3 боя; `1` → 2 боя (`two-front`, `boss-lite`).

**Onboarding** (уже есть): при `isOnboardingExpeditionPending` и `first_battle_won` → `battleIndex: 1`, `battleCount: 2`.

**Skip onboarding, scenarioIndex === 0`:** экспедиция на все 3 боя (`battleIndex: 0`, `battleCount: 3`).

**Регрессия:** solo linear path через `START_OR_CONTINUE_BATTLE` для боя 2+ **убрать из UI**; reducer action остаётся для tutorial и тестов.

### 4.4. `START_OR_CONTINUE_BATTLE`

- Не вызывается из плитки после `first_battle_won`.
- Header «Бой» по-прежнему переключает вкладку, не стартует бой.

---

## 5. Финал onboarding (A)

### 5.1. Modal «Обучение завершено»

**Триггер:** первый раз когда `scenarioIndex >= SCENARIOS.length` **и** `onboarding.graduated` становится `true` (экспедиция onboarding завершена) **или** skip path достиг `done` без graduation — см. §5.3.

**Копирайт (ориентир):**

- Заголовок: **Обучение завершено**
- Тело: базовая тактика и три оси Memento Mori (смерть → уровень героя и сила мира; использование → уровень карт; победа → моды).
- Строка vision: *«Дальше — Испытания. Полноценный Roguelike-run и PvP — в разработке.»*
- Primary CTA: **К испытаниям** — закрыть modal, scroll/focus на секцию «Испытания» (эфемерный UI state в Zustand).
- Secondary: **Позже**

### 5.2. Персистентность

Новое поле в `OnboardingState`:

```ts
tutorialCompleteSeen: boolean  // default false; migration → false
```

Modal не показывать повторно если `tutorialCompleteSeen === true`.

Установить `tutorialCompleteSeen: true` при закрытии modal (любая кнопка).

### 5.3. Skip onboarding

Если `skipMode` и игрок достиг `done` без `graduated`: показать тот же modal один раз, выставить `tutorialCompleteSeen`.

---

## 6. Post-graduation milestones

После `onboarding.graduated || skipMode` drawer «Цели» показывает **milestones** (не onboarding checklist).

### 6.1. Список (MVP)

| ID | Label | Условие выполнения |
|----|-------|-------------------|
| `milestone_first_trial_win` | Выиграть любое испытание | Победа в expedition с `kind: 'procedural'` |
| `milestone_world_power_10` | Довести силу мира до 10 | `campaign.worldPower >= 10` |
| `milestone_hire_second` | Нанять второго героя | `characters.length >= 2` (или roster count) |
| `milestone_first_mod` | Открыть модификацию умения | Любая карта с `modSlots.length > 0` и хотя бы одним mod level > 0 |
| `milestone_big_arena_win` | Победить в «Большой арене» | Победа в expedition `big-arena` |

### 6.2. Архитектура

- Конфиг: `src/game/milestones/definitions.ts` (аналог `onboarding/steps.ts`).
- Состояние: `CampaignState.completedMilestones: readonly MilestoneId[]` — персистентно, миграция `[]`.
- Проверка: pure `evaluateMilestones(campaign)` после `FINALIZE_VICTORY`, hub load; без дублирования в UI-only.
- UI: переиспользовать паттерн `OnboardingChecklist` → `MilestoneChecklist` в том же Drawer.

---

## 7. Memento Mori в UX (D)

Механика не меняется; добавляется feedback.

### 7.1. Бой — floating text

При событиях battle reducer (или слой animation queue):

| Событие | Текст | Приоритет |
|---------|-------|-----------|
| Enemy killed (worldPower +1) | `+1 сила мира` | После урона, emoji из `UI_WORLD_POWER` |
| Ally death + unit level roll success | `+1 уровень` | `UI_LEVEL` |
| Card level up on use | pulse на slot карты + опционально `+1 ур. карты` | Не spam: max 1 float за ход на карту |

Использовать существующий animation/floating-text pipeline (`battle-floating-text-design`).

### 7.2. Бой — debrief stripe

На экране победы (`phase: 'victory'`), перед «Завершить»:

```text
Сила мира: {before} → {after} (+{delta} за бой)
```

`before` — из `battleAttemptSnapshot.worldPower` или snapshot at battle start.

### 7.3. Хаб

**`WORLD_POWER_TOOLTIP`** (`resourceTooltips.ts`):

```text
Сила мира — {N} (+{N}% к базовым статам врагов)
Мир помнит каждую победу. Чем выше — тем опаснее следующие бои.
Смерть героев усиливает их уровень; победы — модификации умений.
```

### 7.4. Inter-battle camp

Под заголовком лагеря одна строка:

```text
Сила мира в экспедиции: {campaign.worldPower}
```

---

## 8. Неактивные секции будущих режимов (B — UI задел)

### 8.1. Принцип

Секции **видны**, **не кликабельны**, без `dispatchRun`, без новых `RunPhase`. Игрок видит roadmap; не возникает ощущения «игра только про 5 испытаний».

### 8.2. Roguelike

**Заголовок секции:** Roguelike  

| Placeholder ID | Label | Icon | Description |
|----------------|-------|------|-------------|
| `roguelike-run` | Run | 🗺 | Полный run: карта, выбор пути, мета между попытками |

- Компонент: `BattleModePlaceholderTile` — визуально как `BattleModeTile`, но `disabled`, класс `game-mode-tile--soon`.
- `aria-label` включает «Скоро».

### 8.3. PvP

**Заголовок секции:** PvP  

| Placeholder ID | Label | Icon | Description |
|----------------|-------|------|-------------|
| `pvp-online` | Онлайн | ⚔ | Бой против игрока в реальном времени |
| `pvp-async` | Арена билдов | 👤 | Бой против сохранённого отряда другого игрока |

Обе disabled.

### 8.4. Типы (минимальный задел)

```ts
// src/game/modes/placeholders.ts — только константы для UI, не reducer
export type PlaceholderModeId = 'roguelike-run' | 'pvp-online' | 'pvp-async'
export type PlaceholderModeDef = { id, section, label, iconEmoji, description }
```

**Не добавлять** `RunMode` в `CampaignState` до отдельной спеки roguelike/PvP.

### 8.5. CSS

Расширить `battle-mode-picker.css`:

- `.game-mode-section--disabled` — приглушённый заголовок секции (optional).
- `.game-mode-tile--soon` — opacity + `cursor: not-allowed`; секция Roguelike/PvP всегда soon.

---

## 9. Product vision (design-only, §10 — без реализации)

Зафиксировано для следующих спек; **не входит в первый PR** кроме placeholder UI §8.

### 9.1. Roguelike (high-end PvE)

**Референс:** Slay the Spire — run с картой узлов, мета-прогресс между run'ами.

**Связь с текущим кодом:**

- Expedition engine (цепочки боёв, inter-battle camp, freeze hub) — фундамент для **одного этапа** run.
- Procedural generators — фундамент для **бoeвых узлов**.
- Новое: map graph, run-scoped loot/rules, meta currency, run reset vs persistent `CampaignState`.

**Отличие от «Испытаний»:** испытания = один expedition из хаба в persistent save; roguelike = изолированный run, fail/restart, отдельная мета.

### 9.2. Online PvP

**Референс:** тактический бой 1v1 (или squad vs squad) против live opponent.

**Связь:** battle reducer + turn order уже есть; нужны: сеть, симметричные правила, отключение PvE-only rewards, matchmaking, anti-cheat.

**Memento в PvP:** отдельный баланс — likely без persistent `worldPower` creep mid-match; meta progression out of match.

### 9.3. Async PvP (offline vs DB builds)

**Референс:** fight a snapshot of another player's roster/build from server DB.

**Связь:** `Character` + equipment + cards serializable; battle from snapshot already similar to `battleStateFromScenario`.

**Memento hook:** snapshot includes owner's `worldPower` at export time — tooltip «Билд игрока X, сила мира N».

### 9.4. UGC story campaigns

**Цель:** пользователи создают и загружают сюжетные кампании.

**Связь с кодом:**

- `ExpeditionChainConfig` + `kind: 'static' | 'procedural' | 'custom'` (future).
- `SCENARIOS` → встроенный preset `builtin-tutorial`, не единственный источник правды.
- Загрузка: JSON schema (scenarios, party rules, inter-battle flags) → validate → add to hub section «Сообщество» или «Мои кампании».

**Роль built-in «Компания»:** эталон формата UGC, не главный контент.

**Out of scope:** редактор, модерация, CDN, versioning.

---

## 10. Миграции и персистентность

| Поле | Default | SAVE_VERSION bump |
|------|---------|-------------------|
| `onboarding.tutorialCompleteSeen` | `false` | Да, если bump |
| `campaign.completedMilestones` | `[]` | Да, если bump |

Следовать правилам `game/persistence/migrate.ts`.

---

## 11. Тесты (минимум)

### 11.1. Ядро

- `campaign-main` после `first_battle_won` → `START_EXPEDITION`, не solo (integration `runReducer`).
- Onboarding expedition: `battleIndex: 1`, `battleCount: 2` — без регрессии.
- Skip path: `scenarioIndex 0` + `START_EXPEDITION` → 3 battles.
- Milestone evaluation: `milestone_world_power_10` при `worldPower >= 10`.
- `tutorialCompleteSeen` не сбрасывается на replay.

### 11.2. UI (optional smoke)

- Секции Roguelike/PvP рендерятся disabled.
- После graduation drawer показывает milestones, не onboarding steps.

---

## 12. Вне объёма первого PR

- Roguelike map / run state / meta shop
- PvP networking, DB, matchmaking
- UGC editor, `kind: 'custom'`, import pipeline
- Codex `CODEX_SHOW_ALL_DEFAULT → false` (отдельная задача релиза)
- Phase-2 mods, LOS, arena mode
- Изменение баланса `worldPower` (+1 MVP stub остаётся)

---

## 13. Связь с предыдущей спекой battle-mode-picker

| Было (2026-07-18 picker) | Стало (этот документ) |
|--------------------------|------------------------|
| Ярус «Скоро» с Компанией | Секция «Обучение»; «Скоро» только styling disabled плиток |
| Компания в «Скоро» | Компания в «Обучение», `tier: featured` |
| До first win — только «Скоро» | До first win — только «Обучение» (+ onboarding flow) |
| 2 яруса | 5 секций: Испытания, Обучение, Roguelike, PvP, Разработка |

При конфликте **этот документ** normative для product hierarchy.

---

## 14. Следующий шаг

После ревью spec пользователем — skill **writing-plans**: детальный план PR (runReducer, CampaignBattleTab, placeholders, milestones, Memento UI, migrate, tests).
