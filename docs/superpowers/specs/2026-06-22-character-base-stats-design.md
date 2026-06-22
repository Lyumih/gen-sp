# Базовые характеристики персонажей и компактный UI статов

**Дата:** 2026-06-22  
**Статус:** rev 0 — после brainstorming-сессии  
**Связь:** `2026-03-28-gen-game-design.md`, `2026-06-22-party-squad-expedition-design.md`, `src/game/balance.ts`, `AGENTS.md`

---

## 1. Краткое описание

Вводится система **9 базовых характеристик** у персонажей и монстров. Значения генерируются при **обновлении таверны** (кандидаты) с учётом **классовых affinities** (расширенный диапазон roll). После найма статы **фиксируются** на персонаже.

В бою effective-значения считаются по формуле §7 (`computeUnitStat`) от базы персонажа + бонусы экипировки (фаза 2 — боевые модификаторы к картам).

**Компактный UI:** строка эмодзи + tooltip с названием, описанием, базой и значением с экипировкой. Классовые бонусы — **только в tooltip класса**. Оценка качества кандидата — **rating** (среднее `value / configMax` по всем статам).

---

## 2. Архитектурный подход

**DECIDED: Вариант A** — база персонажа как `baseStat` в `computeUnitStat`, без `scenario.heroBaseHpStat` для героев.

| Альтернатива | Почему отклонена |
|--------------|------------------|
| B — надстройка поверх сценария | Два непрозрачных слоя «базы»; таверна сравнивает кандидатов некорректно |
| C-only — только модификаторы к картам | Нет единого источника для HP/маны/инициативы |

**Roll механика: расширенный диапазон (вариант C)** — primary/secondary stats бросаются в расширенном диапазоне; **значение может превышать config max** (удачный roll выделяет кандидата).

**UI классовых бонусов: вариант A** — без визуальной подсветки primary в строке статов; текст в tooltip класса.

---

## 3. Базовые характеристики

### 3.1. Список (MVP)

| id | RU | Emoji | config min | config max | Влияние (MVP → целевое) |
|----|-----|-------|------------|------------|-------------------------|
| `health` | Здоровье | ❤️ | 1 | 30 | max HP в бою |
| `defense` | Защита | 🛡 | 0 | 5 | снижение входящего урона (фаза 2) |
| `attack` | Атака | ⚔ | 0 | 5 | бонус к урону карт / базовой атаке (фаза 2) |
| `magicPower` | Сила магии | ✨ | 0 | 5 | бонус к магическому урону (фаза 2) |
| `mana` | Мана | 🔮 | 0 | 30 | ресурс для карт (фаза 2+) |
| `healPower` | Сила исцеления | 💚 | 0 | 5 | бонус к лечению (фаза 2) |
| `speed` | Скорость | 👟 | 1 | 3 | шагов за ход / move range (фаза 2) |
| `initiative` | Инициатива | ⚡ | 0 | 10 | порядок хода каждый раунд |
| `critChance` | Шанс крита | 🎯 | 0 | 20 | % критического удара (фаза 2) |

Границы — в **`src/game/config/baseStats.ts`** (единый конфиг). Новые статы добавляются записью в конфиг + registry; rating и UI итерируют по registry.

### 3.2. Будущие статы (вне MVP, hooks)

| id | Назначение |
|----|------------|
| `evasion` | шанс уклонения |
| `magicResist` | снижение магического урона |
| `regen` | восстановление HP за раунд |
| `luck` | модификатор loot / редких roll |

---

## 4. Roll при генерации кандидата таверны

```ts
type StatAffinity = 'primary' | 'secondary' | 'normal'

function rollUpperBound(configMax: number, affinity: StatAffinity): number {
  if (affinity === 'primary') return Math.round(configMax * 1.5)
  if (affinity === 'secondary') return Math.round(configMax * 1.25)
  return configMax
}

function rollStat(min: number, upper: number, rng): number {
  return min + Math.floor(rng() * (upper - min + 1))
}
```

Для каждого `statId` affinity определяется классом (§5). **Нет пост-множителей** после броска.

**Пример (воин, HP):** `min=1`, `configMax=30` → roll в `[1, 45]`. Значение **45** допустимо и отображается как `❤️45`.

---

## 5. Классы и affinities (8 классов)

Flat `initiativeBase` у класса **удаляется** — инициатива только из roll + экипировка.

