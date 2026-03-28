# Shop, gold, inventory, equipment, Memento item level-up — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В кампании появляются золото, покупка предметов в магазине, инвентарь, экипировка по типизированным слотам, бонусы к maxHp героя и к уровню для урона карт в бою; после победы в сценарии — начисление золота и Memento-броски на +1 уровень каждого надетого предмета; сохранения и снимок попытки боя откатывают экономику и экипировку при retry/abandon.

**Architecture:** Типы и каталог шаблонов предметов в `src/game` (как карты). Чистые функции агрегатов бонусов и награды за сценарий. `CampaignState` + `BattleAttemptSnapshot` расширены `gold`, `items`, `equipment`. В `BattleState` добавляется одно число **`gearCardLevelBonus`**, вычисляемое при старте боя из снимка (чтобы не таскать весь инвентарь в тактический редьюсер). `FINALIZE_VICTORY` принимает `itemLevelRolls`; при неверной длине — полный no-op. `RETRY_CURRENT_BATTLE` и `ABANDON_BATTLE` восстанавливают `gold`/`items`/`equipment` из снимка вместе с картами.

**Tech Stack:** TypeScript strict, Vitest, Vite, Zustand, React + Ant Design 6, существующие `runReducer`, `scenarios.ts`, `migrate.ts`, `rollCardLevelUp`.

**Spec:** `docs/superpowers/specs/2026-03-28-shop-equipment-design.md`

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/types.ts` | `EquipmentSlot`, `ItemInstance`, поля в `CampaignState`, `BattleAttemptSnapshot`, `BattleState.gearCardLevelBonus` |
| `src/game/content/itemTemplates.ts` | `ItemTemplate`, каталог `ITEM_TEMPLATES`, `getItemTemplate`, минимум 2–3 предмета для демо (разные слоты) |
| `src/game/equipment/equipmentOrder.ts` | `EQUIPMENT_ROLL_ORDER`, хелпер `occupiedSlotsInRollOrder(equipment)` |
| `src/game/equipment/aggregates.ts` | `aggregateGearHpBonus`, `aggregateGearCardLevelBonus` (по `items` + `equipment` + шаблонам) |
| `src/game/equipment/aggregates.test.ts` | TDD для агрегатов |
| `src/game/campaign/scenarioRewards.ts` | `goldForScenarioVictory(scenarioSlotIndex)` или по `scenario.id` — одно место констант |
| `src/game/campaign/scenarioRewards.test.ts` | Золото за слот сценария |
| `src/game/memento/rollMementoLevelUp.ts` | Реэкспорт или обёртка над `rollCardLevelUp` (единое имя для предметов) |
| `src/game/campaign/scenarios.ts` | `makeHero`: + бонус HP от снаряжения; `battleStateFromScenario`: выставить `gearCardLevelBonus` |
| `src/game/campaign/runReducer.ts` | `cloneItems`, снимок с `gold`/`items`/`equipment`, `BUY_ITEM`, `EQUIP_ITEM`, `UNEQUIP_ITEM`, расширенный `FINALIZE_VICTORY`, правки `RETRY`/`ABANDON` |
| `src/game/campaign/runReducer.test.ts` | Все сценарии из §9 спеки |
| `src/game/persistence/migrate.ts` | Нормализация `gold`/`items`/`equipment`, очистка битых `id` в слотах |
| `src/game/persistence/migrate.test.ts` | Новые кейсы нормализации |
| `src/game/persistence/schema.ts` | При **обратно совместимом** расширении оставить `SAVE_VERSION = 1`; при смене envelope — bump + ветка в `migrateFromUnknown` |
| `src/features/battle/BattleScreen.tsx` | Победа: `countOccupiedEquipmentSlots(state)` → сгенерировать массив длины N из `randomInt1to100()`, `FINALIZE_VICTORY { itemLevelRolls }` |
| `src/features/campaign/CampaignHub.tsx` (или `src/features/campaign/ShopPanel.tsx` + `EquipmentPanel.tsx`) | Магазин, инвентарь, слоты; `App.useApp()` для ошибок покупки |
| `src/game/rng.ts` | При необходимости хелпер для массива бросков (ESLint purity) |

**Идентификаторы предметов:** без новых зависимостей — `globalThis.crypto.randomUUID()` в рантайме; в тестах задавать `id` явно при создании экземпляров.

---

### Task 1: Типы и начальное состояние

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/campaign/runReducer.ts` (`initialCampaignState`)

