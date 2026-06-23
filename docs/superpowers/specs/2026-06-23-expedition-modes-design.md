# Дизайн: режимы экспедиций и UI подбора отряда

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md`, `AGENTS.md`, `src/game/expedition/config.ts`, `src/features/campaign/CampaignBattleTab.tsx`, `src/game/campaign/scenarios.ts`, `src/game/battle/spawnPlacement.ts`

---

## 1. Цель

Добавить **пять процедурных режимов экспедиции** с генерацией поля боя, врагов и препятствий; переработать UI вкладки «Бой»:

- список экспедиций — **чекбоксы** (радио-поведение: одна активная);
- отряд — **4 ячейки** как на вкладке «Персонажи», с отметкой участников;
- русификация **Expedition → Экспедиция** во всём UI.

Существующие цепочки `campaign-main` и `test-single-battle` **сохраняются**.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Выбор экспедиции | Чекбоксы с **радио-поведением** — только одна за раз |
| Туннель, бой 2 | Случайный враг из пула **героических NPC** (`hero` tag) **или** случайный **босс** (`BOSS_ARCHETYPE_IDS`) |
| Число боёв | Туннель — **2**; остальные новые — **1**; Хаотичная карта — **1–3** (roll на старте экспедиции) |
| Хаотичная, между боями | **Полная перегенерация** поля, препятствий и врагов перед каждым боем |
| Отряд > лимита | **Первые N среди отмеченных**, порядок = слоты 1→2→3→4 |
| Никто не отмечен | Идут **все занятые** слоты отряда |
| Нехватка бойцов | Старт **заблокирован**, если занятых слотов < `partyMin` режима; если roll > доступных — идут **все доступные** |
| Старые цепочки | `campaign-main` + `test-single-battle` остаются в списке |
| Архитектура | **Генератор сценариев** + `generationSeed` в snapshot экспедиции (подход A) |
| Доп. режимы (Дуэль с боссом, Коридор, Осада) | **Отложены** на следующую итерацию |

---

## 3. Каталог экспедиций

### 3.1. Новые процедурные режимы

| ID | Название | Описание | Параметры (строка в UI) |
|----|----------|----------|-------------------------|
| `chaotic-map` | Хаотичная карта | Полный хаос: поле, враги, препятствия | Отряд 1–4 · Враги 1–20 · Поле 1×2–20×20 · Боёв 1–3 |
| `tunnel` | Туннель | Узкий коридор, два боя | Отряд ≤2 · Поле 1×10 · Бой 1: враг · Бой 2: герой-NPC или босс |
| `big-arena` | Большая арена | Массовое сражение на широком поле | Отряд ≤4 · 8–12 врагов + 1–3 босса · 10×20 · 1–10 блоков |
| `small-skirmish` | Малая битва | Дуэль на крошечном поле | 1 герой · 1 враг · поле 1×2 |
| `ambush` | Засада | Окружение с флангов | Отряд ≤4 · ≤8 врагов · 10×10 · центр vs края |

### 3.2. Существующие статические цепочки

| ID | Название (UI) | Описание |
|----|---------------|----------|
| `campaign-main` | Основная кампания | Три сценария подряд с воскрешением между боями |
| `test-single-battle` | Тест: один бой | Один бой tutorial (dev) |

### 3.3. Детали генерации по режимам

#### Хаотичная карта (`chaotic-map`)

- `partySize`: roll 1–4 **перед каждым боем** (активных не больше, чем в snapshot экспедиции).
- `battleCount`: roll 1–3 **один раз** на старте экспедиции.
- `width`, `height`: независимые roll 1–20; минимум одна ось ≥ 2 (исключить 1×1).
- `walls`: случайное число препятствий 0…`(width×height)/4`, случайные клетки (не на спавнах).
- `enemies`: roll 1–20; mix обычных (`poolTags: ['arena']`) и боссов (1 босс на каждые ≤7 врагов, cap 3 босса); случайные позиции на свободных клетках.
- `playerSpawns`: случайные свободные клетки, count = активный partySize.

#### Туннель (`tunnel`)

- `partySize`: max 2.
- `battleCount`: 2 (фикс).
- Поле: **1×10** (width=1, height=10 или width=10, height=1 — roll ориентации).
- Бой 1: 1 случайный враг из общего пула (`arena` / `melee`), позиция на дальнем конце коридора.
- Бой 2: 1 враг из **union**(архетипы с тегом `hero`, `BOSS_ARCHETYPE_IDS`) с равной вероятностью.
- Герои: ближний конец (x=0 или y=0), spread по перпендикулярной оси.

#### Большая арена (`big-arena`)

- `partySize`: max 4.
- Поле: **10×20** (width=10, height=20).
- Игроки: зона `x ∈ [0, 3]`, случайные y на свободных клетках.
- Враги: 8–12 из пула + 1–3 босса; зона `x ∈ [16, 19]`, случайный spread.
- Препятствия: 1–10 **блоков** (connected 2×2 или 1×N «кубики» — roll формы блока).

#### Малая битва (`small-skirmish`)

- `partySize`: 1 (фикс).
- Поле: **1×2**.
- 1 герой на (0,0), 1 случайный враг на (1,0) или (0,1) при 2×1.
- `partyMin`: 1.

#### Засада (`ambush`)

- `partySize`: max 4.
- Поле: **10×10**.
- Игроки: кластер в центральной зоне 4×4 (центр поля).
- Враги: до 8, spawn на **периметре** (краевые клетки), рассредоточены.

---

## 4. UI

### 4.1. Вкладка «Бой» — порядок блоков

1. **Отряд** (4 ячейки, всегда видны)
2. **Экспедиция** (список чекбоксов)
3. Кнопка **«Начать экспедицию»**

### 4.2. Отряд

- Визуал как `SquadSlotRow` / `InventoryCell` — те же 4 слота `campaign.squad`.
- Состав слотов **read-only** на этой вкладке (DnD — только на вкладке «Персонажи»).
- Клик по **занятому** слоту переключает отметку участия (✓ / accent outline).
- Пустые слоты не кликабельны.
- Подсказка: «Не отмечено — идут все занятые слоты. Отмечено больше лимита — первые N по порядку слотов.»

### 4.3. Список экспедиций

- `Checkbox` в вертикальном списке; выбор одного снимает остальные.
- Каждая строка: **название** · **краткое описание** · **параметры** (compact secondary text).
- При активной экспедиции — блок disabled + `Alert` «Недоступно во время экспедиции».

### 4.4. Кнопка старта

Disabled когда:

- идёт бой или активна экспедиция;
- не выбрана экспедиция;
- занятых слотов < `partyMin` выбранного режима.

### 4.5. Русификация

Все пользовательские строки: **Экспедиция / экспедиция** вместо Expedition/expedition:

- `CampaignBattleTab`, `InterBattleScreen`, `CampaignHub`, freeze-tooltips, help-статьи.
- Внутренние id (`chaotic-map`, `START_EXPEDITION`) без изменений.

---

## 5. Архитектура

### 5.1. Структура модулей

```
src/game/expedition/
  config.ts                    — ExpeditionChainConfig + UI meta (label, description)
  resolveExpeditionParty.ts    — отметки → selectedCharacterIds[]
  snapshot.ts                  — + generationSeed
  generators/
    types.ts
    chaoticMap.ts
    tunnel.ts
    bigArena.ts
    smallSkirmish.ts
    ambush.ts
    index.ts
