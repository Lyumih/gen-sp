# Боевая система маны — pool, regen, стоимость умений

**Дата:** 2026-07-20  
**Статус:** rev 0 — после brainstorming-сессии  
**Связь:** `2026-06-22-character-base-stats-design.md`, `2026-06-23-memento-modifiers-design.md`, `AGENTS.md`, `src/game/config/baseStats.ts`, `src/game/battle/reducer.ts`

---

## 1. Краткое описание

Вводится **боевой ресурс маны** для активных умений (карт). Персонаж и враг имеют:

- **`mana` (🔮)** в `baseStats` — **максимальный pool** в бою (flat, без level/worldPower);
- **`manaRegen` (♻️)** в `baseStats` — **восстановление маны** в начале своего хода.

При старте боя `Unit.mana = Unit.maxMana = baseStats.mana`. Каждое умение имеет **`manaCost`** в шаблоне; при использовании мана списывается. Если маны не хватает — действие блокируется, UI показывает предупреждение.

**Целевой темп:** при среднем pool ~30, regen ~4, cost ~12 — **4–5 кастов** с учётом регенерации, затем пауза до восстановления.

Базовые атаки (melee/ranged) **не тратят** ману.

---

## 2. Архитектурный подход

**DECIDED: Вариант 1 — mana на `Unit`**

| Поле | Назначение |
|------|------------|
| `Unit.mana` | текущая мана в бою |
| `Unit.maxMana` | max pool (= `baseStats.mana` при spawn) |

| Альтернатива | Почему отклонена |
|--------------|------------------|
| Sidecar `manaByUnitId` в `BattleState` | Дублирует паттерн HP; сложнее tooltip и синхронизация |
| Derived max + runtime current only | Избыточно при flat-статах |

**Скейлинг:** **flat** — `maxMana` и `manaRegen` не масштабируются через `computeUnitStat` (level/worldPower). Стоимости умений фиксированы; pool и regen растут через roll в таверне.

---

## 3. Модель данных

### 3.1. Новый stat `manaRegen`

Добавить 10-й stat в `StatId` / `BASE_STAT_IDS` / `BASE_STAT_META`:

| id | RU | Emoji | Описание |
|----|-----|-------|----------|
| `manaRegen` | Реген маны | ♻️ | +N 🔮 в начале своего хода в бою |

Stat `mana` (🔮): описание обновить на «Максимум маны в бою (flat)».

### 3.2. Roll в таверне (class-specific 0…N)

Для **`mana`** и **`manaRegen`** — **отдельная** логика roll (не `BASE_STAT_BOUNDS` + affinity):

```ts
rollStatInRange(0, CLASS_MANA_ROLL_MAX[classId], rng)
rollStatInRange(0, CLASS_MANA_REGEN_ROLL_MAX[classId], rng)
```

| Класс | mana N | regen N |
|-------|--------|---------|
| mage | 35 | 8 |
| healer | 30 | 6 |
| warlock | 25 | 5 |
| paladin | 18 | 4 |
| ranger | 12 | 4 |
| rogue | 10 | 3 |
| warrior | 20 | 3 |
| berserker | 18 | 3 |

Конфиг: `CLASS_MANA_ROLL_MAX`, `CLASS_MANA_REGEN_ROLL_MAX` в `src/game/config/baseStats.ts` (или `src/game/config/manaRoll.ts`).

Остальные stats — без изменений (существующий affinity-roll).

### 3.3. Шаблон умения

```ts
// CardAttackTemplate
manaCost: number  // обязательное поле
```

### 3.4. Модификаторы

Подключить существующий `mod-mana-save` (`mana_cost_mult`, −20%):

```ts
applyManaCostMods(baseCost: number, ctx: ModCombatContext): number
// Math.max(0, Math.ceil(baseCost * (1 + sumMult)))
```

Моды карты участвуют в расчёте effective cost (UI + reducer + AI).

---

## 4. Правила боя

### 4.1. Spawn

При создании `Unit` в бою:

```ts
maxMana = baseStats.mana
mana = maxMana
```

Для героев и врагов одинаково. `baseStats` snapshot остаётся на `Unit` для tooltip.

### 4.2. Регенерация