| id | label | hirePrice | primary (+50% range) | secondary (+25% range) |
|----|-------|-----------|------------------------|-------------------------|
| `warrior` | Воин | 25 | health, defense | attack |
| `mage` | Маг | 35 | mana, magicPower | critChance |
| `ranger` | Лучник | 30 | initiative, speed | attack |
| `healer` | Лекарь | 32 | mana, healPower | defense |
| `rogue` | Разбойник | 28 | critChance, speed | initiative |
| `paladin` | Паладин | 38 | defense, healPower | health |
| `warlock` | Колдун | 34 | magicPower, critChance | mana |
| `berserker` | Берсерк | 30 | attack, health | critChance |

Tooltip класса (пример):

> **Воин**  
> Primary (+50% диапазон): ❤️ HP, 🛡 защита  
> Secondary (+25%): ⚔ атака

---

## 6. Rating (оценка кандидата / персонажа)

Только **base stats** (без экипировки, без `unitLevel` / `worldPower`).

```ts
function statQuality(value: number, configMax: number): number {
  if (configMax <= 0) return value <= 0 ? 1 : 0
  return value / configMax  // без clamp; >1.5 возможно при extended roll
}

function computeBaseStatRating(baseStats: BaseStats): number {
  const ids = BASE_STAT_IDS // 9 статов из registry
  const sum = ids.reduce((s, id) => s + statQuality(baseStats[id], BOUNDS[id].max), 0)
  return sum / ids.length
}
```

**Диапазон:** практически ~0.05…1.2+; теоретический потолок ~1.5 если все статы на 150% config max.

**UI:** компактно `★0.78` или `78%`; tooltip: «Средняя оценка базовых статов: 0.78 (78% от cap)».

---

## 7. Effective stats (бой и preview)

```ts
effective = computeUnitStat({ baseStat: character.baseStats[id], unitLevel, worldPower })
  + gearBonus(id)  // когда gear даёт бонус к stat id
```

- **HP:** `effectiveHealth + gearHp` → `maxHp` юнита на старте боя.
- **Initiative:** `effectiveInitiative + gearInitiative` → snapshot в `Unit` (заменяет `initiativeBase`).
- **`scenario.heroBaseHpStat`:** для **героев не используется**; поле остаётся для legacy/migration или удаляется из расчёта. Сложность сценария — через врагов и `worldPower`.

**Tooltip stat row:**

```
Здоровье (❤️)
Максимум HP в бою после level и worldPower.
База: 23  →  с экипировкой: 25
```

В таверне «с экипировкой» = preview стартового шмота кандидата.

---

## 8. Модель данных

### 8.1. BaseStats

```ts
type StatId =
  | 'health' | 'defense' | 'attack' | 'magicPower' | 'mana'
  | 'healPower' | 'speed' | 'initiative' | 'critChance'

type BaseStats = Record<StatId, number>
```

### 8.2. Character (расширение)

```ts
type Character = {
  // ... existing fields ...
  baseStats: BaseStats
  /** Кэш при найме; пересчитывается при изменении baseStats */
  baseStatRating: number
}
```

Удалить `initiativeBase` с `Character` — инициатива в `baseStats.initiative`.

### 8.3. TavernCandidate (расширение)

```ts
type TavernCandidate = {
  candidateId: string
  classId: string
  price: number
  previewGear: Partial<Record<EquipmentSlot, string>>
  baseStats: BaseStats
  baseStatRating: number
}
```

### 8.4. Unit (бой)

```ts
type Unit = {
  // ...
  baseStatsSnapshot: BaseStats  // или readonly pick для UI
  // initiativeBase заменяется на effective initiative at spawn
}
```

### 8.5. EnemyTemplate / BattleScenarioEnemy

```ts
type EnemyTemplate = {
  // ...
  baseStats: BaseStats  // фиксированные или partial + defaults
  classId?: string      // optional: affinities для процедурного spawn позже
}
```

Монстры используют **ту же строку emoji + tooltip**; rating опционален в codex.

---

## 9. Конфиг

**Файл:** `src/game/config/baseStats.ts`

