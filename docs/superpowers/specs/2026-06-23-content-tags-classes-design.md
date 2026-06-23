# Дизайн: наполнение умений и предметов, теги, классы в Кодексе

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-23-memento-modifiers-design.md`, `docs/superpowers/specs/2026-06-18-codex-design.md`, `docs/superpowers/specs/2026-06-22-character-base-stats-design.md`, `src/game/content/characterClasses.ts`, `src/game/content/cardTemplates.ts`, `src/game/content/itemTemplates.ts`, `src/game/content/modTemplates.ts`, `src/game/character/iconCatalog.ts`, `AGENTS.md`

## 1. Цель

Расширить игровой контент и метаданные:

- **24 умения** (универсальный пул) с полным дизайном эффектов, включая фазу 2 (`regen`, `dot`, `buff`, …).
- **24 предмета-архетипа** (оружие / броня / аксессуар на класс) — носят все классы, бонусы и моды заточены под архетип.
- **Система тегов** — carrier tags для модов + theme tags для классов и Кодекса.
- **SemanticEmoji** — один базовый emoji + accent для переиспользования символов с разным смыслом.
- **Кодекс: категория «Классы»** — теги и primary/secondary статы; discovery при найме.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Доступность умений | **Универсальный пул**; у класса — `recommendedCardIds` (3 шт.) |
| Глубина каталога | **Полный дизайн** новых `kind` / ops; MVP-движок — старые 4 `kind`; новые шаблоны `enabled: false` до фазы 2 |
| Предметы | Любой класс может носить любой предмет |
| Класс в Кодексе | Discovery при **найме**; warrior при старте кампании + миграция по roster |
| Страница класса в Кодексе | **Компактно:** теги + primary/secondary статы |
| Emoji | **`SemanticEmoji`** (`base` + `IconAccentId`); рендер через `accentStyle` |
| Архитектура | **Подход A:** расширение существующих TS-каталогов |

## 3. Таксономия тегов

### 3.1. Два слоя

| Слой | Назначение | Примеры |
|------|------------|---------|
| **Carrier tags** | Фильтр модов (`mod.requires`) | `skill`, `attack`, `melee`, `ranged`, `aoe`, `heal`, `weapon`, `armor`, `accessory` |
| **Theme tags** | Классы, Кодекс, рекомендации | `magic`, `holy`, `dark`, `poison`, `regen`, `buff`, `debuff`, `mobility`, `crit`, `tank`, `support`, `resurrect`, `dot`, `lifesteal`, `defense` |

**Правило:** `mod.requires` проверяет только **carrier tags** на носителе. Theme tags — для UI и связи с классами. Пересечение: `heal`, `lifesteal`, `poison`, `dot`, `regen`, `resurrect` — и carrier (когда появятся ops), и theme.

### 3.2. Теги по классам

| Класс | Carrier-релевантные | Theme |
|-------|---------------------|-------|
| warrior | `melee`, `attack`, `armor` | `tank`, `defense` |
| mage | `ranged`, `aoe`, `skill` | `magic` |
| ranger | `ranged`, `attack` | `mobility`, `crit` |
| healer | `heal`, `skill` | `support`, `regen`, `resurrect`, `holy` |
| rogue | `melee`, `attack` | `crit`, `poison`, `mobility` |
| paladin | `melee`, `heal`, `armor` | `holy`, `tank`, `support` |
| warlock | `ranged`, `skill` | `dark`, `dot`, `lifesteal`, `magic` |
| berserker | `melee`, `attack` | `crit`, `lifesteal`, `tank` |

### 3.3. Файл `tagTaxonomy.ts`

```ts
type TagGroup = 'carrier' | 'theme'

