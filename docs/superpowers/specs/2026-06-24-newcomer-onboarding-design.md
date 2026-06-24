# Дизайн: онбординг для новичков (Newcomer Onboarding)

**Дата:** 2026-06-24  
**Статус:** утверждено (brainstorming)  
**Связь:** `gen_spec_for_claude.md` §1–§3, `AGENTS.md`, `docs/superpowers/specs/2026-06-23-help-section-design.md`, `docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md`, `src/game/help/articles.ts`, `src/features/campaign/CampaignHub.tsx`, `src/features/campaign/CampaignBattleTab.tsx`, `src/features/battle/BattleScreen.tsx`, `src/game/campaign/scenarios.ts` (`tutorial`)

---

## 1. Цель

Сделать Gen **понятным для новичков** за **30–60 минут** первой сессии:

1. Игрок знает, **куда нажимать** в хабе и в бою.
2. Понимает **базовую тактику** (ход, удар, умение, инициатива).
3. Понимает **Memento Mori**: поражение не сбрасывает кампанию; смерть, использование и победа качают разные оси прогресса.
4. Проходит **канонический гибридный путь**: бой 1 в хабе → мета в хабе → бои 2–3 в экспедиции «Основная кампания».

**Аудитория:** и полные новички в пошаговой тактике, и игроки, знакомые с жанром (нужен **умный пропуск**).

**Не заменяет:** вкладку «Справка» — дополняет её контекстными подсказками и сценарием первого часа.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Критерий успеха | 30–60 мин: тактика + Memento Mori |
| Аудитория | Оба сегмента; опытные — «Я уже играл» |
| Канонический путь | **Гибрид C:** бой 1 — одиночная кампания в хабе; бои 2–3 — экспедиция `campaign-main` |
| Формат подсказок | **Комбо D:** чеклист целей + coach marks + guided tutorial на `tutorial` |
| Пропуск | **Умный C:** guided/coach off; чеклист → иконка «Цели»; на новом сейве снова welcome |
| Архитектура состояния | **Гибрид:** `CampaignState.onboarding` (персистентно) + Zustand UI (эфемерно) + конфиг `src/game/onboarding/` |
| Ядро vs UI | Ядро фиксирует факты (шаг выполнен, skip, graduate); UI решает, что показать |
| Guided бой | Не меняет правила боя — только `disabled` на лишних кнопках в UI |
| Существующие сейвы | Миграция: `graduated: true` если `scenarioIndex > 0`, иначе онбординг с текущей вехи |

---

## 3. Сценарий первого часа (5 фаз)

| Фаза | Действие игрока | Что показываем |
|------|-----------------|----------------|
| **0. Welcome** | «Начать обучение» / «Я уже играл» | Жанр, Memento в одну фразу, «первый бой — кнопка Бой» |
| **1. Хаб → бой 1** | «Бой» → «Начать первый бой» | Coach mark на «Бой»; панель «Экспедиция» **скрыта** |
| **2. Guided tutorial** | Сценарий `tutorial` (solo) | 6 шагов: цель → ход → сближение → удар → (опц.) карта → победа |
| **3. Дебриф + хаб** | «Продолжить» после победы | Modal: золото, Memento (3 оси), чеклист → магазин |
| **4. Экспедиция 2–3** | «Начать экспедицию» (`campaign-main`) | Coach: freeze хаба, лагерь; **2 боя** (`two-front`, `boss-lite`) — см. §3.1 |
| **5. Выпуск** | Экспедиция завершена | Все режимы экспедиции; coach/guided off; чеклист → иконка «Цели» |

После welcome при «Начать обучение» — переключить активную вкладку на **«Бой»** (не «Персонаж»).

### 3.1. Стык solo-боя и экспедиции (важно)

После победы в solo `tutorial` ядро увеличивает `scenarioIndex` (0 → 1). Цепочка `campaign-main` по умолчанию снова начинается с `tutorial` — **дубликат**.

**Решение для онбординга:** при `START_EXPEDITION` с `chainId === 'campaign-main'`, если в `completedSteps` уже есть `first_battle_won` и `!graduated`:

- создавать экспедицию с **`battleIndex: 1`** (первый бой — `two-front`, второй — `boss-lite`);
- `battleCount` экспедиции = **2** (не 3).

Итого гибридный путь: **1 + 2 = 3 уникальных сценария** без повторного tutorial.

При завершении такой экспедиции: `scenarioIndex` → **3** (`SCENARIOS.length`).

