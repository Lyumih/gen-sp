# Дизайн: UX backlog по playtest fresh save

**Дата:** 2026-07-18  
**Статус:** утверждено (brainstorming)  
**Метод:** прохождение игры с чистым save в браузере + инспекция UI/a11y, без опоры на docs как источник приоритетов  
**Связь:** [newcomer-onboarding](./2026-06-24-newcomer-onboarding-design.md), [mvp-game-loop-closure](./2026-07-18-mvp-game-loop-closure-design.md), `AGENTS.md`

---

## 1. Цель

Устранить **фактическое трение UX** на пути fresh save → первая победа → магазин → экспедиция «Обучение» → graduation → первое испытание.

**Scope:** один PR, порядок реализации внутри PR — P0 → P1 → P2 (подход «onboarding spine first»).

**Не цель:** новые игровые системы, баланс, контент сценариев, backend.

---

## 2. Источник backlog (playtest)

| Наблюдение | Где проявилось |
|------------|----------------|
| Welcome modal на вкладке «Персонаж», CTA ведёт на «Бой» | Fresh save, первый экран |
| Guided hint «Нажмите Ход» при уже выбранном режиме move | Tutorial battle, step 1 |
| Подсветка reachable-клеток слабо читается; a11y — все клетки «·» | Tutorial battle, grid |
| Coach mark ссылается на удалённую «Секцию Скоро» | `coachMarks.ts` `expedition-start` |
| Onboarding checklist без hint-текстов; «Компания» vs «Обучение» | Hub «Цели» |
| Две кнопки победы с одинаковым действием | `BattleScreen` victory Alert |
| Badge прогресса показывает id сценария (`tutorial`) | `buildBattleModeEntries` |
| Покупка → сундук → ручная экипировка без явного next step | Post-first-win shop flow |
| Memento debrief — плотный текст | `PostBattleDebriefModal` |
| Autobattle disabled без объяснения | Tutorial battle sidebar |
| Нет «Начать заново» | Только manual localStorage |
| Пустой character hub до первой покупки | Character tab, fresh save |
| «Завершить ход» не объяснён в tutorial | Guided steps |
| Post-graduation CTA к испытаниям | `TutorialCompleteModal` (scroll уже есть — проверить + coach) |

---

## 3. Приоритеты

### P0 — blockers первого часа

#### P0-1. Стартовая вкладка при onboarding

**Проблема:** `hubActiveTab` по умолчанию `'character'`; welcome говорит идти на «Бой».

**Решение:**

- В `gameStore`: начальный `hubActiveTab` = `'battle'`, если загруженный/initial campaign имеет активный onboarding (`isOnboardingActive`).
- `WelcomeModal.onStart`: оставить `MARK_ONBOARDING_STEP welcome_seen`; **не** переключать таб (уже на «Бой»).
- Skip onboarding (`SET_ONBOARDING_SKIP`): таб не менять.

**Файлы:** `src/store/gameStore.ts`, `src/features/campaign/CampaignHub.tsx` (при необходимости).

---

#### P0-2. Guided tutorial — copy step 1

**Проблема:** «Нажмите «Ход»» при pre-selected move mode.

**Решение:** в `GUIDED_TUTORIAL_STEPS[1]`:

```text
Выберите подсвеченную зелёную клетку ближе к врагу.
```

Move mode остаётся default; `allowedModes: ['move']` без изменений.

**Файлы:** `src/game/onboarding/guidedTutorial.ts`.

---

#### P0-3. Читаемость move-overlay в guided battle

**Проблема:** зелёная подсветка слабая; screen readers не различают клетки.

**Решение:**

1. **Visual (guided only):** класс `battle-cell--guided-move` на reachable-клетках; CSS: opacity overlay ~0.65, optional subtle pulse (respect `prefers-reduced-motion`).
2. **A11y:** `aria-label` на кнопках клеток:
   - reachable + move mode: `Ход: клетка (x+1, y+1)` (1-based для игрока)
   - empty: `Пустая клетка (x+1, y+1)`
   - wall: без изменений (🧱)
   - unit: существующий label

Константу guided overlay не дублировать глобально — только класс/pulse в guided context.

**Файлы:** `src/features/battle/BattleScreen.tsx`, `src/features/layout/game-layout.css` или `battle`-colocated css.

---

#### P0-4. Coach mark expedition-start

**Проблема:** текст «Секция «Скоро»» устарел.

**Решение:** заменить на:

```text
Нажмите плитку «Компания» в секции «Обучение», чтобы начать экспедицию.
```

**Файлы:** `src/game/onboarding/coachMarks.ts`.

---

#### P0-5. Onboarding checklist hints + naming