type TagDefinition = {
  id: string
  labelRu: string
  group: TagGroup
}
```

Используется в Кодексе для локализованных подписей тегов.

### 3.4. Явные теги на шаблонах

`resolveCarrierTags` читает `template.tags` (если заданы), иначе fallback на вывод из `kind` / `slot`. Позволяет луку (`ranger_bow`) иметь `ranged` до фазы 2 дальнего оружия в бою.

## 4. SemanticEmoji

### 4.1. Структура (`src/game/ui/semanticEmoji.ts`)

```ts
type SemanticEmoji = {
  id: string
  base: string              // emoji; позже assetKey для PNG
  accent: IconAccentId      // default | red | blue | green | gold | purple | teal | gray
  labelRu: string
  themeTag?: string
}
```

### 4.2. Легенда смыслов (MVP)

| Accent | Базовый emoji | Смысл |
|--------|---------------|-------|
| `red` | ❤️ | мгновенное исцеление |
| `blue` | ❤️ | регенерация / HoT |
| `green` | 💧 / ☠️ | яд / DoT |
| `gold` | ✨ / 🛡 / ❤️ | святая магия / защита |
| `purple` | ✨ / 🔮 / 🗡 | тёмная магия |
| `red` | 💥 / ⚔ / 🪓 | физический / огненный урон |
| `blue` | ❄️ | лёд / замедление |
| `teal` | 🏹 / ⚡ | мобильность / дальность |
| `gray` | 🛡 / 💨 / 🪤 | защита / утилита |

### 4.3. Рендер

Компонент `SemanticEmojiIcon`: `base` + `accentStyle(accent)` из `iconCatalog.ts`. Портреты героев остаются на `IconAccentId` + skin tone; игровой контент — на `SemanticEmoji`.

Шаблоны карт, предметов, модов и классов ссылаются на `semanticEmojiId`. Поле `emoji?: string` — fallback до миграции.

## 5. Умения — новые `kind` и ops

### 5.1. Расширение `CardAttackTemplate`

```ts
type CardKind =
  | 'melee' | 'ranged' | 'aoe' | 'heal'   // MVP-движок
  | 'regen' | 'resurrect' | 'buff' | 'debuff' | 'dot' | 'lifesteal_spell' | 'utility'  // фаза 2

