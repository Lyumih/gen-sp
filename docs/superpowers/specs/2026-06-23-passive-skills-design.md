# Дизайн: пассивные навыки (passives)

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-23-memento-modifiers-design.md`, `docs/superpowers/specs/2026-06-23-skill-acquisition-chest-shop-design.md`, `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`, `AGENTS.md`, `src/game/types.ts`, `src/features/inventory/CardsInventoryView.tsx`

## 1. Цель

Добавить **пассивные навыки** — отдельный слой прогрессии и билда персонажа:

- до **4 пассивов** на героя (надеть/снять среди своих);
- прокачка **`L`** по триггеру срабатывания (как Memento у умений, но событие — не «использование карты»);
- **модификаторы** на вехах `L` (общий движок Memento, **отдельный пул** модов для пассивов);
- дроп / магазин / таверна по аналогии с умениями;
- раздел **Навыки** в Кодексе;
- сопутствующий баланс: **3 слота** активных умений, **cooldown умений ×2**.

Терминология в UI:

| UI | Код | Смысл |
|----|-----|-------|
| Умение | `card` / `CardInstance` | Активная карта в бою |
| Навык | `passive` / `PassiveInstance` | Пассивный навык |
| Камень | unbound в сундуке | Экземпляр до привязки к герою |

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Архитектура | **Trigger-hook engine** (подход A): `firePassives(trigger, …)` в точках боя |
| Владение | ≤4 пассива на героя; снять/надеть; после привязки — **навсегда** (не в сундук, не другому) |
| Прокачка **L** | Только когда **эффект реально сработал** (proc — только при успехе) |
| Пул дропа | **Равный шанс** из всего пула (~32); без веса по классу |
| Магазин / бой | **Два независимых roll'а** — умение и пассив (те же % и цены) |
| Приобретение | Бой/магазин → сундук; таверна → **1 пассив сразу** новому герою |
| Моды | **Общий движок Memento**, пул **`PASSIVE_MOD_TEMPLATES`**; фильтр по `carrierKind: 'passive'` |
| Стакинг статов | Не более одного `stat_flat` и одного `stat_pct` на один `statId` среди **надетых** |
| Умения | Лоадаут **3** слота; `cooldownTurns` в шаблонах **×2** (`strike` без CD) |

## 3. Модель данных

### 3.1. `PassiveInstance`

Зеркало `CardInstance`:

```ts
type PassiveInstance = {
  id: string
  templateId: string
  global_level: number   // L
  uses_count: number     // счётчик срабатываний (UI / аналитика)
  modSlots: ModSlotState[]
}

type PassiveEquipLoadout = [
  string | null,
  string | null,
  string | null,
  string | null,
]
```

### 3.2. Расширение `Character`

```ts
passives: PassiveInstance[]        // длина ≤ 4
passiveEquip: PassiveEquipLoadout   // активны в бою только надетые
```

### 3.3. `CampaignChest`

```ts
unboundPassives: PassiveInstance[]
```

### 3.4. `PassiveTemplate` (`src/game/content/passiveTemplates.ts`)

```ts
type PassiveTrigger =
  | 'on_strike'
  | 'on_card_attack'
  | 'on_card_heal'
  | 'on_regen_tick'
  | 'on_damaged'
  | 'on_move'
  | 'on_turn_start'
  | 'on_kill'

type PassiveEffectKind = 'stat_flat' | 'stat_pct' | 'proc' | 'conditional'

