# Card use in battle + `%%` — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В бою герой может применить карту по врагу: валидные проверки дистанции/очереди в ядре, урон от шаблона (число или `resolvePercentValue`), прогресс карты через `applyCardUse` + RNG; UI — режим «карта» и `dispatchRun`.

**Architecture:** Каталог шаблонов в `src/game/content/cardTemplates.ts`; чистая функция урона от шаблона и `global_level` (до использования); новое действие `RunAction` `USE_CARD_ATTACK` в `runReducer.ts`, которое после всех проверок обновляет `battle.playerCards`, затем делегирует в `applyAction` обычный `attack`. Порядок: **сначала** валидность хода и дистанции на **исходном** состоянии (без `applyCardUse`), **потом** прогресс карты и атака.

**Tech Stack:** TypeScript strict, Vitest, существующие модули `combat.ts`, `reducer.ts` (`getCurrentActorId`, `applyAction`), `memento/cardProgress.ts`, `memento/resolvePercentToken.ts`, Zustand store, React + Ant Design 6.

**Spec:** `docs/superpowers/specs/2026-03-28-card-use-in-battle-design.md`

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/content/cardTemplates.ts` | Тип `CardAttackTemplate`, `CARD_ATTACK_TEMPLATES`, `getCardAttackTemplate(templateId)` |
| `src/game/content/cardAttackDamage.ts` | `computeCardAttackDamage(template, level)` — токен → `resolvePercentValue`, иначе `fallbackDamage` |
| `src/game/content/cardAttackDamage.test.ts` | TDD для урона |
| `src/game/campaign/runReducer.ts` | `RunAction` + ветка `USE_CARD_ATTACK`, хелпер `applyUseCardAttack` (или логика inline) |
| `src/game/campaign/runReducer.test.ts` | Интеграционные кейсы use-card |
| `src/store/gameStore.ts` | Опционально `dispatchUseCardAttack` — thin wrapper; иначе только UI вызывает `dispatchRun` |
| `src/features/battle/BattleScreen.tsx` | Режим `card` / выбор карты, клик по врагу → `USE_CARD_ATTACK` с RNG |
| `src/game/rng.ts` | `randomInt1to100()` — RNG вне компонента (ESLint purity) |

**Статус:** реализовано (inline, март 2026). Задачи 1–3 и регрессия `npm run test` отмечены ниже.

---

### Task 1: Урон по шаблону (TDD)

**Files:**
- Create: `src/game/content/cardTemplates.ts`
- Create: `src/game/content/cardAttackDamage.ts`
- Create: `src/game/content/cardAttackDamage.test.ts`

- [x] **Step 1:** Добавить тип шаблона и каталог (минимум `strike` для `templateId` из `STARTER_CARDS`).

```ts
// cardTemplates.ts — суть интерфейса
export type CardAttackTemplate = {
  kind: 'melee' | 'ranged'
  maxRange: number // для melee можно дублировать 1 или не использовать в compute, но для ranged обязателен
  damageToken?: string
  fallbackDamage: number
}

export const CARD_ATTACK_TEMPLATES: Readonly<Record<string, CardAttackTemplate>> = {
  strike: { kind: 'melee', maxRange: 1, damageToken: '40%%', fallbackDamage: 5 },
}

export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId]
}
```

*Примечание:* для `melee` поле `maxRange` в шаблоне не используется в `combat` (дистанция всегда 1); можно задать `maxRange: 1` для единообразия.

- [x] **Step 2:** Написать падающий тест в `cardAttackDamage.test.ts`: при `damageToken: '40%%'` и `level === 100` ожидать `80` (спека §3.1); при отсутствии токена — `fallbackDamage`.

```ts
import { describe, it, expect } from 'vitest'
import { computeCardAttackDamage } from './cardAttackDamage'
import type { CardAttackTemplate } from './cardTemplates'

describe('computeCardAttackDamage', () => {
  it('uses resolvePercentValue for token 40%% at L=100', () => {
    const t: CardAttackTemplate = {
      kind: 'melee',
      maxRange: 1,
      damageToken: '40%%',
      fallbackDamage: 5,
    }
    expect(computeCardAttackDamage(t, 100)).toBe(80)
  })

  it('uses fallback when no token', () => {
    const t: CardAttackTemplate = {
      kind: 'melee',
      maxRange: 1,
      fallbackDamage: 7,
    }
    expect(computeCardAttackDamage(t, 50)).toBe(7)
  })
})
```

- [x] **Step 3:** `npm run test` — ожидается FAIL (нет экспорта / неверный результат).

- [x] **Step 4:** Реализовать `computeCardAttackDamage` в `cardAttackDamage.ts`:

```ts
import type { CardAttackTemplate } from './cardTemplates'
import { resolvePercentValue } from '../memento/resolvePercentToken'

export function computeCardAttackDamage(
  template: CardAttackTemplate,
  levelForDamage: number,
): number {
  if (template.damageToken !== undefined) {
    const v = resolvePercentValue(levelForDamage, template.damageToken)
    if (v !== null) return v
  }
  return template.fallbackDamage
}
```

- [x] **Step 5:** `npm run test` — ожидается PASS.

- [x] **Step 6:** Коммит

```bash
git add src/game/content/cardTemplates.ts src/game/content/cardAttackDamage.ts src/game/content/cardAttackDamage.test.ts
git commit -m "feat(game): card attack template and %% damage helper"
```

---

### Task 2: `USE_CARD_ATTACK` в `runReducer`

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

- [x] **Step 1:** Расширить union `RunAction`:

```ts
| {
    type: 'USE_CARD_ATTACK'
    cardId: string
    targetId: string
    randomInt1to100: number
  }
