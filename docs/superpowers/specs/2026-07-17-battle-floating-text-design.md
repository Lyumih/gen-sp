# Всплывающий боевой текст (floating combat numbers)

**Дата:** 2026-07-17  
**Статус:** утверждено после brainstorming  
**Связь:** `AGENTS.md`, `2026-07-17-battle-animations-design.md`, `src/features/battle/animation/`, `src/features/battle/BattleScreen.tsx`, `src/game/ui/labels.ts`

---

## 1. Цель

Показывать **компактные всплывающие значения** над героем, врагом и клеткой при уроне, исцелении, тиках статусов и наложении бафов/дебафов — в формате **число + emoji** (вариант B из brainstorming).

Дополнительно: **замедлить ходы врага** (вариант A) — AI не действует, пока не доиграет очередь анимаций текущего действия, затем пауза «думания» 350 ms.

---

## 2. Решения заказчика (brainstorming)

| Тема | Решение |
|------|---------|
| Формат текста | **B** — `-12 💥`, `(7 🛡)`, `+8 ❤️`, emoji для статусов без числа |
| Темп врага | **A** — gating на `animationPlaying` + `ENEMY_ACTION_DELAY_MS = 350` |
| Реализация float | **Вариант 1** — float внутри существующих animation steps, без отдельного `float_text` step |
| Длительность чтения | `FLOAT_READ_MS = 700` — step duration = `max(presetMs, FLOAT_READ_MS)` для шагов с float |

---

## 3. Что всплывает

| Событие | AnimationStep / log | Текст | Позиция | Цвет / variant |
|---------|---------------------|-------|---------|----------------|
| Урон melee / ranged | `strike` → `strike_melee` / `projectile` | `-N 💥` | клетка цели | `--float-damage` `#cf1322` |
| Поглощение | `strike.absorbedDamage > 0` | `(N 🛡)` | та же клетка, stagger +100 ms | `--float-absorb` `#8c8c8c`, меньший шрифт |
| AoE урон | `strike` aoe → `aoe_burst` | `-N 💥` | клетка `targetId` (MVP: один float) | `--float-damage` |
| Хил | `heal` | `+N ❤️` | клетка цели | `--float-heal` `#389e0d` |
| Воскрешение | `resurrect` | `+N ❤️` | клетка цели | `--float-heal` |
| DoT tick | `status_tick` → `status_tick_dot` | `-N 💥` | клетка юнита | `--float-damage` |
| Regen tick | `status_tick` → `status_tick_regen` | `+N ❤️` | клетка юнита | `--float-heal` |
| Баф | `status_applied` buff → `buff_aura` | emoji статуса* | клетка юнита | `--float-buff` `#1677ff`; gold tint для holy |
| Дебаф | `status_applied` debuff → `debuff_aura` | emoji статуса* | клетка юнита | `--float-debuff` `#722ed1` |
| 0 урона (cast) | `strike` damage 0 | — | — | float не показываем |
| Move / death / proc | — | — | — | без float |

\* Карта emoji в `floatTextMap.ts` (с fallback по polarity из `statusAuraMap.ts`).

### 3.1. Карта emoji статусов (MVP)

| `statusKind` | Emoji |
|--------------|-------|
| `attack_up` | ⚔ |
| `defense_up`, `damage_reduction` | 🛡 |
| `card_damage_up` | 💥 |
| `regen` | 💚 |
| `elemental_resist` | ✨ |
| `dot` | 🔥 |
| `rooted` | ⛓ |
| `defense_down` | 🛡 |
| unknown buff | ✨ |
| unknown debuff | 💀 |

Использовать константы из `src/game/ui/labels.ts` где применимо (`UI_DAMAGE`, `UI_HEART`, `UI_DEFENSE`, `UI_HEAL`).

### 3.2. Stagger урон + поглощение

В одном strike-step два float-line:

```
-12 💥     ← delay 0 ms, drift вверх
  (7 🛡)   ← delay 100 ms, font-size 10px, offset right 8px
```

Оба живут в рамках одного step (700 ms).

---

## 4. Архитектура

### 4.1. Pipeline (без нового step kind)

```
battleLog delta
  → logToSteps (проброс absorbedDamage, statusKind)
  → AnimationQueue
  → presetRegistry (duration с учётом FLOAT_READ_MS)
  → BattleAnimationLayer
      → существующий flash/shake/projectile
      → FloatingCombatText (новый компонент)
```

**Reducer и `BattleLogEntry` не меняем** — `absorbedDamage` уже есть в `strike`.

### 4.2. Расширение `AnimationStep`

```ts
// Дополнения к существующим вариантам:
| { kind: 'strike_melee'; ...; damage: number; absorbedDamage?: number }
| { kind: 'projectile'; ...; damage: number; absorbedDamage?: number }
| { kind: 'aoe_burst'; center: Cell; cellKeys: readonly string[]; damage?: number; absorbedDamage?: number }
| { kind: 'resurrect'; ...; hp: number } // float: +hp ❤️
```

`logToSteps`: для `strike` с `attackKind === 'aoe'` пробрасывать `damage` и `absorbedDamage` в `aoe_burst`.

### 4.3. Новые модули

| Файл | Назначение |
|------|------------|
| `animation/floatTextMap.ts` | `statusKind → emoji`, `FloatVariant`, форматирование `-N 💥` / `+N ❤️` |
| `animation/FloatingCombatText.tsx` | Переиспользуемый overlay: `{ lines, cell }` |
| `animation/floatTextMap.test.ts` | Карта статусов, fallbacks |
| `animation/presetRegistry.test.ts` | Duration rules для float steps |

### 4.4. Изменяемые модули