Вне онбординга — поведение `campaign-main` **без изменений** (3 боя с `tutorial`).

---

## 4. Модель данных

### 4.1. `CampaignState.onboarding`

```ts
type OnboardingStepId =
  | 'welcome_seen'
  | 'first_battle_started'
  | 'first_battle_won'
  | 'hub_after_first_win'
  | 'shop_visited'
  | 'expedition_started'
  | 'expedition_completed'
  | 'memento_defeat_debrief'

type OnboardingState = {
  skipMode: boolean
  completedSteps: readonly OnboardingStepId[]
  guidedTutorialDone: boolean
  graduated: boolean
}
```

**Дефолт** в `initialCampaignState()`:

```ts
onboarding: {
  skipMode: false,
  completedSteps: [],
  guidedTutorialDone: false,
  graduated: false,
}
```

### 4.2. Zustand (не в save)

```ts
type OnboardingUiState = {
  checklistExpanded: boolean
  activeCoachMarkId: string | null
  guidedBattleStep: number | null
}
```

### 4.3. Actions в `runReducer`

| Action | Назначение |
|--------|------------|
| `{ type: 'MARK_ONBOARDING_STEP', stepId }` | UI/явное завершение шага |
| `{ type: 'SET_ONBOARDING_SKIP', skip: true }` | «Я уже играл» / «Пропустить обучение» |
| `{ type: 'SET_GUIDED_TUTORIAL_DONE' }` | Guided завершён или пропущен |

Автоматические шаги в существующих ветках reducer (после победы, старта боя и т.д.) — см. §6.

### 4.4. Миграция сохранений

- `SAVE_VERSION` → **11**
- Для загруженных кампаний без `onboarding`:
  - если `scenarioIndex > 0` → `{ skipMode: false, completedSteps: [], guidedTutorialDone: true, graduated: true }`
  - иначе → дефолтный onboarding (новичок дотягивает с текущей вехи)

---

## 5. Файлы и компоненты

### 5.1. Конфиг (`src/game/onboarding/`)

| Файл | Содержание |
|------|------------|
| `steps.ts` | Чеклист: id, заголовок, описание, зависимости |
| `coachMarks.ts` | id, `screen`, текст, условие `showWhen` |
| `guidedTutorial.ts` | Шаги боя: разрешённый режим, текст, `advanceOn` |
| `copy.ts` | Welcome, дебрифы, короткие тексты Memento |
| `selectors.ts` | Чистые функции: `shouldShowCoachMark`, `nextChecklistStep`, `isOnboardingActive` |

Паттерн как `src/game/help/articles.ts` — данные без React.

### 5.2. UI (`src/features/onboarding/`)

| Компонент | Роль |
|-----------|------|
| `WelcomeModal` | Фаза 0 |
| `OnboardingChecklist` | Панель целей / иконка «Цели» |
| `CoachMark` | Popover + spotlight по `ref` target |
| `GuidedBattleOverlay` | Подсказка и блокировка кнопок в бою |
| `PostBattleDebriefModal` | После 1-й победы / 1-го поражения |
| `useOnboarding.ts` | Хуки: селекторы + dispatch шагов |

### 5.3. Точки интеграции

| Место | Изменение |
|-------|-----------|
| `CampaignHub` | Welcome, checklist, coach на табах, дебриф-триггеры |
| `GameHeader` | Coach на «Бой»; иконка «Цели» после graduate |
| `CampaignBattleTab` | Скрыть «Экспедиция» до `first_battle_won`; CTA «Начать первый бой» |
| `BattleScreen` | `GuidedBattleOverlay` при solo `tutorial` |
| `InterBattleScreen` | Coach `inter-battle-camp` (1-й раз) |
| `gameStore.ts` | `onboardingUi` slice |

---

## 6. Чеклист «Цели»

| # | id | Текст | Завершение |
|---|-----|-------|------------|
| 1 | `welcome_seen` | Ознакомиться с игрой | Welcome закрыт (`MARK_ONBOARDING_STEP`) |
| 2 | `first_battle_started` | Сыграть первый бой | `START_OR_CONTINUE_BATTLE` при `scenarioIndex === 0` |
| 3 | `first_battle_won` | Победить в обучающем бою | Победа в solo `tutorial` |
| 4 | `hub_after_first_win` | Узнать о прогрессе Memento | Дебриф после 1-й победы закрыт |
| 5 | `shop_visited` | Заглянуть в магазин | Вкладка «Магазин» открыта (`MARK_ONBOARDING_STEP`) |
| 6 | `expedition_started` | Начать экспедицию «Основная кампания» | `START_EXPEDITION` с `campaign-main` |
| 7 | `expedition_completed` | Завершить экспедицию (2 боя: two-front, boss-lite) | Онбординг-экспедиция снята → `graduated: true`, `scenarioIndex: 3` |