- [ ] **Step 1:** Добавить `export type EquipmentSlot = 'weapon' | 'armor' | 'accessory'`, `ItemInstance`, расширить `CampaignState` полями `gold`, `items`, `equipment: Record<EquipmentSlot, string | null>`. Расширить `BattleAttemptSnapshot` теми же тремя полями (копии). Добавить в `BattleState` поле `gearCardLevelBonus: number`.

- [ ] **Step 2:** В `initialCampaignState` задать `gold: 0`, `items: []`, `equipment: { weapon: null, armor: null, accessory: null }`.

- [ ] **Step 3:** `npm run test` — ожидаются ошибки компиляции в местах, где создают `BattleState` / `CampaignState` без новых полей; исправить **минимально** (следующие задачи добьют логику).

- [ ] **Step 4:** Commit  
`git add src/game/types.ts src/game/campaign/runReducer.ts …`  
`git commit -m "feat(types): campaign gold items equipment and battle gearCardLevelBonus"`

---

### Task 2: Порядок слотов и агрегаты бонусов (TDD)

**Files:**
- Create: `src/game/equipment/equipmentOrder.ts`
- Create: `src/game/equipment/aggregates.ts`
- Create: `src/game/equipment/aggregates.test.ts`

- [ ] **Step 1:** `EQUIPMENT_ROLL_ORDER` как `readonly EquipmentSlot[]` в фиксированном порядке; функция `occupiedEquipmentSlotsInOrder(equipment): { slot: EquipmentSlot; itemId: string }[]` — обход в порядке массива, только не-`null`.

- [ ] **Step 2:** Падающие тесты: при двух надетых предметах с известными шаблонами/уровнях сумма HP-бонуса и card-бонуса совпадает с ручным расчётом; пустая экипировка → `0`.

- [ ] **Step 3:** Реализовать `aggregateGearHpBonus` и `aggregateGearCardLevelBonus(items, equipment, getTemplate)`.

- [ ] **Step 4:** `npm run test -- src/game/equipment/aggregates.test.ts` — PASS.

- [ ] **Step 5:** Commit `test(equipment): aggregates for hp and card level bonus`

---

### Task 3: Шаблоны предметов и награда золотом

**Files:**
- Create: `src/game/content/itemTemplates.ts`
- Create: `src/game/campaign/scenarioRewards.ts`
- Create: `src/game/campaign/scenarioRewards.test.ts`

- [ ] **Step 1:** Определить `ItemTemplate` с полями из спеки (`slot`, `shopPrice`, `hpBonusPerItemLevel`, `cardLevelBonusPerItemLevel`). Каталог из 3 шаблонов (по одному на слот), цены в духе 10/15/20 для MVP.

- [ ] **Step 2:** `goldForScenarioVictory(scenarioSlotIndex: number): number` — константа на слот или простая формула (например база + число врагов из `SCENARIOS[i].enemies.length`).

- [ ] **Step 3:** Тест на золото для индексов `0` и `2`.

- [ ] **Step 4:** Commit `feat(content): item templates and scenario gold rewards`

---

### Task 4: Снимок боя, герой, `gearCardLevelBonus`

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`snapshotFromCampaign`, `cloneItems`)
- Modify: `src/game/campaign/scenarios.ts` (`makeHero`, `battleStateFromScenario`)

