# Дизайн: склонности персонажа (character specialization)

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md`, `docs/superpowers/specs/2026-06-23-memento-modifiers-design.md`, `docs/superpowers/specs/2026-06-23-skill-acquisition-chest-shop-design.md`, `docs/superpowers/specs/2026-06-23-passive-skills-design.md`, `AGENTS.md`, `src/game/types.ts`, `src/game/tavern/generateCandidates.ts`

## 1. Цель

Добавить **склонности** — перманентный мета-слой на персонаже:

- **не влияют на прямой бой** (нет бонусов к статам, урону, CD в бою);
- **косвенно** усиливают прогрессию: дроп, Memento, лоадаут, экономика;
- работают только пока герой **в отряде** (хаб или expedition);
- выдаются **случайно при найме в таверне**, **изменить нельзя**;
- до найма — **сюрприз** (не показываем на карточке кандидата).

Терминология UI:

| UI | Код | Смысл |
|----|-----|-------|
| Склонность | `specializationId` / `affinity` | Мета-бонус персонажа |
| Специализация Memento | carrier preset | Отдельная система носителя (карта/предмет); **не путать** |

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Архитектура | **Каталог + resolver** (подход A): `SpecializationTemplate` + точки триггера |
| Область удачи | Только **носители владельца** (карты, предметы, пассивы, `unitLevel`) |
| Область мета | **Вся команда**, если носитель склонности в отряде |
| Стакинг мета в отряде | **Лучший** бонус; дубликаты **не суммируются** |
| Downed в expedition | Мета **остаётся** — герой в `squadSnapshot`, `metaStatus` не отключает |
| Таверна | Склонность **скрыта** до `HIRE_TAVERN_CANDIDATE` |
| Пул при найме | **Равный шанс** `1/N` на каждую из 15 склонностей |
| Удача | При провале `rollCardLevelUp` — **один** retry с новым `r` |
| Мягкий откат модов | Потеря **20%** прогресса внутри вехи, не полный откат к порогу |
| Legacy персонажи | `specializationId: null` после миграции, без ретро-выдачи |

## 3. Активация

Склонность **активна**, если:

```
characterId ∈ campaign.squad (любой занятый слот)
ИЛИ
characterId ∈ expedition.squadSnapshot[].characterId
```

`metaStatus === 'downed'` **не** отключает эффект.

В **резерве** (не в отряде) — все бонусы неактивны.

| Тип эффекта | Область | Стакинг |
|-------------|---------|---------|
| Удача (`lucky_*`) | Носители владельца | Личное |
| Мета (`meta_*`) | Команда | Лучший в отряде |
| Моды / слоты | Носители и лоадаут владельца | Личное |

## 4. Модель данных

### 4.1. `Character`

```ts
type Character = {
  // ...existing fields
  specializationId: string | null
}
```

- При `createCharacter` до найма: `null`.
- При `HIRE_TAVERN_CANDIDATE`: обязательный `id` из пула.
- Неизменяемо после найма.

### 4.2. Каталог

`src/game/specialization/specializationTemplates.ts`:

```ts
type SpecializationEffectKind =
  | 'meta_drop_skill'
  | 'meta_drop_passive'
  | 'meta_shop_refresh'
  | 'meta_sell_bonus'
  | 'lucky_unit'
  | 'lucky_card_l'
  | 'lucky_passive_l'
  | 'lucky_mod_lm'
  | 'mod_offer_plus'
  | 'mod_soft_rollback'
  | 'mod_early_slot'
  | 'mod_offer_preview'
  | 'mod_extra_lm_roll'
  | 'slot_skill_plus'
  | 'slot_passive_plus'

type SpecializationTemplate = {
  id: string
  label: string
  emoji: string
  description: string
  effectKind: SpecializationEffectKind
  /** Числовые параметры эффекта (mult, discount, threshold override…) */
  params: Record<string, number>
}
```

### 4.3. Resolver API

`src/game/specialization/resolve.ts`:

```ts
function isSpecializationActive(
  campaign: CampaignState,
  characterId: string,
): boolean

