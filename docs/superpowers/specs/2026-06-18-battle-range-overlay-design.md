# Дизайн: подсветка дальности и областей на поле боя

**Дата:** 2026-06-18  
**Статус:** реализован (v1 + v2 amendment, коммит `f0865ba`)  
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
| Автобой + AoE (v1) | Не использовал огненный шар |
| **v2 amendment** | См. §11 — LOS, BFS-ход, подтверждение AoE, автобой с AoE, анимация |

## 3. Визуальный язык

Полупрозрачные overlay поверх клетки; юниты и стены остаются читаемыми.

| Смысл | Когда | Цвет | Hex (alpha) |
|-------|-------|------|-------------|
| Дальность хода | Режим «Ход» | Голубой | `#91caff` ~35% |
| Дальность атаки/каста | Удар / выстрел / карта | Янтарный | `#ffd591` ~40% |
| Область поражения (AoE) | Hover / pending AoE | Красный | `#ff7875` ~45% |
| Достижимая цель | Hover на врага в range | Зелёный | `#b7eb8f` ~50% |
| Угроза врагов (база) | Ход героя, всегда | Бледно-красный | `#ffa39e` ~25% |
| Угроза врага (focus) | Hover на врага | Насыщенный | `#ff4d4f` ~35% |
| Pending AoE (v2) | После 1-го клика | Inset border | `battle-cell-aoe-pending` |

**Рендер overlay (реализация):** один доминирующий цвет по приоритету (`cellOverlayStyle.ts`): valid-target > AoE > move > actionRange > threatFocus > threatDim > threatBase. Spec изначально описывал stacked layers; priority-режим принят для читаемости.

**Легенда** под сеткой: чипы «Ход», «Дальность», «Область», «Угроза».

Подсветка активна только когда: `phase === 'ongoing'`, ход героя, автобой выключен. На ходе врага overlay угроз скрыт.

## 4. Потоки взаимодействия

### 4.1 Ход (v2: BFS)

1. Выбрал «Ход (≤3 клетки)» → голубые все клетки, достижимые за ≤ `HERO_MOVE_RANGE` (3) ортогональных шагов (BFS, без прохода сквозь стены/юнитов).
2. Клик по голубой → `dispatchBattle({ type: 'move', ... })` — герой **телепортируется** на выбранную клетку за одно действие (путь не анимируется).
3. Стены, занятые клетки и недостижимые за 3 шага не подсвечиваются.

### 4.2 Single-target (удар, выстрел, карта «Удар»)

1. Выбрал режим → янтарная дальность от позиции героя (**с учётом LOS** для ranged).
2. Hover на врага в range + LOS → зелёная подсветка.
3. Клик по врагу в range → атака.
4. Клик по пустой клетке в range → «Выберите врага».
5. Клик по врагу вне range / за стеной → «Вне дальности» или «нет прямой видимости».

| Режим | Дальность |
|-------|-----------|
| Удар (melee) | манхэттен = 1 |
| Выстрел (ranged) | манхэттен 1–6 + LOS |
| Карта `strike` | манхэттен = 1 |

### 4.3 AoE «Огненный шар» (v2: confirm + анимация)

1. Выбрал карту → янтарная дальность каста (манхэттен ≤ 3 + **LOS** до центра).
2. Hover или pending → красный превью 3×3.
3. **1-й клик** по валидной клетке → `pendingAoeCell`, рамка, сообщение «Нажмите ещё раз для подтверждения».
4. **2-й клик** по той же клетке → `USE_CARD_AOE`, анимация взрыва 600 ms на клетках AoE.
5. Клик по врагу → трактуется как клик по клетке под врагом.
6. Клик вне range / без LOS → «Вне дальности или нет прямой видимости».

### 4.4 Угрозы врагов

Для каждого живого врага с текущей позиции:

- **Melee:** соседние клетки (манхэттен = 1).
- **Ranged:** манхэттен 1–8 + **LOS** (константы из `enemyCombat.ts`).

Базовый слой — объединение всех зон. При hover на врага — только его зона (насыщеннее), остальные приглушены.

## 5. Архитектура

### 5.1 `src/game/battle/rangeOverlay.ts`

Чистые функции геометрии и overlay. Ключевые экспорты:

- `reachableMoveCells(state, unitId, maxSteps?)` — BFS, default `HERO_MOVE_RANGE`
- `cellsInManhattanRange`, `cellsInAoE`
- `castRangeCells`, `attackRangeCells` — с фильтром LOS
- `validSingleTargetCells`, `aoeCastTargetCells`
- `canCastAoEAt(hero, tx, ty, castRange, walls?)`
- `aggregateEnemyThreatCells`, `enemyThreatCells`

