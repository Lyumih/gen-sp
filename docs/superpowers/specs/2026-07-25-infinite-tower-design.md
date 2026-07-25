# Дизайн: режим «Бесконечная башня»

**Дата:** 2026-07-25  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-03-28-gen-game-design.md`, `docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md`, `docs/superpowers/specs/2026-06-23-expedition-modes-design.md`, `docs/superpowers/specs/2026-07-18-battle-mode-picker-design.md`, `AGENTS.md`, `src/game/types.ts`, `src/game/campaign/scenarios.ts`, `src/game/battle/enemySpawn.ts`, `src/game/content/enemyArchetypes.ts`, `src/game/expedition/generators/`

---

## 1. Цель

Добавить мета-режим **«Бесконечная башня»**: один **этаж = один бой**. Прогресс этажа сохраняется между сессиями. После победы игрок возвращается в **полный хаб** (магазин, таверна, экипировка), подбирает отряд и продолжает. Режим масштабируется бесконечно по номеру этажа; сложность растёт циклами по 10 этажей.

Параллельно заложить **общий слой генерации encounter** (число врагов, уровни, tier скиллов, affix), переиспользуемый башней и будущими процедурными режимами.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Между этажами | **Полный хаб** после каждой победы; не expedition-freeze |
| Поражение | Остаёмся на **том же этаже N**; retry с тем же encounter |
| Сброс | Кнопка **«Сбросить башню»**: этаж 1, новый `runSeed`; `bestFloor` и first-clear история **сохраняются** |
| Состав | До **4** бойцов; **перед каждым боем** заново (как party pick экспедиций) |
| Этаж | **Один бой**; рост силы через мету (уровни, карты, шмот) |
| Награды | **First-clear** бонус за этаж **один раз за save**; retry и reset на уже cleared N — **без** повторного бонуса; стандартные боевые награды Memento Mori **всегда** |
| Affix | **С этажа 11** (cycle ≥ 2); этажи 1–10 **без** affix |
| Архитектура режима | **`TowerProgress` в `CampaignState`**, не бесконечная экспедиция |
| Параллель с экспедицией | Башня **не** создаёт `expedition`; обычная экспедиция **разрешена** (отдельный бой через expedition flow) |

---

## 3. Петля игрока

1. Игрок открывает башню, видит **текущий этаж N**, рекord, preview encounter (число врагов, боссы, affix с 11+).
2. **«В бой»** → party pick (≤4) → один тактический бой (процедурный сценарий от `runSeed` + N).
3. **Победа:** `currentFloor` → N+1, обновить `bestFloor` при необходимости; если N не в `floorsFirstCleared` — выдать first-clear и записать N; вернуть в хаб.
4. **Поражение:** `currentFloor` без изменений; encounter тот же; хаб доступен для подготовки.
5. **Сброс башни:** confirm → `currentFloor = 1`, новый `runSeed`, очистка кэша encounter текущего run (если есть); first-clear множество **не** очищается.

**Мотивация retry vs reset:** retry — тот же roll врагов; reset — новая процедурная вариация при застревании, **не** повторный farm first-clear.

---

## 4. Модель данных

### 4.1. TowerProgress

```ts
type TowerProgress = {
  /** Следующий бой; ≥ 1 */
  currentFloor: number
  /** Максимальный пройденный этаж за всё время (рекord) */
  bestFloor: number
  /** Seed процедурного run; меняется только при «Сбросить башню» */
  runSeed: number
  /** Номера этажей, за которые уже выдан first-clear бонус */
  floorsFirstCleared: number[]
}
```

- `CampaignState.tower: TowerProgress | null`
- **`null`:** игрок ещё не начинал башню в этом save **или** явно не инициализирован; первый «В бой» / «Начать башню» создаёт `{ currentFloor: 1, bestFloor: 0, runSeed: roll, floorsFirstCleared: [] }`.
- После **сброса** объект **не** `null`, а `currentFloor: 1` с новым `runSeed`.

### 4.2. Encounter determinism

Encounter этажа **N** полностью определяется `(runSeed, N)`:

- состав и позиции врагов (архетипы, боссы);
- affix (если N ≥ 11);
- layout поля (profile по `indexInCycle`).

**Retry** после поражения использует те же `(runSeed, N)`. **Победа** и переход на N+1 использует новую пару `(runSeed, N+1)`.

Реализация: `hashSeed` / существующие `makeRng(seed, salt)` с salt вида `tower:${N}:enemies`, `tower:${N}:affix`, без хранения отдельного snapshot encounter в save (регенерация из seed при старте боя).

---

## 5. Формула этажа (цикл 10)

```ts
cycle = Math.ceil(floor / 10)           // 1 для 1–10, 2 для 11–20, …
indexInCycle = ((floor - 1) % 10) + 1   // 1…10
```

### 5.1. Число врагов (каждый cycle)

| indexInCycle | Рядовые (grunt) | Боссы |
|--------------|-----------------|-------|
| 1 | 1 | 0 |
| 2 | 2 | 0 |
| 3 | 3 | 0 |
| 4 | 4 | 0 |
| 5 | 4 | 1 |
| 6 | 5 | 1 |
| 7 | 6 | 1 |
| 8 | 7 | 1 |
| 9 | 8 | 1 |
| 10 | 8 | 2 |

На **cycle > 1** таблица **та же** по count; рост сложности — через уровни, skill tier, affix, пулы (см. ниже), **не** через добавление 9-го рядового сверх cap 8.

### 5.2. Масштабирование stats и скиллов

| Параметр | Правило (MVP) |
|----------|----------------|
| `enemyUnitLevel` | `1 + (cycle - 1) * 2` для всех врагов этажа (уточнение в балансе; единая функция `enemyUnitLevelForTower(cycle)`) |
| `skillTier` | `cycle - 1` (0 на cycle 1); применение см. §7 |
| Пул архетипов | cycle 1: `['arena', 'melee']`; cycle ≥ 2: добавить `'ranged'`; cycle ≥ 3: ограниченный шанс chaotic-архетипа среди рядовых (cap 1 на этаж) — **отложить на post-MVP**, если нет готового баланса |
| Боссы | Выбор из `BOSS_ARCHETYPE_IDS` через `hash(runSeed, cycle, bossSlotIndex)`; на indexInCycle 10 — **два разных** id (slot 0 и 1) |

### 5.3. Affix (floor ≥ 11)

- Ровно **один** affix на бой, id из пула tier `cycle - 1` (cycle 2 → tier 1 pool, …).
- Roll: `makeRng(runSeed, `tower:${floor}:affix`)`.
- **Preview в UI** перед стартом боя (название + краткое описание).
- Этажи **1–10:** affix **отсутствует**.

**MVP-пул affix (минимум 3 id, расширяемо в данных):**

| id | Эффект (концепт) |
|----|------------------|
| `tower_affix_enemy_initiative` | +2 ⚡ инициативы всем врагам |
| `tower_affix_heal_down` | Исцеление игроков ×0.75 |
| `tower_affix_narrow_field` | Уменьшенная ширина/высота layout profile «compact+» |

Affix реализуется через поле на `BattleScenario` (`towerAffixId?: string`) и hook при сборке боя / применении статов (один модуль `towerAffixes.ts`).

### 5.4. Layout поля

| indexInCycle | Profile |
|--------------|---------|
| 1–4 | **compact** — малая арена (ориентир: `small-skirmish` / узкий `ambush`, party ≤4) |
| 5–10 | **wide** — ориентир `big-arena` 10×20 или `ambush` 10×10 при count ≤8 |

Конкретные размеры и зоны спавна — в генераторе `infinite-tower`; placement переиспользует `src/game/expedition/generators/placement.ts`.

---

## 6. Награды

### 6.1. Всегда (каждый бой)

Стандартные правила Memento Mori: прокачка за использование карт, моды за убийства и т.д. — **без изменений** относительно процедурного боя.

### 6.2. First-clear (один раз за номер этажа)

При **первой** победе на этаже N (когда N ∉ `floorsFirstCleared`):

1. Добавить N в `floorsFirstCleared`.
2. Выдать **first-clear пакет**:
   - **Золото:** `50 + 10 * N` (MVP константы в `src/game/tower/rewards.ts` или рядом).
   - **Milestone worldPower:** +1 при N ∈ {10, 20, 30, …} (кратные 10).

Повторная победа на том же N (retry), прохождение N после **сброса башни**, если N уже в `floorsFirstCleared` — **без** first-clear пакета.

### 6.3. UI

- Preview этажа: «🎁 Бонус первого прохождения» или «Бонус уже получен».
- Modal сброса: явно указать, что first-clear за пройденные номера **не** восстанавливается.

---

## 7. Архитектура врагов (encounter layer)

### 7.1. EncounterSpec

Ввести чистый модуль (например `src/game/encounter/encounterSpec.ts`):

```ts
type EncounterSpec = {
  gruntCount: number
  bossCount: number
  enemyUnitLevel: number
  skillTier: number
  poolTags: readonly string[]
  affixId?: string
  layoutProfile: 'compact' | 'wide'
}

