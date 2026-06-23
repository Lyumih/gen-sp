# Дизайн: унификация математики скейлинга статов, умений и экипировки

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** `src/game/balance.ts`, `src/game/memento/resolvePercentToken.ts`, `src/game/equipment/aggregates.ts`, `docs/superpowers/specs/2026-03-28-gen-game-design.md`, `docs/superpowers/specs/2026-03-28-shop-equipment-design.md`, `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`, `docs/superpowers/specs/2026-06-23-memento-modifiers-design.md`

## 1. Цель

Привести математику роста силы к **единой процентной логике** (+1% за уровень → ×2 на 100-м уровне) там, где это уместно, и **отделить прогресс экипировки** от уровня карт/оружия. Убрать «взрывной» рост от плоских бонусов (`+k × itemLevel` к HP и виртуальным уровням карт).

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Общий подход | **C:** осознанно разные кривые по подсистемам, но предметы — **процентный вклад**, не плоские уровни |
| Урон от экипировки | **A:** отдельный множитель `gearDamageMult`, **не** прибавляется к `L` карты/оружия |
| Статы героя (`unitLevel`) | **A:** 1%/ур (было 2%) |
| `worldPower` | **A:** 1%/очко (было 5%) |
| HP от экипировки | **A:** % к effective HP: `gearHpMult = 1 + Σ(hpPct × itemLevel / 100)` |
| Умения (`%%` plain), моды (`Lm`) | без изменений — уже 1%/ур |
| Реализация | **Подход 2:** единый хелпер `scalePercentPerLevel` + отдельные агрегаты экипировки |
| Калибровка шаблонов | 1:1 по числу: `hpBonus 2` → `hpPct 2`, `cardLevelBonus 1` → `damagePct 1` |
| Миграция save | `SAVE_VERSION` 7 → 8; пересчёт `gearDamageMult` из снимка боя при загрузке |

## 3. Единое правило роста

```ts
scaled = round(base × (1 + level × rate))
```

`rate = 0.01` означает +1% за уровень; на `level = 100` множитель = 2.

| Подсистема | `level` | `rate` | На L=100 |
|------------|---------|--------|----------|
| Статы героя | `unitLevel` | 0.01 | ×2 |
| Мета | `worldPower` | 0.01 | ×2 |
| Умения (`%%` plain) | `global_level` / `itemLevel` оружия (strike) | 0.01 | ×2 |
| Моды | `lm` | 0.01 | ×2 |
| HP экипировки | `itemLevel` | `hpPctPerLevel / 100` | см. §5 |
| Урон экипировки | `itemLevel` | `damagePctPerLevel / 100` | см. §5 |

Токены `%%CAP` и `%%-P` — без изменений (`resolvePercentToken`).

## 4. Формулы по подсистемам

### 4.1. Статы героя

```ts
effectiveStat = round(baseStat × (1 + 0.01×unitLevel + 0.01×worldPower)) + modFlatBonus
```

Константы в `balance.ts`:

```ts
export const UNIT_STAT_LEVEL_COEFF = 0.01      // было 0.02
export const UNIT_STAT_WORLD_POWER_COEFF = 0.01 // было 0.05
```

Статы `attack` / `magicPower` по-прежнему **не входят** в расчёт урона карт (фаза 2); формула нужна для UI и будущего боя.

### 4.2. Max HP

```ts
scaledHealth = round(baseStats.health × (1 + 0.01×unitLevel + 0.01×worldPower))
gearHpMult = 1 + Σ(hpPctPerLevel × itemLevel / 100)   // все надетые слоты
maxHp = round(scaledHealth × gearHpMult) + modFlatHp
```

Пассивные flat-бонусы модов (`carrier_hp_add`) — **после** множителя экипировки.

### 4.3. Урон и лечение карт

```ts
// strike: L = weapon.itemLevel (кулаки → L = 0)
// skill/heal: L = card.global_level
baseAmount = resolvePercentValue(L, token)

gearDamageMult = 1 + Σ(damagePctPerLevel × itemLevel / 100)
// strike: только armor + accessory (оружие не входит — свой L уже в baseAmount)
// skill/heal: все надетые слоты, включая weapon

amount = round(baseAmount × gearDamageMult)
amount = applyDamageMods(amount, modCtx)   // или applyHealMods для heal
```

**Без двойного счёта:** `damagePctPerLevel` на оружии усиливает скиллы/heal, но **не** добавляется к `L` удара `strike`.

### 4.4. Модификаторы

`scaleModValue(base, lm) = base × (1 + lm/100)` — без изменений.

## 5. Шаблоны предметов

### 5.1. Переименование полей

```ts
type ItemTemplate = {
  // ...
  hpPctPerLevel: number       // было hpBonusPerItemLevel
  damagePctPerLevel: number   // было cardLevelBonusPerItemLevel
}
```

Семантика:

- `hpPctPerLevel: 2` → +2% max HP за каждый уровень предмета
- `damagePctPerLevel: 1` → +1% урона/heal за каждый уровень предмета