**Проблема:** нет подсказок у active step; label «экспедиция «Компания»» не совпадает с секцией «Обучение».

**Решение:**

- Расширить `OnboardingStepDef`:

```ts
type OnboardingStepDef = {
  id: OnboardingStepId
  label: string
  hint?: string
}
```

- Обновить `ONBOARDING_STEPS`:

| id | label | hint (active only) |
|----|-------|-------------------|
| `welcome_seen` | Ознакомиться с игрой | — |
| `first_battle_started` | Сыграть первый бой | Вкладка «Бой» → плитка «Компания» в «Обучение». |
| `first_battle_won` | Победить в обучающем бою | Победите орка в guided-бою. |
| `hub_after_first_win` | Узнать о прогрессе Memento | Прочитайте debrief после победы. |
| `shop_visited` | Заглянуть в магазин | Купите предмет и наденьте на героя. |
| `expedition_started` | Начать обучение (экспедиция) | Ещё 2 боя подряд; магазин временно закрыт. |
| `expedition_completed` | Завершить экспедицию | Пройдите оставшиеся бои «Компании». |

- `OnboardingChecklist`: рендер `hint` под active step (паттерн как `MilestoneChecklist`).

**Файлы:** `src/game/onboarding/steps.ts`, `src/features/onboarding/OnboardingChecklist.tsx`.

---

### P1 — post-win loop

#### P1-6. Victory Alert — одна CTA

**Проблема:** «Продолжить» и «Закончить» вызывают `finalizeVictoryToHub`.

**Решение:** оставить одну primary-кнопку «Продолжить в хаб».

**Файлы:** `src/features/battle/BattleScreen.tsx`.

---

#### P1-7. Человекочитаемые labels сценариев в badge

**Проблема:** badge `Бой 1 / 3 — tutorial`.

**Решение:**

- Новая функция `getScenarioDisplayLabel(scenarioId: string): string` в `src/game/campaign/scenarioLabels.ts`:

| id | label |
|----|-------|
| `tutorial` | Первая схватка |
| `two-front` | Два фронта |
| `boss-lite` | Босс |

- Fallback: `scenarioId`.
- `trainingBadge` в `buildBattleModeEntries.ts` использует display label.

**Тест:** unit на mapping + badge string.

**Файлы:** `src/game/campaign/scenarioLabels.ts`, `src/features/campaign/buildBattleModeEntries.ts`, `buildBattleModeEntries.test.ts`.

---

#### P1-8. Shop → equip next step

**Проблема:** после покупки в сундук игрок не знает следующий шаг.

**Решение:**

1. **Coach mark** `shop-equip-next` (новый id в `coachMarks.ts`):
   - Trigger: `shop_visited` completed, `!hasCompletedStep('shop_item_equipped')` — **новый optional step** или dismiss-on-equip без checklist entry.
   - Проще без нового step id: coach показывается после первой покупки item в onboarding (`pendingHubNotice` / flag `onboarding.pendingShopEquipHint` в UI-only zustand OR one-shot coach после `BUY_SHOP_OFFER` при onboarding).
   - **Выбранный вариант:** coach mark `shop-equip-next`, показывается в `CampaignHub` когда `shop_visited` && первая покупка item произошла (`hasCompletedStep('shop_first_item_bought')` — новый step, mark в `BUY_SHOP_OFFER` reducer при onboarding active).
   - Text: «Откройте «Сундук» или слот экипировки на «Персонаж» и наденьте предмет.»
   - Dismiss on equip (`EQUIP_ITEM`) или manual dismiss.

2. **Default destination в shop:** пока onboarding active && `!shop_visited`, default `'character'` в `ShopOffersGrid` popover (вместо `'chest'`).

**Новый onboarding step (optional, internal):** `shop_first_item_bought` — только для coach trigger, **не** показывать в checklist.

**Файлы:** `src/game/onboarding/types.ts`, `src/game/onboarding/coachMarks.ts`, `src/game/campaign/runReducer.ts`, `src/features/campaign/CampaignHub.tsx`, `src/features/inventory/ShopOffersGrid.tsx`.

---

#### P1-9. Memento debrief — компактный copy

**Проблема:** 6 bullets в `FIRST_VICTORY_DEBRIEF` / defeat debrief.

**Решение:** сократить до 3 строк в `copy.ts`:

**First victory:**

1. Вы получили золото. Прогресс сохранён автоматически.
2. Memento Mori: смерть усиливает героя и мир; использование — умения и шмот; победа — моды.
3. Дальше: магазин, затем экспедиция «Компания» (ещё 2 боя).

Footer: secondary link «Подробнее: Справка → Memento Mori» (переключение на help tab + anchor если есть).