type PassiveTemplate = {
  id: string
  label: string
  semanticEmojiId: string
  classFlavor: ClassId       // кодекс / описание; не влияет на дроп
  effectKind: PassiveEffectKind
  levelTrigger: PassiveTrigger
  statId?: StatId
  baseFlat?: 1 | 2 | 3
  basePct?: number           // 15–20 (% от базового стата)
  procChance?: number
  ops: readonly ModOp[]
  synergies: readonly string[]  // templateId умений для tooltip
  descriptionRu: string
  enabled?: boolean
}
```

### 3.5. `ShopOffer`

```ts
| { kind: 'passive'; templateId: string }
```

## 4. Прогрессия L и Lm

| Поле | Правило |
|------|---------|
| **L** | `rollCardLevelUp(L, r)` после реального срабатывания (`applyPassiveProgress`) |
| **Lm** | Победа в бою: 1 бросок на каждый **заполненный** слот мода **надетого** пассива |
| Слоты модов | Те же вехи, что в `2026-06-23-memento-modifiers-design.md` §3.2 |
| Оффер модов | `carrierKind: 'passive'` → пул `PASSIVE_MOD_TEMPLATES` + `requires`/`excludes` |

### 4.1. Когда считается «сработал»

| Тип | Условие срабатывания | Прокачка L |
|-----|----------------------|------------|
| `stat_flat` / `stat_pct` | Стат участвовал в расчёте события (`on_damaged` → defense/hp; `on_strike` → attack) | При этом событии |
| `proc` | Бросок proc **успешен** | Только при успехе |
| `conditional` | Условие выполнено и эффект применён | При применении |
| `on_move` | Перемещение ≥1 клетки | При движении |

### 4.2. Стакинг

Среди **надетых** пассивов:

- не более **одного** `stat_flat` на `statId`;
- не более **одного** `stat_pct` на `statId`.

Попытка надеть конфликтующий пассив → reject в reducer + tooltip в UI.

## 5. Математика простых пассивов

Ступенчатый множитель (единый для flat и pct):

```
tier = floor(L / 100)
mult = 1 + 0.5 × tier     // L=0 → ×1.0, L=100 → ×1.5, L=200 → ×2.0
```

| Тип | Формула |
|-----|---------|
| **Flat** | `bonus = round(baseFlat × mult)` |
| **Pct** | `bonus = round(baseStat × basePct/100 × mult)` |

`baseFlat` в каталоге: чаще **+2**; **+3** — у сигнатурных flat-навыков класса.

**Tooltip** (AGENTS.md): название, краткий эффект, триггер прокачки, цепочка «сейчас → на ур.100».

## 6. Бой: trigger-hook engine

### 6.1. Точки вызова

`firePassives(trigger, actor, ctx)` вызывается из reducer:

| Trigger | Момент |
|---------|--------|
| `on_turn_start` | Начало хода героя |
| `on_move` | После `MOVE` |
| `on_strike` | После базовой атаки |
| `on_card_attack` | После damage/aoe/debuff/dot умением |
| `on_card_heal` | После heal/regen/resurrect умением |
| `on_regen_tick` | Тик regen в `on_turn_start` |
| `on_damaged` | После `applyDamage` к герою |
| `on_kill` | Враг убит этим героем |

### 6.2. Пайплайн одного пассива

1. Пассив **надет** (`passiveEquip`)?
2. `template.levelTrigger === trigger`?
3. Вычислить эффект:
   - stat → вклад в `effectiveStats` / бой-контекст;
   - proc/conditional → `ops` шаблона + моды слотов (`× (1 + Lm/100)`).
4. Эффект применён → `applyPassiveProgress(passive, rng)`.

### 6.3. Battle log

Новый тип записи `passive_proc` (templateId, proc success, опционально target/effect).

## 7. Экономика

Расширение `SkillAcquisitionConfig` → `AbilityAcquisitionConfig`:

```ts
{
  battleDropChance: number
  shopSkillOfferChance: number
  shopPassiveOfferChance: number   // = shopSkillOfferChance
  shopSkillPrice: number
  shopPassivePrice: number         // = shopSkillPrice
  shopRefreshCost: number
}
```

| Источник | Умение | Пассив |
|----------|--------|--------|
| Победа | roll → `chest.unboundCards` | roll → `chest.unboundPassives` |
| Магазин | слот `kind:'skill'` | слот `kind:'passive'` |
| Таверна | 1 random → `character.cards` | 1 random → `character.passives` + авто-надеть слот 0 |

**Привязка:** `BIND_PASSIVE_TO_CHARACTER` — из `unboundPassives`, если у героя <4.

**Продажа:** unbound из сундука — `floor(shopPassivePrice × 0.5)`. Привязанные не продаются.

**Пул:** `PASSIVE_TEMPLATE_POOL = Object.keys(PASSIVE_TEMPLATES)`; `pickRandomPassiveTemplateId(rng)` — равный вес.

## 8. UI

### 8.1. Кодекс

Порядок категорий:

```
class → item → card (Умения) → passive (Навыки) → mod → enemy
```

`CodexCategory`: добавить `'passive'`. Hint: «Привяжите навык к герою.»

### 8.2. Персонаж → Карточки

- Коллекция умений + **3 слота лоадаута** (было 2).
- Divider → **4 слота пассивов** (drag equip/unequip среди `character.passives`).
- Unbound-пассивы — в сундуке (секция рядом с unbound-умениями).

### 8.3. Бой

Пассивы не в руке карт; proc — в логе; статы — в tooltip через `effectiveStats`.

### 8.4. Expedition freeze

Bind / equip / sell — disabled + `Alert` (как остальной хаб).

## 9. Каталог 32 навыков

Универсальны для всех классов; `classFlavor` — для кодекса и синергий в описании.

### 9.1. Воин (`classFlavor: warrior`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `warrior_fortitude` | Стойкость | flat +2 defense | on_damaged | +🛡 | shield_bash |
| `warrior_vigor` | Выносливость | pct +15% health | on_damaged | +❤️ | cleave |
| `warrior_riposte` | Ответный удар | proc 20% | on_damaged | контрудар в melee range | shield_bash |
| `warrior_battle_line` | Боевой строй | proc | on_turn_start | +1🛡 за союзника рядом | battle_cry |

### 9.2. Маг (`mage`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `mage_arcane_focus` | Арканный фокус | flat +2 magicPower | on_card_attack | +✨ | fireball |
| `mage_mana_well` | Колодец маны | pct +20% mana | on_card_attack | +🔮 | arcane_bolt |
| `mage_ignite` | Воспламенение | proc 25% | on_card_attack | сплеш 1 клетка | fireball |
| `mage_frost_ward` | Морозный барьер | proc 15% | on_damaged | замедление атакующего | frost_nova |

### 9.3. Лучник (`ranger`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `ranger_keen_eye` | Меткий глаз | flat +2 critChance | on_strike | +🎯 | power_shot |
| `ranger_swiftness` | Стремительность | pct +15% speed | on_move | +👟 | snare_trap |
| `ranger_double_tap` | Двойной выстрел | proc 20% | on_strike | доп. удар | multishot |
| `ranger_far_sight` | Дальний прицел | flat +1 range* | on_move | +дальность если нет врага рядом | power_shot |

\* Условный бонус к `maxRange` атаки; качается при движении.

### 9.4. Лекарь (`healer`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `healer_gentle_hands` | Нежные руки | flat +2 healPower | on_card_heal | +💚 | heal |
| `healer_vitality` | Жизненная сила | pct +15% health | on_regen_tick | +❤️ | regeneration |
| `healer_splash_heal` | Перелив | proc 20% | on_card_heal | 2-я цель 50% силы | heal |
| `healer_renewal` | Обновление | proc | on_regen_tick | +1 к тику regen | regeneration |

### 9.5. Разбойник (`rogue`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `rogue_precision` | Точность | flat +2 critChance | on_strike | +🎯 | backstab |
| `rogue_agility` | Ловкость | pct +15% speed | on_move | +👟 | smoke_bomb |
| `rogue_venom` | Яд на клинке | proc 25% | on_strike | poison | poison_blade |
| `rogue_smoke_veil` | Дымовая завеса | proc 15% | on_damaged | уклонение (0 урона) | smoke_bomb |

### 9.6. Паладин (`paladin`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `paladin_aegis` | Эгида | flat +2 defense | on_damaged | +🛡 | divine_shield |
| `paladin_faith` | Вера | pct +15% healPower | on_card_heal | +💚 | lay_on_hands |
| `paladin_holy_reflect` | Святой отпор | reflect 10% | on_damaged | отражение | holy_strike |
| `paladin_intercession` | Заступничество | proc 20% | on_turn_start | хил союзника <50% HP, range 2 | lay_on_hands |

### 9.7. Колдун (`warlock`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `warlock_dark_power` | Тёмная мощь | flat +2 magicPower | on_card_attack | +✨ | shadow_bolt |
| `warlock_soul_harvest` | Сбор душ | pct +15% health | on_kill | +❤️ | corruption |
| `warlock_spread_plague` | Чума | proc 20% | on_kill | распространить DoT | corruption |
| `warlock_life_tap` | Кровавый канал | lifesteal 8% | on_card_attack | вампиризм | life_drain |

### 9.8. Берсерк (`berserker`)

| id | Название | Тип | levelTrigger | Эффект | synergies |
|----|----------|-----|--------------|--------|-----------|
| `berserker_rage` | Ярость | flat +2 attack | on_strike | +⚔ | frenzy |
| `berserker_bloodlust` | Кровожадность | pct +15% health | on_damaged | +❤️ | blood_rage |
| `berserker_twin_cleave` | Двойной рассек | proc 20% | on_strike | доп. удар | whirlwind |
| `berserker_desperation` | Отчаяние | conditional | on_strike | +25% урона при HP<50% | blood_rage |

## 10. Пул пассив-модов (MVP)

Файл `src/game/content/passiveModTemplates.ts`. Оффер через `carrierKind: 'passive'`.

| id | Эффект | requires |
|----|--------|----------|
| `pmod-flat-up` | +10% к flat-бонусу | stat_flat |
| `pmod-pct-up` | +10% к pct-бонусу | stat_pct |
| `pmod-proc-up` | +5% к шансу proc | proc |
| `pmod-move-range` | +1 к дальности хода | levelTrigger: on_move |
| `pmod-heal-splash-up` | +10% splash heal | heal proc |
| `pmod-counter-up` | +15% урона контрудара | counter proc |
| `pmod-regen-up` | +1 к regen tick | on_regen_tick |
| `pmod-reflect-up` | +5% отражения | reflect |
| `pmod-lifesteal-up` | +3% вампиризма | lifesteal |
| `pmod-range-up` | +1 дальность | range passive |
| `pmod-thorns` | 5% урона атакующему | on_damaged |
| `pmod-initiative` | +2 initiative | any passive |

Моды умений с `requires: ['active_card']` (cooldown, mana save и т.д.) **исключены** из пассив-оффера.

## 11. Сопутствующий баланс умений

| Изменение | Деталь |
|-----------|--------|
| `BattleLoadout` | **3 слота**: `[string \| null, string \| null, string \| null]` |
| Cooldown ×2 | Все `cooldownTurns` в `cardTemplates` ×2; `strike` без изменений |
| Миграция loadout | `[c1, c2]` → `[c1, c2, null]` |
| Таверна | 1 умение + 1 пассив при найме |

## 12. Reducer actions (новые)

| Action | Описание |
|--------|----------|
| `BIND_PASSIVE_TO_CHARACTER` | unbound → character.passives |
| `SET_PASSIVE_EQUIP` | slot 0..3, cardId \| null |
| `SELL_UNBOUND_PASSIVE` | сундук → золото |
| `PICK_PASSIVE_MOD_OFFER` | аналог карточного |
| `REMOVE_PASSIVE_MOD` | аналог карточного |

## 13. Миграция сохранений

- `character.passives = []`, `passiveEquip = [null, null, null, null]`
- `chest.unboundPassives = []`
- `battleLoadout` нормализовать до 3 слотов
- Cooldown — в шаблонах, не в save

## 14. Guardrails

- `BIND_PASSIVE` при 4 пассивах → reject
- Конфликт stat_flat/stat_pct на statId → reject equip
- Expedition / roster cap — существующие правила хаба

## 15. Тесты

| Область | Кейсы |
|---------|-------|
| `passiveEngine` | триггеры; proc-only progress |
| Стакинг | reject второго flat на defense |
| Экономика | dual shop/battle roll; tavern bind |
| `effectiveStats` | надетые vs снятые |
| Миграция | loadout 2→3; пустые passives |

## 16. Вне scope (phase 2)

- Пассивы у врагов (архитектура готова: тот же engine на `side: 'enemy'`)
- Уникальные пассив-моды на конкретный templateId
- Реролл пассива в таверне