function encounterSpecForTowerFloor(floor: number): Omit<EncounterSpec, 'affixId'> & { affixId?: string }
```

- `encounterSpecForTowerFloor` инкапсулирует таблицу §5.1 и формулы §5.2–5.3.
- Генератор **`generateInfiniteTower(ctx)`** принимает `floor`, `runSeed`, строит `BattleScenario` из spec + rng.

### 7.2. Применение skillTier

- **MVP:** `skillTier` увеличивает `global_level` всех `skillPresets` / `passivePresets` у **боссов** на `skillTier`; у рядовых — на `max(0, skillTier - 1)` начиная с cycle 2, чтобы этаж 11 не удвоил AI-сложность рядовых сразу.
- Дополнительный skill из `collectSkillsFromThreatPool` — **post-MVP**, если tier недостаточно для ощущения скачка на 10n.

### 7.3. Изменение resolveScenarioEnemies

Сегодня pool-spawns получают `unitLevel: 1` всегда. Для башни (и масштабируемости):

- `BattleScenario` может нести опционально **`defaultEnemyUnitLevel`** и **`enemySkillTier`** (или per-spawn override).
- `resolveScenarioEnemies` использует `spawn.unitLevel ?? scenario.defaultEnemyUnitLevel ?? 1`.
- При создании юнита из архетипа применять bump `global_level` пресетов по `enemySkillTier` в одном месте (рядом с `makeEnemyUnit` / сборкой battle state — зафиксировать в плане реализации одну функцию `applyEncounterTierToArchetype`).

### 7.4. Переиспользование другими режимами

Процедурные генераторы могут в будущем принимать `EncounterSpec` вместо hardcoded `rollInt(8, 12)` (например `big-arena` с `fixedTier`). **MVP:** только башня использует полный spec; рефактор других режимов **не** входит в scope, но API spec проектируется без привязки к `tower` в именах типов (`EncounterSpec`, не `TowerSpec`).

---

## 8. Бой и интеграция с кампанией

### 8.1. Старт боя башни

- **Не** через `Expedition` snapshot (нет shop lock).
- Flow: из хаба → party pick → `startTowerBattle(partyIds)` → процедурный scenario id вида `infinite-tower-${runSeed}-${floor}` → обычный `BattleState`.
- В `CampaignState` / battle meta хранить **`towerBattleContext: { floor, runSeed } | null`** на время боя (для outcome handler), либо передавать через поле battle snapshot — выбор в плане реализации; outcome при победе/поражении обновляет `tower`.

### 8.2. Outcome

| Исход | Действие |
|-------|----------|
| Победа | Обновить tower progress (§3); first-clear (§6); вернуть phase hub |
| Поражение | `currentFloor` без изменений; hub |
| Abandon боя | Как **поражение**: этаж не меняется, first-clear не выдаётся (аналогично выходу без победы) |

### 8.3. UI размещение

- Плитка **«Бесконечная башня»** в сетке режимов боя (`BattleModeGrid`) или отдельная секция featured; tier `featured` после unlock (см. §9).
- Экран/панель башни: этаж, рекord, preview, кнопки «В бой», «Сбросить башню».
- Party pick: переиспользовать `ExpeditionPartyPickModal` с `maxParty: 4`, `partyMin: 1`.

### 8.4. Onboarding / unlock

- **MVP unlock:** `first_battle_won` (как featured expedition modes) **или** milestone `tower_unlock` — **DECIDED: `first_battle_won`** для согласованности с picker.
- Coach mark опционально post-MVP.

---

## 9. Вне scope (MVP)

- Еженедельный seed / лидерборд.
- Tower-only валюта и магазин этажа.
- Run-only баффы между этажами (roguelike picks).
- Рефактор всех expedition generators на `EncounterSpec`.
- Chaotic рядовые на высоких cycle (§5.2).
- Отдельная «tower lobby» UI — достаточно панели на вкладке «Бой».

---

## 10. Тестирование

- Unit: `encounterSpecForTowerFloor` — таблица count для floor 1–12, 20, 21; affix только ≥11; `enemyUnitLevel` / cycle.
- Unit: first-clear — первый win на N начисляет золото и mutates `floorsFirstCleared`; второй win на N — нет; win на N после reset при N уже cleared — нет.
- Unit: determinism — два вызова generator с `(runSeed, floor)` дают идентичные archetype ids и affix.
- Unit: reset — новый `runSeed`, `currentFloor === 1`, `floorsFirstCleared` unchanged, `bestFloor` unchanged.
- Integration: победа повышает `currentFloor`; поражение — нет.

---

## 11. Связанные файлы (ожидаемые при реализации)

| Область | Путь |
|---------|------|
| Spec encounter | `src/game/encounter/encounterSpec.ts` |
| Tower rewards | `src/game/tower/rewards.ts` |
| Generator | `src/game/expedition/generators/infiniteTower.ts` |
| Affix | `src/game/tower/towerAffixes.ts` |
| Campaign state / reducer | `src/game/campaign/` |
| UI | `src/features/campaign/` (tile + tower panel) |
| Persist | миграция schema save для `tower` |

---

## 12. Changelog spec

| Rev | Дата | Примечание |
|-----|------|------------|
| 0 | 2026-07-25 | Brainstorming approved |
