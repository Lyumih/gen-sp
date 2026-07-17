# Бой и персонаж: журнал, очерёдность, статы на клетках, завершение хода, пассивы, loadout UX

**Дата:** 2026-07-17  
**Статус:** утверждено после brainstorming  
**Связь:** `AGENTS.md`, `2026-03-28-battle-log-ui-design.md`, `2026-06-22-battle-field-ui-design.md`, `2026-06-22-character-base-stats-design.md`, `src/features/battle/BattleScreen.tsx`, `src/features/inventory/CardsInventoryView.tsx`

---

## 1. Цель

Улучшить тактическую читаемость боя и удобство loadout на странице «Персонаж»:

1. **Журнал боя** — показывать поглощённый урон одним числом; цветовая кодировка по стороне актора и нейтральные системные события.
2. **Клетки поля и «Очерёдность хода»** — компактные боевые ⚔/🛡/❤️; объединить блоки «Инициатива» и «Здоровье» в одну прокручиваемую полосу.
3. **Завершить ход** — явная кнопка пропуска действия.
4. **Пассивы в бою** — список пассивных навыков текущего актора под «Умения и карты».
5. **Страница «Персонаж»** — переименовать секции loadout; кнопки «Надеть» / «Снять» для умений и пассивов (как у экипировки).

---

## 2. Архитектурный подход

**DECIDED: Вариант B** — ядро (reducer, типы лога, `end_turn`) + выделенные UI-компоненты.

| Модуль | Назначение |
|--------|------------|
| `src/game/types.ts` | `absorbedDamage?` в `strike`; `BattleAction` `{ type: 'end_turn' }` |
| `src/game/battle/reducer.ts` | Расчёт поглощения в `applySingleStrike`; обработка `end_turn` |
| `src/game/battle/battleLog.ts` | Формат «поглощено N»; хелпер классификации строки (hero/enemy/neutral) |
| `src/features/battle/BattleLogLine.tsx` | Цветная строка журнала |
| `src/features/battle/TurnOrderStrip.tsx` | «Очерёдность хода» — замена `InitiativeQueue` + блок «Здоровье» |
| `src/features/battle/UnitToken.tsx` | Расширение: мини-статы ⚔🛡❤️ для `grid` и `initiative` |
| `src/features/battle/unitCombatStats.ts` | Effective ⚔/🛡 из `effectiveStatWithStatuses` |
| `src/features/battle/ActorPassivesPanel.tsx` | Пассивы текущего актора в правой панели |
| `src/features/inventory/CardsInventoryView.tsx` | Переименования; popover «Надеть» / «Снять» |
| `src/features/campaign/sectionTooltips.ts` | Обновление help-текста |

| Альтернатива | Почему отклонена |
|--------------|------------------|
| A — монолит в `BattleScreen` | Файл уже >1200 строк; дублирование форматирования |
| C — Zustand presentation slice | Избыточно для локального UI-состояния |

---

## 3. Журнал боя

### 3.1. Поглощение урона

**Решение:** одно число «поглощено» — суммарная разница между уроном **до** всех модификаторов цели и **итоговым** уроном, попавшим в HP.

- `damageBeforeTargetMitigation` — после бонусов атакующего, крита, dodge-check; **до** `mitigatePassiveDefense`, ward, resist, `damage_reduction`.
- `absorbedDamage = max(0, damageBeforeTargetMitigation - finalDamage)`.
- Если `absorbedDamage === 0` — не показывать (строка как сейчас).

**Расширение `BattleLogEntry` (`strike`):**

```ts
{
  type: 'strike'
  attackerId: string
  targetId: string
  damage: number           // итоговый урон по HP
  absorbedDamage?: number  // только если > 0
  attackKind: 'melee' | 'ranged' | 'aoe'
  targetKilled: boolean
  fromCard?: { cardId: string; templateId: string }
}
```

**Формат текста:**

```
🪓 Орк-разоритель → ⚔️ Герой: 3 💥 (поглощено 7) (выстрел)
```