**First defeat:** 2 строки + link на справку (без изменения retry flow).

**Файлы:** `src/game/onboarding/copy.ts`, `src/features/onboarding/PostBattleDebriefModal.tsx`.

---

#### P1-10. Autobattle disabled — пояснение

**Решение:** в `GuidedBattleOverlay`, если `guidedActive`, добавить `Typography.Text type="secondary"` под hint:

```text
Автобой отключён на время обучения.
```

**Файлы:** `src/features/onboarding/GuidedBattleOverlay.tsx`.

---

### P2 — polish

#### P2-11. «Начать заново»

**Решение:**

- Reducer action `RESET_CAMPAIGN`: state → `initialCampaignState()`, сброс `onboardingUi` в store.
- UI: «Справка» → блок «Данные игры» → кнопка «Начать заново» → `Modal.confirm` с предупреждением → dispatch + `localStorage.removeItem(STORAGE_KEY)` + reload optional (или hydrate).
- Не показывать во время `inBattle` / active expedition без confirm «прогресс боя потеряется».

**Файлы:** `src/game/campaign/runReducer.ts`, `src/features/help/CampaignHelpTab.tsx`, `src/store/gameStore.ts`.

---

#### P2-12. Упрощение пустого character hub в onboarding

**Условие:** `isOnboardingActive && !hasCompletedStep('shop_visited')`.

**Решение:** вместо 12 пустых слотов инвентаря — `Alert type="info"`: «Экипировка и предметы появятся после визита в магазин.» Grid скрыт.

**Файлы:** character hub layout (найти компонент с inventory grid на character tab).

---

#### P2-13. Guided step — «Завершить ход»

**Решение:** добавить step после melee intro (index 4 → сдвиг):

Новый step (index 4):

```text
Если ходить и бить больше нечем — нажмите «Завершить ход».
allowedModes: []  // только ack или auto-advance после end_turn
```

Либо `requiresAck: true` без блокировки modes — **выбрано:** step с `allowedModes: ['move','melee','card']` + hint без ack; auto-advance когда игрок нажал `end_turn` (detect в BattleScreen как для move steps).

**Файлы:** `src/game/onboarding/guidedTutorial.ts`, `src/features/battle/BattleScreen.tsx` (advance on end_turn).

---

#### P2-14. Post-graduation trials intro

**Решение:**

- Проверить `setHubBattleFocusSection('trials')` + `scrollIntoView` на `#hub-battle-mode-trials` — должно работать из `TutorialCompleteModal`.
- Добавить coach mark `trials-intro` (один раз после graduation, dismissible): «Испытания — основной режим после обучения. Выберите любую плитку.»
- Trigger: `graduated && !dismissedCoachMarkIds.includes('trials-intro') && activeTab === 'battle'`.

**Файлы:** `src/game/onboarding/coachMarks.ts`, `src/features/campaign/CampaignHub.tsx`.

---

## 4. Порядок реализации (внутри PR)

1. P0-1 … P0-5 (onboarding spine)
2. P1-6 … P1-10
3. P2-11 … P2-14
4. Manual playtest fresh save
5. Unit tests (см. §5)

---

## 5. Тестирование

| Область | Тест |
|---------|------|
| Scenario labels | `scenarioLabels.test.ts` |
| Training badge | `buildBattleModeEntries.test.ts` |
| Onboarding steps hints | snapshot/render `OnboardingChecklist` или steps structure test |
| RESET_CAMPAIGN | `runReducer.test.ts` |
| Guided steps count / end_turn advance | `guidedTutorial` + BattleScreen logic test if feasible |
| Coach mark copy | static string test optional |

**Manual checklist:**

- [ ] Fresh save → welcome на вкладке «Бой»
- [ ] Tutorial: видны зелёные клетки, hint без «Нажмите Ход»
- [ ] Победа → одна кнопка «Продолжить в хаб»
- [ ] Debrief компактный, link в справку
- [ ] Магазин: default «на персонажа», coach после покупки
- [ ] Экспедиция: coach без «Скоро»
- [ ] Graduation → scroll к испытаниям + coach
- [ ] «Начать заново» в справке

---

## 6. Явные non-goals

- Autobattle в tutorial
- Авто-экипировка после покупки
- Изменение боевого баланса tutorial
- Mobile-specific layout pass

---

## 7. Self-review (2026-07-18)

- [x] Нет TBD/TODO placeholders
- [x] P0/P1/P2 не противоречат mvp-game-loop-closure spec
- [x] Scope — один PR, реализуемо
- [x] P1-8: выбран вариант с internal step `shop_first_item_bought` (не в checklist)
- [x] P2-13: auto-advance on `end_turn`, не blocking ack
