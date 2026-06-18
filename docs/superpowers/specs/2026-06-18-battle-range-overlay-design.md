# Дизайн: подсветка дальности и областей на поле боя

**Дата:** 2026-06-18  
**Статус:** утверждён (brainstorming)  
**Связь:** `src/features/battle/BattleScreen.tsx`, `src/game/battle/combat.ts`, `src/game/content/cardTemplates.ts`, `docs/superpowers/specs/2026-03-28-card-use-in-battle-design.md`

## 1. Цель

На экране боя визуально показывать **дальность хода**, **дальность атаки/каста**, **область поражения (AoE)** и **зоны угроз врагов**. Игрок видит «куда могу дойти», «куда достаёт выстрел», «кого заденет огненный шар» и «откуда враг может ударить» — без угадывания по тексту кнопок.

Для проверки AoE добавляется карта **«Огненный шар»** (дальность каста 3 клетки, область 3×3).

## 2. Принятые решения (brainstorming)

| Вопрос | Решение |
|--------|---------|
| AoE-таргетинг | Ground target (клик по клетке); single-target — клик по врагу как сейчас |
| Угрозы врагов | **A + B:** базовая карта угроз на ходе героя + усиленная зона при hover на врага |
| Подсветка действий героя | **C:** дальность каста/атаки сразу при выборе режима; AoE 3×3 и valid-target — на hover |
| Архитектура overlay | Чистая геометрия в `rangeOverlay.ts` + тонкий UI в `BattleScreen` |
| Friendly fire (AoE) | Да — герой может попасть под свой огненный шар |
| Автобой + AoE | Автобой не использует огненный шар в v1; overlay скрыт при автобое |

## 3. Визуальный язык

Полупрозрачные overlay поверх клетки; юниты и стены остаются читаемыми.

| Смысл | Когда | Цвет | Hex (alpha) |
|-------|-------|------|-------------|
| Дальность хода | Режим «Ход» | Голубой | `#91caff` ~35% |
| Дальность атаки/каста | Удар / выстрел / карта | Янтарный | `#ffd591` ~40% |
| Область поражения (AoE) | Hover по клетке в дальности каста | Красный | `#ff7875` ~45% |
| Достижимая цель | Hover на врага в range | Зелёный | `#b7eb8f` ~50% |
| Угроза врагов (база) | Ход героя, всегда | Бледно-красный | `#ffa39e` ~25% |
| Угроза врага (focus) | Hover на врага | Насыщенный | `#ff4d4f` ~35% |

**Наложение слоёв (bottom → top):** пол/стена → базовая угроза → focus-угроза → дальность героя → AoE preview → valid-target → юнит.

**Легенда** под сеткой: чипы «Ход», «Дальность», «Область», «Угроза» с соответствующими цветами.

Подсветка активна только когда: `phase === 'ongoing'`, ход героя, автобой выключен. На ходе врага overlay угроз скрыт.

## 4. Потоки взаимодействия

### 4.1 Ход

1. Выбрал «Ход» → сразу голубые 4 ортогональные свободные клетки.
2. Клик по голубой → `dispatchBattle({ type: 'move', ... })`.
3. Стены и занятые клетки не подсвечиваются.

### 4.2 Single-target (удар, выстрел, карта «Удар»)

1. Выбрал режим → янтарная дальность от позиции героя.
2. Hover на врага в range → зелёная подсветка.
3. Клик по врагу в range → атака (как сейчас).
4. Клик по пустой клетке в range → «Выберите врага».
5. Клик по врагу вне range → «Вне дальности».

| Режим | Дальность |
|-------|-----------|
| Удар (melee) | манхэттен = 1 |
| Выстрел (ranged) | манхэттен 1–6 |
| Карта `strike` | манхэттен = 1 |

### 4.3 AoE «Огненный шар»

1. Выбрал карту → янтарная дальность каста (манхэттен ≤ 3 от героя).
2. Hover по клетке в range → красный превью 3×3 с центром на клетке.
3. Клик по клетке в range → урон всем живым юнитам в 3×3.
4. Клик по врагу → трактуется как клик по клетке под врагом.
5. Клик вне range → «Вне дальности».

3×3 — квадрат с центром на выбранной клетке; клетки за bounds не рисуются в превью, урон по юнитам in bounds считается.

### 4.4 Угрозы врагов

Для каждого живого врага с текущей позиции:

- **Melee:** соседние клетки (манхэттен = 1).
- **Ranged:** манхэттен 1–8 (константы из `enemyCombat.ts`).

Базовый слой — объединение всех зон (бледно-красный). При hover на врага — только его зона (насыщеннее), остальные угрозы приглушены (~50% opacity).

## 5. Архитектура

### 5.1 Новый модуль `src/game/battle/rangeOverlay.ts`

Чистые функции:

```ts
type CellKey = string

function reachableMoveCells(state: BattleState, unitId: string): Set<CellKey>
function cellsInManhattanRange(
  ox: number, oy: number, maxRange: number,
  width: number, height: number,
  walls?: ReadonlySet<string>,
): Set<CellKey>
function cellsInAoE(cx: number, cy: number, aoeSize: number, width: number, height: number): Set<CellKey>
function aggregateEnemyThreatCells(state: BattleState): Set<CellKey>
function enemyThreatCells(state: BattleState, enemyId: string): Set<CellKey>
function validSingleTargetCells(
  state: BattleState, ox: number, oy: number,
  kind: 'melee' | 'ranged', maxRange: number,
): Set<CellKey>
function canCastAoEAt(
  hero: Unit, targetX: number, targetY: number, castRange: number,
): boolean
```