Источник атаки в скобках в конце — без изменений (`ближний удар`, `выстрел`, `карта «…»`).

### 3.2. Цветовая кодировка

Три CSS-класса (не inline-стили):

| Класс | Условие | Стиль |
|-------|---------|-------|
| `battle-log--hero` | Актор — юнит `side === 'player'` | текст `#1677ff`, фон `#e6f4ff` (лёгкий) |
| `battle-log--enemy` | Актор — `side === 'enemy'` | текст `#cf1322`, фон `#fff1f0` |
| `battle-log--neutral` | Системные / мета-события | текст `#8c8c8c` |

**Правила классификации:**

| Тип записи | Класс |
|------------|-------|
| `move`, `strike`, `heal`, `resurrect` | по `unitId` / `attackerId` / `healerId` |
| `status_applied` | neutral (в payload нет `sourceUnitId`; только `unitId` получателя) |
| `passive_proc` успех | по стороне владельца `unitId` |
| `passive_proc` не сработал | neutral |
| `card_level_up`, `mod_proc`, `status_tick` | neutral |

Золотая подсветка «улучшений» **не** входит в MVP — системные события neutral.

### 3.3. UI

- Компонент `BattleLogLine`: класс + `formatBattleLogEntry()`.
- Автоскролл и `maxHeight` — без изменений.
- Unit lookup для emoji/имён — без изменений.

---

## 4. Клетки поля и «Очерёдность хода»

### 4.1. Объединение блоков

- Удалить отдельный блок **«Здоровье»** из `BattleScreen`.
- Переименовать **«Инициатива»** → **«Очерёдность хода»**.
- Один горизонтальный контейнер: `overflow-x: auto`, `flex-wrap: nowrap`, gap между чипами; при большом числе юнитов — горизонтальная прокрутка (паттерн как `GameScrollX`).

### 4.2. Компонент `TurnOrderStrip`

Заменяет `InitiativeQueue` + список HP. Порядок чипов — `battle.turnOrder` (как сейчас).

**Чип (`UnitToken variant="initiative"`):**

```
[имя, ellipsis]
[emoji + accent ring]
⚔{attack} 🛡{defense}
❤️{hp}/{maxHp}
[бейдж хода: 1 | 2 | R+N — если применимо]
```

- **Статы:** effective in battle через `effectiveStatWithStatuses(unit)` — ⚔ = `attack`, 🛡 = `defense`.
- **Бейдж:** та же функция `turnBadgeLabel()` что на клетке поля; текущий актор и мёртвые — бейдж скрыт.
- **Подсветка:** текущий актор — синяя рамка (как сейчас); hover ↔ подсветка клетки на поле — без изменений.
- **Tooltip:** `BattleUnitTooltip` (StatStrip + цепочка base → buffs → итог).

### 4.3. Клетка поля (`UnitToken variant="grid"`)

```
[emoji + accent]
⚔{attack} 🛡{defense}
❤️{hp}
```

- Только **текущий** HP (без `/maxHp`) — как сейчас по AGENTS.md для компактности.
- Effective ⚔/🛡 — те же значения что в очереди.
- Tooltip на hover — без изменений (`BattleUnitTooltip`).
- Юниты без `baseStats` (если есть) — только emoji + ❤️hp.

### 4.4. Хелпер `unitCombatStats.ts`

```ts
export function unitCombatMiniStats(unit: Unit): {
  attack: number
  defense: number
} | null
```

Единый источник для grid и turn-order; не дублировать формулы в компонентах.

---

## 5. «Завершить ход»

### 5.1. Поведение

- Кнопка **«Завершить ход»** в блоке «Перемещение и базовая атака», под `Radio.Group` (Ход / Удар / Выстрел).
- Одно нажатие — без `Modal.confirm`.
- Передаёт ход следующему юниту в `turnOrder` через существующий `advanceBattleTurn()`.
- Move/attack/card **не** выполняются; cooldown карт не тратится.

### 5.2. Видимость и блокировки

