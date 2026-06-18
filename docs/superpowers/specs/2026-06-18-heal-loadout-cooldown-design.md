# Дизайн: Исцеление, loadout карт и перезарядка

**Дата:** 2026-06-18  
**Статус:** утверждён (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-03-28-card-use-in-battle-design.md`, `docs/superpowers/specs/2026-06-18-hero-autobattle-design.md`, `docs/superpowers/specs/2026-06-18-inventory-grid-design.md`, `src/game/content/cardTemplates.ts`, `src/features/inventory/CardsInventoryView.tsx`

## 1. Цель

1. **Карта «Исцеление»** — лечит героя или союзника в радиусе 2 клеток (манхэттен + линия видимости).
2. **Loadout (2 слота)** — в бой попадают не все карты коллекции, а выбранные игроком; Исцеление есть в коллекции с первого боя, но по умолчанию не активно.
3. **Перезарядка в бою** — Огненный шар: 3 хода героя; Исцеление: 4 хода героя; Удар без перезарядки.

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Цели лечения | Герой + союзники (`side === 'player'`), не враги |
| Дистанция | Манхэттен ≤ 2, нужна LOS (стены блокируют) |
| Сила лечения | Токен `%%`, растёт с `global_level` (+ `gearCardLevelBonus`) |
| Полное HP | Нельзя выбрать; использование не тратится |
| Колода | Исцеление в `campaign.cards`, **не** в loadout по умолчанию |
| Loadout | 2 слота drag-and-drop; старт: `c1` Удар + `c2` Огненный шар |
| Автобой | Лечит **себя**, если HP < 50% maxHp и нет более выгодной атаки |
| CD — тик | Конец хода героя (после любого действия) |
| CD — scope | Только внутри боя; новый бой → все CD = 0 |
| CD — при использовании | Ставим полное значение; **в этот ход тик не идёт** |
| CD — значения | Огненный шар **3**, Исцеление **4**, Удар **0** (поле отсутствует) |
| Архитектура шаблонов | Расширить `CardAttackTemplate` полем `kind: 'heal'` (подход A) |
| Архитектура loadout | `battleLoadout: [string \| null, string \| null]` в `CampaignState` (подход A1) |

## 3. Объём v1 (YAGNI)

**Входит:**

- Шаблон `heal`, `computeCardHealAmount`, `USE_CARD_HEAL`, `BattleAction.heal`.
- Overlay и UI выбора цели лечения.
- Поле `cooldownTurns` в шаблонах; `cooldownRemaining` на картах в `BattleState`.
- UI бейдж CD в бою; loadout-слоты в `CardsInventoryView`.
- Миграция save; расширение `heroAi`; unit-тесты.

**Не входит:**

- Лечение союзников в автобое.
- CD между боями / в кампании.
- AoE-heal, MP, rename `CardAttackTemplate` → `CardAbilityTemplate`.

## 4. Шаблоны карт

### 4.1 Исцеление (новый)

```ts
heal: {
  label: 'Исцеление',
  kind: 'heal',
  maxRange: 2,
  healToken: '25%%',
  fallbackHeal: 6,
  cooldownTurns: 4,
  emoji: '💚',
}
```

### 4.2 Изменения существующих

- **Огненный шар:** добавить `cooldownTurns: 3`.
- **Удар:** поле `cooldownTurns` отсутствует (= 0).

### 4.3 Расширение типа шаблона

```ts
export type CardAttackTemplate = {
  label: string
  kind: 'melee' | 'ranged' | 'aoe' | 'heal'
  maxRange: number
  aoeSize?: number
  damageToken?: string
  fallbackDamage?: number
  healToken?: string
  fallbackHeal?: number
  cooldownTurns?: number
  emoji?: string
}
```

### 4.4 Расчёт лечения

```ts
computeCardHealAmount(template, card.global_level + battle.gearCardLevelBonus)
// healToken → resolvePercentValue ?? fallbackHeal
```

Уровень для формулы — **`global_level` до `applyCardUse`** (как у атаки).

## 5. Loadout

### 5.1 Состояние кампании

```ts
// CampaignState
battleLoadout: [string | null, string | null]  // card id; старт ['c1', 'c2']
```

### 5.2 Стартовые карты

```ts
export const STARTER_CARDS: CardInstance[] = [
  { id: 'c1', templateId: 'strike', ... },
  { id: 'c2', templateId: 'fireball', ... },
  { id: 'c3', templateId: 'heal', global_level: 1, uses_count: 0, modifications: [] },
]

export function initialCampaignState(): CampaignState {
  return {
    ...
    cards: cloneCards(STARTER_CARDS),
    battleLoadout: ['c1', 'c2'],
  }
}
```

### 5.3 Старт боя

При `START_OR_CONTINUE_BATTLE` / создании боя в `scenarios.ts`:

```ts
playerCards = battleLoadout
  .filter((id): id is string => id !== null)
  .map((id) => cards.find((c) => c.id === id))
  .filter(Boolean)
  .map((c) => ({ ...cloneCard(c), cooldownRemaining: 0 }))
```

Коллекция `campaign.cards` — все карты. В бою — только loadout.

### 5.4 RunAction

```ts
{ type: 'SET_BATTLE_LOADOUT'; slotIndex: 0 | 1; cardId: string | null }
```

- Один `cardId` — максимум в одном слоте.
- Swap при drag между слотами.
- В бою (`inBattle`) — disabled.

## 6. Перезарядка

### 6.1 Поле в бою

На каждой карте в `BattleState.playerCards`:

```ts
type BattleCardInstance = CardInstance & { cooldownRemaining: number }
```

Поле **не** входит в `CardInstance` кампании и **не** сохраняется в localStorage.

### 6.2 Правила

| Событие | Поведение |
|---------|-----------|
| Старт боя | `cooldownRemaining = 0` |
| Использование карты с `cooldownTurns > 0` | `cooldownRemaining = cooldownTurns`; затем эффект и сдвиг очереди |
| Конец хода героя | Если `cooldownRemaining > 0` → `-1` (тик **не** в ход применения карты) |
| Карта на CD | Нельзя выбрать; `uses_count` не растёт |

**Пример (CD=3):** ход N — огненный шар → `cooldownRemaining = 3`; ходы N+1, N+2, N+3 — тики → `2`, `1`, `0`; ход N+4 — снова доступен.

Тик CD — только при `phase === 'ongoing'`.

Проверка `cooldownRemaining === 0` обязательна во **всех** путях использования карты: `USE_CARD_ATTACK`, `USE_CARD_AOE`, `USE_CARD_HEAL` — до `applyCardUse`.

### 6.3 Место тика

Хелпер `tickHeroCardCooldowns(state: BattleState): BattleState` вызывается после завершения хода героя (в `advanceTurnFrom` или сразу после `applyAction`, когда актор был герой).

## 7. Механика лечения

### 7.1 Валидность цели

Цель — живой юнит `side === 'player'` с `hp < maxHp`:

- `manhattan(hero, target) <= template.maxRange` (2);
- `hasLineOfSight(hero.x, hero.y, target.x, target.y, walls)` — для дистанции 0 (сам герой) LOS не проверяется.

### 7.2 RunAction

```ts
{ type: 'USE_CARD_HEAL'; cardId: string; targetId: string; randomInt1to100: number }
```

### 7.3 BattleAction

```ts
{
  type: 'heal'
  healerId: string
  targetId: string
  amount: number
  fromCard?: { cardId: string; templateId: string }
}
```

### 7.4 Порядок в `tryUseCardHeal`

1. `battle.phase === 'ongoing'`, ход героя.
2. Карта в `playerCards`, шаблон `kind === 'heal'`.
3. `cooldownRemaining === 0`.
4. Цель валидна (союзник, range, LOS, `hp < maxHp`).
5. `applyCardUse` → обновить `playerCards`.
6. `applyAction(heal)` → `hp = min(maxHp, hp + amount)`.
7. При `leveledUp` — запись в `battleLog`.
8. Сдвиг очереди; тик CD **не** в этот ход.

При невалидном действии — **no-op**, `uses_count` без изменений (как у атаки).

### 7.5 BattleLog

```ts
{
  type: 'heal'
  healerId: string
  targetId: string
  amount: number
  fromCard?: { cardId: string; templateId: string }
}
```

Формат UI: `💚 Герой исцеляет Героя на 6 (Исцеление)`.

## 8. UI

### 8.1 Loadout в `CardsInventoryView`

```
┌─ В бой (2 слота) ─────────────┐
│  [c1 🃏]    [c2 🔥]           │
└───────────────────────────────┘
┌─ Коллекция ───────────────────┐
│  [c3 💚]  …                   │
└───────────────────────────────┘
```

- Drag коллекция → слот: `SET_BATTLE_LOADOUT`.
- Drag слот → коллекция: `cardId: null`.
- `modKillTarget` 🎯 — без изменений логики.

### 8.2 Бой — режим heal

- Overlay **зелёный** на `validHealTargetCells(state, hero)`.
- Клик по своей клетке — валидно.
- `describeCardCombatStats`: для `kind === 'heal'` — строки с 💚 и ожидаемым лечением.

### 8.3 Бейдж CD

- `cooldownRemaining > 0` → кнопка карты disabled, opacity 0.5, бейдж «CD N».
- Tooltip: «Перезарядка: N ход(ов) героя».
- В хабе CD не показывается.

### 8.4 Легенда overlay

Пункт «Лечение» (зелёный) при выбранной heal-карте.

## 9. Автобой

Расширить `HeroAiDecision`:

```ts
| { kind: 'card_heal'; cardId: string; targetId: string }
```

Алгоритм (после выбора цели атаки, перед атакой):

1. Если HP героя < 50% maxHp.
2. В loadout есть heal с `cooldownRemaining === 0`.
3. Герой — валидная цель лечения.
4. Нет более выгодной атаки (текущий приоритет: kill shot → карта → AoE → melee → ranged → move).

Иначе — существующий алгоритм. Союзников автобой **не** лечит (v1).

## 10. Миграция save

1. `mergeMissingStarterCards` — добавить `c3` (heal) в `cards`, battle snapshot.
2. Если нет `battleLoadout` → `['c1', 'c2']`.
3. `cooldownRemaining` — только runtime в `BattleState`.

## 11. Тестирование

| Уровень | Сценарий |
|---------|----------|
| `computeCardHealAmount` | `25%%` + fallback |
| `validHealTargetCells` | range, LOS, full HP excluded |
| `tryUseCardHeal` | HP↑, uses_count+1, CD=4, turn advance |
| Guard | wrong turn / CD>0 / full HP / enemy target → no-op |
| CD tick | use → CD=4, no tick same turn; 4 hero turns → CD=0 |
| Fireball CD | CD=3, three full hero turns wait |
| Loadout | only 2 cards in battle; c3 not default |
| `SET_BATTLE_LOADOUT` | swap, duplicate forbidden |
| `heroAi` | HP<50% → heal; else attack |
| Migration | old save → c3 + battleLoadout |
| Regression | strike without CD unchanged |

## 12. Новые/изменённые файлы

```
src/game/content/cardTemplates.ts
src/game/content/cardHealAmount.ts
src/game/battle/reducer.ts
src/game/battle/rangeOverlay.ts
src/game/campaign/runReducer.ts
src/game/types.ts
src/game/persistence/migrate.ts
src/features/battle/BattleScreen.tsx
src/features/battle/heroAi.ts
src/features/inventory/CardsInventoryView.tsx
src/game/descriptions/cardText.ts
src/game/battle/battleLog.ts
```

## 13. Риски

| Риск | Митигация |
|------|-----------|
| `CardAttackTemplate` — неточное имя | v1 оставляем; rename отдельно |
| CD-тик при победе/поражении | Тик только при `phase === 'ongoing'` |
| Битый id в loadout | Фильтровать при старте боя |
| Merge карт после победы | `cooldownRemaining` не переносить в кампанию |

## 14. Следующий шаг

После ревью этого файла — план реализации (`writing-plans`) и пошаговая разработка.