- **Когда:** начало хода юнита (в `advanceBattleTurn`, до действий игрока/AI), вместе с passive `on_turn_start`.
- **Формула:** `mana = min(mana + baseStats.manaRegen, maxMana)`.
- Юнит с `manaRegen = 0` — только стартовый pool.

### 4.3. Использование умения

Порядок gate при попытке каста:

1. Карта не на CD
2. `unit.mana >= effectiveManaCost(card)`
3. Дальность / цель / LOS (как сейчас)

При успешном применении:

```ts
unit.mana -= effectiveManaCost
// + существующая логика CD, damage, log
```

При нехватке маны:

- **Reducer:** silent no-op (как при CD)
- **UI (`BattleScreen`):** `message.warning('Недостаточно маны')` через `App.useApp()`

### 4.4. AI врага

`enemyAi`: карта доступна только если `cooldownRemaining <= 0 && actor.mana >= effectiveManaCost`. Иначе fallback move / basic attack.

### 4.5. Базовая атака

Melee/ranged hero basic и enemy basic — **0 mana**, без изменений.

### 4.6. Battle log (optional v1)

```ts
| { type: 'mana_spent'; unitId: string; amount: number; remaining: number }
```

В UI log можно не показывать в v1; полезно для тестов.

---

## 5. Стоимости умений (`manaCost`)

Ручная таблица; CD — ориентир. Средний cost ~12; тяжёлые 17–24.

### 5.1. Герои (`CARD_ATTACK_TEMPLATES`)

| templateId | CD | manaCost |
|------------|-----|----------|
| strike | 3 | 9 |
| backstab | 4 | 10 |
| arcane_bolt | 4 | 10 |
| shadow_bolt | 4 | 10 |
| shield_bash | 6 | 12 |
| fireball | 6 | 13 |
| power_shot | 6 | 12 |
| multishot | 6 | 13 |
| poison_blade | 6 | 12 |
| holy_strike | 6 | 12 |
| corruption | 6 | 12 |
| life_drain | 6 | 13 |
| cleave | 6 | 13 |
| frost_nova | 8 | 15 |
| battle_cry | 8 | 15 |
| snare_trap | 8 | 14 |
| heal | 8 | 14 |
| regeneration | 8 | 13 |
| smoke_bomb | 8 | 14 |
| frenzy | 8 | 14 |
| blood_rage | 8 | 15 |
| whirlwind | 8 | 14 |
| lay_on_hands | 10 | 18 |
| divine_shield | 10 | 17 |
| resurrection | 16 | 24 |

### 5.2. Монстры / боссы (`MONSTER_SKILL_TEMPLATES`)

| templateId | CD | manaCost |
|------------|-----|----------|
| monster_bite | 4 | 10 |
| monster_bone_throw | 4 | 10 |
| boss_spell_eater | 4 | 10 |
| monster_roar | 6 | 12 |
| monster_mana_siphon | 6 | 12 |
| monster_armor_break | 6 | 12 |
| boss_ground_slam | 6 | 13 |
| boss_blink_adjacent | 6 | 12 |
| monster_plague_cloud | 8 | 14 |
| boss_soul_mark | 8 | 14 |
| boss_ward_pulse | 6 | 13 |
| boss_decay_aura | 8 | 15 |
| boss_holy_judgment | 8 | 15 |
| boss_grave_silence | 10 | 17 |
| boss_silence_dark | 8 | 14 |
| boss_mirror_rage | 10 | 17 |

---

## 6. UI

### 6.1. Панель активного героя

`BattleScreen`: строка **`🔮{mana}/{maxMana}`** у текущего актора (рядом с HP).

### 6.2. Hover юнита на поле

`BattleUnitTooltip`: строка **`🔮 в бою: {mana}/{maxMana}`** (аналог HP).

### 6.3. Ячейка «Активные умения»

`BattleSkillCell` — расширить `contextBadge`:

```
{effectEmoji}{amount} · 🔮{manaCost} · ⏳{cd}
```

