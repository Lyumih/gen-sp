# Дизайн: враги и боссы

**Дата:** 2026-06-23  
**Статус:** implemented  
**Связь:** `docs/superpowers/specs/2026-03-28-gen-game-design.md`, `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`, `docs/superpowers/specs/2026-06-23-passive-skills-design.md`, `docs/superpowers/specs/2026-06-23-content-tags-classes-design.md`, `AGENTS.md`

## 1. Цель

Расширить MVP-врагов (`grunt`, `boss`) до полноценной системы контента:

- **16 обычных архетипов** — по 2 на каждый класс героя как контрпик **роли в смешанном отряде**
- **8 боссов** — по 1 на класс; **гибридный антипод**: один класс страдает сильнее всего, отряд может компенсировать
- Враги похожи на героев: базовые статы, раса, опциональный класс, 0–4 умения, 0–4 пассива, базовая атака-фолбэк
- Пул + веса по типу угрозы; босс — отдельный сценарий каждые N боёв

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| «Сложный для класса» (обычные враги) | Контрит **стиль класса в смешанном отряде** |
| Боссы | **Гибрид**: основной антипод-класс + отряд может закрыть слабость |
| Умения | **Гибрид**: реюз карт героев + 6 общих монстр-умений; боссы — 8 эксклюзивных |
| Расы | **Полная система** резистов/уязвимостей к тегам + врождённый трейт |
| Кампания | **Пул + веса** по `threatTag`; босс — фиксированный сценарий раз в **4** боя |
| Погрешность статов | **Глобальный** множитель `U(0.5, 1.5)` для большинства; **per-stat** только у 3 хаотичных мутантов |
| Пассивы врагов | До **4 пассивов** по той же системе, что у героев; фиксированный L и пресет модов |
| Архитектура | **Подход B**: `EnemyArchetype` + `SpawnProfile` (не зеркало `Character`) |

## 3. Модель данных

### 3.1 `EnemyArchetype`

```ts
type EnemyArchetype = {
  id: string
  label: string
  emoji: string
  semanticEmojiId?: string
  raceId: RaceId
  classId?: ClassId
  threatTags: readonly string[]
  counterClass: ClassId
  baseStats: BaseStats
  baseAttack: 'strike' | 'shot' | 'magic_bolt'
  skillPresets: readonly EnemySkillPreset[]
  passivePresets: readonly EnemyPassivePreset[]
  skillPriorities: readonly EnemySkillPriority[]
  isBoss?: boolean
  isChaotic?: boolean
  spawnWeight: number
  descriptionRu: string
}

type EnemySkillPreset = {
  templateId: string
  global_level: number
  modSlots: ModSlotState[]
}

type EnemyPassivePreset = {
  templateId: string
  global_level: number
  modSlots: ModSlotState[]
}

type EnemySkillPriority = {
  skillId: string
  baseScore: number
  preferLowHpTarget?: boolean
  preferRangedTarget?: boolean
  preferHealerTarget?: boolean
  minRange?: number
}
```

### 3.2 Спавн и погрешность

```ts
effectiveStat = round(baseStat × powerMult × varianceMult)
```

- `powerMult` — из `unitLevel` + `worldPower` (как у героев, §7 gen-game-design)
- **Обычный враг:** один `varianceMult ~ U(0.5, 1.5)` на **все** статы
- **Хаотичный** (`isChaotic`): каждый стат — свой `U(0.5, 1.5)`
- Умения/пассивы: фиксированный `global_level` и пресет модов; **без** Memento-прокачки в бою

### 3.3 Базовые атаки (фолбэк, без CD)

| id | Аналог | kind | maxRange | statSource |
|----|--------|------|----------|------------|
| `strike` | существующий | melee | 1 | attack |
| `shot` | lite `power_shot` | ranged | 5 | attack |
| `magic_bolt` | lite `arcane_bolt` | ranged | 4 | magicPower |

Используются, когда все умения на перезарядке или цель вне радиуса умений.

## 4. Система рас

### 4.1 `RaceId`

`beast` | `undead` | `human` | `orc` | `elf` | `specter` | `construct` | `demon`

### 4.2 Таблица резистов и трейтов

