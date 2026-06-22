# Поле боя: расстановка, identity, инициатива и hover

**Дата:** 2026-06-22  
**Статус:** rev 0 — после brainstorming-сессии  
**Связь:** `2026-03-28-gen-game-design.md`, `2026-06-22-party-squad-expedition-design.md`, `2026-06-22-character-base-stats-design.md`, `AGENTS.md`, `src/features/battle/BattleScreen.tsx`

---

## 1. Краткое описание

Доработка **UI/UX поля боя** и **identity персонажей**:

1. **Спавн без наложений** — герои случайно расставляются в зоне сценария (или левая колонка по умолчанию); лишние не участвуют в бою.
2. **Бейдж очереди хода** — в правом верхнем углу клетки; синхронизация с `turnOrder`.
3. **Имя + emoji на клетке** — имя над иконкой с ellipsis; tooltip вертикальный.
4. **Переименование и облик героя** — имя, emoji из каталога, accent-пресет, skin-tone (где применимо).
5. **Инициатива** — chip: имя над emoji; hover ↔ подсветка на поле.
6. **Облик врагов** — emoji, accent, display name из шаблона/сценария (override).
7. **Hover-анимация** — плавная подсветка chip ↔ клетка.

---

## 2. Архитектурный подход

**DECIDED: Вариант B** — ядро (spawn, display, turn badge) + общие UI-компоненты.

| Модуль | Назначение |
|--------|------------|
| `src/game/battle/spawnPlacement.ts` | Расстановка героев, `excludedCharacterIds` |
| `src/game/battle/turnBadge.ts` | Вычисление бейджа `1`, `2`, `R+N` |
| `src/game/character/iconCatalog.ts` | Каталог emoji, accent-пресеты, skin-tone, дефолты классов |
| `src/game/content/enemyDisplay.ts` | Resolve display врага (template + scenario override) |
| `src/game/character/display.ts` | `getCharacterDisplay`, `getUnitDisplay` |
| `src/features/battle/UnitToken.tsx` | Emoji + имя + accent + бейдж (grid / initiative) |
| `src/features/stats/StatTooltipList.tsx` | Вертикальный tooltip статов |
| `src/features/battle/BattleUnitTooltip.tsx` | Tooltip клетки |

| Альтернатива | Почему отклонена |
|--------------|------------------|
| A — монолит в `BattleScreen` | Дублирование с инициативой и roster |
| C — presentation slice в Zustand | Избыточно для текущего масштаба |

---

## 3. Спавн и сценарии

### 3.1. Расширение `BattleScenario`

```ts
type BattleScenario = {
  // ...existing
  /** Явные клетки спавна (приоритет) */
  playerSpawnCells?: readonly { x: number; y: number }[]
  /** Прямоугольная зона; если cells не заданы */
  playerSpawnZone?: { xMin: number; xMax: number; yMin: number; yMax: number }
  /** Legacy: трактуется как playerSpawnCells при отсутствии новых полей */
  playerSpawns: { x: number; y: number }[]
}
```

**Дефолт без zone/cells:** все клетки `x === 0`, кроме стен и клеток с врагами на старте.

### 3.2. Алгоритм `assignSpawnPositions`

1. Собрать пул клеток: `playerSpawnCells` → `playerSpawnZone` → legacy `playerSpawns` → дефолт (левая колонка).
2. Отфильтровать: в границах поля, не стена, не занята врагом.
3. Перемешать детерминированно (seed: `{ scenarioId, battleIndex, expeditionId? }`).
4. Активным членам party (по порядку `spawnIndex`) выдать по одной уникальной клетке.
5. Кого не хватило → `excludedCharacterIds[]`; **Unit не создаётся**.

**Без fallback** на соседние клетки и без ошибки.

### 3.3. Исключённые герои

- `Alert` `type="warning"` вверху `BattleScreen`: «Не хватило места спавна: **{имена}** не участвуют в этом бою».
- Downed — не спавнятся (как сейчас), не попадают в alert.
- Если **все** активные герои excluded → мгновенный `phase: 'defeat'` (`isPartyWipe`).

Враги — фиксированные координаты из сценария.

---

## 4. Бейдж очереди хода

Функция `turnBadgeLabel(unitId, turnOrder, currentTurnIndex)`:

