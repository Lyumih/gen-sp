# Группа, отряд, expedition и Таверна

**Дата:** 2026-06-22  
**Статус:** rev 0 — после brainstorming-сессии  
**Связь:** `2026-03-28-gen-game-design.md`, `src/game/types.ts`, `src/game/campaign/scenarios.ts`, `src/features/campaign/CampaignHub.tsx`

---

## 1. Краткое описание

Переход от **одного героя** к **roster персонажей** (до 100): игрок собирает **отряд** переменного размера (по умолчанию до 4 слотов в хабе; сценарий может требовать 1, 5, 10 и т.д.), ведёт **expedition** — цепочку из N боёв без возврата в хаб — и нанимает новых персонажей во **Таверне**.

**Ключевые правила (согласовано):**

- **Отряд** — бойцы, идущие в expedition; **резерв** — остальные из roster.
- У каждого персонажа **свой stash, экипировка (3 слота), коллекция карт и loadout (2 слота)**; обмен предметами между персонажами — **вручную в хабе**.
- **Состав, магазин, таверна, смена экипировки** — **заморожены** на время expedition.
- **Initiative** определяет порядок хода **каждый раунд**; на него влияют класс, экипировка, умения, расходники.
- **Смерть в бою:** Memento Mori — шанс прокачки `unitLevel` персонажа; HP = 0 → **downed**; воскрешение в бою — умения / предметы / расходники / события.
- **Конец боя без revive:** персонаж **не участвует в следующем бою** expedition, пока не воскрешён **между боями** (событие, расходник, camp-правило сценария) — **без замены из резерва**.
- После **завершения expedition** — возврат в хаб, полный доступ к roster, магазину, таверне; downed → available.

---

## 2. Архитектурный подход

**DECIDED: Character-first** с явным `Expedition` (элементы Roster + ExpeditionInstance).

| Альтернатива | Почему отклонена |
|--------------|------------------|
| Минимальный патч плоского `CampaignState` | Плохо масштабируется на 100 персонажей, дублирование equip/cards |
| Только ExpeditionInstance без Character | Нет чистого persistent-слоя для stash/cards |

---

## 3. Модель данных

### 3.1. Character

```ts
type Character = {
  id: string
  name: string
  classId: string           // архетип; влияет на initiativeBase, стартовые пуллы
  unitLevel: number
  initiativeBase: number
  equipment: Record<EquipmentSlot, string | null>
  items: ItemInstance[]
  cards: CardInstance[]
  battleLoadout: BattleLoadout  // [string | null, string | null]
}
```

- **`unitLevel`** — per-character (не общий `playerUnitLevel` кампании).
- **`worldPower`** — остаётся **глобальным** на кампанию (как сейчас).

### 3.2. CampaignState (хаб)

```ts
const DEFAULT_SQUAD_SLOTS = 4
const MAX_ROSTER_SIZE = 100

type CampaignState = {
  // ... gold, worldPower, scenarioIndex, phase ...
  characters: Character[]
  /** Слоты отряда в хабе; длина DEFAULT_SQUAD_SLOTS; null = пустой слот */
  squad: (string | null)[]
  expedition: Expedition | null
}
```

**Derived:** `reserve = characters.filter(c => !squad.includes(c.id))`.

**Удаляются / мигрируются:** плоские `playerUnitLevel`, `items`, `equipment`, `cards`, `battleLoadout` с уровня кампании.

### 3.3. Expedition

```ts
type Expedition = {
  scenarioChainId: string
  /** Зафиксировано из конфига сценария на старт */
  partySize: number
  /** Snapshot на каждый слот отряда; null = пустой (не используется при валидном старте) */
  squadSnapshot: (CharacterBattleSnapshot | null)[]
  battleIndex: number       // 0-based текущий бой в цепочке
  battleCount: number       // всего боёв в expedition
  shopLocked: true
}

type CharacterBattleSnapshot = {
  characterId: string
  /** Копии id предметов / карт на момент freeze (refs в Character) */
  equipment: Record<EquipmentSlot, string | null>
  battleLoadout: BattleLoadout
  /** Между боями expedition */
  metaStatus: 'active' | 'downed'
}
```

### 3.4. Конфиг сценария / expedition

