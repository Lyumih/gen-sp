# Readable item/card stats, hero profile (phase 1) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Игрок видит понятные характеристики предметов (включая магазин, инвентарь, экипировку) и карт; общий **профиль героя** в **Modal** доступен из **хаба и боя**; в хабе показывается **ожидаемый maxHp** следующего боя по тем же правилам, что `makeHero`; в бою — фактические HP и те же агрегаты, что в `BattleState`.

**Architecture:** Один слой **чистых функций** (`src/game/descriptions/`) строит строки и числа для UI; **не дублировать** формулы бонусов — использовать `aggregateGearHpBonus`, `aggregateGearCardLevelBonus`, `computeCardAttackDamage`, `getCardAttackTemplate`. Формула maxHp героя для сценария вынесена в **`computeHeroMaxHpForScenario`**, `makeHero` её вызывает. React: общий **`HeroProfileModal`**, кнопка с `aria-label` «Профиль героя» в `CampaignHub` и `BattleScreen`. Карты в бою: компактная строка + **Collapse** или **Popover** с деталями.

**Tech Stack:** TypeScript strict, Vitest, Vite, React 19, Ant Design 6, Zustand, существующие `scenarios.ts`, `itemTemplates.ts`, `cardTemplates.ts`.

**Spec:** `docs/superpowers/specs/2026-03-28-readable-stats-hero-profile-enemy-inspect-design.md`