Тесты: `rangeOverlay.test.ts`.

### 5.2 `src/game/battle/lineOfSight.ts` (v2)

Bresenham; **стены** на клетках между атакующим и целью блокируют луч. **Юниты не блокируют.**

Тесты: `lineOfSight.test.ts`.

### 5.3 `src/game/battle/enemyCombat.ts`

```ts
export const ENEMY_MELEE_DAMAGE = 4
export const ENEMY_RANGED_DAMAGE = 3
export const ENEMY_RANGED_MAX_RANGE = 8
```

### 5.4 `src/game/battle/combat.ts`

```ts
export const HERO_MOVE_RANGE = 3
// canRangedAttack(..., walls?) — опциональный LOS
```

### 5.5 Шаблоны карт, `USE_CARD_AOE`, `aoe_strike`

Без изменений от v1 (см. предыдущую версию spec). Валидация каста включает `walls` через `canCastAoEAt`.

### 5.6 UI — `BattleScreen`

Локальный state:

```ts
hoverCell, hoveredEnemyId, selectedCardId
pendingAoeCell          // v2
explosionCells          // v2
```

Файлы: `battleOverlayColors.ts`, `cellOverlayStyle.ts`, `battle.css`.

Автобой: dispatch `card_aoe` → `USE_CARD_AOE` (v2).

### 5.7 `heroAi.ts` (v2)

```ts
type HeroAiDecision =
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'card'; cardId: string; targetId: string }
  | { kind: 'card_aoe'; cardId: string; targetX: number; targetY: number }
  | null
```

Алгоритм AoE: перебор cast-клеток, score = суммарный урон врагам − 2× урон по себе; каст если score > лучшей single-target атаки.

## 6. UI-чеклист

- [x] Легенда под сеткой (4 чипа)
- [x] Per-card выбор в Radio.Group
- [x] Hover preview AoE 3×3 (+ pending preview v2)
- [x] Enemy threat base + focus on hover
- [x] Cursor: pointer / default на стенах
- [ ] Tooltip при hover на focus-зоне врага (отложено)
- [x] Overlay скрыт при автобое и на ходе врага
- [x] v2: double-click confirm AoE
- [x] v2: анимация взрыва

## 7. Тестирование

| Файл | Сценарии |
|------|----------|
| `lineOfSight.test.ts` | стена блокирует / не блокирует луч |
| `rangeOverlay.test.ts` | manhattan, AoE, BFS multi-step, threat, cast |
| `runReducer.test.ts` | `USE_CARD_AOE` valid/invalid |
| `reducer.test.ts` | `aoe_strike`, multi-step move |
| `heroAi.test.ts` | AoE не выбирается без целей; выбирается при кластере врагов |

**Статус:** 118 тестов pass (2026-06-18).

## 8. Объём v1 (реализован)

Overlay, fireball, per-card UI, enemy threat A+B, `aoe_strike`, `USE_CARD_AOE`, friendly fire, автобой **без** AoE (заменено v2).

## 9. Риски

- **Перегрузка цветами:** легенда и priority-цвета.
- **BattleScreen размер:** ~800 строк; при росте — `useBattleTargeting`.
- **Friendly fire + confirm:** двойной клик снижает случайные попадания.
- **BFS-ход:** телепорт за одно действие может удивить — подпись «≤3 клетки» на кнопке.

## 10. v2 amendment (2026-06-18, post-v1)

Добавлено по запросу после закрытия v1. Коммит: `f0865ba`.

| Фича | Решение |
|------|---------|
| Line of sight | Bresenham; стены блокируют; ranged/AoE cast/threat учитывают |
| Multi-step move | `HERO_MOVE_RANGE = 3`, BFS, один move-action на любую достижимую клетку |
| AoE confirm | 2-й клик по той же клетке; `pendingAoeCell` + CSS border |
| Автобой + AoE | `pickBestAoEAction`, `{ kind: 'card_aoe' }` |
| Анимация | `battle.css` — `.battle-cell-explosion`, 600 ms |

**Не входит (по-прежнему):**

- Юниты блокируют LOS
- Пошаговая анимация движения по пути
- Tooltip угроз (optional)

## 11. Следующий шаг

v1 + v2 **реализованы**. Plan: `docs/superpowers/plans/2026-06-18-battle-range-overlay.md` (status: complete). Дальнейшие улучшения — отдельный spec (tooltip угроз, анимация шагов, LOS через юнитов).