- heal/regen/resurrect: `💚` вместо `💥`
- CD: при `cooldownRemaining > 0` показывать **remaining**; иначе template CD
- Добавить `UI_COOLDOWN = '⏳'` в `src/game/ui/labels.ts`
- Недостаточно маны: cell **не** disabled (игрок видит умение); клик → warning; опционально opacity если `mana < effectiveCost`

### 6.4. Popover карты

`describeCardCombatStats`: строки «Стоимость: 🔮{effectiveCost}» и существующая перезарядка.

### 6.5. StatStrip (таверна / roster / профиль)

- Новый stat `manaRegen` в строке
- Tooltip `mana`: max pool в бою
- Tooltip `manaRegen`: восстановление в начале хода

---

## 7. Враги

- `enemyArchetypes.baseStats`: задать `mana` и `manaRegen` по смыслу archetype (магические — выше pool/regen; grunt warrior — ниже, но warrior N ≥ 15 для mana roll у классовых врагов при генерации)
- Spawn, regen, spend, AI — **идентично** героям
- Archetype без `manaRegen` → `0`

---

## 8. Миграция сохранений

**SAVE_VERSION:** 13 → **14**

Для существующих `Character`:

1. Если нет `baseStats.manaRegen` — deterministic roll `0..CLASS_MANA_REGEN_ROLL_MAX[classId]` от `hash(character.id + classId)`.
2. `baseStats.mana` — пересчитать deterministic roll `0..CLASS_MANA_ROLL_MAX[classId]` (новая class-table, не старый affinity-roll).
3. Пересчитать `baseStatRating` при изменении stats.

Tavern-кандидаты без `manaRegen` — перегенерировать при следующем refresh.

Unit-тест: legacy save → migrate с проверкой полей.

---

## 9. MVP scope

### В scope

- Stat `manaRegen`, class roll tables, `Unit.mana` / `maxMana`
- Regen в начале хода, spend при касте, UI warning
- `manaCost` на всех hero + monster templates (таблица §5)
- `applyManaCostMods`, включить `mod-mana-save`
- UI: panel, tooltip, skill cell badges, popover, StatStrip
- Enemy AI mana check
- SAVE migration
- Unit/integration tests

### Вне scope

- `monster_mana_siphon` / `enemy_anti_mana` как drain или silence маны (контент есть, механика — отдельная задача)
- Gear/passive бонусы к `mana` / `manaRegen` (кроме mod-mana-save на cost)
- Перенос остатка маны между боями expedition
- Скейлинг pool/regen от level/worldPower

---

## 10. Тестирование

| Область | Кейсы |
|---------|--------|
| Regen | +N в начале хода, cap at maxMana, regen=0 |
| Spend | успешный каст уменьшает mana; CD + mana вместе |
| Block | mana < cost → no state change; UI message |
| Mods | mod-mana-save −20%, ceil, min 0 |
| AI | враг не выбирает карту без маны |
| Spawn | mana = maxMana = baseStats.mana |
| Migration | vN → vN+1 deterministic mana/manaRegen |
| UI | badge format, tooltip lines |

---

## 11. Связанные файлы (implementation hint)

| Файл | Изменения |
|------|-----------|
| `src/game/config/baseStats.ts` | `manaRegen`, class roll max tables |
| `src/game/stats/rollBaseStats.ts` | special roll для mana/manaRegen |
| `src/game/types.ts` | `Unit.mana`, `maxMana`; log entry |
| `src/game/content/cardTemplateTypes.ts` | `manaCost` |
| `src/game/content/cardTemplates.ts` | values §5.1 |
| `src/game/content/monsterSkillTemplates.ts` | values §5.2 |
| `src/game/mods/modPipeline.ts` | `applyManaCostMods` |
| `src/game/battle/reducer.ts` | regen tick, spend, gates |
| `src/game/campaign/runReducer.ts` | player card gates |
| `src/game/campaign/cardCombat.ts` | spend on dispatch |
| `src/features/battle/enemyAi.ts` | mana affordability |
| `src/features/battle/BattleSkillCell.tsx` | badges |
| `src/features/battle/BattleScreen.tsx` | mana line, warning |
| `src/features/battle/BattleUnitTooltip.tsx` | mana line |
| `src/game/descriptions/cardText.ts` | cost in popover |
| `src/game/persistence/migrate.ts` | SAVE bump |
