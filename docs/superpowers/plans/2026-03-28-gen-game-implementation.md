# Gen + Memento Mori — план реализации MVP

> **Для агентов:** обязательно использовать @superpowers:subagent-driven-development (рекомендуется) или @superpowers:executing-plans — выполнять задачи по порядку, отмечать чекбоксы.

**Цель:** играбельный MVP — цепочка тактических боёв на сетке 4-направления, карточки умений/оружия с `rollCardLevelUp`, токены `%%`, модификации за убийства, `worldPower`, автосохранение в `localStorage`, UI на Ant Design + Zustand.

**Архитектура:** чистое ядро в `src/game/**` (без React), детерминированные редьюсеры/чистые функции для боя и кампании; Zustand только как оболочка и мост к UI; персистентность — `JSON` + версия схемы + миграции. Один управляемый игрок в MVP (**соло-отряд**), поражение → **повтор текущего боя** без дюпа наград за уже одержанные победы в этой попытке.

**Стек:** Vite 8, React 19, TypeScript strict, Ant Design 6, Zustand 5, **Vitest** (unit-тесты ядра).

**Спека:** `docs/superpowers/specs/2026-03-28-gen-game-design.md`

---

## Карта файлов (создать / изменить)

| Путь | Ответственность |
|------|-----------------|
| `package.json` | скрипт `test`, devDeps: `vitest` |
| `vite.config.ts` | блок `test: { environment: 'node', globals: false }` |
| `src/game/memento/rollCardLevelUp.ts` | канон `rollCardLevelUp` из спеки §4.3 |
| `src/game/memento/rollCardLevelUp.test.ts` | TDD |
| `src/game/memento/resolvePercentToken.ts` | парсинг токена + расчёт `%%` / `%%CAP` / `%%-P` |
| `src/game/memento/resolvePercentToken.test.ts` | кейсы из спеки §3 |
| `src/game/memento/cardProgress.ts` | `uses_count++`, вызов roll + инкремент уровня |
| `src/game/memento/modifications.ts` | `modSlotsUnlocked(level)=floor(level/75)`, начисление за kill |
| `src/game/types.ts` | `CampaignState`, `BattleState`, `CardInstance`, `Unit`, координаты |
| `src/game/balance.ts` | `α`, `β`, `baseStat`, формула стата из §7 |
| `src/game/battle/grid.ts` | соседи по 4 направлениям, проходимость |
| `src/game/battle/combat.ts` | урон ближний/дальний, дистанция манхэттен, смерть |
| `src/game/battle/reducer.ts` | чистый `applyAction(state, action) -> state` |
| `src/game/battle/reducer.test.ts` | ход, атака, конец боя |
| `src/game/campaign/scenarios.ts` | 2–3 захардкоженных боя подряд (конфиги карт/врагов) |
| `src/game/campaign/runReducer.ts` | переходы: бой → междубойе → следующий бой; retry |
| `src/game/persistence/schema.ts` | `SAVE_VERSION`, тип сериализуемого корня |
| `src/game/persistence/serialize.ts` | toJSON / parse |
| `src/game/persistence/migrate.ts` | миграции между версиями |
| `src/game/persistence/localStorage.ts` | read/write + debounced autosave hook (вызывается из store) |
| `src/store/gameStore.ts` | Zustand: snapshot + `dispatch` + `hydrate` |
| `src/features/battle/BattleScreen.tsx` | сетка, панель действий, HP |
| `src/features/campaign/CampaignHub.tsx` | «следующий бой», прогресс цепочки |
| `src/App.tsx` | маршрутизация экранов (пока условный рендер по фазе рана) |
| `README.md` | как запустить `npm test` / `npm run dev` |

**Решения v0 (из §9 спеки):** `40%%CAP` при `L > 100` — **заморозка** множителя на значении при `L = 100`. Поражение — **retry текущего боя**. Отряд MVP — **1 герой**.

---