```

- [x] **Step 2:** Реализовать обработку (псевдокод для единого места правды):

```ts
import { getCurrentActorId } from '../battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { applyCardUse } from '../memento/cardProgress'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { computeCardAttackDamage } from '../content/cardAttackDamage'

// Внутри applyRunAction, case 'USE_CARD_ATTACK':
// 1. if (!state.battle || state.battle.phase !== 'ongoing') return state
// 2. const b = state.battle
// 3. if (getCurrentActorId(b) !== 'hero') return state
// 4. const hero = b.units.find(u => u.id === 'hero' && u.hp > 0); const target = b.units.find(u => u.id === action.targetId && u.side === 'enemy' && u.hp > 0)
//    if (!hero || !target) return state
// 5. const card = b.playerCards.find(c => c.id === action.cardId); if (!card) return state
// 6. const tmpl = getCardAttackTemplate(card.templateId); if (!tmpl) return state
// 7. if (tmpl.kind === 'melee' && !canMeleeAttack(hero, target)) return state
// 8. if (tmpl.kind === 'ranged' && !canRangedAttack(hero, target, tmpl.maxRange)) return state
// 9. const damage = computeCardAttackDamage(tmpl, card.global_level)
// 10. const used = applyCardUse(card, action.randomInt1to100)
// 11. const { leveledUp: _l, ...nextCard } = used
// 12. const playerCards = b.playerCards.map(c => c.id === card.id ? nextCard : c)
// 13. const bWithCards = { ...b, playerCards }
// 14. const attack: BattleAction = tmpl.kind === 'melee'
//       ? { type: 'attack', attackerId: 'hero', targetId: target.id, damage, kind: 'melee' }
//       : { type: 'attack', attackerId: 'hero', targetId: target.id, damage, kind: 'ranged', maxRange: tmpl.maxRange }
// 15. const nextBattle = applyAction(bWithCards, attack)
// 16. Далее как в BATTLE_DISPATCH: victory → finalizeVictory, defeat → phase defeat, иначе battle + phase battle
```

*Проверка типов:* `applyCardUse` возвращает объект с `leveledUp`; для `CardInstance` отбросить `leveledUp` через деструктуризацию (см. спек §7 дизайна).

- [x] **Step 3:** Тесты в `runReducer.test.ts`:

  - **Успех:** состояние с активным боем, ход героя (позиции как в существующих тестах — герой рядом с `e1`), `USE_CARD_ATTACK` с `randomInt1to100: 100` (гарантированный ап при подходящем уровне) или зафиксировать уровень карты 1 и любой `r` — ожидать `uses_count` увеличен на 1.
  - **Неверная дистанция:** герой далеко, `USE_CARD_ATTACK` (melee strike) — `playerCards` идентичны исходным (`uses_count` без изменений).
  - **Не ход героя:** `currentTurnIndex` на врага — no-op для карты.

- [x] **Step 4:** `npm run test` — все зелёные.

- [x] **Step 5:** Коммит

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(game): USE_CARD_ATTACK in run reducer"
```

---

### Task 3: Store и UI

**Files:**
- Modify: `src/store/gameStore.ts` (опционально)
- Modify: `src/features/battle/BattleScreen.tsx`

- [x] **Step 1:** В `BattleScreen` расширить `ActionMode`: `'move' | 'melee' | 'ranged' | 'card'`.

- [x] **Step 2:** В `Radio.Group` добавить режим «Карта (strike)» или список кнопок по `battle.playerCards` (v1: одна карта `c1` достаточно).

- [x] **Step 3:** В `onCellClick` для `mode === 'card'`: при клике на врага вызвать

```ts
dispatchRun({
  type: 'USE_CARD_ATTACK',
  cardId: 'c1', // или id выбранной карты
  targetId: target.id,
  randomInt1to100: randomInt1to100(), // из `src/game/rng.ts` (не `Math.random` в теле компонента)
})
```

Использовать существующий `dispatchRun` из `useGameStore`; при желании добавить в store тонкую обёртку `dispatchUseCardAttack` — не обязательно.

- [x] **Step 4:** После успешного использования опционально `message.success` — пропущено (YAGNI).

- [x] **Step 5:** `npm run build && npm run lint && npm run test`.

- [x] **Step 6:** Коммит

```bash
git add src/features/battle/BattleScreen.tsx src/game/rng.ts
git commit -m "feat(ui): card attack mode on battle screen"
```

---

## Проверка регрессии

- [x] `npm run test` / `npm run build` / `npm run lint` — пройдены.
- [x] Ручной прогон (рекомендуется при релизе): режим «Карта», соседний враг → HP и `uses_count` в хабе.

---

## Plan review (опционально)

При наличии субагента **plan-document-reviewer**: передать пути к этому плану и к спеке `2026-03-28-card-use-in-battle-design.md`; при замечаниях поправить план и повторить (до 3 итераций).

---

## Передача на исполнение

План сохранён в `docs/superpowers/plans/2026-03-28-card-use-in-battle.md`.

**Исполнение:** inline (задачи 1–3 сделаны, коммиты в истории репозитория).