```

### 5.2. Расширение `ExpeditionChainConfig`

```ts
type ExpeditionChainConfig = {
  id: string
  label: string
  description: string
  partySize: PartySizeConfig
  partyMin: number
  battleCount: BattleCountConfig
  interBattleReviveAllDowned?: boolean
} & (
  | { kind: 'static'; battleScenarioIds: readonly string[] }
  | { kind: 'procedural'; generatorId: string }
)
```

### 5.3. Расширение `Expedition`

```ts
type Expedition = {
  scenarioChainId: string
  partySize: number
  squadSnapshot: (CharacterBattleSnapshot | null)[]
  battleIndex: number
  battleCount: number
  shopLocked: true
  interBattleReviveAllDowned?: boolean
  /** Фиксируется на старте; детерминизм процедурных боёв */
  generationSeed: number
}
```

### 5.4. `resolveExpeditionParty`

```ts
function resolveExpeditionParty(input: {
  squad: readonly (string | null)[]
  markedIds: readonly string[]
  maxParty: number
}): string[]
```

Алгоритм:

1. `candidates` = если `markedIds` пуст → все не-null из `squad` по порядку слотов; иначе → пересечение `markedIds` с занятыми слотами, порядок слотов.
2. Вернуть `candidates.slice(0, maxParty)`.

### 5.5. Data flow

```
UI → resolveExpeditionParty(squad, markedIds, chainMaxParty)
  → selectedCharacterIds