```ts
type ScenarioExpeditionConfig = {
  /** Ровно N бойцов ИЛИ диапазон — см. §3.5 */
  partySize: number | { min: number; max: number }
  battleCount: number | { min: number; max: number }
  /** Точки спавна игрока; длина ≥ max partySize для этого контента */
  playerSpawns: { x: number; y: number }[]
}
```

### 3.5. Размер отряда

| Контекст | Поведение |
|----------|-----------|
| Хаб UI | **4 слота** по умолчанию (`DEFAULT_SQUAD_SLOTS`) |
| Старт expedition | Сценарий задаёт `partySize`; экран подбора показывает **N слотов** |
| `partySize: 1` | Solo — один персонаж |
| `partySize: 10` | 10 слотов; старт blocked, если живых персонажей в roster < min |

**DECIDED — формат конфига:**

- **Фиксированный** `partySize: number` — игрок обязан выбрать **ровно N** персонажей (основной формат для authored-сценариев).
- **Диапазон** `{ min, max }` — игрок выбирает от min до max (для процедурного / вариативного контента).
- При roll `battleCount: { min, max }` — значение фиксируется **один раз** на старте expedition.

### 3.6. BattleState

- Юниты игрока: `id = characterId` (не hardcode `'hero'`).
- `turnOrder` — **пересчёт в начале каждого раунда** по initiative (§4).
- `playerCards` — карты **текущего актора** или индекс `unitId → BattlePlayerCard[]` (реализация — в плане; контракт: loadout per-character).

---

## 4. Initiative

**DECIDED:**

1. В **начале каждого раунда** для всех юнитов с `hp > 0` вычисляется  
   `initiative = initiativeBase + gearBonus + buffs − debuffs`.
2. Сортировка по убыванию initiative; tie-break — стабильный `unitId`.
3. Downed (`hp === 0`) в очередь не попадают.
4. Модификаторы от умений / расходников — через battle buffs (контент hooks).

**UI:** компактная полоска очереди хода; при 15+ юнитах — scroll / иконки.

---

## 5. Expedition flow

```
Хаб → выбор expedition / сценария
    → экран подбора отряда (N слотов, preview partySize & battleCount)
    → START_EXPEDITION (freeze snapshot)
    → Бой 1 → Inter-battle → Бой 2 → … → Бой N
    → FINISH_EXPEDITION → Хаб (gold, Memento, metaStatus сброс)
```

### 5.1. Freeze (на время expedition)

Заблокировано:

- смена состава отряда / резерв;
- магазин, таверна;
- DnD экипировки и loadout;
- обмен предметами между персонажами.

Разрешено:

- inter-battle **revive** downed (расходники / события / camp);
- просмотр статусов и кодекса (read-only).

### 5.2. Inter-battle экран

- Статус каждого слота: active / downed.
- Действия revive (если есть ресурс или сценарийное camp-событие).
- Кнопка «Следующий бой» (disabled, если все слоты downed — см. §6).

### 5.3. Между боями: revive без смены состава

Downed персонаж **остаётся в том же слоте** expedition. Воскрешение:

- расходник (hook, контент позже);
- inter-battle **событие** (сценарий / random event);
- camp-правило: `{ reviveAllDowned: true }` между боями в конфиге цепочки.

После revive: `metaStatus: 'active'`, HP на старте следующего боя — по правилу revive (контент; MVP: `%` от maxHp, например 30%).

---

## 6. Поражение и победа

| Условие | Исход |
|---------|--------|
| **Победа** в последнем бою цепочки | `FINISH_EXPEDITION`: gold, Memento rolls, все `downed` → `available`, `expedition: null` |
| **Поражение** (все союзники downed в бою, нет revive) | `FAIL_EXPEDITION`: как сейчас defeat — retry / abandon; Memento death rolls per downed |
| **Retry** | Тот же snapshot expedition **или** новый старт — **DECIDED: новый snapshot при retry из хаба**; mid-expedition retry — тот же `battleIndex` и squadSnapshot (как `RETRY_BATTLE` сейчас) |
| Все слоты downed **между** боями, revive невозможен | Expedition fail (аналог party wipe) |

**Memento на смерть:** per-character `unitLevel` roll при downed (правила из `gen-game-design.md` §2).

---

## 7. Таверна