### Task 1: Vitest и конфиг

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Шаг 1:** Добавить devDependency `vitest` (^3.x, совместим с Vite 8).

```bash
npm install -D vitest
```

- [ ] **Шаг 2:** В `package.json` в `scripts` добавить `"test": "vitest run"` и `"test:watch": "vitest"`.

- [ ] **Шаг 3:** В `vite.config.ts` добавить:

```ts
/// <reference types="vitest/config" />
export default defineConfig({
  // ...plugins
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Шаг 4:** Запустить `npm run test`  
  **Ожидается:** завершение без тестов или 0 passed (ok).

- [ ] **Шаг 5:** Коммит  
  `git add package.json package-lock.json vite.config.ts && git commit -m "chore: add vitest for game core tests"`

---

### Task 2: `rollCardLevelUp` (TDD)

**Files:**
- Create: `src/game/memento/rollCardLevelUp.ts`
- Create: `src/game/memento/rollCardLevelUp.test.ts`

- [ ] **Шаг 1:** Написать падающий тест — при `currentLevel === 1` для **каждого** `r` в `1..100` ожидать `true` (спека §4.3: `r >= L` при `L=1`).

```ts
import { describe, it, expect } from 'vitest'
import { rollCardLevelUp } from './rollCardLevelUp'

describe('rollCardLevelUp', () => {
  it('level 1 always succeeds for r in 1..100', () => {
    for (let r = 1; r <= 100; r++) {
      expect(rollCardLevelUp(1, r)).toBe(true)
    }
  })
})
```

- [ ] **Шаг 2:** `npm run test` — **FAIL** (нет экспорта).

- [ ] **Шаг 3:** Реализовать точную копию спеки §4.3.

```ts
export function rollCardLevelUp(currentLevel: number, randomInt1to100: number): boolean {
  const r = randomInt1to100
  if (currentLevel > 100) return r === 1
  return r === 100 || r >= currentLevel
}
```

- [ ] **Шаг 4:** Добавить тесты: `L=100` только `r=100`; `L=101` только `r=1`; `L=50` `r=49` false, `r=50` true.

- [ ] **Шаг 5:** `npm run test` — **PASS**. Коммит: `feat(game): rollCardLevelUp per design spec`

---

### Task 3: `resolvePercentToken` (TDD)

**Files:**
- Create: `src/game/memento/resolvePercentToken.ts`
- Create: `src/game/memento/resolvePercentToken.test.ts`

- [ ] **Шаг 1:** Тесты: экспорт `parsePercentToken`, `resolvePercentValue(base, level, tokenString)` или раздельно — покрыть `40%%` при `L=100` → `80` (по §3.1: `BASE*(1+0.01*L)`); `40%%50` при `L=100` → `60`; `40%%-50` при `L=100` → `30` (§3.3: `40 * (1 - 50/200)`).

- [ ] **Шаг 2:** Запуск — FAIL.

- [ ] **Шаг 3:** Реализация парсера по regex из спеки §3.4; ветки `plain`, `cap`, `neg`; для `%%CAP` использовать линейную формулу §3.2 на `L<=100`, при `L>100` — **заморозка** на значении `L=100` (решение v0).

- [ ] **Шаг 4:** Тест на невалидный ввод — выброс или `null` (зафиксировать один стиль).

- [ ] **Шаг 5:** `npm run test` — PASS. Коммит: `feat(game): resolvePercentToken for Memento Mori %%`

---

### Task 4: Прогресс карточки и слоты модификаций

**Files:**
- Create: `src/game/memento/cardProgress.ts`
- Create: `src/game/memento/modifications.ts`
- Create: `src/game/memento/modifications.test.ts`

- [ ] **Шаг 1:** Тест `modSlotsUnlocked(cardLevel) === floor(cardLevel/75)` для 0,74,75,149,150.

- [ ] **Шаг 2:** FAIL → реализовать `modSlotsUnlocked` в `modifications.ts`.

- [ ] **Шаг 3:** Тест `applyCardUse(card, rng)` увеличивает `uses_count`, при успешном roll увеличивает `global_level` на 1.

- [ ] **Шаг 4:** Реализовать в `cardProgress.ts` (иммутабельно: возвращать новый объект карточки).

- [ ] **Шаг 5:** PASS, коммит: `feat(game): card use progression and mod slot math`

---

### Task 5: Типы и баланс статов

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/balance.ts`
- Create: `src/game/balance.test.ts`

