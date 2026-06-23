# Дизайн: умения от статов героя, новая семантика `%%`, унификация Сильного удара

**Дата:** 2026-06-23  
**Статус:** черновик (brainstorming)  
**Заменяет / уточняет:** §4.3 и связанные пункты в `docs/superpowers/specs/2026-06-23-stat-scaling-balance-design.md`, §3.1 `docs/superpowers/specs/2026-03-28-gen-game-design.md` (семантика plain `BASE%%` для умений)  
**Связь:** `src/game/content/cardTemplates.ts`, `src/game/content/itemTemplates.ts`, `src/game/stats/effectiveStats.ts`, `src/game/memento/resolvePercentToken.ts`, `src/game/campaign/runReducer.ts`, `src/game/equipment/virtualFists.ts`, `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`

## 1. Цель

1. **Исправить семантику `P%%`:** число `P` — не абсолютный урон при L=0, а **потолок бонуса от уровня умения** (+P% к `core` на L=100).
2. **Привязать силу умений к статам героя:** в шаблоне явно указать опорный стат + флат умения.
3. **Экипировка усиливает статы** (% к `attack` / `magicPower` / `healPower` …), а не отдельный `gearDamageMult` на финальный урон карты.
4. **Убрать спецлогику `strike`:** Сильный удар считается как любое другое умение; оружие даёт % к `attack`, как броня к другим статам.
5. **Включить все скиллы** (`enabled: true`) и довести боевую поддержку до playable-состояния.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| База умения | **D = A + B:** effective stat героя + `skillFlat` из шаблона |
| `P%%` | +P% к `core` на L=100; на L=0 множитель 1.0 |
| Уровень L для `P%%` | всегда `card.global_level` (включая Сильный удар) |
| Экипировка | % к **соответствующему стату**; в будущем — уникальные бонусы на конкретное умение (вне MVP) |
| Поля предметов | `statPctPerLevel: Partial<Record<StatId, number>>` (+ сохранить `hpPctPerLevel`) |
| `gearDamageMult` / `gearStrikeDamageMult` | **удалить** из пайплайна умений |
| Сильный удар | обычное умение: `statSource: attack`, без канала оружия |
| Прокачка оружия | **A:** roll `itemLevel` при использовании любого умения с `statSource: attack` |
| Все скиллы enabled | да; buff/utility — минимальные боевые эффекты в этом же релизе (см. §8) |
| Старый `resolvePercentValue` plain | **не использовать** для умений; новая функция `skillLevelMult` |

## 3. Формула умения (нормативная)

### 3.1. Эффективный стат

```ts
stat0 = computeUnitStat({
  baseStat: baseStats[statSource],
  unitLevel,
  worldPower,
})

gearStatMult(statId) =
  1 + Σ_over_equipped_items( (item.statPctPerLevel[statId] ?? 0) × item.itemLevel / 100 )

stat1 = round(stat0 × gearStatMult(statSource))
```

Пассивные flat-моды на статы (`carrier_hp_add` и т.д.) применяются по существующим правилам `effectiveStats` **до** или **внутри** `stat0` — без изменений относительно `2026-06-22-character-base-stats-design.md`.

### 3.2. Ядро и уровень умения

```ts
core = stat1 + skillFlat

skillLevelMult(L, P) = 1 + (P / 100) × min(L, 100) / 100

amount = round(core × skillLevelMult(L, P))
final  = applyDamageMods(amount, modCtx)   // или applyHealMods для heal/regen
```

- `L` = `card.global_level`
- `P` = число из `scaleToken` (`'40%%'` → P=40)
- `skillFlat` ≥ 0, целое (калибровка контента)
- `modCtx` — моды **карты** (как сейчас); моды предметов на стат уже в `gearStatMult`

### 3.3. Таблица множителей `skillLevelMult`

| L \\ P | 25 | 40 | 50 | 60 |
|--------|----|----|----|-----|
| 0 | 1.00 | 1.00 | 1.00 | 1.00 |
| 50 | 1.125 | 1.20 | 1.25 | 1.30 |
| 100 | 1.25 | 1.40 | 1.50 | 1.60 |

### 3.4. Пример: Исцеление

Шаблон (целевой): `statSource: healPower`, `skillFlat: 5`, `scaleToken: '40%%'`.