| Раса | Резист | Уязвимость | Врождённый трейт |
|------|--------|------------|------------------|
| `beast` | `poison` −30% | `holy` +25% | +1 speed |
| `undead` | `dark` −20% | `holy` +50% | исцеление полученное −25% |
| `human` | — | — | +1 defense |
| `orc` | `melee` −15% | `magic` +15% | +2 attack при HP < 50% |
| `elf` | `magic` −15% | `poison` +25% | +1 initiative |
| `specter` | `melee` −30%, `poison` immune | `holy` +40% | *(фаза 2)* проход 1 стены/ход |
| `construct` | `crit` −50% | `magic` +20% | не лечится; +defense |
| `demon` | `fire` −25%, `dark` −25% | `holy` +35% | lifesteal 10% на ударах |

### 4.3 Применение в бою

```ts
finalDamage = baseDamage × (1 - raceResist[tag]) × (1 + raceVulnerable[tag])
```

Теги — из `CardAttackTemplate.tags` (`holy`, `dark`, `poison`, `melee`, `ranged`, `magic`, `fire`).

Tooltip урона (inspect): `База → защита → раса → итог`.

## 5. Умения монстров

### 5.1 Реюз карт героев

Враги используют существующие `CARD_ATTACK_TEMPLATES` (`fireball`, `backstab`, `shield_bash` и т.д.).

### 5.2 Общие монстр-умения (6)

| id | Название | kind | Роль |
|----|----------|------|------|
| `monster_bite` | Укус | melee + dot | звери, ближний урон |
| `monster_roar` | Рык | debuff aoe | −инициатива соседям, 1 ход |
| `monster_bone_throw` | Костяной бросок | ranged | нежить, дистанция |
| `monster_mana_siphon` | Высасывание маны | ranged debuff | анти-маг |
| `monster_armor_break` | Разлом брони | melee debuff | −defense цели, 2 хода |
| `monster_plague_cloud` | Чумное облако | aoe dot | анти-хил зона |

### 5.3 Босс-умения (10 эксклюзивных для 8 боссов)

| id | Название | Босс | Эффект |
|----|----------|------|--------|
| `boss_ground_slam` | Удар по земле | `boss_iron_colossus` | AoE вокруг, отбрасывает |
| `boss_spell_eater` | Пожирание заклинания | `boss_spell_eater` | Поглощает 1 заклинание/ход |
| `boss_blink_adjacent` | Мгновенный рывок | `boss_blink_hunter` | Телепорт в соседнюю к цели клетку |
| `boss_soul_mark` | Метка души | `boss_soul_reaper` | −50% исцеления на цели |
| `boss_grave_silence` | Могильная тишина | `boss_soul_reaper` | Блок `resurrect` на 3 хода |
| `boss_ward_pulse` | Импульс стража | `boss_abyss_warden` | AoE урон + снимает «скрытность» |
| `boss_decay_aura` | Аура упадка | `boss_decay_avatar` | Святые баффы −50% эффект |
| `boss_holy_judgment` | Святой суд | `boss_high_inquisitor` | Святой burst |
| `boss_silence_dark` | Тишина тьмы | `boss_high_inquisitor` | Блок тёмных умений на 2 хода |
| `boss_mirror_rage` | Зеркальная ярость | `boss_mirror_fiend` | Копирует бафф ярости атакующего |

### 5.4 Новые пассивы врагов (добавить в `passiveTemplates.ts` или `enemyPassiveTemplates.ts`)

Сокращения в ростере (`anti-heal`, `anti-mana`, `rage-trait`, `holy ward`, `thorns`, `speed L2`) — **новые templateId**, не абстрактные плейсхолдеры:

| id | Назначение |
|----|------------|
| `enemy_anti_heal_aura` | −25% исцеления на соседних героях |
| `enemy_anti_mana` | Снижает эффективность магии цели при попадании |
| `enemy_rage_trait` | +attack при HP < 50% |
| `enemy_holy_ward` | +% святого урона |
| `enemy_thorns` | Отражение % ближнего урона |
| `enemy_dark_affinity` | +% тёмного урона |

### 5.5 Босс-пассивы

| id | Босс | Эффект |
|----|------|--------|
| `boss_ignore_armor` | `boss_iron_colossus` | Атаки игнорируют 50% defense |
| `boss_ranged_ward` | `boss_blink_hunter` | Урон от `ranged` −50% |
| `boss_no_flank` | `boss_abyss_warden` | Нельзя атаковать с фланга / со спины |
| `boss_reflect_rage` | `boss_mirror_fiend` | Отражает 30% урона в ближнем |

## 6. Ростер: 16 обычных врагов

Контрпик = давит роль в **смешанном отряде**.