- [ ] **Шаг 1:** Описать в `types.ts` минимум: `Unit` (id, side, grid x,y, hp, maxHp, unitLevel), `CardInstance` (id, templateId, global_level, uses_count, modifications: { level }[]).

- [ ] **Шаг 2:** Тест `computeUnitStat({ baseStat: 10, unitLevel: 2, worldPower: 1 }, coeffs)` соответствует `round(10 * (1 + α*2 + β*1))`.

- [ ] **Шаг 3:** Реализовать `computeUnitStat` в `balance.ts` с константами `α, β` в одном месте.

- [ ] **Шаг 4:** PASS.

- [ ] **Шаг 5:** Коммит: `feat(game): types and stat formula from spec §7`

---

### Task 6: Сетка и бой (ядро)

**Files:**
- Create: `src/game/battle/grid.ts`
- Create: `src/game/battle/combat.ts`
- Create: `src/game/battle/reducer.ts`
- Create: `src/game/battle/reducer.test.ts`

- [ ] **Шаг 1:** Тест: манхэттен-расстояние, соседи только N/E/S/W.

- [ ] **Шаг 2:** Тест: `applyAction('move')` отклоняет занятую клетку и стену.

- [ ] **Шаг 3:** Тест: ближняя атака только при дистанции 1; дальняя — при дистанции ≤ `maxRange` и LOS упрощённо (без укрытий MVP: прямая линия по сетке или только манхэттен ≤ range — **выбрать и задокументировать в комментарии к `combat.ts`**).

- [ ] **Шаг 4:** Реализовать минимальный `BattleState`: очередь ходов (игрок/враги), победа при 0 врагов, поражение при 0 HP героя.

- [ ] **Шаг 5:** PASS, коммит: `feat(game): tactical battle reducer MVP`

---

### Task 7: Смерть, worldPower, модификации за kill

**Files:**
- Modify: `src/game/battle/reducer.ts` или отдельный `src/game/battle/outcomes.ts`
- Create: `src/game/battle/outcomes.test.ts`

- [ ] **Шаг 1:** Тест: при смерти врага `worldPower` увеличивается на фиксированный шаг (или бросок — заглушка `+1` в MVP).

- [ ] **Шаг 2:** Тест: при смерти врага вызывается хук начисления **очков модификации** (например `modXp += 1` на выбранную карту) — детерминированно в тесте.

- [ ] **Шаг 3:** Тест: при смерти героя бой переходит в `defeat` без изменения `worldPower` (по §6).

- [ ] **Шаг 4:** Реализация.

- [ ] **Шаг 5:** PASS, коммит: `feat(game): enemy death worldPower and mod progression on kill`

---

### Task 8: Кампания и retry

**Files:**
- Create: `src/game/campaign/scenarios.ts`
- Create: `src/game/campaign/runReducer.ts`
- Create: `src/game/campaign/runReducer.test.ts`

- [ ] **Шаг 1:** Задать массив из **2–3** сценариев боёв (размер поля, стартовые юниты).

- [ ] **Шаг 2:** Тест: после `victory` индекс сценария +1, сохраняются карточки/уровни героя.

- [ ] **Шаг 3:** Тест: при `defeat` состояние «текущий сценарий» сбрасывается на **начало того же боя** (retry), **без** повторного начисления наград за убийства из **прошлой** попытки (снимок до входа в бой или флаг `attemptId`).

