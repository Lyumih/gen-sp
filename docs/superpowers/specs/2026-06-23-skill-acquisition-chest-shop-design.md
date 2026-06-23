# Дизайн: добыча умений, сундук, магазин и UI состава

**Дата:** 2026-06-23  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-03-28-gen-game-design.md`, `docs/superpowers/specs/2026-06-23-content-tags-classes-design.md`, `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`, `docs/superpowers/specs/2026-06-18-shop-buy-quick-sell-design.md`, `src/game/campaign/runReducer.ts`, `src/game/config/modSlotMilestones.ts`, `src/features/campaign/CampaignShopTab.tsx`, `src/features/character/CharacterRosterView.tsx`

## 1. Цель

Ввести **редкую добычу умений** (бой + магазин), **общий сундук** кампании, переработать **магазин** (лимит слотов, обновление, состав отряда) и **вкладку персонажа** (сундук, облик в модалке, «Состав» вместо Roster). Убрать фиксированный стартовый пул `STARTER_CARDS`.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Архитектура сундука | **A:** `CampaignState.chest { items, unboundCards }` |
| Пул умений | Весь `CARD_ATTACK_TEMPLATES`, **кроме** `strike`; включая `enabled: false` |
| Стартовый герой | Только **`strike`** |
| Найм в таверне | **1 случайное** умение сразу в `character.cards` (без сундука); без `strike` |
| Дубликаты | **Разрешены** (разные персонажи, сундук) |
| Дроп после боя | **1 бросок** на `FINALIZE_VICTORY` → `chest.unboundCards` |
| Шанс дропа (prod / dev) | **1% / 10%** |
| Магазин: обновление | Кнопка за золото: **100 / 10** 💰 |
| Магазин: слоты | **5 предметов** + опциональный **6-й** слот умения |
| Шанс умения в магазине (prod / dev) | **3% / 50%** при обновлении |
| Цена умения в магазине (prod / dev) | **1000 / 100** 💰 |
| Покупка предмета | Назначение **сундук** (default) или **персонаж** |
| Покупка умения | Всегда в **сундук** |
| Предметы сундук ↔ персонаж | **В обе стороны**, если не надеты |
| Привязка умения | `BIND_CHEST_CARD` → `character.cards` **навсегда** |
| Миграция сейвов | **Жёсткая:** `SAVE_VERSION++`, персонажи по новым правилам, лишние карты → сундук |
| Порядок вкладок хаба | **Магазин** первым |
| Roster | Переименовать в **«Состав»** |
| Облик | **Modal** по кнопке-карандашу в строке состава; убрать из магазина и inline-профиля |

## 3. Конфиг

**Путь:** `src/game/config/skillAcquisition.ts`

```ts
export const SKILL_ACQUISITION = import.meta.env.DEV
  ? {
      battleDropChance: 0.1,
      shopSkillOfferChance: 0.5,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    }
  : {
      battleDropChance: 0.01,
      shopSkillOfferChance: 0.03,
      shopSkillPrice: 1000,
      shopRefreshCost: 100,
    }
```

Публичные хелперы (для тестов без `import.meta`):

- `rollBattleSkillDrop(rng: number): boolean` — `rng < battleDropChance`
- `rollShopSkillOffer(rng: number): boolean` — `rng < shopSkillOfferChance`
- `pickRandomSkillTemplateId(rng: () => number): string` — равномерно из пула без `strike`

## 4. Модель данных

### 4.1. Новые типы

```ts
type ShopOffer =
  | { kind: 'item'; templateId: string }
  | { kind: 'skill'; templateId: string }

