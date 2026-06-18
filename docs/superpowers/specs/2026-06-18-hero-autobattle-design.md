# Дизайн: автобой героя

**Дата:** 2026-06-18  
**Статус:** утверждён  
**Связь:** `src/features/battle/enemyAi.ts`, `src/features/battle/BattleScreen.tsx`, `docs/superpowers/specs/2026-03-28-card-use-in-battle-design.md`

## 1. Цель

Кнопка **«Автобой»** на экране боя: при включении герой автоматически выполняет ходы по простому алгоритму. Игрок может выключить автобой в любой момент и вернуться к ручному управлению со следующего хода.

## 2. Принятые решения (brainstorming)

| Вопрос | Решение |
|--------|---------|
| UX | Автопилот на ходах героя; выключение toggle → ручной контроль |
| Выбор цели | Ближайший враг; если кого-то можно добить одним ударом — приоритет ему |
| Выбор карты | Максимальный урон в текущей ситуации; при равенстве — карта с 🎯 (`modKillTargetCardId`) |
| Персистентность | Только сессия (вкладка открыта), **не** в save кампании |
| Задержка перед ходом | **2000 ms** (2 секунды) |

## 3. Объём v1 (YAGNI)

**Входит:**

- Toggle «Автобой» в `BattleScreen`.
- Чистая функция `pickHeroAiAction` — один шаг ИИ за вызов.
- Сессионный флаг `autoBattleEnabled` в `useGameStore` (вне `campaign`, не попадает в localStorage).
- `useEffect` на ход героя: delay 2000 ms → выбор действия → dispatch.
- При ON: Radio.Group действий героя disabled.
- Unit-тесты алгоритма выбора цели и действия.

**Не входит:**

- Pathfinding (A*); движение — greedy один шаг, как у `enemyAi`.
- Автобой / ускорение ходов врагов.
- Настройки стратегии (агрессия, осторожность).
- Сохранение автобоя в save.
- Лечение, баффы, AoE-карты.

## 4. Архитектура

### 4.1 Подход

**Зеркало `enemyAi.ts`** (реcommended): отдельный модуль `heroAi.ts`, UI только триггерит и диспатчит. Альтернативы (единый `pickActorAction`, действие `AUTO_HERO_TURN` в reducer) отклонены как преждевременная абстракция или смешение слоёв.

### 4.2 Новые файлы

```
src/features/battle/heroAi.ts
src/features/battle/heroAi.test.ts
```

### 4.3 Тип результата

Карта атакует через `USE_CARD_ATTACK` (RunAction), базовые действия — через `BattleAction`. Функция возвращает:

```ts
type HeroAiDecision =
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'card'; cardId: string; targetId: string }
  | null
```

UI:

- `{ kind: 'battle' }` → `dispatchBattle(action)`
- `{ kind: 'card' }` → `dispatchRun({ type: 'USE_CARD_ATTACK', cardId, targetId, randomInt1to100 })`
- `null` → ничего (герой «застрял»)

### 4.4 Сессионное состояние

Расширить `GameStoreState`:

```ts
autoBattleEnabled: boolean
setAutoBattleEnabled: (enabled: boolean) => void
```

Начальное значение `false`. Поле **не** входит в `CampaignState` и **не** сохраняется подпиской на localStorage (сохраняется только `campaign`).

## 5. Алгоритм одного хода

```
1. Проверки: battle.phase === 'ongoing', getCurrentActorId === 'hero', герой жив
2. Цель среди живых врагов (side === 'enemy', hp > 0):
   a. Kill shot: враг, которого можно убить лучшим доступным действием
      (лучшая карта в range → базовая melee → базовая ranged)
   b. Иначе — ближайший по манхэттену; при равной дистанции — меньший HP
3. Действие по приоритету (для выбранной цели):
   a. Карта: среди карт в range — макс. computeCardAttackDamage;
      tie-break → modKillTargetCardId
   b. Базовая melee (canMeleeAttack, HERO_BASIC_MELEE_DAMAGE)
   c. Базовая ranged (canRangedAttack, HERO_BASIC_RANGED_MAX_RANGE)
   d. Move: один ортогональный шаг, минимизирующий манхэттен до цели
      (логика как в enemyAi: ORTHO_DELTAS, стены, занятые клетки)
4. null — нет допустимого хода
```