- [ ] **Шаг 4:** Реализация `runReducer`.

- [ ] **Шаг 5:** PASS, коммит: `feat(game): campaign chain and defeat retry`

---

### Task 9: Персистентность

**Files:**
- Create: `src/game/persistence/schema.ts`
- Create: `src/game/persistence/serialize.ts`
- Create: `src/game/persistence/migrate.ts`
- Create: `src/game/persistence/localStorage.ts`
- Create: `src/game/persistence/persistence.test.ts`

- [ ] **Шаг 1:** Тест: `serialize` / `parse` round-trip для пустого `CampaignState`.

- [ ] **Шаг 2:** Тест: неизвестная `version` → миграция или безопасный сброс с `console.warn` (задокументировать).

- [ ] **Шаг 3:** Реализовать `SAVE_VERSION = 1`, ключ `gen-sp-save-v1`.

- [ ] **Шаг 4:** `loadSave()` / `saveSave(state)` без `window` в тестах (инжект storage API).

- [ ] **Шаг 5:** PASS, коммит: `feat(game): localStorage save with version`

---

### Task 10: Zustand store

**Files:**
- Create: `src/store/gameStore.ts`
- Modify: `src/main.tsx` или `App.tsx` — гидратация при старте

- [ ] **Шаг 1:** Store: `state`, `dispatchBattle`, `dispatchRun`, `hydrateFromStorage`, подписка с **debounce 300ms** на запись.

- [ ] **Шаг 2:** Ручная проверка: в DevTools изменить состояние — в `localStorage` появился JSON.

- [ ] **Шаг 3:** Коммит: `feat(ui): zustand game store with autosave`

---

### Task 11: UI боя и хаба

**Files:**
- Create: `src/features/battle/BattleScreen.tsx`
- Create: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/App.tsx`

- [ ] **Шаг 1:** `CampaignHub`: кнопка «Начать бой / Продолжить», отображение индекса сценария, `worldPower`, уровней карточек (коротко).

- [ ] **Шаг 2:** `BattleScreen`: отрисовка сетки (CSS grid или таблица), клик по клетке → move/attack по режиму; Ant Design `Button`, `Card`, `App.useApp()` для сообщений.

- [ ] **Шаг 3:** Экран поражения: кнопка **«Повторить бой»** вызывает retry из store.

- [ ] **Шаг 4:** `npm run build` — без ошибок TS.

- [ ] **Шаг 5:** Коммит: `feat(ui): battle and campaign screens MVP`

---

### Task 12: Документация и линт

**Files:**
- Modify: `README.md`

- [ ] **Шаг 1:** README: цель проекта, `npm run dev`, `npm run test`, `npm run build`, ссылка на спеку и план.

- [ ] **Шаг 2:** `npm run lint` — исправить новые предупреждения в добавленных файлах.

- [ ] **Шаг 3:** Финальный коммит: `docs: README gameplay MVP pointers`

---

## Проверка готовности MVP

- [ ] `npm run test` — все тесты зелёные.
- [ ] `npm run build` — успех.
- [ ] Ручной прогон: пройти 1 бой, увидеть рост `uses_count`/уровня карты при использовании, после убийства — рост `worldPower` и модификаций, F5 — сохранение на месте, поражение — retry.

---

## Ревью плана

После первого прохода рекомендуется внешнее ревью документа плана и спеки (subagent **plan-document-reviewer**, если доступен в среде).

---

## Передача на исполнение

План сохранён в `docs/superpowers/plans/2026-03-28-gen-game-implementation.md`.

**Два варианта исполнения:**

1. **Subagent-Driven (рекомендуется)** — отдельный субагент на каждую задачу из этого файла, ревью между задачами; skill: @superpowers:subagent-driven-development  

2. **Inline** — выполнение чекбоксов в одной сессии пакетами с чекпоинтами; skill: @superpowers:executing-plans  

Какой вариант предпочитаете?