- [ ] **Step 1:** Добавить `cloneItems` (глубокая копия массива предметов). Включить `gold`, `cloneItems(state.items)`, копию `equipment` в `snapshotFromCampaign`.

- [ ] **Step 2:** В `makeHero`: после `computeUnitStat` прибавить `aggregateGearHpBonus(...)` из снимка.

- [ ] **Step 3:** В `battleStateFromScenario` задать `gearCardLevelBonus: aggregateGearCardLevelBonus(...)`.

- [ ] **Step 4:** Обновить все фикстуры в тестах (`runReducer.test.ts`, `reducer.test.ts` и др.), где собирают `BattleState` / снимок — добавить `gearCardLevelBonus: 0` и новые поля снимка.

- [ ] **Step 5:** `npm run test` — все зелёные.

- [ ] **Step 6:** Commit `feat(campaign): snapshot and battle apply gear bonuses`

---

### Task 5: Урон карт с учётом снаряжения

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`tryUseCardAttack`)

- [ ] **Step 1:** Заменить вызов на  
`computeCardAttackDamage(tmpl, card.global_level + state.battle.gearCardLevelBonus)`  
(при отсутствии боя — уже есть guard).

- [ ] **Step 2:** Тест в `runReducer.test.ts` или отдельный: при ненулевом `gearCardLevelBonus` урон отличается от базового (зафиксировать ожидаемое число для одного шаблона и уровня).

- [ ] **Step 3:** Commit `feat(battle): card damage uses gear card level bonus`

---

### Task 6: RETRY и ABANDON восстанавливают экономику

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`RETRY_CURRENT_BATTLE`, `ABANDON_BATTLE`)

- [ ] **Step 1:** В ветке `RETRY_CURRENT_BATTLE` восстановить из `snap`: `gold`, `items: cloneItems(snap.items)`, `equipment: { ...snap.equipment }` (и обновить вложенный `battleAttemptSnapshot` теми же значениями).

- [ ] **Step 2:** В `ABANDON_BATTLE` то же для возврата в хаб.

- [ ] **Step 3:** Тест: купить предмет в хабе → начать бой → проиграть → `RETRY` — `gold`/`items` как в снимке (снимок создаётся при **входе** в бой; для проверки «покупка до входа» см. следующий тест).

- [ ] **Step 4:** Тест: в состоянии хаба с золотом купить предмет, начать бой (снимок без покупки если покупка после старта — уточнить сценарий). **Правильный сценарий спеки:** купили в хабе → вошли в бой → снимок содержит покупку → поражение → retry — откат к снимку с покупкой. Реализовать проверку через диспатчи в тесте.

- [ ] **Step 5:** Commit `fix(campaign): retry and abandon restore gold items equipment`

---

### Task 7: BUY_ITEM, EQUIP_ITEM, UNEQUIP_ITEM

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1:** Расширить `RunAction` тремя типами. В `applyRunAction`:  
  - **BUY_ITEM:** шаблон есть, `gold >= price` → новый `ItemInstance`, уникальный `id`, `itemLevel: 1`, минус цена. Иначе no-op.  
  - **EQUIP_ITEM:** проверки из спеки (идемпотентность, запрет «уже в другом слоте», совпадение слота и шаблона, замена в занятом слоте).  
  - **UNEQUIP_ITEM:** слот → `null`.

- [ ] **Step 2:** Тесты: покупка хватает / не хватает на 1; экип в пустой слот; замена в занятом; идемпотентный экип; попытка второго слота с тем же `itemId` — no-op; снятие.

- [ ] **Step 3:** Commit `feat(campaign): shop equip and unequip actions`

---

### Task 8: FINALIZE_VICTORY + itemLevelRolls + золото + уровни предметов

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Create: `src/game/memento/rollMementoLevelUp.ts` (опционально)
- Modify: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1:** Изменить тип: `{ type: 'FINALIZE_VICTORY'; itemLevelRolls: number[] }`.

