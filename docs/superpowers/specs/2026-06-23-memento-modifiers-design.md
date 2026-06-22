# Дизайн: встроенные модификаторы умений и экипировки (Memento)

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** [Memento Mori — модификаторы (вики)](https://memento-wiki.vercel.app/dev/memento-modifiers), `memento-wiki.md`, `docs/superpowers/specs/2026-03-28-gen-game-design.md`, `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`, `src/game/types.ts`, `src/features/inventory/CardsInventoryView.tsx`

## 1. Цель

Заменить текущий MVP «моды за kill» (`modKillTarget`, `kill_reward`) на **полную систему встроенных модификаторов** по модели Memento Mori:

- независимые уровни носителя **`L`** и модификатора **`Lm`**;
- слоты модов на **вехах `L`** (конфиг dev/prod);
- **оффер из 3** совместимых модов при открытии слота;
- моды **влияют на бой и персонажа** через декларативный пайплайн эффектов;
- единая система для **умений**, **оружия** и **экипировки**.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Модель прогресса | Вики: **`L`** / **`Lm`** независимы; убрать `modKillTarget` и +1 за kill |
| Рост **`L`**: умения | Использование карты в бою (`global_level`, бросок Memento) |
| Рост **`L`**: оружие | `itemLevel` предмета в слоте `weapon` при базовой атаке (`strike` / выстрел) |
| Рост **`L`**: броня/акс. | `itemLevel` при **получении удара** от врага |
| Рост **`Lm`** | **Победа в бою**: один независимый бросок Memento **на каждый заполненный слот** |
| Карта `strike` | Канал действия **без** собственного `L` и модов |
| Без оружия в слоте | Виртуальные **«кулаки»**: `itemLevel = 0`, слотов модов нет |
| Вехи слотов (prod) | 1-й при **L ≥ 75**, далее **+100** (75, 175, 275…) |
| Вехи слотов (dev) | 1-й при **L ≥ 5**, далее **+5** (5, 10, 15…) — в конфиге |
| Оффер | 3 случайных мода из пула; **несколько pending** офферов параллельно |
| Удаление мода | **`L` → начало предыдущей вехи**; слот пуст; `Lm` потерян; оффер перегенерировать |
| Фильтрация пула | **Полная таксономия**: `group`, `tags`, `requires`, `excludes` |
| Архитектура эффектов | **Декларативный движок ops** (рекомендованный подход A) |
| UI | Таб **Персонаж** → коллекция; бейдж **M+**; tooltip → кнопка → Modal с 3 карточками |

## 3. Носители и прогресс

### 3.1. Таблица носителей

| Носитель | Поле **L** | Триггер роста **L** | Слоты модов | Триггер роста **Lm** |
|----------|------------|---------------------|-------------|----------------------|
| Умение (`fireball`, `heal`, …) | `CardInstance.global_level` | Использование в бою | по вехам §3.2 | Победа: 1 бросок на слот |
| Оружие (предмет `weapon`) | `ItemInstance.itemLevel` | Базовая атака через `strike`/выстрел | по вехам §3.2 | Победа: 1 бросок на слот |
| Экипировка (`armor`, `accessory`) | `ItemInstance.itemLevel` | Получение удара от врага | по вехам §3.2 | Победа: 1 бросок на слот |
| Кулаки (виртуальные) | 0 (не сохраняется) | — | 0 | — |
| Карта `strike` | — | канал, без L/модов | — | — |

При базовой атаке растёт **только `itemLevel` надетого оружия**. Если слот `weapon` пуст — атака через «кулаки», прогресс не идёт.

### 3.2. Вехи слотов

Конфиг `modSlotMilestones`:

```ts
// production
{ firstThreshold: 75, step: 100 }  // slot k (0-based): L ≥ 75 + 100·k

// development (import.meta.env.DEV)
{ firstThreshold: 5, step: 5 }       // slot k: L ≥ 5 + 5·k
```

- Открытие слота **не расходует** бросок `L`.
- Число **разблокированных** слотов: максимальный `k+1`, для которого `L ≥ milestoneThreshold(k)`.
- При пересечении вехи генерируется **оффер из 3** модов (§5).

### 3.3. Уровень модификатора **Lm**

- На каждый **заполненный** слот — свой **`Lm`** (целое ≥ 0).
- Бросок повышения: **`rollCardLevelUp(Lm, r)`** — то же правило, что для `L` ([memento-roll](https://memento-wiki.vercel.app/dev/memento-roll)).
- Очередь бросков **независима** от бросков `L`.
- Сила эффекта: **`effective = base × (1 + Lm/100)`** (ориентир вики: ×2 к **Lm = 100**); flat-ops масштабируются по `scaleMode` в данных op.

### 3.4. Pending офферы и удаление

**Pending оффер:** при достижении вехи слот переходит в `empty` с `offer: ModOffer`. Несколько слотов могут ждать выбора **одновременно** (заполнение в любом порядке).

**Удаление заполненного мода (`REMOVE_MOD`):**

1. Подтверждение в UI с текстом отката (текущий L → порог предыдущей вехи).
2. `L` носителя = `milestoneThreshold(slotIndex - 1)`, или **0** если удаляется слот 0.
3. Слот → `empty` с **новым** оффером (новый seed).
4. `Lm` удалённого мода теряется безвозвратно.
5. Заполненные слоты с **бóльшим** индексом **не** затрагиваются.

## 4. Каталог модификаторов

### 4.1. Таксономия

**Группы (`group`):** `damage` | `survival` | `utility` | `defense`.

**Теги носителя** (на шаблоне карты / предмета): `melee`, `ranged`, `aoe`, `heal`, `weapon`, `armor`, `accessory`, `attack`, `skill`.

**Фильтр оффера:** мод в пуле, если **все** теги из `mod.requires` есть на носителе (`carrier.tags ⊇ mod.requires`), `carrier.tags ∩ mod.excludes = ∅`, и ни один `excludes`-тег не совпадает с `templateId` модов в **других заполненных слотах** этого носителя. Для OR-совместимости (ranged **или** aoe) — **отдельные записи** в каталоге (`mod-range-up`, `mod-aoe-range-up`).

### 4.2. Структура данных

```ts
type ModScaleMode = 'percent' | 'flat'

type ModOp =
  | { kind: 'damage_mult'; base: number; scaleMode: 'percent' }
  | { kind: 'heal_mult'; base: number; scaleMode: 'percent' }
  | { kind: 'range_add'; base: number; scaleMode: 'flat' }
  | { kind: 'cooldown_add'; base: number; scaleMode: 'flat' }
  | { kind: 'aoe_size_add'; base: number; scaleMode: 'flat' }
  | { kind: 'crit_chance_add'; base: number; scaleMode: 'percent' }
  | { kind: 'carrier_hp_add'; base: number; scaleMode: 'flat' }
  | { kind: 'defense_add'; base: number; scaleMode: 'flat' }
  | { kind: 'initiative_add'; base: number; scaleMode: 'flat' }
  | { kind: 'self_heal_on_use'; base: number; scaleMode: 'percent' }
  | { kind: 'lifesteal_pct'; base: number; scaleMode: 'percent' }
  | { kind: 'proc_extra_hit'; baseChance: number; hits: number }
  | { kind: 'reflect_on_hit'; base: number; scaleMode: 'percent' }
  | { kind: 'self_heal_on_damaged'; base: number; scaleMode: 'percent' }
  | { kind: 'aoe_center_damage_mult'; base: number; scaleMode: 'percent' }
  | { kind: 'heal_splash'; splashRatio: number; scaleMode: 'percent' }

type ModTemplate = {
  id: string
  label: string
  emoji?: string
  group: 'damage' | 'survival' | 'utility' | 'defense'
  tags: readonly string[]
  requires: readonly string[]
  excludes?: readonly string[]
  descriptionLines: readonly string[]
  ops: readonly ModOp[]
}

type ModOffer = { modIds: [string, string, string]; rollSeed: number }

type ModSlotState =
  | { status: 'locked' }
  | { status: 'empty'; offer: ModOffer | null }
  | { status: 'filled'; templateId: string; lm: number }
```

**Экземпляр:** `modSlots: ModSlotState[]` на `CardInstance` и `ItemInstance`. Длина массива = число разблокированных слотов на текущем `L` (растёт при пересечении вех).

### 4.3. MVP-каталог (23 мода)

#### Простые (14)

| id | Название | group | requires | op | base @ Lm=0 |
|----|----------|-------|----------|-----|-------------|
| `mod-damage-up` | Усиление урона | damage | `attack` | `damage_mult` | +50% |
| `mod-heal-up` | Усиление лечения | survival | `heal` | `heal_mult` | +50% |
| `mod-range-up` | Дальнобойность | utility | `ranged` | `range_add` | +1 клетка |
| `mod-aoe-range-up` | Дальняя волна | utility | `aoe` | `range_add` | +1 клетка |
| `mod-melee-reach` | Длинная рука | utility | `melee` | `range_add` | +1 клетка |
| `mod-cooldown-down` | Быстрая перезарядка | utility | `skill` | `cooldown_add` | −1 CD (min 0) |
| `mod-aoe-size` | Широкий охват | utility | `aoe` | `aoe_size_add` | +1 к размеру |
| `mod-crit-chance` | Критический удар | damage | `attack` | `crit_chance_add` | +15% |
| `mod-hp-bonus-armor` | Запас прочности | defense | `armor` | `carrier_hp_add` | +3 maxHp |
| `mod-hp-bonus-accessory` | Живучесть | defense | `accessory` | `carrier_hp_add` | +3 maxHp |
| `mod-armor-bonus` | Укрепление | defense | `armor` | `defense_add` | +1 🛡 |
| `mod-weapon-damage` | Острая сталь | damage | `weapon` | `damage_mult` | +40% |
| `mod-mana-save` | Экономия маны | utility | `skill` | `mana_cost_mult` | −20% (фаза 2, если мана в бою) |
| `mod-initiative` | Рывок | utility | `accessory` | `initiative_add` | +2 ⚡ |

#### Сложные (9)

| id | Название | group | requires | op | Поведение |
|----|----------|-------|----------|-----|-----------|
| `mod-self-heal-on-use` | Жизненная сила | survival | `skill` | `self_heal_on_use` | После применения: исцелить носителя на `round(5 × (1 + Lm/100))` HP |
| `mod-self-heal-on-attack` | Кровожадность | survival | `attack` | `self_heal_on_use` | То же, для базовой атаки / attack-тега |
| `mod-lifesteal` | Вампиризм | survival | `attack` | `lifesteal_pct` | 20% урона → HP атакующего |
| `mod-double-strike` | Двойной удар | damage | `attack` | `proc_extra_hit` hits=1 | 25% шанс второго удара; независимо от тройного |
| `mod-triple-strike` | Тройной удар | damage | `attack` | `proc_extra_hit` hits=2 | 10% шанс доп. ударов |
| `mod-thorns` | Шипы | defense | `armor` | `reflect_on_hit` | При получении удара: `round(3 × (1+Lm/100))` урона атакующему |
| `mod-heal-on-hit-taken` | Регенерация | survival | `armor` | `self_heal_on_damaged` | При получении урона: +N HP |
| `mod-accessory-regen` | Ободок стойкости | survival | `accessory` | `self_heal_on_damaged` | При получении урона: +N HP |
| `mod-aoe-center-bonus` | Центр взрыва | damage | `aoe` | `aoe_center_damage_mult` | +100% урона по центральной клетке |
| `mod-ally-heal-splash` | Окружение светом | survival | `heal` | `heal_splash` | 50% лечения соседу в радиусе 1 |

### 4.4. Порядок применения в бою

1. **Базовое действие** — урон/лечение по `L` + токены `%%` + бонусы экипировки на `levelForDamage`.
2. **Моды носителя действия** (умение или оружие) — по **индексу слота** ascending.
3. **Пассивные моды надетой экипировки** — `carrier_hp_add`, `defense_add`, `initiative_add` (вне боя / при расчёте effective stats).
4. **Proc-моды экипировки** — при триггере (`reflect_on_hit`, `self_heal_on_damaged`).
5. **Внешние эффекты** (worldPower, баффы) — фаза 2.

Proc-моды (`proc_extra_hit`, `crit_chance_add`): **независимые** проверки RNG на каждый мод; порядок слотов задаёт порядок логов, не блокирует последующие procs.

## 5. Оффер из трёх

```ts
function generateOffer(
  carrierTags: readonly string[],
  occupiedTemplateIds: readonly string[],
  slotIndex: number,
  seed: number,
): ModOffer
```

1. Пул = все `ModTemplate`, проходящие `filterModsForCarrier`.
2. Исключить моды, нарушающие `excludes` с уже занятыми слотами.
3. Случайно выбрать **3** (с повторениями **разрешены**, как на вики).
4. Сохранить `rollSeed` для воспроизводимости и миграций.

Реролл оффера за валюту **не входит** в v1. Смена набора — через удаление мода с откатом `L` (§3.4).

## 6. UI

### 6.1. Размещение

**CampaignCharacterTab** → `CardsInventoryView` + `EquipmentInventoryView`. Отдельный экран не нужен.

**Удалить:** UI `modKillTarget` (🎯), строка «Моды за kill → …», action `SET_MOD_KILL_TARGET`.

### 6.2. Бейдж M+

На `InventoryCell`, если есть слот `{ status: 'empty', offer: ModOffer }`:

- Бейдж **M+** — правый верхний угол, accent-цвет.
- Только в **хабе** (не в бою).

### 6.3. Tooltip / Popover

- Desktop: `Tooltip`, `mouseEnterDelay={0.3}`.
- Touch: controlled `Popover` (AGENTS.md §7).

Содержимое: имя, уровень **L**, combat preview, список слотов (filled + Lm / empty M+ / locked с порогом).

Кнопка **«Добавить модификатор»** — если есть pending offer → открывает **Modal** (`ModOfferPicker`) с 3 карточками.

Кнопка **«Удалить»** на filled слотах → `Modal.confirm` с текстом отката (§3.4). Disabled при `inBattle` / expedition.

### 6.4. Компакт на клетке

Точки под emoji: ● filled (цвет по `group`), ○ empty pending, ◌ locked.

### 6.5. Бой

- Tooltip карты: строка активных модов с effective-значениями.
- Battle log: короткие строки proc («Двойной удар!»).
- После победы (фаза 1.5): summary роста **Lm** по слотам.

## 7. Архитектура кода

### 7.1. Новые модули

```
src/game/config/modSlotMilestones.ts
src/game/content/modTemplates.ts       # расширить
src/game/memento/modSlots.ts
src/game/memento/modOffers.ts
src/game/memento/modScaling.ts
src/game/mods/modPipeline.ts
src/game/mods/carrierTags.ts
src/features/inventory/ModOfferPicker.tsx
src/features/inventory/modSlotBadges.tsx
```

### 7.2. Run actions

```ts
| { type: 'PICK_MOD_OFFER'; carrierKind: 'card' | 'item'; carrierId: string; slotIndex: number; modTemplateId: string }
| { type: 'REMOVE_MOD'; carrierKind: 'card' | 'item'; carrierId: string; slotIndex: number }
```

Генерация офферов — **внутри reducer** при изменении `L`, не отдельный UI action.

### 7.3. Удаляемое (legacy MVP)

- `CampaignState.modKillTargetCardId`
- `SET_MOD_KILL_TARGET`, `applyModKillReward`, `kill_reward` template
- AI preference `modKillTargetCardId` в `playerAi.ts`
- `modifications: ModificationInstance[]` на картах → **`modSlots`** (breaking migration)

### 7.4. Data flow

```
Hub: pick/remove mod → runReducer → CampaignState
Battle: use/heal/hit → roll L → maybe generateOffer
Battle: victory → roll Lm per filled slot → mergeBattleCards / items
Combat: modPipeline(base, ctx) → final damage/heal/procs
```

## 8. Миграция сохранений

1. Удалить `modKillTargetCardId`.
2. `modifications[{ templateId: 'kill_reward', level: N }]` → первый `modSlots` filled `mod-damage-up` с `lm: N`, если `L ≥ firstThreshold`; иначе empty/locked по правилам §3.2.
3. `modSlots: []` на items; пересчитать при загрузке по текущему `itemLevel`.
4. Codex: `mod/kill_reward` → `mod/mod-damage-up` для discovered entries.

## 9. Тесты

| Модуль | Покрытие |
|--------|----------|
| `modSlots.test.ts` | пороги dev/prod, rollback L, slot count |
| `modOffers.test.ts` | requires/excludes, 3 из пула, детерминизм seed |
| `modScaling.test.ts` | ×2 @ Lm=100, flat ops |
| `modPipeline.test.ts` | damage_mult, range_add, self_heal_on_use, proc |
| `runReducer.test.ts` | victory Lm, pick/remove, milestone offer, L triggers |
| `migrate.test.ts` | kill_reward → modSlots |

## 10. Фазы реализации

1. **Core:** types, config, slots, offers, migrate, remove kill MVP  
2. **Combat:** modPipeline + простые ops + victory Lm + hit-trigger for gear L  
3. **UI:** M+, ModOfferPicker, remove confirm  
4. **Content:** сложные/proc-моды, battle log, codex text  
5. **Weapon channel:** strike → weapon-driven progress, virtual fists  

## 11. Вне scope (v1)

- Реролл оффера за золото
- `customHandlerId` escape-hatch (фаза 2)
- `mod-mana-save` до появления маны в бою
- Специализация Memento (классы носителя) — отдельная спека