| Шаг | Значение |
|-----|----------|
| `healPower` после unit/world | 3 |
| Экипировка +100% к heal | `round(3 × 2) = 6` |
| + skillFlat | `core = 11` |
| L=100, P=40 | `round(11 × 1.4) = 15` |

## 4. Шаблон умения (`CardAttackTemplate`)

### 4.1. Новые / заменяемые поля

```ts
type CardAttackTemplate = {
  label: string
  kind: CardKind
  maxRange: number
  aoeSize?: number

  /** Стат героя, от которого строится умение. */
  statSource: StatId   // 'attack' | 'magicPower' | 'healPower' | ...

  /** Аддитив к effective stat (бывший fallbackDamage / fallbackHeal). */
  skillFlat: number

  /** Потолок +P% на L=100. Единое поле для урона и лечения. */
  scaleToken: string     // '40%%'

  cooldownTurns?: number
  tags: readonly string[]
  semanticEmojiId: string
  enabled?: boolean      // default true; убрать все enabled: false
}
```

**Удалить:** `damageToken`, `healToken`, `fallbackDamage`, `fallbackHeal` (миграция контента в новые поля).

### 4.2. Маппинг `statSource` по контенту (MVP)

| Группа скиллов | `statSource` |
|----------------|--------------|
| melee / ranged physical (`tags` содержит `attack`, не magic) | `attack` |
| arcane / shadow / fire (`magicPower` в тегах класса или `ranged`+magic-теги) | `magicPower` |
| heal / regen / lay_on_hands | `healPower` |
| holy_strike | `attack` (физический удар; святой флейвор — теги/моды) |

Точный маппинг фиксируется в `cardTemplates.ts` при калибровке; валидатор: каждый enabled-скилл с боевым эффектом имеет `statSource` + (`scaleToken` или отдельная логика kind, §8).

### 4.3. Сильный удар (`strike`)

```ts
strike: {
  label: 'Сильный удар',
  kind: 'melee',
  statSource: 'attack',
  skillFlat: TBD,        // калибровка: ~2–5 для стартового героя
  scaleToken: '40%%',
  maxRange: 1,
  // global_level качается через applyCardUse — как у fireball
}
```

**Удалить полностью:**

- `resolveStrikeWeaponChannel`, `VIRTUAL_FISTS`, `weaponStrikeModCombatContext`
- `applyWeaponStrikeItemProgress`, `applyStrikeChannelUse`
- `gearStrikeDamageMult` в `BattleState`
- ветки `isStrike` в `runReducer`, `cardText`, UI (кроме продукта: strike остаётся стартовой картой, не продаётся)

## 5. Экипировка

### 5.1. Поля предмета

```ts
type ItemTemplate = {
  // ...
  hpPctPerLevel: number
  statPctPerLevel: Partial<Record<StatId, number>>
}
```

**Миграция контента:** `damagePctPerLevel: N` → `statPctPerLevel: { attack: N }` на оружии; предметы с магическим уклоном — `{ magicPower: N }`; кольца/амулеты — по дизайну предмета.

`hpPctPerLevel` без изменений (max HP).

### 5.2. Агрегатор

```ts
function aggregateGearStatMult(
  statId: StatId,
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (id: string) => ItemTemplate | undefined,
): number {
  let sum = 0
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const itemId = equipment[slot]
    if (itemId === null) continue
    const inst = items.find((i) => i.id === itemId)
    if (!inst) continue
    const t = getTemplate(inst.templateId)
    if (!t) continue
    sum += (t.statPctPerLevel[statId] ?? 0) * inst.itemLevel
  }
  return 1 + sum / 100
}
```

**Удалить:** `aggregateGearDamageMult`, `aggregateGearStrikeDamageMult` и их использование в расчёте умений.

### 5.3. Будущее (не MVP)

- Уникальные предметы: `skillBonus: { templateId, pct }` — прямой множитель к `core` или `final` конкретного умения.
- Моды «+10% к Огненному шару» — отдельный слой после `skillLevelMult`, до/после `applyMods` (зафиксировать при реализации уникалок).

## 6. Прокачка предметов

| Слот | Триггер level-up (как сейчас / новое) |
|------|----------------------------------------|
| armor, accessory | получение урона героем (без изменений) |
| weapon | **новое:** успешное использование умения с `statSource: 'attack'` (включая Сильный удар, cleave, …) — `applyItemUseRoll` на надетом оружии |