| Ситуация | Бейдж |
|----------|-------|
| Текущий актор | **скрыт** (не «0») |
| Мёртв (`hp ≤ 0`) | **скрыт** |
| Ещё не ходил в раунде | `1`, `2`, `3`… |
| Уже ходил в этом раунде | `R+1`, `R+2`… |

UI: `Badge`, `position: absolute; top: 2px; right: 2px` на клетке поля.

---

## 5. Identity героев

### 5.1. Расширение `Character`

```ts
type IconAccentId =
  | 'default' | 'green' | 'gray' | 'blue' | 'red' | 'gold' | 'purple' | 'teal'

type IconSkinToneId = 'default' | 'light' | 'medium' | 'dark'

type Character = {
  // ...existing
  name: string              // 1–20 символов после trim
  iconEmoji: string         // из CHARACTER_ICON_CATALOG
  iconAccent: IconAccentId
  iconSkinTone: IconSkinToneId  // Fitzpatrick modifier где поддерживается
}
```

### 5.2. Каталог emoji (~28, общий)

⚔️ 🗡️ 🛡️ 🏹 🎯 🧙 🔮 ✨ 💚 🪓 ⚡ 🔥 ❄️ 🌿 🐺 🦅 🐻 🎭 👤 🧝 🧛 🏴 💀 🎖️ ⭐ 🦁 🐉

Дефолт по классу:

| classId | default |
|---------|---------|
| warrior | ⚔️ |
| mage | 🧙 |
| ranger | 🏹 |
| healer | 💚 |
| rogue | 🗡️ |
| paladin | 🛡️ |
| warlock | 🔮 |
| berserker | 🪓 |

### 5.3. Accent-пресеты (комбо: рамка + filter)

| id | рамка | filter |
|----|-------|--------|
| default | `#d9d9d9` | — |
| green | `#52c41a` | лёгкий `hue-rotate` |
| gray | `#8c8c8c` | `grayscale(0.7)` |
| blue | `#1677ff` | — |
| red | `#ff4d4f` | — |
| gold | `#faad14` | — |
| purple | `#722ed1` | — |
| teal | `#13c2c2` | — |

### 5.4. Skin-tone модификаторы

- Для emoji из `SKIN_TONE_ELIGIBLE` (👤 🧙 🧝 🧛 и др. humanoid) UI показывает 4 варианта: default + light/medium/dark.
- Рендер: базовый emoji + U+1F3FB–U+1F3FF при необходимости (`renderEmojiWithSkinTone`).
- Если emoji не поддерживает tone — контрол скрыт, значение игнорируется.

### 5.5. UI профиля («Облик»)

В `HeroProfileContent` (хаб):

- Input имени (blur/Enter → `RENAME_CHARACTER`).
- Grid emoji (~28).
- Row accent-пресетов (цветные кружки).
- Skin-tone row (если emoji eligible).
- Live preview как `UnitToken`.

**Expedition freeze:** disabled + Alert «недоступно во время expedition».

Store actions:

- `RENAME_CHARACTER { characterId, name }`
- `SET_CHARACTER_APPEARANCE { characterId, iconEmoji, iconAccent?, iconSkinTone? }`

---

## 6. Identity врагов

### 6.1. Расширение шаблонов и сценария

```ts
type EnemyTemplate = {
  // ...existing
  label: string
  emoji?: string
  iconAccent?: IconAccentId   // NEW default accent
}

type BattleScenarioEnemy = {
  // ...existing
  displayName?: string          // override label
  iconEmoji?: string            // override template emoji
  iconAccent?: IconAccentId     // override template accent
}
```

### 6.2. Snapshot на `Unit` при спавне

```ts
type Unit = {
  // ...existing
  displayName?: string
  iconEmoji?: string
  iconAccent?: IconAccentId
}
```

Resolve при `makeEnemies`: scenario override > template default > fallback (`👾`, id как name).

### 6.3. Каталог emoji врагов (`ENEMY_ICON_CATALOG`)

~20 emoji для override в контенте: 👹 👺 💀 👾 🦇 🕷️ 🐍 🐉 🧟 ☠️ 🔥 ❄️ 🌑 ⚡ 🗿 🦴 👁️ 🐺 🦂 🧌

Используется авторами сценариев/шаблонов; игрок **не редактирует** врагов в UI кампании.

---

## 7. UI поля боя

### 7.1. `UnitToken` (grid + initiative)

**Grid (сверху вниз):**

```
[бейдж R+2]     ← absolute top-right
Иван…           ← ellipsis 1 line
🗡️              ← emoji + accent ring + skin tone
⭐3
❤️18/20
```