type CampaignChest = {
  items: ItemInstance[]
  unboundCards: CardInstance[]
}
```

### 4.2. Расширение `CampaignState`

```ts
chest: CampaignChest
shopOffers: ShopOffer[] | null   // null до первой генерации
shopRefreshSeed: number          // для детерминизма в тестах
```

### 4.3. Удаление

- `STARTER_CARDS` и `mergeMissingStarterCards` (миграция заменяет)
- Покупка `BUY_ITEM` с немедленной записью только в персонажа — заменяется на `BUY_SHOP_OFFER`

## 5. Игровая логика

### 5.1. Создание персонажа

`createCharacter`: `cards: []`, `battleLoadout: [null, null]`.

`initialCampaignState`: стартовому герою одна карта `strike` (`global_level: 1`, `modSlots: []`), `battleLoadout: [strikeId, null]`.

### 5.2. Таверна — `HIRE_TAVERN_CANDIDATE`

После создания персонажа:

1. `templateId = pickRandomSkillTemplateId(rng)`
2. Добавить `CardInstance` в `character.cards`
3. Если loadout пуст — первый слот = новая карта
4. Codex: `skill:{templateId}`

### 5.3. Дроп после победы — `finalizeVictory`

После существующей логики наград:

1. `roll = seededRng(seed from battleAttemptId + 'skill-drop')`
2. Если `rollBattleSkillDrop(roll)` — создать карту уровня 1 → `chest.unboundCards`
3. Вернуть флаг `skillDropped?: { templateId }` для UI (через побочный результат или отдельное поле в state `lastSkillDrop` — **DECIDED:** поле `pendingSkillDropNotice: string | null` в кампании, сбрасывается при `MARK_SKILL_DROP_SEEN` или входе в хаб с показом message)

**Упрощение v1:** UI читает diff `chest.unboundCards.length` или reducer возвращает metadata — предпочтительно **`pendingHubNotice`** в state:

```ts
pendingHubNotice: { kind: 'skill_drop'; templateId: string } | null
```

### 5.4. Магазин — `REFRESH_SHOP { seed?: number }`

Условия: хаб, не expedition, `gold >= shopRefreshCost`.

1. Списать золото
2. Выбрать 5 уникальных `templateId` из `ITEM_TEMPLATES`
3. Отдельный ролл `shopSkillOfferChance` → при успехе append `{ kind: 'skill', templateId }`
4. `shopOffers = [...]`, обновить `shopRefreshSeed`

При первом открытии магазина с `shopOffers === null` — автоматический `REFRESH_SHOP` **бесплатно** (только первый раз за кампанию) **или** показать пустую сетку + кнопку обновить. **DECIDED:** бесплатная первая генерация при `shopOffers === null` (без списания золота).

### 5.5. Покупка — `BUY_SHOP_OFFER`

```ts
{
  type: 'BUY_SHOP_OFFER'
  offerIndex: number
  destination?: 'chest' | 'character'  // только для kind === 'item'
  characterId?: string
}
```

- **item:** цена `getItemTemplate(templateId).shopPrice`; default `destination: 'chest'`; при `character` — в `character.items`
- **skill:** цена `shopSkillPrice`; всегда `chest.unboundCards`; `destination` игнорируется
- Удалить offer по индексу; codex discovery для skill/item

### 5.6. Сундук

| Action | Поведение |
|--------|-----------|
| `MOVE_CHEST_ITEM_TO_CHARACTER` | `chest.items` → `character.items`; no-op если надет / нет в chest |
| `MOVE_CHARACTER_ITEM_TO_CHEST` | stash → chest; no-op если надет |
| `BIND_CHEST_CARD` | card из `unboundCards` → `character.cards`; удалить из chest; **необратимо** |
| `TRANSFER_ITEM` | Сохранить: прямой обмен stash ↔ stash между персонажами |

Предметы в сундуке **продаются** (`SELL_ITEM` расширить или `SELL_CHEST_ITEM`) — та же формула `floor(shopPrice * 0.5)`.

Умения в сундуке **не продаются** в v1.

### 5.7. Умения `enabled: false`

Можно получить, привязать к персонажу, видеть в коллекции и кодексе. В loadout и бой **нельзя** добавить, пока `template.enabled === false` (UI disabled + tooltip «Скоро»). Движок боя без изменений.

### 5.8. Expedition / бой

Все действия сундука, магазина, привязки — `assertHubActionAllowed` / `shopLocked` как сейчас.

## 6. Миграция (`SAVE_VERSION` 6 → 7)

1. `chest = { items: [], unboundCards: [] }`, `shopOffers = null`, `shopRefreshSeed = 0`, `pendingHubNotice = null`
2. Для каждого `character`:
   - Если `id === LEGACY_HERO_CHARACTER_ID`: оставить только карту с `templateId === 'strike'`; остальные → `chest.unboundCards` (сохранить `global_level`, `modSlots`, `uses_count`)
   - Иначе (нанятые): все `cards` → `chest.unboundCards`; добавить 1 случайное умение (детерминированный seed от `characterId`) в `character.cards`
3. Пересобрать `battleLoadout`: первый слот — `strike` или первая карта; второй — вторая карта или `null`
4. Снять экипировку, если `equipment` ссылается на отсутствующий item (существующее правило)

## 7. UI

### 7.1. Навигация

`TAB_ORDER`: `['shop', 'character', 'battle', 'tavern', 'codex', 'help']`.  
Дефолт `activeTab` в `CampaignHub`: `'shop'` (когда не в бою).

### 7.2. Магазин (`CampaignShopTab`)

Секции сверху вниз:

1. Заголовок «Магазин» + `Button` «Обновить ({shopRefreshCost} 💰)»
2. Сетка товаров (5 + skill)
3. **Состав** — переключатель персонажа (`shopSelectedCharacterId`)
4. Компактный профиль: имя, `StatStrip`, `EquipmentSlotRow` (3 ячейки), краткий список карт
5. **Инвентарь** выбранного персонажа (stash)
6. **Сундук** (предметы + unbound cards)

Убрать `HeroAppearanceEditor` / полный профиль с обликом.

**Покупка предмета:** popover → «Купить» + `Radio`: Сундук (default) / Персонаж.

**DnD:** chest ↔ character stash; card из chest → drop на строку состава = bind.

### 7.3. Персонаж (`CampaignCharacterTab`)

- `CharacterRosterView`: заголовок **«Состав»**; кнопка `EditOutlined` → `Modal` с `HeroAppearanceEditor`
- Убрать inline облик из `HeroProfileContent` на этой вкладке
- Секция **«Сундук»** под инвентарём (та же компонентная база, что в магазине)
- Заголовки с `{selectedCharacter.name}` — при смене персонажа обновляются

### 7.4. Компоненты

| Компонент | Назначение |
|-----------|------------|
| `ChestInventoryView` | Сетка сундука (items + unbound cards) |
| `EquipmentSlotRow` | 3 compact `InventoryCell` для weapon/armor/accessory |
| `ShopOffersGrid` | 5+1 слотов магазина |
| `SquadCharacterPicker` | Переключатель персонажа в магазине |

Переиспользовать `InventoryCell`, `InventoryGrid`, `ItemPopoverActions`.

### 7.5. Уведомления

При `pendingHubNotice.kind === 'skill_drop'` — `App.useApp().message.success` при монтировании хаба / смене на вкладку магазина.

## 8. Reducer actions (сводка)

| Action | Новый / изменён |
|--------|-----------------|
| `REFRESH_SHOP` | новый |
| `BUY_SHOP_OFFER` | новый (заменяет прямой `BUY_ITEM` из UI магазина) |
| `MOVE_CHEST_ITEM_TO_CHARACTER` | новый |
| `MOVE_CHARACTER_ITEM_TO_CHEST` | новый |
| `BIND_CHEST_CARD` | новый |
| `SELL_CHEST_ITEM` | новый |
| `MARK_HUB_NOTICE_SEEN` | новый |
| `HIRE_TAVERN_CANDIDATE` | изменён (+ random skill) |
| `FINALIZE_VICTORY` | изменён (+ skill drop roll) |
| `BUY_ITEM` | оставить для обратной совместимости или deprecate |

## 9. Тесты

### 9.1. Unit — `skillAcquisition.ts`

- prod vs dev константы (mock `import.meta.env.DEV` или тестировать хелперы с явными параметрами)
- `pickRandomSkillTemplateId` никогда не возвращает `strike`
- границы шансов 0 и 1

### 9.2. Reducer — `runReducer.test.ts`

- `REFRESH_SHOP`: 5 items, seed determinism, skill slot probability (mock rng)
- `BUY_SHOP_OFFER`: chest vs character destination; skill always chest; gold deduction
- `BIND_CHEST_CARD`: card moves, cannot re-bind to chest
- `MOVE_*_CHEST_*`: bidirectional; no-op when equipped
- `FINALIZE_VICTORY`: drop at seeded threshold
- `HIRE_TAVERN_CANDIDATE`: exactly 1 card, not strike
- `initialCampaignState`: only strike on hero

### 9.3. Migration — `migrate.test.ts`

- v6 → v7: hero keeps strike only; extra cards in chest
- hired character: cards to chest + 1 new random

### 9.4. UI smoke (опционально)

- `CampaignHubNav.test.ts`: shop first in order
- `CharacterRosterView`: label «Состав»

## 10. Граничные случаи

| Ситуация | Поведение |
|----------|-----------|
| Покупка без золота | no-op, `message.warning` |
| Bind во время expedition | disabled |
| Перемещение надетого предмета | no-op |
| Пустой loadout у нанятого (только 1 скилл) | 1 слот занят, второй null |
| Умение `enabled: false` в коллекции | в loadout нельзя |
| Продажа из сундука | как stash sell |
| `shopOffers` после покупки последнего слота | пустая сетка, кнопка обновить |
| Имя персонажа при переключении в магазине | локальный `shopSelectedCharacterId` синхронизирован с UI |

## 11. Вне scope (v1)

- Продажа умений
- Реролл оффера умения в магазине за золото
- Класс-эксклюзивные пулы
- Автоматическая привязка дропа к персонажу

## 12. Порядок реализации (для плана)

1. Конфиг + типы + миграция
2. Reducer: chest, shop, bind, drop, tavern
3. `ChestInventoryView`, `EquipmentSlotRow`, shop grid
4. `CampaignShopTab` rework
5. `CampaignCharacterTab` + состав + modal облика
6. Hub nav order + help/codex статьи