## 7. UI и tooltip

Цепочка в `describeCardCombatStats` (паттерн AGENTS.md):

```
⚔ stat (⭐unit/world): 3 → с экипировкой: 6
+ flat умения: 5 → core: 11
⭐ карты L100: ×1.40
Моды карты: ×1.00
Итого: 15
```

Не дублировать `gearDamageMult` в tooltip умений.

## 8. Включение всех скиллов

### 8.1. Снять `enabled: false` (12 шт.)

`battle_cry`, `frost_nova`, `snare_trap`, `regeneration`, `resurrection`, `poison_blade`, `smoke_bomb`, `divine_shield`, `corruption`, `life_drain`, `frenzy`, `blood_rage`

### 8.2. Боевая реализация по `kind`

| kind | MVP в этом релизе |
|------|-------------------|
| `melee`, `ranged`, `aoe` | новая формула §3 |
| `heal` | новая формула §3 |
| `regen` | heal на цель + статус regen N ходов (минимальный DoT-heal тик = `final` или доля — TBD при калибровке) |
| `dot` | удар `final` + статус poison/corruption (урон/ход от `skillFlat` или % от `core`) |
| `lifesteal_spell` | `final` damage + heal caster на % |
| `buff` | минимальный эффект: +stat или +damage_mult на 1–2 хода (см. таблицу) |
| `utility` | минимальный эффект: snare = skip move; smoke = -accuracy (или простой «debuff placeholder») |
| `resurrect` | восстановить союзника с 25% HP (одноразово, дальность из шаблона) |

Минимальные buff/utility **обязательны** для `enabled: true` — иначе карта в loadout бесполезна.

| id | Минимальный MVP-эффект |
|----|------------------------|
| `battle_cry` | +attack effective на 2 хода (self) |
| `divine_shield` | +defense или damage reduction 1 ход |
| `frenzy` | +attack, -defense 2 хода |
| `blood_rage` | +damage_mult на картах 2 хода |
| `snare_trap` | цель не может двигаться 1 ход |
| `smoke_bomb` | AoE: враги -1 maxRange 1 ход (или skip attack — проще) |

Детали статусной системы — если нет готовой, добавить `BattleStatus` с `remainingTurns` и 2–3 эффектами (не полный buff framework).

## 9. Калибровка контента

Старые `damageToken: '40%%'` означали «40 урона при L=0» — **невалидны** в новой модели.

Процесс:

1. Задать целевой `core` на стартовом герое (unit 1, базовая экипировка).
2. Подобрать `skillFlat` и `P` так, чтобы L=1 и L=100 давали ощутимый, но не ломающий баланс рост.
3. Сверить с бесплатным **Ударом** (5 💥): Сильный удар на L=1 должен быть сильнее, но не ×8.

`P` остаётся в диапазоне **25–60** (относительная сила умения); абсолютный урон задаётся stat + flat.

## 10. Миграция save

- `SAVE_VERSION` 8 → **9**
- Удалить `battle.gearDamageMult`, `battle.gearStrikeDamageMult` из схемы; при загрузке v8 — отбросить поля
- `damagePctPerLevel` в сохранённых предметах не хранится (только templateId) — миграция только шаблонов
- Карты в save: поля экземпляра без изменений (`global_level` по-прежнему)

## 11. Тесты

- `skillLevelMult.test.ts` — таблица §3.3
- `computeSkillAmount.test.ts` — цепочка stat → core → mult → mods
- Удалить / переписать strike-specific тесты в `runReducer.test.ts`
- `cardText.test.ts` — новая цепочка tooltip
- Интеграция: fireball, heal, strike на фикстурном герое
- Регрессия: HP mult, unit stats без изменений

## 12. Вне скоупа

- Уникальные предметы с бонусом к одному умению
- Влияние `critChance` / `speed` на формулу урона карт
- Переработка `%%CAP` / `%%-P` (не используются в текущем контенте; старый `resolvePercentValue` остаётся для модов/legacy до отдельного решения)

## 13. Self-review

- [x] Нет TBD в нормативных формулах (калибровка `skillFlat` — контентная задача, не блокер спеки)
- [x] Нет двойного счёта экипировки (stat mult only)
- [x] Strike унифицирован
- [x] Все enabled скиллы имеют план боевой поддержки
- [x] Связь со stat-scaling balance явно указана как superseding §4.3