START_EXPEDITION:
  1. validate occupiedSlots >= partyMin
  2. partySize = min(resolvePartySize(chain), selectedCharacterIds.length)
  3. buildExpeditionSnapshot (+ generationSeed, battleCount roll)
  4. startExpeditionBattle

startExpeditionBattle:
  static  → getScenarioById(battleScenarioIds[battleIndex])
  procedural → generateScenario(generatorId, {
    seed: hashSeed(`${generationSeed}:${battleIndex}`),
    battleIndex,
    expeditionPartySize: expedition.partySize,
  })
  → battleStateFromScenario(scenario, snapshot)
```

### 5.6. Изменение `START_EXPEDITION`

- Убрать жёсткое `selectedCharacterIds.length === partySize`.
- Принимать `markedCharacterIds` (пустой массив = «все занятые слоты»).
- UI/resolver вычисляет финальный `selectedCharacterIds` до dispatch.

---

## 6. Контент: героические NPC (Туннель)

Добавить **4–6 архетипов** в `enemyArchetypes.ts` с тегом `hero`:

- Примеры: рыцарь, паладин, следопыт, боевой маг (hero-styled).
- Бой 2 Туннеля: `pickUniform(heroArchetypes ∪ BOSS_ARCHETYPE_IDS)`.

---

## 7. Корневые случаи и fallback

| Ситуация | Поведение |
|----------|-----------|
| Поле 1×2, дуэль | Герой и враг на противоположных концах |
| Врагов > свободных клеток | Разместить max; остальные отбросить |
| Нет клеток для героев | Уменьшать препятствия до 0 |
| Минимальный размер поля | Не 1×1; min 1×2 или 2×1 |
| partySize roll > snapshot | Активных бойцов ≤ размер snapshot |
| Генератор не может разместить | Fallback: уменьшить enemy count; не крашить бой |

В dev/test генератор может бросать `PlacementError` для диагностики.

---

## 8. Награды и inter-battle

- **Без изменений** относительно текущей системы: gold, Memento, `FINISH_EXPEDITION`.
- `interBattleReviveAllDowned: true` — только у `campaign-main`.
- Новые процедурные режимы — стандартный inter-battle без auto-revive.

---

## 9. Миграция save

- `generationSeed` в `Expedition` — optional; при отсутствии в mid-expedition save: fallback `hashSeed(scenarioChainId)`.

---

## 10. Тесты

| Модуль | Покрытие |
|--------|----------|
| `resolveExpeditionParty` | пустые отметки; > лимита; пустые слоты |
| `chaoticMap` | детерминизм seed; 1×2 и 20×20; enemies ≤ 20 |
| `tunnel` | 2 разных боя; бой 2 из hero+boss |
| `bigArena`, `ambush`, `smallSkirmish` | зоны, count в диапазоне |
| `runReducer` START_EXPEDITION | новая валидация; procedural seed |
| `config` | все chain id уникальны; partyMin корректен |

---

## 11. Вне скоупа (следующая итерация)

- **Дуэль с боссом** — 1 герой vs 1 босс, 6×6.
- **Коридор** — 1×12, 3 микробоя.
- **Осада** — 2 волны с четырёх сторон.

---

## 12. Чеклист реализации (краткий)

1. Типы + `ExpeditionChainConfig` discriminated union.
2. Генераторы + unit-тесты корневых случаев.
3. `resolveExpeditionParty` + изменение `START_EXPEDITION` / `startExpeditionBattle`.
4. UI: `ExpeditionSquadStrip`, `ExpeditionModeList`, русификация.
5. Героические архетипы для Туннеля.
6. Help-статья «Экспедиция» — обновить список режимов.