| Файл | Изменение |
|------|------------|
| `animation/types.ts` | `absorbedDamage?` на strike steps |
| `animation/logToSteps.ts` | Проброс `absorbedDamage` из `strike` log |
| `animation/presetRegistry.ts` | `hasFloatText(step)`, `getPresetDurationMs` → max с `FLOAT_READ_MS` |
| `animation/BattleAnimationLayer.tsx` | Рендер `FloatingCombatText` для всех float-событий |
| `animation/battle-animation.css` | Обобщить heal-float → `.battle-anim--float`, модификаторы variant |
| `BattleScreen.tsx` | Enemy AI + auto-battle: `animationPlaying` gating |

### 4.5. `FloatingCombatText`

```tsx
type FloatLine = {
  text: string
  variant: 'damage' | 'heal' | 'absorb' | 'buff' | 'debuff'
  delayMs?: number
}

type FloatingCombatTextProps = {
  cell: Cell
  lines: readonly FloatLine[]
}
```

- Позиция: `cellCenterPx(cell)` + `translate(-50%, -50%)`
- `aria-hidden` — полная информация в журнале боя
- `pointer-events: none`

---

## 5. Тайминги

| Константа | Значение | Где |
|-----------|----------|-----|
| `FLOAT_READ_MS` | 700 | `presetRegistry.ts` |
| `FLOAT_ABSORB_STAGGER_MS` | 100 | `FloatingCombatText` / CSS |
| `ENEMY_ACTION_DELAY_MS` | 350 | `BattleScreen.tsx` (без изменения значения) |
| Flash CSS durations | 120–260 ms | без изменений — короткий удар |
| Float CSS animation | 700 ms | drift up ~20px, opacity 1→0 |

### 5.1. `getPresetDurationMs`

```ts
function hasFloatText(step: AnimationStep): boolean {
  switch (step.kind) {
    case 'strike_melee':
    case 'projectile':
      return step.damage > 0
    case 'heal':
    case 'resurrect':
    case 'status_tick_dot':
    case 'status_tick_regen':
    case 'buff_aura':
    case 'debuff_aura':
      return true
    case 'aoe_burst':
      return (step.damage ?? 0) > 0
    default:
      return false
  }
}

// duration = hasFloatText ? max(DURATIONS[kind], FLOAT_READ_MS) : DURATIONS[kind]
// reduced-motion → 0, float не рендерится
```

---

## 6. Gating AI (темп боя)

### 6.1. Enemy AI

Текущий `useEffect` (enemy turn) дополняется:

1. Если `animationPlaying` (`activeStep !== null || queueLength > 0`) — **не** запускать `runEnemyAi`.
2. Добавить `animationPlaying` в dependency array эффекта — при завершении очереди эффект перезапускается.
3. Когда очередь пуста — `setTimeout(runEnemyAi, ENEMY_ACTION_DELAY_MS)` (350 ms).

```
[анимации предыдущего действия] → [700 ms float] → [350 ms пауза] → ход врага
```

### 6.2. Auto-battle (player AI)

Аналогичный gating: не вызывать `pickPlayerAiAction`, пока `animationPlaying`. `HERO_AI_DELAY_MS = 2000` остаётся как дополнительная пауза после drain очереди.

### 6.3. Ход игрока (ручной)

- Dispatch **не** блокируется анимацией (косметика, как в `2026-07-17-battle-animations-design.md`).
- Кнопка «Завершить ход» — уже disabled при `animationPlaying`.

### 6.4. `prefers-reduced-motion`

- Все step durations → 0
- `FloatingCombatText` не рендерится
- Gating мгновенный

---

## 7. Отклонённые альтернативы

| Вариант | Почему отклонён |
|---------|-----------------|
| Отдельный step `float_text` в очереди | Удваивает длину очереди (220 ms flash + 700 ms float = 920 ms на hit) |
| Параллельный `FloatingTextPool` вне очереди | Второй lifecycle; враг может пойти до исчезновения float |
| Фиксированная задержка 700–900 ms вместо gating | Не масштабируется на multi-hit chains (lifesteal, AoE+debuff) |
| Текст без emoji (вариант A) | Заказчик выбрал B; emoji согласованы с AGENTS.md |

---

## 8. Вне scope (MVP)

- Crit-подсветка (`🎯`) — нет поля crit в `BattleLogEntry`
- Float для `mod_proc` / `passive_proc` / `card_level_up`
- Dodge / miss / block как отдельный float (0 dmg → cast без float)
- Multi-cell AoE floats (несколько целей в одном strike) — Phase 2 при расширении log
- Настройка скорости боя в UI
- Queue depth indicator «⏩ N»

---

## 9. Тестирование

### Unit

| Файл | Проверки |
|------|----------|
| `floatTextMap.test.ts` | Emoji для всех `UnitStatusKind`; unknown → buff/debuff fallback |
| `logToSteps.test.ts` | `absorbedDamage` пробрасывается в strike steps |
| `presetRegistry.test.ts` | Strike/heal → 700 ms; move → 280 ms; reduced-motion → 0 |

### Manual checklist

- [ ] Melee / ranged урон: `-N 💥` над целью
- [ ] Урон + поглощение: два числа со stagger
- [ ] Heal / regen tick: `+N ❤️`
- [ ] DoT tick: `-N 💥`
- [ ] Buff / debuff apply: emoji над юнитом
- [ ] Lifesteal chain: projectile float → heal float последовательно
- [ ] Enemy AI: ждёт float, затем 350 ms, затем ходит
- [ ] Auto-battle: не обгоняет анимации
- [ ] `prefers-reduced-motion`: без float, мгновенный drain
- [ ] Abandon battle mid-queue: без утечек таймеров

---

## 10. Следующий шаг

После ревью этого файла — план реализации (`writing-plans`) и пошаговая разработка.