**Вне этого плана:** фаза 2 (экипировка врага + инспектор врага) — отдельный план после завершения фазы 1.

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/campaign/heroMaxHp.ts` | `computeHeroMaxHpForScenario(snapshot, scenario)` = база `computeUnitStat` + `aggregateGearHpBonus` (как `makeHero` сейчас) |
| `src/game/campaign/heroMaxHp.test.ts` | Совпадение с прежним поведением `makeHero` / фикстура сценария |
| `src/game/campaign/scenarios.ts` | `makeHero` вызывает `computeHeroMaxHpForScenario`; реэкспорт при необходимости для хаба |
| `src/game/descriptions/itemText.ts` | Короткие подписи, строки для магазина (уровень 1 + «за уровень»), полное описание экземпляра по слоту |
| `src/game/descriptions/itemText.test.ts` | Граничные нули, известные шаблоны из `ITEM_TEMPLATES` |
| `src/game/content/cardTemplates.ts` | Поле **`label`** (или `displayName`) у `CardAttackTemplate` + значения для существующих ключей |
| `src/game/descriptions/cardText.ts` | Имя карты, строки атаки/дальности/токена, ожидаемый урон через `computeCardAttackDamage(tmpl, levelForDamage)` |
| `src/game/descriptions/cardText.test.ts` | `strike` + уровень + `gearCardLevelBonus`; отсутствующий шаблон |
| `src/features/profile/HeroProfileModal.tsx` | Modal: пропсы `open`, `onClose`, режим `hub \| battle`, данные из `CampaignState` / `BattleState` |
| `src/game/campaign/battleSnapshot.ts` (новый, опционально) | `buildBattleAttemptSnapshot(campaign, scenarioSlotIndex)` — бывший `snapshotFromCampaign`; импорт в `runReducer` |
| `src/game/campaign/runReducer.ts` | Использовать `buildBattleAttemptSnapshot` вместо локальной копии |
| `src/features/campaign/CampaignHub.tsx` | Кнопка профиля; магазин: цена + слот + эффекты; Select: короткие `label`; опционально Popover |
| `src/features/battle/BattleScreen.tsx` | Кнопка профиля; блок карт с именем + Collapse/Popover; без изменения логики боя |
| `src/game/content/cardAttackDamage.ts` | Обновить JSDoc: **уровень для урона** = `global_level + gearCardLevelBonus` в бою |

---

### Task 1: Единая формула maxHp героя (TDD)

**Files:**
- Create: `src/game/campaign/heroMaxHp.ts`
- Create: `src/game/campaign/heroMaxHp.test.ts`
- Modify: `src/game/campaign/scenarios.ts` (`makeHero`)

- [ ] **Step 1:** В `heroMaxHp.ts` реализовать `computeHeroMaxHpForScenario(snapshot: BattleAttemptSnapshot, scenario: BattleScenario): number` — скопировать текущую логику из `makeHero` (база + gear).

- [ ] **Step 2:** Тест: для фиксированного `snapshot` и первого сценария `SCENARIOS[0]` результат равен ручному расчёту `computeUnitStat(...) + aggregateGearHpBonus(...)` (как в тесте можно вызвать оба и сравнить с `battleStateFromScenario(...).units[0].maxHp` после рефактора).

- [ ] **Step 3:** Заменить тело расчёта maxHp в `makeHero` на вызов `computeHeroMaxHpForScenario`.

- [ ] **Step 4:** `npm run test -- src/game/campaign/heroMaxHp.test.ts src/game/campaign/scenarios.ts` (или полный `npm run test`) — ожидается PASS.

- [ ] **Step 5:** Commit  
`git add src/game/campaign/heroMaxHp.ts src/game/campaign/heroMaxHp.test.ts src/game/campaign/scenarios.ts`  
`git commit -m "refactor(campaign): shared computeHeroMaxHpForScenario for hero max HP"`

---

### Task 2: Тексты предметов (TDD)

**Files:**
- Create: `src/game/descriptions/itemText.ts`
- Create: `src/game/descriptions/itemText.test.ts`

- [ ] **Step 1:** Экспортировать функции, например: `itemPerLevelBonusesLines(t: ItemTemplate)` — строки про `+X HP` и `+Y к уровню урона карт` за **один** уровень предмета (0 скрывать или «нет» по соглашению в тесте); `itemTotalBonusesAtLevel(t, itemLevel)` — те же вклады для экземпляра; `itemShopSummaryLine(t)` — кратко для кнопки (слот + per-level); `itemSelectShortLabel(templateId, itemLevel)` или принимать `ItemInstance` + `getItemTemplate`.

- [ ] **Step 2:** Тесты на `wooden_sword`, `leather_armor` при уровнях `1` и `2`; шаблон с обоими ненулевыми коэффициентами (`copper_ring`).

- [ ] **Step 3:** `npm run test -- src/game/descriptions/itemText.test.ts` — PASS.

- [ ] **Step 4:** Commit `feat(descriptions): item stat copy for UI`

---

### Task 3: Имена и тексты карт (TDD)

**Files:**
- Modify: `src/game/content/cardTemplates.ts`
- Create: `src/game/descriptions/cardText.ts`
- Create: `src/game/descriptions/cardText.test.ts`
- Modify: `src/game/content/cardAttackDamage.ts` (JSDoc)

- [ ] **Step 1:** Добавить в тип шаблона поле **`label: string`**; для `strike` задать человекочитаемое имя (например «Удар»).

- [ ] **Step 2:** `cardText.ts`: `getCardDisplayLabel(templateId)` → `label` или fallback `templateId`; `describeCardCombatStats(card, gearCardLevelBonus)` — `levelForDamage = card.global_level + gearCardLevelBonus`, шаблон через `getCardAttackTemplate`, урон через `computeCardAttackDamage`, строки для `kind`, `maxRange`, токена.

- [ ] **Step 3:** Тест: при `gearCardLevelBonus = 3`, `global_level = 10`, шаблон `strike` — урон совпадает с `computeCardAttackDamage(tmpl, 13)`.

- [ ] **Step 4:** JSDoc в `cardAttackDamage.ts`: уточнить, что **`levelForDamage`** в бою включает бонус экипировки (см. спеку экипировки).

- [ ] **Step 5:** `npm run test -- src/game/descriptions/cardText.test.ts` — PASS; `npm run build` — без ошибок.

- [ ] **Step 6:** Commit `feat(descriptions): card labels and combat stat copy`

---

### Task 4: HeroProfileModal

**Files:**
- Create: `src/features/profile/HeroProfileModal.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/game/campaign/runReducer.ts` (или новый модуль + импорт в редьюсер)

- [ ] **Step 0:** Экспортировать функцию сборки **`BattleAttemptSnapshot`** из кампании (рефактор: вынести `snapshotFromCampaign` в `src/game/campaign/battleSnapshot.ts` как `buildBattleAttemptSnapshot(campaign, scenarioSlotIndex)` и вызывать из `runReducer`, **или** экспортировать эквивалент из `runReducer`). Хаб передаёт в модал результат `buildBattleAttemptSnapshot(campaign, campaign.scenarioIndex)` для расчёта ожидаемого HP.

- [ ] **Step 1:** Компонент с `Modal` из `antd`: заголовок «Профиль героя»; `open` / `onCancel`; `destroyOnClose` по желанию.

- [ ] **Step 2:** Пропсы: минимум `campaign: CampaignState`, `mode: 'hub' | 'battle'`, при `battle` — `battle: BattleState`; сценарий: `SCENARIOS[snapshot.scenarioSlotIndex]` где `snapshot` = `campaign.battleAttemptSnapshot` в бою (должен быть не `null` при активном бое).

- [ ] **Step 3:** Содержимое: `playerUnitLevel`, `worldPower`, `gold`; суммы `aggregateGearHpBonus` / `aggregateGearCardLevelBonus` с `getItemTemplate`; список слотов с надетыми предметами (полные описания из `itemText`); при `mode === 'battle'` — HP героя из `battle.units`; при `mode === 'hub'` — строка «Ожидаемый max HP в следующем бою: N» через `computeHeroMaxHpForScenario(buildBattleAttemptSnapshot(campaign, campaign.scenarioIndex), SCENARIOS[campaign.scenarioIndex])` (если кампания завершена и сценария нет — не показывать или «—»).

- [ ] **Step 4:** Опционально: список карт — имя из `cardText`, уровень, `uses_count`; раскрытие **Collapse** с деталями атаки (использовать `gearCardLevelBonus` из боя в режиме battle, из `aggregateGearCardLevelBonus` в режиме hub для согласованности с будущим боем).

- [ ] **Step 5:** В `CampaignHub` и `BattleScreen`: состояние `profileOpen`, кнопка с текстом и **`aria-label="Профиль героя"`**.

- [ ] **Step 6:** Ручная проверка: открыть из хаба и боя; `npm run build`.

- [ ] **Step 7:** Commit `feat(ui): hero profile modal in hub and battle`

---

### Task 5: Магазин, инвентарь, селекты, карты в бою

**Files:**
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1:** Магазин: под заголовком или внутри кнопки/`Space` показать **слот** + строки бонусов за уровень предмета + подпись про рост после побед (как в спеке §5); не ломать `disabled` при нехватке золота.

- [ ] **Step 2:** `Select` опции: короткий `label` из `itemSelectShortLabel` (или эквивалент); при необходимости **Popover** на строку выбранного слота с полным текстом.

- [ ] **Step 3:** Рюкзак (текстовая строка): короткие описания с бонусами или отсылка к профилю — не раздувать; минимум: имя + ур. + краткий вклад HP/урон.

- [ ] **Step 4:** `BattleScreen`: заменить сырой `templateId` в списке карт на **label**; добавить **Collapse** (один общий или на карту) / **Popover** с выводом `describeCardCombatStats` и `battle.gearCardLevelBonus`.

- [ ] **Step 5:** `npm run lint`, `npm run build`.

- [ ] **Step 6:** Commit `feat(ui): readable shop, equipment labels, card details in battle`

---

## Проверка перед merge

- `npm run test`
- `npm run build`
- Ручной проход: хаб → профиль → магазин → бой → профиль → карты.

---

## Фаза 2 (отдельный план)

По спеке §6: опциональная экипировка врага в сценарии, пересчёт `makeEnemies`, модал инспектора по клику на врага. Не смешивать с задачами выше.