**UI:**

- Пока `!graduated && !skipMode`: компактная панель под шапкой (`Alert` + список, `size="small"`).
- После `graduated` или `skipMode`: панель свёрнута; иконка 🎯 в шапке → `Drawer` со списком.
- Клик по активному пункту в хабе — coach mark на целевой кнопке (если применимо).

---

## 7. Coach marks

Порядок показа (каждый: кнопки **«Далее»** и **«Пропустить обучение»** → `SET_ONBOARDING_SKIP`):

| id | Условие | Target | Текст |
|----|---------|--------|-------|
| `hub-battle-btn` | После welcome, в хабе | Кнопка «Бой» | Здесь начинается бой и экспедиция. Начните с первого сценария. |
| `battle-start-solo` | До `first_battle_won` | «Начать первый бой» | Первый бой — одиночный сценарий. После победы вернётесь в хаб. |
| `battle-initiative` | 1-й ход в guided | `InitiativeQueue` | Порядок хода по ⚡ инициативе. Сейчас ваш ход. |
| `battle-actions` | Guided шаг 0–1 | Панель «Действия» | Выберите режим: ход, удар или умение — затем клетку на поле. |
| `hub-gold` | После 1-й победы | Золото в шапке | Золото за победы. Тратится в магазине и таверне. |
| `hub-shop-tab` | После дебрифа, shop не visited | Иконка «Магазин» | Покупки попадают в сундук — назначьте герою на вкладке «Персонаж». |
| `expedition-unlock` | После `hub_after_first_win` | Панель «Экспедиция» | Ещё 2 боя подряд (`two-front`, `boss-lite`). Магазин и таверна на время экспедиции недоступны. |
| `expedition-start` | Перед 1-й экспедицией | «Начать экспедицию» | Выберите «Основная кампания» и подтвердите состав. |
| `inter-battle-camp` | 1-й `inter_battle` | `InterBattleScreen` | Лагерь: отряд восстанавливается, затем следующий бой. |

Не показывать coach marks при `skipMode || graduated`.

---

## 8. Guided tutorial (solo `tutorial`)

**Условие активации:** `!onboarding.skipMode && !onboarding.guidedTutorialDone && expedition === null && battleAttemptSnapshot?.scenarioSlotIndex === 0` (слот 0 = сценарий `tutorial`).

Стартовая расстановка: герой (0,2), враг (4,2), стены (2,1)/(2,3).

| Шаг | Разрешённые режимы | Подсказка | Переход |
|-----|-------------------|-----------|---------|
| 0 | — (только «Понятно») | Ваш герой слева, враг справа. Цель — HP врага до 0. | `ack` |
| 1 | `move` | Нажмите **Ход** и выберите подсвеченную клетку ближе к врагу. | Событие `MOVE` героя |
| 2 | `move` | Подойдите вплотную, если ещё не рядом (зелёные клетки = ход). | Manhattan distance ≤ 1 до врага |
| 3 | `melee` | **Удар** — клик по врагу на соседней клетке. | Урон от melee |
| 4 | `melee`, `card` | Повторяйте удары. Умение качается при применении (необязательно). | Не блокирует |
| 5 | любой | Добейте врага. После победы расскажем о прогрессе. | `battle.phase === 'victory'` |

**UI-ограничения на время guided:**

- Недоступные `Radio.Button` — `disabled`.
- Переключатель **Автобой** — `disabled`.
- Подсказка: `Alert` `type="info"` у панели действий или overlay снизу поля.

При retry после поражения — сброс `guidedBattleStep` на 0. При `SET_ONBOARDING_SKIP` или завершении — `guidedTutorialDone: true`.

---

## 9. Тексты модалок

### 9.1. Welcome

**Заголовок:** Добро пожаловать в Gen

1. Тактическая RPG: отряд, бои на сетке, прогресс сохраняется автоматически.
2. **Memento Mori** — поражение не стирает кампанию. Смерть, использование умений и победы постепенно усиливают героев и мир.
3. Первый шаг: кнопка **«Бой»** → **«Начать первый бой»**.

**Кнопки:** `Начать обучение` (primary) · `Я уже играл` (text)

### 9.2. Дебриф первой победы

**Заголовок:** Первая победа