| Условие | Состояние кнопки |
|---------|------------------|
| `currentActor.side === 'player'` | enabled (если нет других блокировок) |
| Auto-battle включён | hidden или disabled |
| Идёт анимация боя | disabled |
| Поражение / победа | hidden |

### 5.3. Движок

```ts
// BattleAction
| { type: 'end_turn' }
```

- Reducer: валидация «текущий актор — player»; no-op если бой завершён.
- Запись в журнал **не** добавляется (нейтральное системное действие игрока; при необходимости — опциональная neutral-строка «Герой пропускает ход» — **не** в MVP).

---

## 6. Пассивные навыки в панели боя

### 6.1. Размещение

Правая панель, блок **«Пассивные навыки»** — **под** «Умения и карты».

### 6.2. Содержимое

- Только **текущий актор** (`currentActorId`).
- Источник: `battle.passivesByUnitId[currentActorId]` → resolve `PassiveInstance` через campaign character.
- Пустой loadout — секция скрыта или текст «Нет пассивных навыков».

**Строка списка:**

- emoji + название (`getPassiveDisplayLabel`)
- одна строка summary из `describePassiveStats()` (уровень, ключевой бонус)

**Popover / tooltip:**

- полное описание: триггер, все бонус-строки, уровень.

### 6.3. Враги

- MVP: показывать только если у врага есть данные в `passivesByUnitId` (boss/enemy passives). Иначе секция скрыта для вражеского хода.

---

## 7. Страница «Персонаж»

### 7.1. Переименования секций loadout

| Было | Станет |
|------|--------|
| В бой | **Активные умения** |
| Навыки в бою | **Пассивные навыки** |

Обновить:

- `CardsInventoryView.tsx` — заголовки секций
- `sectionTooltips.ts` — `SKILLS_SECTION_HELP`
- aria-label слотов («Слот активного умения N», «Слот пассивного навыка N»)

Вкладки stash **«Умения»** / **«Навыки»** — без переименования.

### 7.2. Кнопки «Надеть» / «Снять»

По образцу `EquipmentInventoryView` + `ItemPopoverActions`:

| Место | Действие |
|-------|----------|
| Слот «Активные умения» / «Пассивные навыки» (popover при hover/click) | **Снять** → `onSetBattleLoadout(i, null)` / `onSetPassiveEquip(i, null)` |
| «Коллекция» / «Коллекция навыков» (popover) | **Надеть** → первый свободный слот (`firstEmptyCardSlot` / `firstEmptyPassiveSlot`) |

**Правила:**

- Drag-and-drop сохраняется полностью.
- Конфликт пассивов (`canEquipPassive`) — существующее `message.warning`.
- Disabled card (`template.enabled === false`) — кнопка «Надеть» disabled + существующий текст.
- Expedition freeze — disabled + tooltip «недоступно во время expedition» (как у gear).
- «Надеть» при заполненных слотах — disabled или сообщение «Нет свободных слотов».

---

## 8. Тестирование

| Уровень | Что проверяем |
|---------|---------------|
| `reducer` / `applySingleStrike` | `absorbedDamage` корректен при flat defense, ward, resist, `damage_reduction`; 0 — поле отсутствует |
| `reducer` | `end_turn` передаёт ход; no-op для enemy actor / finished battle |
| `battleLog.ts` | Формат строки с/без поглощения; классификация hero/enemy/neutral |
| `unitCombatStats` | Effective ⚔/🛡 совпадают с tooltip |
| `TurnOrderStrip` | Одна строка + scroll; бейдж совпадает с клеткой |
| `CardsInventoryView` | «Надеть» кладёт в первый пустой слот; «Снять» очищает слот |

---

## 9. Вне scope (MVP)

- Золотая подсветка level-up / crit в журнале.
- Neutral-строка «пропуск хода» в журнале.
- Пассивы всех героев партии одновременно в бою.
- Изменение формулы mitigation в движке (только отображение существующей).

---

## 10. Следующий шаг

После ревью этого файла — план реализации (`writing-plans`) и пошаговая разработка.