### 5.2. Калибровка (1:1)

Числа в `ITEM_TEMPLATES` сохраняются как есть, меняется только имя поля и формула агрегации.

Примеры:

| id | hpPct | damagePct |
|----|-------|-----------|
| `wooden_sword` | 0 | 1 |
| `leather_armor` | 2 | 0 |
| `copper_ring` | 1 | 1 |
| `warrior_plate` | 3 | 0 |
| `mage_staff` | 0 | 2 |

### 5.3. Референсные точки

Герой: `health = 25`, `unitLevel = 10`, `worldPower = 3` → effective HP ≈ 28.

| Ситуация | itemLevel | Было | Станет |
|----------|-----------|------|--------|
| Кожаная броня | 20 | +40 flat HP | ×1.4 HP |
| Латы + печать воина | 50 | +250 flat HP | ×3.5 HP |
| Полный сет воина | 50 | урон через L+150 | strike L=50; skills ×2.5 от gear |

Ранний геймплей мягче; эндгейн силён, но предсказуем.

## 6. Изменения в коде

### 6.1. Новые функции

**`src/game/balance.ts`:**

```ts
export const PER_LEVEL_RATE = 0.01
export function scalePercentPerLevel(base: number, level: number, rate?: number): number
```

**`src/game/equipment/aggregates.ts`:**

| Было | Стало |
|------|-------|
| `aggregateGearHpBonus` | `aggregateGearHpMult` |
| `aggregateGearCardLevelBonus` | `aggregateGearDamageMult` |
| — | `aggregateGearStrikeDamageMult` (armor + accessory only) |

### 6.2. Типы и бой

`BattleState`:

```ts
gearDamageMult: number   // default 1; было gearCardLevelBonus (flat level sum)
```

При старте боя (`scenarios.ts`): `gearDamageMult = aggregateGearDamageMult(...)`.

Для strike в `runReducer`: использовать `aggregateGearStrikeDamageMult` или эквивалентную фильтрацию слотов.

### 6.3. Затронутые файлы

| Область | Файлы |
|---------|-------|
| Ядро | `balance.ts`, `aggregates.ts`, `effectiveStats.ts`, `itemTemplates.ts` |
| Бой | `runReducer.ts`, `scenarios.ts`, `cardAttackDamage.ts`, `cardHealAmount.ts`, `types.ts` |
| UI | `itemText.ts`, `cardText.ts`, `BattleScreen.tsx`, `HeroProfileContent.tsx`, `CardsInventoryView.tsx`, `CampaignCharacterTab.tsx`, `previewEquipDelta.ts`, `playerAi.ts` |
| Персистентность | `schema.ts` (v8), `migrate.ts` |
| Тесты | `aggregates.test.ts`, `effectiveStats.test.ts`, `runReducer.test.ts`, `migrate.test.ts`, `cardText.test.ts`, `playerAi.test.ts` |

### 6.4. UI / tooltip

**Предмет:** «+2% max ❤️ за уровень предмета», «+1% 💥 за уровень предмета».

**Карта в бою:**

```
Урон база (⭐50): 60
Экипировка: ×1.5
Моды: ×1.1
Итого: 99
```

**Профиль:** показывать `gearHpMult` / `gearDamageMult`, не flat «+N к ⭐».

## 7. Миграция сохранений

- **`ItemInstance`** — без изменений (`templateId` + `itemLevel`).
- **`SAVE_VERSION`:** 7 → 8.
- **Бой в процессе:** при загрузке пересчитать `gearDamageMult` из `items`/`equipment` в снимке боя через новые агрегаты.
- Legacy fallback: если пересчёт невозможен, `gearCardLevelBonus` → `1 + old/100` (приближение; только для старых сейвов без items в battle snapshot).

## 8. Тестирование

| Уровень | Проверка |
|---------|----------|
| `balance.ts` | `unitLevel=100, base=10` → 20; `worldPower=100` → ×2 |
| `aggregates.ts` | mult-агрегаты; strike-mult без weapon |
| `effectiveStats.ts` | HP через `gearHpMult`, не flat |
| `runReducer` | strike: L только weapon; skill: mult отдельно; heal: тот же mult |
| `migrate.test.ts` | v7 → v8 battle snapshot |
| Регрессия | существующие тесты strike/gear с обновлёнными ожиданиями |

## 9. Порядок реализации

1. `scalePercentPerLevel` + коэффициенты `balance.ts`
2. Переименование полей `itemTemplates` + `aggregates`
3. `effectiveStats` (HP mult)
4. `runReducer` + `scenarios` (урон/heal)
5. UI / descriptions
6. `migrate` v8 + тесты

## 10. Вне скоупа

- Включение `attack` / `magicPower` в формулу урона карт (фаза 2)
- Изменение кривых `%%CAP` / `%%-P`
- Изменение `rollCardLevelUp` и вех модов
- Перебалансировка цен магазина под новые кривые