```ts
export const BASE_STAT_BOUNDS: Record<StatId, { min: number; max: number }>
export const BASE_STAT_META: Record<StatId, { labelRu: string; emoji: string; descriptionRu: string }>
export const CLASS_STAT_AFFINITY: Record<ClassId, { primary: StatId[]; secondary: StatId[] }>
export const BASE_STAT_IDS: readonly StatId[]  // порядок отображения в UI
```

**Функции ядра:** `src/game/stats/rollBaseStats.ts`, `src/game/stats/computeRating.ts`, `src/game/stats/effectiveStats.ts`.

**UI labels:** расширить `src/game/ui/labels.ts` или `statLabels.ts` — re-export emoji из `BASE_STAT_META`.

---

## 10. UI

### 10.1. Компонент `StatStrip`

Переиспользуемый компонент: `src/features/stats/StatStrip.tsx`

**Props:** `baseStats`, `effectiveStats?`, `mode: 'tavern' | 'hub' | 'battle'`, `showRating?`, `classId?`

**Строка:**

```
❤️23 🛡3 ⚔3 ✨1 🔮12 💚0 👟2 ⚡8 🎯6  ·  ★0.78
```

- Hover на emoji → `StatTooltip` (название, описание, база → effective).
- Hover на имя/класс → affinities класса (§5).
- Rating tooltip отдельно при hover на `★`.

### 10.2. Точки встраивания

| Экран | Поведение |
|-------|-----------|
| `CampaignTavernTab` | StatStrip + rating на карточке кандидата |
| `CharacterRosterView` | компактная строка под class · level |
| `HeroProfileContent` | полный StatStrip + effective preview |
| `BattleScreen` | hover/click юнита → StatStrip (battle effective + current HP) |
| Codex врагов | base stats монстра |

### 10.3. Ant Design

- Tooltip (`antd`) для desktop; на touch — tap toggles Popover (см. `AGENTS.md`).

---

## 11. Интеграция с боем (фазы)

### Фаза 1 (этот spec / первая реализация)

- Типы, конфиг, roll, rating, миграция save.
- StatStrip UI в таверне, roster, профиле.
- HP и initiative из base stats в spawn боя.
- Монстры: base stats в templates.

### Фаза 2

- defense, attack, magicPower, healPower, critChance → модификаторы к `computeCardAttackDamage`, heal, incoming damage.
- speed → `HERO_MOVE_RANGE` / per-unit move.
- mana → ресурс карт.

---

## 12. Миграция сохранений

**SAVE_VERSION:** 3 → **4**

Для существующих `Character` без `baseStats`:

1. Deterministic roll от `hash(character.id + classId)` через `seededRng` — воспроизводимые статы.
2. `baseStatRating = computeBaseStatRating(baseStats)`.
3. `initiativeBase` → перенести в `baseStats.initiative` (если есть), иначе roll.
4. Таверна-кандидаты без stats — перегенерировать при следующем refresh.

Unit-тест: legacy save v3 → v4 с проверкой полей.

---

## 13. MVP scope

### В scope

- 9 stats, config bounds, 8 classes, roll C, rating.
- Tavern / roster / profile StatStrip + tooltips.
- HP + initiative в бою от base stats.
- Enemy base stats в templates.
- SAVE v4 migration.
- `AGENTS.md` UI patterns.

### Вне scope

- Фаза 2 боевых модификаторов (кроме hooks в типах).
- Gear bonuses к stats кроме существующих HP/card level (расширение item templates — отдельная задача).
- Класс-relative rating tier.
- Weighted rating (primary ×1.5).

---

## 14. Тестирование

| Область | Минимум |
|---------|---------|
| `rollBaseStats` | primary upper = max×1.5; value может > configMax |
| `computeBaseStatRating` | all min, all max, mixed; initiative 12 / cap 10 → 1.2 |
| class affinities | warrior HP upper 45 при max 30 |
| effective HP | замена heroBaseHpStat; gear additive |
| migration v3→v4 | персонажи получают baseStats |
| UI | StatStrip рендер 9 emoji + rating |

---

## 15. UI-паттерны

Канонические паттерны взаимодействия — **`AGENTS.md`** (корень репозитория). При UI-задачах агент следует этому документу.

---

## 16. Открытые параметры баланса

- Точные `hirePrice` per class.
- Starter gear pools per class (расширить beyond warrior/ranger).
- Default stats для migration mid-point vs random.
- Отображение rating: `0.78` vs `78%` (рекомендация: **78%** для игрока, `0.78` в debug).