- Вы получили золото и опыт. Прогресс **сохранён**.
- **Memento Mori** — три способа стать сильнее:
  - **Смерть** — уровень героя и сила мира.
  - **Использование** — уровень умений и экипировки.
  - **Победа** — уровень модификаторов.
- Дальше: **магазин**, затем **экспедиция** (ещё 2 боя подряд).

**Кнопки:** `В магазин` · `Понятно`

### 9.3. Дебриф первого поражения (один раз)

**Заголовок:** Поражение — это не конец

- Кампания **не сброшена**.
- **«Начать новый бой»** — повторить попытку.
- Подробнее: **Справка** → Memento Mori.

---

## 10. Скрытие и переименование UI

| Условие | Поведение |
|---------|-----------|
| `!first_battle_won` в completedSteps | Панель «Экспедиция» не рендерится |
| `!first_battle_won` | Кнопка кампании: **«Начать первый бой»** вместо «Начать / продолжить бой» |
| `skipMode \|\| graduated` | Coach marks и guided не показываются |
| `graduated` | Все режимы экспедиции в `ExpeditionModeList` |

---

## 11. Краевые случаи

| Ситуация | Поведение |
|----------|-----------|
| F5 во время guided | `guidedBattleStep` сброшен (UI store); допустимо начать guided заново |
| Поражение в tutorial | Guided → шаг 0 на retry; дебриф поражения один раз |
| Экспедиция до `shop_visited` | Не блокировать; пункт 5 остаётся открытым |
| Загрузка с активной экспедицией | Coach marks expedition не показывать задним числом |
| Повторный `campaign-main` после graduate | Стандартные 3 боя с `tutorial` |
| Бой не `tutorial` | Guided не активен |
| `skipMode` в текущем сейве | Welcome не повторяется; новый сейв — снова welcome |

---

## 12. Тестирование

### Ядро (Vitest)

- `initialCampaignState().onboarding` — дефолт
- `MARK_ONBOARDING_STEP`, `SET_ONBOARDING_SKIP`, `SET_GUIDED_TUTORIAL_DONE`
- Победа solo `tutorial` → `first_battle_won` в `completedSteps`
- `START_EXPEDITION` `campaign-main` → `expedition_started`
- Завершение онбординг-экспедиции → `graduated: true`, `scenarioIndex: 3`
- `START_EXPEDITION` campaign-main при `first_battle_won` → `battleIndex: 1`, `battleCount: 2`
- Миграция v10→v11

### Конфиг

- Snapshot / unit на `selectors.ts`: `shouldShowCoachMark`, `isExpeditionPanelVisible`

### Ручной test plan

1. Новый сейв → welcome → бой 1 → guided → победа → дебриф → магазин → экспедиция 2–3 → graduate.
2. «Я уже играл» → нет guided/coach; чеклист свёрнут.
3. Старый сейв `scenarioIndex > 0` → без онбординга.
4. Поражение в tutorial → дебриф → retry.

---

## 13. Фазы внедрения

| Фаза | Scope |
|------|-------|
| **P1** | `OnboardingState`, миграция, Welcome, скрытие экспедиции, CTA «Первый бой», чеклист |
| **P2** | Coach marks, дебрифы победы/поражения |
| **P3** | Guided tutorial в `BattleScreen` |
| **P4** | Иконка «Цели», клик по пункту → coach; опционально Analytics |

Рекомендуемый порядок: **P1 → P2 → P3**; P4 по желанию.

---

## 14. Вне scope

- Обучение на всех режимах экспедиции
- Принудительное поражение для демонстрации Memento
- Видео, озвучка, NPC-анимации
- A/B текстов (кроме опциональных Analytics в P4)
- Глубокий онбординг магазина/таверны/модов сверх одного coach mark
- Изменение баланса или геометрии сценария `tutorial`

---

## 15. Критерии приёмки

- [ ] Новый сейв: welcome → вкладка «Бой» → «Начать первый бой» без видимой экспедиции
- [ ] Solo `tutorial`: guided проходим без чтения справки (ход + удар)
- [ ] После 1-й победы: дебриф объясняет 3 оси Memento
- [ ] После дебрифа: экспедиция видна; coach предупреждает о freeze; экспедиция = 2 боя без повтора tutorial
- [ ] «Я уже играл»: нет guided/coach; чеклист свёрнут в «Цели»
- [ ] Старый сейв с прогрессом: онбординг не мешает
- [ ] `npm run test` — тесты onboarding в ядре зелёные