### 5.1 Kill shot detection

Для каждого врага `maxAvailableDamage(hero, enemy, playerCards, gearCardLevelBonus)`:

- перебор `playerCards` с шаблоном: если в range — `computeCardAttackDamage`
- иначе если adjacent — `HERO_BASIC_MELEE_DAMAGE`
- иначе если в ranged range — `HERO_BASIC_RANGED_DAMAGE`

Если `damage >= enemy.hp` — кандидат. Среди kill-shot кандидатов — ближайший; при равной дистанции — меньший HP.

### 5.2 Константы

Переиспользовать из `src/game/battle/combat.ts`:

- `HERO_BASIC_MELEE_DAMAGE` (5)
- `HERO_BASIC_RANGED_DAMAGE` (4)
- `HERO_BASIC_RANGED_MAX_RANGE` (6)

## 6. UI

### 6.1 Toggle

- Расположение: блок «Действия героя», над или рядом с Radio.Group.
- Компонент: `Switch` с подписью «Автобой» (опционально `RobotOutlined`).
- ON: визуально активное состояние; Radio.Group disabled (`actionsDisabled || autoBattleEnabled`).

### 6.2 Авто-ход

```tsx
const HERO_AI_DELAY_MS = 2000

useEffect(() => {
  if (!autoBattleEnabled || !battle || battle.phase !== 'ongoing') return
  const actor = battle.units.find((u) => u.id === getCurrentActorId(battle))
  if (!actor || actor.side !== 'player') return
  const t = window.setTimeout(() => {
    const b = useGameStore.getState().campaign.battle
    if (!b || b.phase !== 'ongoing') return
    if (!useGameStore.getState().autoBattleEnabled) return
    const decision = pickHeroAiAction(b, campaign.modKillTargetCardId)
    if (!decision) return
    if (decision.kind === 'battle') {
      useGameStore.getState().dispatchBattle(decision.action)
    } else {
      useGameStore.getState().dispatchRun({
        type: 'USE_CARD_ATTACK',
        cardId: decision.cardId,
        targetId: decision.targetId,
        randomInt1to100: randomInt1to100(),
      })
    }
  }, HERO_AI_DELAY_MS)
  return () => window.clearTimeout(t)
}, [battle, autoBattleEnabled, ...])
```

Задержка **2000 ms** — осознанно больше, чем у врагов (350 ms), чтобы игрок успевал следить за ходами героя.

### 6.3 Взаимодействие с ручным режимом

- Выключение toggle в любой момент: текущий timeout отменяется (`clearTimeout`), следующий ход — ручной.
- Клики по сетке при ON не обрабатываются (действия disabled).

## 7. Тестирование

| Тест | Сценарий |
|------|----------|
| Kill shot | Добиваемый враг дальше, но с меньшим HP — выбирается он, не ближайший |
| Карта vs базовая | Карта в range с большим уроном — `{ kind: 'card' }` |
| Tie карты | Равный урон — выбирается `modKillTargetCardId` |
| Move | Нет атак в range — `{ kind: 'battle', action: move }` к ближайшему |
| Guard | Не ход героя / нет врагов — `null` |
| Regression | `enemyAi`, `runReducer`, `battle/reducer` тесты без изменений |

RNG level-up карты в unit-тестах `heroAi` не проверяется — только выбор `cardId` и `targetId`.

## 8. Риски

- **Дублирование с enemyAi:** общий хелпер «лучший шаг к цели» можно вынести позже; v1 — допустимое копирование паттерна.
- **Застревание:** при окружении стенами `null`; UI молчит (как у врага без хода). Отдельное сообщение — не v1.
- **Два useEffect (герой + враг):** на ходе героя срабатывает только hero-effect; на ходе врага — enemy-effect. Конфликта нет.

## 9. Следующий шаг

После ревью этого файла — план реализации (`writing-plans`) и пошаговая разработка.