### 6.1 Против Воина

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_siege_golem` | Осадный голем | construct | warrior | `cleave`, `whirlwind`, `monster_armor_break` | `warrior_riposte` L3 | Пробивает броню, AoE |
| `enemy_ether_duelist` | Эфирный дуэлянт | specter | mage | `arcane_bolt`, `frost_nova`, `smoke_bomb` | `mage_frost_ward` L2 | Кайтит, замедляет |

### 6.2 Против Мага

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_orc_ravager` | Орк-разоритель | orc | berserker | `frenzy`, `whirlwind`, `monster_roar` | rage-trait L2 | Быстрый раш, AoE |
| `enemy_mana_leech` | Пожиратель маны | demon | warlock | `shadow_bolt`, `life_drain`, `monster_mana_siphon` | anti-mana L3 | Высасывает ресурс мага |

### 6.3 Против Лучника

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_shadow_stalker` | Теневой охотник | specter | rogue | `smoke_bomb`, `backstab`, `poison_blade` | speed L2 | Сближение через дым |
| `enemy_iron_bulwark` | Железный бастион | human | warrior | `shield_bash`, `battle_cry`, `monster_armor_break` | `warrior_fortitude` L3, thorns | Высокая защита, отражение |

### 6.4 Против Лекаря

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_plague_herald` | Чумной вестник | undead | warlock | `monster_plague_cloud`, `corruption`, `shadow_bolt` | anti-heal −25% L3 | Снижает хил, DoT |
| `enemy_bone_assassin` | Костяной убийца | undead | rogue | `backstab`, `poison_blade`, `monster_bite` | crit L3 | Burst быстрее хила |

### 6.5 Против Разбойника

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_iron_warden` | Железный караульный | human | warrior | `cleave`, `shield_bash`, `whirlwind` | thorns, `warrior_battle_line` L2 | AoE, шипы |
| `enemy_storm_caller` | Призыватель бури | elf | mage | `fireball`, `frost_nova`, `arcane_bolt` | `mage_ignite` L2 | AoE по области |

### 6.6 Против Паладина

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_dark_cultist` | Культист тьмы | human | warlock | `shadow_bolt`, `corruption`, `life_drain` | dark +15% L2 | Тёмный урон |
| `enemy_grave_speaker` | Говорящий с мёртвыми | undead | mage | `corruption`, `frost_nova`, `monster_bone_throw` | undead regen L2 | Нежить + DoT |

### 6.7 Против Колдуна

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_holy_crusader` | Святой каратель | human | paladin | `holy_strike`, `divine_shield`, `lay_on_hands` | holy +20% L2 | Святой урон + щит |
| `enemy_lightbound` | Светоносец | elf | healer | `holy_strike`, `heal`, `regeneration` | holy ward L2 | Переживает DoT |

### 6.8 Против Берсерка

| id | Название | Раса | Класс | Умения | Пассивы | Контрпик |
|----|----------|------|-------|--------|---------|----------|
| `enemy_frost_shaman` | Ледяной шаман | elf | mage | `frost_nova`, `arcane_bolt`, `monster_roar` | `mage_frost_ward` L3 | Замедление, кайт |
| `enemy_spinebeast` | Шипозверь | beast | warrior | `shield_bash`, `monster_bite`, `cleave` | thorns 20% L3 | Защита + отражение |

**spawnWeight:** `10` по 2–3 `threatTags` на архетип.

## 7. Ростер: 8 боссов

Порядок вех: каждые **4** боя (`bossIndex = floor(scenarioIndex / 4)`).

| # | id | Название | Раса | Класс | Антипод | Ключевые умения | Как помогает отряд |
|---|-----|----------|------|-------|---------|-----------------|-------------------|
| 1 | `boss_iron_colossus` | Железный колосс | construct | warrior | warrior | `boss_ground_slam`, `monster_armor_break` | Дальний DPS |
| 2 | `boss_spell_eater` | Пожиратель заклинаний | demon | mage | mage | `boss_spell_eater`, `monster_mana_siphon` | Ближний физ. урон |
| 3 | `boss_blink_hunter` | Мстительный призрак | specter | rogue | ranger | `boss_blink_adjacent`, `backstab` | Танк + AoE |
| 4 | `boss_soul_reaper` | Жнец душ | undead | warlock | healer | `boss_soul_mark`, `boss_grave_silence` | Burst DPS |
| 5 | `boss_abyss_warden` | Страж Бездны | construct | warrior | rogue | `boss_ward_pulse` | Дальний + AoE |
| 6 | `boss_decay_avatar` | Аватар упадка | demon | warlock | paladin | `boss_decay_aura`, `monster_plague_cloud` | Святой / burst DPS |
| 7 | `boss_high_inquisitor` | Верховный инквизитор | human | paladin | warlock | `boss_holy_judgment`, `boss_silence_dark` | Физ. урон |
| 8 | `boss_mirror_fiend` | Зеркальный демон | demon | berserker | berserker | `boss_mirror_rage`, `whirlwind` | Кайт / контроль |

**Пресеты L:** боссы skill L 5–8, passive L 4–6; 2 мода на ключевое умение.

## 8. Хаотичные мутанты (3)

| id | Название | Особенность | spawnWeight |
|----|----------|-------------|-------------|
| `enemy_chaos_aberration` | Аберрация хаоса | Случайный classId; 2 случайных умения из пула угрозы; per-stat variance | 3 |
| `enemy_mutant_wanderer` | Мутант-скиталец | Случайная раса; 3 умения; 0–1 случайный пассив | 3 |
| `enemy_shifting_shaman` | Шаман перемен | mage; ротация резиста fire/ice/poison каждые 3 хода | 3 |

## 9. Threat tags и биомы

| threatTag | Типичные враги |
|-----------|----------------|
| `forest` | spinebeast, shadow_stalker, frost_shaman |
| `crypt` | bone_assassin, grave_speaker, plague_herald |
| `arena` | iron_bulwark, orc_ravager, holy_crusader |
| `ruins` | siege_golem, ether_duelist, storm_caller |
| `swamp` | plague_herald, mana_leech, мутанты |

Сценарий задаёт 1–2 тега; спавн выбирает 1–4 врага из пересечения пулов.

```ts
type ScenarioEnemySpawn =
  | { kind: 'fixed'; archetypeId: string }
  | { kind: 'pool'; poolTags: string[]; count: number }