Новая вкладка хаба: **Таверна**.

**DECIDED:**

- **3 случайных кандидата**; refresh за золото.
- Кандидат: `classId` (roll) + starting gear (roll из пулов класса) + фиксированная / масштабируемая цена.
- Покупка создаёт `Character` с starter cards по классу (минимум: текущий `STARTER_CARDS` или class-specific pool).
- Roster cap: **100**; при 100 — покупка disabled + предупреждение; при 90+ — soft warning.
- **Недоступна** при `expedition !== null`.

**Камни:** в этом spec — только **тип-hook** (`ItemTemplate.kind: 'stone'` или отдельная валюта в types); полная система камней — отдельная фича (магазин / дроп / квесты).

---

## 8. UI

| Вкладка | Изменения |
|---------|-----------|
| **Персонаж** | Roster list; отряд (4 слота в хабе, N при подборе expedition); per-character equip + stash + cards; drag-transfer предметов между персонажами |
| **Таверна** | Кандидаты, refresh, найм |
| **Бой** | Выбор expedition; preview `partySize`, `battleCount`; подбор N слотов |
| **Магазин** | Без изменений логики; frozen в expedition |
| **Кодекс** | Read-only в expedition |

**BattleScreen:**

- Выбор **текущего актора** (side panel / click unit on grid).
- Очередь initiative.
- Autobattle — для **любого** союзника на его ходу (обобщение `heroAi` → `playerAi`).

---

## 9. Миграция сохранения

**SAVE_VERSION:** 2 → **3**.

Миграция v2 → v3:

1. Создать `Character` `id: 'char-hero-1'` из legacy полей.
2. Перенести `playerUnitLevel`, `items`, `equipment`, `cards`, `battleLoadout`.
3. `squad = ['char-hero-1', null, null, null]`.
4. `expedition = null`.
5. Удалить legacy поля с `CampaignState`.

Unit-тест миграции обязателен.

---

## 10. MVP scope vs later

### В scope этого spec / первой реализации

- Типы `Character`, `Expedition`, `ScenarioExpeditionConfig`.
- Миграция save v3.
- Roster, отряд (variable partySize), freeze rules.
- Expedition как цепочка существующих сценариев (конфиг `partySize` / `battleCount` per chain).
- Бой с N союзниками, initiative per round.
- Downed / inter-battle revive (минимум: camp `{ reviveAllDowned: true }` между боями в tutorial chain).
- Таверна: 3 кандидата, random class + gear, cap 100.
- Per-character cards/loadout в бою (до 2×partySize карт).
- UI: вкладки, inter-battle, масштабируемые слоты.

### Вне scope (hooks only)

- Полная система **камней**.
- Процедурная генерация expedition.
- Классовые skill trees, >3 card templates.
- Consumables inventory (кроме revive hook).
- Permadeath, замена из резерва mid-expedition.
- PvP / multiplayer roster.

---

## 11. Подводные камни (чеклист для реализации)

1. **8–20 карт в бою** — merge card progress per `characterId` на victory.
2. **Autobattle** — один AI на всех союзников; не assume `id === 'hero'`.
3. **Сценарии** — `playerSpawns[]`, `partySize` в конфиге; tutorial может остаться `partySize: 1`.
4. **Grid UI** — 10 слотов отряда, 10 spawn points на карте.
5. **Initiative UI** — длинная очередь.
6. **Freeze** — явные guards в reducers + disabled UI, не только CSS.
7. **Downed vs empty slot** — downed занимает слот expedition; резерв не подставляется.
8. **Валидация старта** — roster < min partySize → понятная ошибка «найми в Таверне».

---

## 12. Тестирование

| Область | Минимум |
|---------|---------|
| Миграция v2→v3 | snapshot legacy → Character |
| Expedition freeze | shop/tavern/squad actions rejected |
| partySize | solo (1) и multi (4+) spawn + turn order |
| Initiative | пересортировка между раундами |
| Downed | skip turn; inter-battle revive; next battle active |
| Таверна | hire, cap 100, refresh |

---

## 13. Открытые параметры баланса (не блокируют реализацию)

- Цены таверны и refresh.
- Starter cards per class.
- `%` HP при inter-battle revive.
- Формула `initiativeBase` по классам.