- [ ] **Step 2:** В начале `finalizeVictory` (или обёртке):  
  `expected = occupiedEquipmentSlotsInOrder(state.equipment).length`  
  если `action.itemLevelRolls.length !== expected` → **return state** (полный no-op).

- [ ] **Step 3:** Иначе: начислить золото через `goldForScenarioVictory` от **текущего** сценария до инкремента: использовать `state.battleAttemptSnapshot?.scenarioSlotIndex ?? state.scenarioIndex` (согласовать с логикой «только что выигранный» слот — для обычной кампании это индекс активного сценария; для replay — слот из снимка).

- [ ] **Step 4:** Применить броски по порядку к копии `items`, обновить уровни через `rollCardLevelUp`/`rollMementoLevelUp`.

- [ ] **Step 5:** Смержить `worldPower`, `cards` из боя как сейчас + новые `items`, `gold`, `scenarioIndex`, очистить бой.

- [ ] **Step 6:** Тесты: неверная длина массива → состояние не меняется; верная длина + фиксированные броски → уровни выросли ожидаемо; пустая экипировка + `[]` → только золото и мерж.

- [ ] **Step 7:** Commit `feat(campaign): finalize victory with gold and item memento rolls`

---

### Task 9: UI победы и хаба

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx` и/или новые компоненты в `src/features/campaign/`

- [ ] **Step 1:** Импортировать хелпер подсчёта занятых слотов (или дублировать минимально из `equipmentOrder` только на клиенте — лучше импорт из `game`). При клике «продолжить»:  
  `const n = occupiedEquipmentSlotsInOrder(campaign.equipment).length`  
  `const rolls = Array.from({ length: n }, () => randomInt1to100())`  
  `dispatchRun({ type: 'FINALIZE_VICTORY', itemLevelRolls: rolls })`.

- [ ] **Step 2:** Хаб: блок «Золото», магазин (список из `ITEM_TEMPLATES`), инвентарь и три слота с селектами/кнопками → диспатчи.

- [ ] **Step 3:** Ручная проверка в браузере: покупка, экип, бой, победа, рост уровня/золота.

- [ ] **Step 4:** Commit `feat(ui): shop equipment panels and victory rng payload`

---

### Task 10: Персистенция

**Files:**
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

- [ ] **Step 1:** В `normalizeLoadedCampaign`: если нет `gold` → `0`; нет `items` → `[]`; нет или частичный `equipment` → полный объект с `null`; удалить из `equipment` ссылки на отсутствующие в `items` `id`.

- [ ] **Step 2:** Тест: сырой объект без новых полей после normalize имеет валидную форму; битый `id` в слоте сбрасывается.

- [ ] **Step 3:** Если меняется только наполнение `campaign` при том же `SAVE_VERSION`, **не** менять `STORAGE_KEY` без необходимости.

- [ ] **Step 4:** Commit `fix(persistence): normalize campaign gold items equipment`

---

### Task 11: Финальная верификация

- [ ] **Step 1:** `npm run test` — все тесты PASS.

- [ ] **Step 2:** `npm run build` — без ошибок.

- [ ] **Step 3:** `npm run lint` — без новых ошибок в изменённых файлах.

- [ ] **Step 4:** Commit при необходимости правок `chore: …` или оставить рабочее дерево чистым после предыдущих коммитов.

---

## Заметки по краевым случаям

- **Порядок бросков** строго `EQUIPMENT_ROLL_ORDER`; UI обязан генерировать столько бросков, сколько возвращает `occupiedEquipmentSlotsInOrder`.
- **Спека:** неверная длина `itemLevelRolls` — полный no-op; игрок не должен застревать, если UI всегда шлёт корректную длину.
- **`computeCardAttackDamage`:** сигнатуру можно не менять — передавать уже суммарный `levelForDamage`.

---

## Следующий шаг

Выполнение: @superpowers:subagent-driven-development или @superpowers:executing-plans по чеклисту выше.