```

## 10. ИИ врага

Порядок выбора действия:

1. Пассивы `on_turn_start` / `on_damaged` — `passiveEngine`
2. Лучшее умение (off CD, в радиусе, score из `skillPriorities`)
3. Базовая атака (`strike` / `shot` / `magic_bolt`)
4. Движение — шаг, уменьшающий манхэттен до ближайшего живого героя
5. Пропуск (если заблокирован)

Флаги приоритета: `preferLowHpTarget`, `preferRangedTarget`, `preferHealerTarget`, `minRange`.

**Примеры:**

- `enemy_shadow_stalker`: `smoke_bomb` → `backstab`
- `boss_blink_hunter` ход 1: `boss_blink_adjacent` к дальнему бою
- `boss_soul_reaper`: `boss_soul_mark` с `preferHealerTarget`

## 11. Пресеты L и модов

| Тип | skill L | passive L | Моды |
|-----|---------|-----------|------|
| Обычный враг | 1–3 | 1–2 | 0–1 на умение, 0–1 на пассив |
| Сюжетный элит | 3–5 | 2–3 | 1–2 |
| Босс | 5–8 | 4–6 | 2 на ключевое умение, 1–2 на пассив |

Моды подбираются по синергии с умением (яд → `mod-poison-up`, AoE → `mod-aoe-size`).

## 12. Кодекс

- **Discovery:** первое убийство архетипа → `codexEntryId('enemy', archetypeId)` (расширить `discovery.ts`)
- **Описание:** раса, класс, counterClass, baseStats, резисты, умения, пассивы, лор-строка
- **Босс:** бейдж `★ Босс` в UI
- **Монстр-умения:** открытие в категории `card` при первом попадании по герою
- **Расы (фаза 2):** категория `race`, открытие после 3 убийств одной расы

## 13. Файловая структура

```
src/game/content/
  enemyArchetypes.ts
  enemyRaces.ts
  monsterSkillTemplates.ts
  enemyTemplates.ts          // deprecate → thin wrapper или alias

src/game/battle/
  enemySpawn.ts
  enemyResists.ts

src/features/battle/
  enemyAi.ts                 // score-based, расширить существующий

src/game/descriptions/
  enemyText.ts               // полное описание для кодекса
```

## 14. Тестирование

| Область | Тест |
|---------|------|
| Variance | Глобальный множитель сохраняет пропорции статов |
| Chaotic | Per-stat variance независим |
| Race resist | `holy` +50% на undead |
| AI | `boss_blink_hunter` ход 1 → blink |
| Codex | Kill архетипа → discovery |
| Spawn pool | `poolTags: ['forest']` не выдаёт crypt-only |

## 15. Вне скоупа (фаза 2)

- Specter: проход сквозь стену
- Категория кодекса `race`
- Процедурные имена / варианты emoji
- Элитные версии архетипов с отдельными id