type CardAttackTemplate = {
  // ...существующие поля
  tags: readonly string[]
  semanticEmojiId: string
  enabled?: boolean   // false для фазы 2
}
```

### 5.2. Новые ops (декларативно)

```ts
| { kind: 'apply_status'; statusId: string; duration: number; potencyToken?: string }
| { kind: 'resurrect'; hpPercent: number }
| { kind: 'heal_over_time'; healPerTurnToken: string; duration: number }
| { kind: 'damage_over_time'; damagePerTurnToken: string; duration: number }
| { kind: 'stat_buff'; statId: StatId; valueToken: string; duration: number }
```

### 5.3. Carrier tags для новых kind

| kind | Carrier tags |
|------|--------------|
| `heal`, `regen`, `resurrect` | `skill`, `heal` |
| `dot`, `lifesteal_spell` | `skill`, `attack`, `ranged` |
| `buff`, `debuff`, `utility` | `skill` |
| `melee` | `skill`, `attack`, `melee` |
| `ranged` | `skill`, `attack`, `ranged` |
| `aoe` | `skill`, `attack`, `ranged`, `aoe` |

`strike` — канал действия без `L` и модов; не входит в пул из 24 умений.

### 5.4. Каталог умений (24 шаблона)

| id | Название | kind | SemanticEmoji | Рек. класс | Кратко | enabled |
|----|----------|------|---------------|------------|--------|---------|
| `shield_bash` | Удар щитом | `melee` | shield-gray | warrior | Ближний удар; оглушение 1 ход | MVP* |
| `cleave` | Рассекающий удар | `aoe` | sword-red | warrior | AoE 3×3, дальность 1 | MVP* |
| `battle_cry` | Боевой клич | `buff` | horn-gold | warrior | +защита союзникам, радиус 2 | false |
| `fireball` | Огненный шар | `aoe` | fire-red | mage | *существует* | true |
| `frost_nova` | Ледяная волна | `aoe` | frost-blue | mage | AoE 3×3; замедление | false |
| `arcane_bolt` | Чародейский луч | `ranged` | spark-purple | mage | Одиночная цель, дальность 4 | MVP* |
| `power_shot` | Силовой выстрел | `ranged` | bow-default | ranger | Высокий урон, дальность 5, CD 3 | MVP* |
| `multishot` | Залп | `aoe` | bow-teal | ranger | 3×3 на дальности 4 | MVP* |
| `snare_trap` | Капкан | `utility` | trap-gray | ranger | Обездвиживание 2 хода | false |
| `heal` | Исцеление | `heal` | heart-red | healer | *существует* | true |
| `regeneration` | Регенерация | `regen` | heart-blue | healer | HoT 3 хода | false |
| `resurrection` | Воскрешение | `resurrect` | spark-gold | healer | 0 HP → 30% maxHp, CD 8 | false |
| `backstab` | Удар в спину | `melee` | dagger-purple | rogue | Ближний; +крит | MVP* |
| `poison_blade` | Отравленный клинок | `dot` | drop-green | rogue | Удар + яд 3 хода | false |
| `smoke_bomb` | Дымовая шашка | `utility` | smoke-gray | rogue | −инициатива врагам 3×3 | false |
| `holy_strike` | Святой удар | `melee` | spark-gold | paladin | Урон + self-heal 20% | MVP* |
| `lay_on_hands` | Возложение рук | `heal` | heart-gold | paladin | Сильное исцеление, CD 5 | MVP* |
| `divine_shield` | Божественный щит | `buff` | shield-gold | paladin | +защита 3 хода | false |
| `shadow_bolt` | Теневой болт | `ranged` | orb-purple | warlock | Магический урон, дальность 4 | MVP* |
| `corruption` | Порча | `dot` | skull-green | warlock | DoT 4 хода | false |
| `life_drain` | Высасывание жизни | `lifesteal_spell` | vampire-purple | warlock | Урон + 50% как HP | false |
| `frenzy` | Бешенство | `buff` | axe-red | berserker | +атака, −защита 3 хода | false |
| `blood_rage` | Кровавая ярость | `buff` | blood-red | berserker | Вампиризм 30% на атаки 3 хода | false |
| `whirlwind` | Вихрь | `aoe` | axe-red | berserker | AoE 3×3 вокруг себя | MVP* |

\* **MVP\*** — шаблон добавляется в каталог с `enabled: true` только если `kind` ∈ {`melee`, `ranged`, `aoe`, `heal`} и движок уже умеет эффект. Все остальные новые умения — `enabled: false` до фазы 2.

### 5.5. Баланс-ориентиры (уровень 1)

- Урон: токены `40%%`–`60%%` attack/magic.
- Лечение: `25%%`–`40%%` healPower.
- CD: урон 2–4, лечение 3–5, utility 3–4, resurrect 8.

### 5.6. Новые модификаторы (заготовки, `enabled: false`)

| id | requires | Смысл |
|----|----------|-------|
| `mod-poison-up` | `dot` | +50% урон яда |
| `mod-regen-up` | `regen` | +50% HoT |
| `mod-buff-duration` | `buff` | +1 ход баффа |
| `mod-resurrect-hp` | `resurrect` | +10% HP при воскрешении |
| `mod-debuff-range` | `debuff` | +1 радиус дебаффа |

## 6. Предметы — 24 архетипа

### 6.1. Расширение `ItemTemplate`

```ts
type ItemTemplate = {
  // ...существующие поля
  tags: readonly string[]
  semanticEmojiId: string
  recommendedClassId?: ClassId
  modAffinity?: readonly SpecModId[]  // подсказка в Кодексе
}
```

**Фаза 2:** оружие дальнего боя (`bow`, `staff`) — carrier tag `ranged` вместо `melee`.

### 6.2. Каталог

| id | Название | Слот | SemanticEmoji | Рек. класс | hp/L | cardLv/L | modAffinity |
|----|----------|------|---------------|------------|------|----------|-------------|
| `warrior_blade` | Клинок воина | weapon | sword-red | warrior | 0 | 1 | mod-weapon-damage, mod-crit-chance, mod-double-strike |
| `warrior_plate` | Латы | armor | shield-gray | warrior | 3 | 0 | mod-armor-bonus, mod-hp-bonus-armor, mod-thorns |
| `warrior_signet` | Печать силы | accessory | ring-gold | warrior | 2 | 1 | mod-initiative, mod-hp-bonus-accessory |
| `mage_staff` | Посох мага | weapon | orb-purple | mage | 0 | 2 | mod-damage-up, mod-aoe-size, mod-cooldown-down |
| `mage_robe` | Мантия мага | armor | robe-purple | mage | 1 | 1 | mod-mana-save*, mod-cooldown-down |
| `mage_crystal` | Кристалл маны | accessory | orb-blue | mage | 0 | 1 | mod-initiative, mod-cooldown-down |
| `ranger_bow` | Лук следопыта | weapon | bow-teal | ranger | 0 | 1 | mod-range-up, mod-crit-chance, mod-weapon-damage |
| `ranger_leathers` | Доспех следопыта | armor | gi-teal | ranger | 2 | 0 | mod-initiative, mod-heal-on-hit-taken |
| `ranger_charm` | Амулет меткости | accessory | target-teal | ranger | 0 | 1 | mod-crit-chance, mod-initiative |
| `healer_staff` | Посох лекаря | weapon | heal-red | healer | 0 | 1 | mod-heal-up, mod-self-heal-on-use |
| `healer_mantle` | Мантия целителя | armor | heal-blue | healer | 3 | 0 | mod-heal-on-hit-taken, mod-ally-heal-splash* |
| `healer_ring` | Кольцо света | accessory | ring-gold | healer | 2 | 0 | mod-accessory-regen, mod-heal-up |
| `rogue_dagger` | Кинжалы | weapon | dagger-purple | rogue | 0 | 1 | mod-crit-chance, mod-double-strike, mod-lifesteal |
| `rogue_cloak` | Плащ теней | armor | mask-gray | rogue | 1 | 0 | mod-initiative, mod-heal-on-hit-taken |
| `rogue_ring` | Кольцо удара | accessory | target-purple | rogue | 0 | 1 | mod-crit-chance, mod-triple-strike |
| `paladin_mace` | Булава паладина | weapon | sword-gold | paladin | 0 | 1 | mod-weapon-damage, mod-self-heal-on-attack |
| `paladin_aegis` | Эгида | armor | shield-gold | paladin | 3 | 0 | mod-armor-bonus, mod-thorns, mod-hp-bonus-armor |
| `paladin_reliquary` | Реликварий | accessory | spark-gold | paladin | 2 | 0 | mod-heal-up, mod-hp-bonus-accessory |
| `warlock_staff` | Посох колдуна | weapon | orb-purple | warlock | 0 | 2 | mod-damage-up, mod-lifesteal, mod-crit-chance |
| `warlock_shroud` | Мрачная мантия | armor | moon-purple | warlock | 2 | 0 | mod-heal-on-hit-taken, mod-thorns |
| `warlock_soul_gem` | Камень душ | accessory | skull-purple | warlock | 0 | 1 | mod-lifesteal, mod-self-heal-on-attack |
| `berserker_axe` | Топор берсерка | weapon | axe-red | berserker | 0 | 2 | mod-weapon-damage, mod-double-strike, mod-triple-strike |
| `berserker_harness` | Нагрудник ярости | armor | blood-red | berserker | 2 | 0 | mod-heal-on-hit-taken, mod-thorns |
| `berserker_amulet` | Амулет крови | accessory | blood-red | berserker | 1 | 1 | mod-lifesteal, mod-self-heal-on-attack |

\* фаза 2.

**Цены (ориентир):** оружие 25–40, броня 30–45, аксессуар 20–35 золота.

**Стартовые бюджетные предметы** (`wooden_sword`, `leather_armor`, `copper_ring`) сохраняются как entry-level.

**`gearPool` в `characterClasses.ts`** ссылается на архетипные id класса.

## 7. Расширение шаблона класса

```ts
type CharacterClassTemplate = {
  id: string
  label: string
  hirePrice: number
  gearPool: { slot: EquipmentSlot; templateId: string; weight: number }[]
  tags: readonly string[]
  recommendedCardIds: readonly string[]
  recommendedItemIds: readonly string[]
  descriptionRu: string
  semanticEmojiId: string
}
```

### recommendedCardIds / recommendedItemIds

| classId | recommendedCardIds | recommendedItemIds |
|---------|-------------------|-------------------|
| warrior | shield_bash, cleave, battle_cry | warrior_blade, warrior_plate, warrior_signet |
| mage | fireball, frost_nova, arcane_bolt | mage_staff, mage_robe, mage_crystal |
| ranger | power_shot, multishot, snare_trap | ranger_bow, ranger_leathers, ranger_charm |
| healer | heal, regeneration, resurrection | healer_staff, healer_mantle, healer_ring |
| rogue | backstab, poison_blade, smoke_bomb | rogue_dagger, rogue_cloak, rogue_ring |
| paladin | holy_strike, lay_on_hands, divine_shield | paladin_mace, paladin_aegis, paladin_reliquary |
| warlock | shadow_bolt, corruption, life_drain | warlock_staff, warlock_shroud, warlock_soul_gem |
| berserker | frenzy, blood_rage, whirlwind | berserker_axe, berserker_harness, berserker_amulet |

## 8. Кодекс

### 8.1. Категория `class`

```ts
type CodexCategory = 'class' | 'item' | 'card' | 'mod' | 'enemy'
```

Порядок вкладок: **Классы · Предметы · Умения · Модификаторы · Враги**.

Id: `class:warrior`, …

### 8.2. Discovery

| Событие | Где | Открывает |
|---------|-----|-----------|
| Создание кампании (starter warrior) | `createNewCampaign` | `class:warrior` |
| Найм героя (`HIRE_CANDIDATE`) | `runReducer` | `class:{classId}` |
| Загрузка save (миграция) | `migrate.ts` | `class:{classId}` для каждого `characters[].classId` |

### 8.3. UI карточки класса

- Заголовок: `SemanticEmojiIcon` + label.
- Строка тегов (carrier — `blue`, theme — `purple`).
- Primary / secondary статы из `CLASS_STAT_AFFINITY` + `BASE_STAT_META` (как tooltip класса в таверне).
- Collapse «Подробнее»: `descriptionRu`.
- Рекомендуемые умения/предметы **не показываются** в v1 UI (данные есть для фазы 2).

### 8.4. Теги на других записях

`describeCodexEntry` для `item` / `card` / `mod`: строка «Теги: …» в `summaryLines`.

### 8.5. Новые файлы

| Файл | Назначение |
|------|------------|
| `src/game/ui/semanticEmoji.ts` | Каталог SemanticEmoji |
| `src/game/content/tagTaxonomy.ts` | Метки RU, группа carrier/theme |
| `src/game/descriptions/classText.ts` | `describeClassCodex(classId)` |
| `src/components/SemanticEmojiIcon.tsx` | Рендер |

### 8.6. Справка

Новая статья «Теги контента» в `src/game/help/articles.ts` — легенда carrier/theme тегов и SemanticEmoji accents.

## 9. Миграция

- **Save version:** без изменения.
- При загрузке: discover классы всех героев в `characters[]` (идемпотентно).
- Новая кампания: `class:warrior` в `codexDiscovered` сразу.

## 10. Тестирование

| Файл | Проверка |
|------|----------|
| `registry.test.ts` | 8 записей `class`; уникальные id |
| `discovery.test.ts` | hire → class; migrate roster |
| `classText.test.ts` | теги + primary/secondary |
| `carrierTags.test.ts` | явные tags на bow → ranged |
| `semanticEmoji.test.ts` | accent для id |
| `characterClasses.test.ts` | recommended ids существуют в каталогах |

## 11. Вне объёма v1

- UI рекомендуемых умений/предметов на карточке класса.
- PNG-ассеты.
- Боевой движок для новых `kind` / status ops.
- Классовые эксклюзивы умений.
- Категория «Статусы» в Кодексе.
- Бонусы предметов к статам кроме hp/cardLevel (фаза 2 base stats).

## 12. Следующий шаг

План реализации (`writing-plans`) после ревью этого файла пользователем.