Тесты: `src/game/battle/rangeOverlay.test.ts`.

### 5.2 Константы врагов — `src/game/battle/enemyCombat.ts`

```ts
export const ENEMY_MELEE_DAMAGE = 4
export const ENEMY_RANGED_DAMAGE = 3
export const ENEMY_RANGED_MAX_RANGE = 8
```

Импорт из `enemyAi.ts` и `rangeOverlay.ts`.

### 5.3 Шаблоны карт

```ts
export type CardAttackTemplate = {
  label: string
  kind: 'melee' | 'ranged' | 'aoe'
  maxRange: number
  aoeSize?: number           // только для kind === 'aoe'
  damageToken?: string
  fallbackDamage: number
  emoji?: string
}
```

Новый шаблон:

```ts
fireball: {
  label: 'Огненный шар',
  kind: 'aoe',
  maxRange: 3,
  aoeSize: 3,
  damageToken: '50%%',
  fallbackDamage: 8,
  emoji: '🔥',
}
```

В `STARTER_CARDS` (`runReducer.ts`) — вторая карта `c2` с `templateId: 'fireball'`.

### 5.4 Действие рана `USE_CARD_AOE`

```ts
| {
    type: 'USE_CARD_AOE'
    cardId: string
    targetX: number
    targetY: number
    randomInt1to100: number
  }
```

Обработчик `tryUseCardAoE` — порядок проверок как у `USE_CARD_ATTACK`:

1. Бой ongoing, ход героя.
2. Карта и шаблон `kind === 'aoe'`.
3. `(targetX, targetY)` in bounds, не стена.
4. `canCastAoEAt(hero, targetX, targetY, tmpl.maxRange)`.
5. Только после валидации — `applyCardUse`, расчёт урона.
6. `applyAction` с `aoe_strike`.

`USE_CARD_ATTACK` для single-target без изменений.

### 5.5 Действие боя `aoe_strike`

```ts
| {
    type: 'aoe_strike'
    attackerId: string
    centerX: number
    centerY: number
    damage: number
    aoeSize: number
    fromCard?: { cardId: string; templateId: string }
  }
```

`tryAoEStrike` в `battle/reducer.ts`:

- Все живые юниты в `cellsInAoE(centerX, centerY, aoeSize)`.
- Урон каждому (friendly fire включён).
- Одна запись `battleLog` на каждую поражённую цель; `attackKind: 'aoe'`.
- Kill rewards и победа/поражение — как при серии ударов.
- Сдвиг очереди — один раз после всего AoE.

Расширить `BattleLogEntry.attackKind`: `'melee' | 'ranged' | 'aoe'`.

### 5.6 UI — `BattleScreen`

Локальный state:

```ts
hoverCell: { x: number; y: number } | null
hoveredEnemyId: string | null
selectedCardId: string | null   // при mode === 'card'
```

- **Per-card Radio.Group** — отдельная кнопка на каждую карту в бою.
- Рендер клетки: stacked overlay по слоям из §3.
- Hover: `onMouseEnter` / `onMouseLeave` на клетках; на юните-враге — `hoveredEnemyId`.
- Клик AoE → `dispatchRun({ type: 'USE_CARD_AOE', cardId, targetX, targetY, randomInt1to100 })`.
- При `autoBattleEnabled` — overlay не рисуется.

### 5.7 Тексты

`describeCardCombatStats` для `kind === 'aoe'`:

```
Дальний бой (область), дальность N клеток, область M×M
```

## 6. UI-чеклист (секция 4)

- [ ] Легенда под сеткой (4 чипа)
- [ ] Per-card выбор в Radio.Group
- [ ] Hover preview AoE 3×3
- [ ] Enemy threat base + focus on hover
- [ ] Cursor: pointer на интерактивных клетках, default на стенах
- [ ] Tooltip при hover на клетку в focus-зоне врага (опционально v1: через `title`)
- [ ] Overlay скрыт при автобое и на ходе врага

## 7. Тестирование

| Файл | Сценарии |
|------|----------|
| `rangeOverlay.test.ts` | move cells, manhattan disk, 3×3 AoE, threat union, enemy focus |
| `runReducer.test.ts` | `USE_CARD_AOE` valid/invalid, uses_count, multi-enemy hit |
| `reducer.test.ts` | `aoe_strike` multi-target, friendly fire, kill rewards, turn advance |
| `heroAi.test.ts` | регрессия: fireball не выбирается |

## 8. Объём v1 (YAGNI)

**Входит:** overlay, fireball, per-card UI, enemy threat A+B, тесты геометрии и AoE.

**Не входит:**

- Line of sight / блокировка луча
- Подтверждение AoE вторым кликом
- Автобой с AoE
- Pathfinding / multi-step move range
- Анимации взрыва

## 9. Риски

- **Перегрузка цветами:** легенда и полупрозрачность обязательны; при необходимости снизить opacity базовой угрозы.
- **BattleScreen размер:** геометрия вынесена в `rangeOverlay.ts`; при дальнейшем росте — хук `useBattleTargeting`.
- **Friendly fire:** игрок может случайно ранить себя; сообщение в журнале должно быть явным.

## 10. Следующий шаг

После ревью этого файла — план реализации (`writing-plans`) и пошаговая разработка.