**Initiative chip (вертикально):**

```
Иван…
🗡️
```

- Игрок: `getCharacterDisplay(character)`.
- Враг: `displayName` / `iconEmoji` / `iconAccent` с Unit snapshot.

### 7.2. Tooltip клетки

Desktop: `Tooltip` `mouseEnterDelay={0.3}`. Touch: controlled `Popover`.

```
🗡️ Иван
❤️ Здоровье: 18 → 20
🛡 Защита: 2 → 3
... (BASE_STAT_IDS вертикально)
❤️ в бою: 18/20
```

Компонент `StatTooltipList` — не горизонтальный `StatStrip`.

### 7.3. Hover-синхронизация и анимация

Состояние `highlightedUnitId` в `BattleScreen`:

| Событие | Эффект |
|---------|--------|
| Hover chip инициативы | подсветка chip + клетки |
| Hover клетки юнита | подсветка клетки + chip |
| mouseLeave контейнера | сброс |

**Анимация (in scope):**

- `transition: box-shadow 180ms ease, outline-color 180ms ease, transform 180ms ease`
- Клетка: `transform: scale(1.04)`, усиленный `box-shadow`
- Chip: фон + border accent
- Текущий актор сохраняет синюю рамку; hover — дополнительный слой

`pointer-events: none` на декоративных слоях бейджа/имени.

---

## 8. Инициатива и прочие экраны

### 8.1. `InitiativeQueue`

- Chip = `UnitToken` variant `initiative`.
- Убрать отображение raw id (`characterId`, `e1`).
- Разделитель `→` между chips.

### 8.2. Строка «Ход» и здоровье

- «Ход: {emoji} {name}».
- Здоровье: `{emoji} {name}: ❤️ hp/maxHp`.

### 8.3. Battle log

- Игрок: `{emoji} {name}`.
- Враг: `{emoji} {displayName}`.

### 8.4. Roster / Squad

- Emoji + accent + имя в строке (компактно).

---

## 9. Миграция и тесты

### 9.1. Миграция (`SAVE_VERSION` +1)

| Поле | Default |
|------|---------|
| `iconEmoji` | по `classId` |
| `iconAccent` | `'default'` |
| `iconSkinTone` | `'default'` |

### 9.2. Unit-тесты

| Файл | Покрытие |
|------|----------|
| `spawnPlacement.test.ts` | zone/cells/default, exclude overflow, seed, walls/enemies |
| `turnBadge.test.ts` | hide current/dead, `1+`, `R+N` |
| `display.test.ts` | character/enemy resolve, skin tone render |
| `scenarios.test.ts` | random spawn, excluded |
| `runReducer.test.ts` | rename, appearance, validation |
| `migrate.test.ts` | legacy saves |

### 9.3. Граничные случаи

| Ситуация | Поведение |
|----------|-----------|
| 0 spawn cells | все excluded → defeat если нет игроков |
| Имя пустое после trim | откат к предыдущему |
| Дубликаты имён | разрешены |
| Emoji не из каталога | reject в reducer |
| Skin tone на неeligible emoji | игнор / скрыт UI |

---

## 10. Файлы

| Новые | Изменяемые |
|-------|------------|
| `spawnPlacement.ts`, `turnBadge.ts` | `scenarios.ts`, `types.ts` |
| `iconCatalog.ts`, `display.ts` | `enemyTemplates.ts`, `migrate.ts` |
| `enemyDisplay.ts` | `BattleScreen.tsx`, `InitiativeQueue.tsx` |
| `UnitToken.tsx`, `StatTooltipList.tsx` | `HeroProfileContent.tsx`, `battle.css` |
| `BattleUnitTooltip.tsx` | `CharacterRosterView`, `SquadSlotRow`, `schema.ts` |

---

## 11. Brainstorming log (DECIDED)

| Вопрос | Решение |
|--------|---------|
| Зона спавна | C — гибрид cells/zone/default column |
| Переполнение | excluded, Alert на BattleScreen, без fallback |
| Бейдж хода | C — `R+N` для следующего раунда; текущему скрыт |
| Иконки героев | C — общий каталог + дефолт класса |
| Цвет emoji | C — рамка + CSS filter |
| Excluded UX | Alert при входе в бой |
| Бывший out-of-scope | **всё in scope**: enemy icons/accent/names, hover animation, skin-tone |