function characterHasEffect(
  campaign: CampaignState,
  characterId: string,
  kind: SpecializationEffectKind,
): boolean

function partyMetaMultiplier(
  campaign: CampaignState,
  kind: 'meta_drop_skill' | 'meta_drop_passive',
): number  // 1.0 или 1.5

function partyMetaBonusFraction(
  campaign: CampaignState,
  kind: 'meta_shop_refresh' | 'meta_sell_bonus',
): number
// meta_shop_refresh → 0.25, cost = floor(baseCost × (1 - fraction))
// meta_sell_bonus → 0.25, gold = floor(baseGold × (1 + fraction))

function rollWithLuckyRetry(
  currentLevel: number,
  randomInt1to100: () => number,
  lucky: boolean,
): boolean
```

### 4.4. Лоадаут и капы

`src/game/specialization/loadoutCaps.ts`:

| Параметр | База | С `slot_skill_plus` | С `slot_passive_plus` |
|----------|------|---------------------|------------------------|
| Активные умения (`battleLoadout`) | 3 | **4** | 3 |
| Слоты пассивов (`passiveEquip`) | 4 | 4 | **5** |
| Владение пассивами (`passives.length`) | 4 | 4 | **5** |

Слоты лоадаута настраиваются в хабе всегда; в бою бонус слотов имеет смысл только когда герой в отряде expedition/бою.

## 5. Каталог склонностей (15)

Равный вес `1/15` при найме.

### 5.1. Мета — команда (лучший в отряде)

| id | Название | Эффект | Триггер |
|----|----------|--------|---------|
| `meta_drop_skill` | Собиратель умений | `battleDropChance × 1.5` для умения | Победа → `rollBattleSkillDrop` |
| `meta_drop_passive` | Собиратель навыков | `× 1.5` для пассива | Победа → `rollBattlePassiveDrop` |
| `meta_shop_refresh` | Торговец | Refresh магазина **−25%** золота | `REFRESH_SHOP` |
| `meta_sell_bonus` | Скупщик | Продажа камня из сундука **+25%** золота | `SELL_*_FROM_CHEST` |

### 5.2. Удача — носители владельца

| id | Название | Эффект | Триггер |
|----|----------|--------|---------|
| `lucky_unit` | Судьбоносный | Retry `unitLevel` | `finalizeVictory` |
| `lucky_card_l` | Ученик умений | Retry `global_level` карты | `cardProgress` |
| `lucky_passive_l` | Ученик навыков | Retry `global_level` пассива | `passiveProgress` (успешный proc) |
| `lucky_mod_lm` | Кователь модов | Retry `Lm` | `applyVictoryModRolls` |

Правило retry: первый `r` провалился → второй `r`; любой успех = level up.

### 5.3. Memento — носители владельца

| id | Название | Эффект | Триггер |
|----|----------|--------|---------|
| `mod_offer_plus` | Искатель модов | Оффер **4** мода вместо 3 | `generateOffer` |
| `mod_soft_rollback` | Осторожный мастер | При `REMOVE_MOD`: см. §5.5 | `REMOVE_MOD` |
| `mod_early_slot` | Ранний дебют | 1-й слот: **L ≥ 60** (prod) / **L ≥ 4** (dev) | `unlockedSlotCount` |
| `mod_offer_preview` | Провидец | Превью оффера следующего закрытого слота | UI инвентаря |
| `mod_extra_lm_roll` | Усердный | **+1** бросок `Lm` на каждый заполненный слот при победе | `applyVictoryModRolls` |

Превью оффера: seed = `modOfferSeed(carrierId, nextSlotIndex, milestoneThreshold(nextSlot))` — тот же оффер, что при открытии слота.

### 5.4. Слоты — владелец

| id | Название | Эффект |
|----|----------|--------|
| `slot_skill_plus` | Тактик | +1 слот активного умения (3→4) |
| `slot_passive_plus` | Собиратель знаний | +1 слот пассива (4→5), cap владения 5 |

### 5.5. Мягкий откат модов

Базовый откат (без склонности): `L → milestoneThreshold(slotIndex - 1)` (или 0).

С `mod_soft_rollback`:

```
milestonePrev = slotIndex <= 0 ? 0 : milestoneThreshold(slotIndex - 1)
delta = L - milestonePrev
L_new = L - ceil(delta × 0.2)
L_new = max(L_new, milestonePrev)
```

Пример: `L = 90`, `milestonePrev = 75` → `delta = 15` → теряем 3 → `L_new = 87`.

## 6. Точки интеграции

| Место | Изменение |
|-------|-----------|
| `HIRE_TAVERN_CANDIDATE` | `pickRandomSpecializationId(rng)`; codex `affinity:{id}`; `pendingHubNotice` |
| `finalizeVictory` | meta drop mult; `lucky_unit` |
| `applyVictoryModRolls` | `lucky_mod_lm`, `mod_extra_lm_roll` per owner |
| `cardProgress` / `itemProgress` / `passiveProgress` | `lucky_card_l` / `lucky_passive_l` |
| `generateOffer` | 4 mod ids при `mod_offer_plus` |
| `milestoneThreshold` / `unlockedSlotCount` | `mod_early_slot` через `effectiveMilestones(character)` |
| `rollbackCarrierLevel` / `REMOVE_MOD` | ветка `mod_soft_rollback` |
| `REFRESH_SHOP` | `meta_shop_refresh` |
| Sell chest actions | `meta_sell_bonus` |
| `SET_BATTLE_LOADOUT` / passive equip | caps из `loadoutCaps` |
| `battleSnapshot` | проброс `specializationId` (UI; бой без изменений) |

## 7. UI

| Место | Поведение |
|-------|-----------|
| Таверна | Склонность **не** на карточке кандидата |
| После найма | Notice + toast «Открыта склонность: {label}» |
| Профиль / roster | Emoji + название; tooltip — описание |
| Отряд / резерв | Бейдж «активна» / «неактивна» |
| Инвентарь носителя | Блок превью при `mod_offer_preview` |
| Кодекс | Категория **`affinity`** («Склонности») |
| Help | Склонность ≠ Memento-спец носителя |

## 8. Кодекс

- Новая категория: `CodexCategory` += `'affinity'`.
- Entry id: `affinity:{specializationId}`.
- Discover при найме героя с этой склонностью.

## 9. Ошибки и границы

- Неизвестный `specializationId` → `console.warn`, эффектов нет.
- Solo: если единственный герой **не** в `squad` — мета не работает.
- `SET_BATTLE_LOADOUT`: `slotIndex` 0..3 при 4 слотах.
- Extra passive slot: владение до 5 пассивов только у носителя `slot_passive_plus`.

## 10. Тесты

| Тест | Проверка |
|------|----------|
| `resolve.test.ts` | active: squad, expedition, downed; inactive: reserve |
| party meta | Два `meta_drop_skill` → mult 1.5, не 2.25 |
| `rollWithLuckyRetry` | fail→success; fail→fail |
| `mod_soft_rollback` | L=90, milestone 75 → L=87 |
| `HIRE` | Ровно один id из пула |
| `loadoutCaps` | 4-й skill slot только с `slot_skill_plus` |
| migrate v9→v10 | `specializationId: null` |

## 11. Миграция и save

- `SAVE_VERSION`: **9 → 10**
- `migrateV9CampaignToV10`: всем персонажам `specializationId: null`
- `createCharacter`: `specializationId: null` до найма

## 12. Баланс (заметки)

При равных весах `slot_*` и `mod_offer_plus` сильнее остальных — мониторинг на плейтесте; веса можно ввести позже без смены архитектуры.

## 13. Вне scope v1

- Смена склонности за золото / ивент
- Показ склонности на карточке таверны
- Веса редкости в пуле
- Влияние класса персонажа на пул склонностей
