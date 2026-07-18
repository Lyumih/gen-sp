# UX Playtest Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all P0–P2 UX fixes from fresh-save playtest so onboarding → graduation → first trial feels smooth.

**Architecture:** Single PR, spine-first order. Core changes in onboarding copy/selectors, battle guided overlay, hub coach marks, and one new reducer action (`RESET_CAMPAIGN`). Internal onboarding step `shop_first_item_bought` triggers shop coach but is excluded from checklist.

**Tech Stack:** React 19, Ant Design v6, Zustand, Vitest, TypeScript strict.

**Spec:** [2026-07-18-ux-playtest-backlog-design.md](../specs/2026-07-18-ux-playtest-backlog-design.md)

## Global Constraints

- One PR; implement P0 → P1 → P2 in order.
- Russian UI copy as specified in spec.
- Follow `AGENTS.md`: compact UI, `App.useApp()` for messages, no new dependencies.
- `shop_first_item_bought` in `OnboardingStepId` but **not** in `ONBOARDING_STEPS` array.
- Guided overlay pulse respects `prefers-reduced-motion`.
- Do not enable autobattle during guided tutorial.

---

## File map

| File | Responsibility |
|------|----------------|
| `src/store/gameStore.ts` | Initial `hubActiveTab`, `resetCampaign()` |
| `src/game/onboarding/guidedTutorial.ts` | Step copy + new end-turn step |
| `src/game/onboarding/steps.ts` | Hints on checklist steps |
| `src/game/onboarding/types.ts` | Add `shop_first_item_bought` |
| `src/game/onboarding/coachMarks.ts` | Fix expedition-start; add shop-equip-next, trials-intro |
| `src/game/onboarding/copy.ts` | Compact debrief copy + help link text |
| `src/game/campaign/scenarioLabels.ts` | **Create** display labels |
| `src/game/campaign/runReducer.ts` | `RESET_CAMPAIGN`, mark shop step on buy, dismiss coach trigger on equip |
| `src/features/onboarding/OnboardingChecklist.tsx` | Render hints |
| `src/features/onboarding/GuidedBattleOverlay.tsx` | Autobattle note |
| `src/features/onboarding/PostBattleDebriefModal.tsx` | Help link footer |
| `src/features/battle/BattleScreen.tsx` | Guided cells, aria-labels, victory CTA, end_turn advance |
| `src/features/layout/game-layout.css` | `.battle-cell--guided-move` pulse |
| `src/features/campaign/CampaignHub.tsx` | Welcome onStart, coach triggers |
| `src/features/campaign/buildBattleModeEntries.ts` | Use scenario display label |
| `src/features/inventory/ShopOffersGrid.tsx` | Default destination during onboarding |
| `src/features/character/hub/CharacterHubLayout.tsx` | Pre-shop empty state |
| `src/features/help/CampaignHelpTab.tsx` | Reset save UI |

---

### Task 1: Onboarding hub entry (P0-1, P0-4, P0-5)

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/game/onboarding/coachMarks.ts`
- Modify: `src/game/onboarding/steps.ts`
- Modify: `src/features/onboarding/OnboardingChecklist.tsx`
- Test: `src/game/onboarding/steps.test.ts` (create)

**Interfaces:**
- Produces: `isOnboardingActive` used for tab default; updated `ONBOARDING_STEPS` with optional `hint`; fixed coach text.

- [ ] **Step 1: Write failing test for step hints**

Create `src/game/onboarding/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ONBOARDING_STEPS } from './steps'

describe('ONBOARDING_STEPS', () => {
  it('first_battle_started has hint pointing to battle tab', () => {
    const step = ONBOARDING_STEPS.find((s) => s.id === 'first_battle_started')
    expect(step?.hint).toContain('Бой')
  })

  it('expedition_started label mentions обучение', () => {
    const step = ONBOARDING_STEPS.find((s) => s.id === 'expedition_started')
    expect(step?.label).toContain('обучение')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/onboarding/steps.test.ts`  
Expected: FAIL (hint undefined / label mismatch)

- [ ] **Step 3: Update steps.ts**

```ts
export type OnboardingStepDef = {
  id: OnboardingStepId
  label: string
  hint?: string
}

export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  { id: 'welcome_seen', label: 'Ознакомиться с игрой' },
  {
    id: 'first_battle_started',
    label: 'Сыграть первый бой',
    hint: 'Вкладка «Бой» → плитка «Компания» в «Обучение».',
  },
  {
    id: 'first_battle_won',
    label: 'Победить в обучающем бою',
    hint: 'Победите орка в guided-бою.',
  },
  {
    id: 'hub_after_first_win',
    label: 'Узнать о прогрессе Memento',
    hint: 'Прочитайте debrief после победы.',
  },
  {
    id: 'shop_visited',
    label: 'Заглянуть в магазин',
    hint: 'Купите предмет и наденьте на героя.',
  },
  {
    id: 'expedition_started',
    label: 'Начать обучение (экспедиция)',
    hint: 'Ещё 2 боя подряд; магазин временно закрыт.',
  },
  {
    id: 'expedition_completed',
    label: 'Завершить экспедицию',
    hint: 'Пройдите оставшиеся бои «Компании».',
  },
]
```

- [ ] **Step 4: Update OnboardingChecklist** (mirror `MilestoneChecklist` hint block under active step)

- [ ] **Step 5: Fix coachMarks expedition-start text**

```ts
text: 'Нажмите плитку «Компания» в секции «Обучение», чтобы начать экспедицию.',
```

- [ ] **Step 6: gameStore initial tab**

```ts
import { isOnboardingActive } from '../game/onboarding/selectors'

function initialHubTab(campaign: CampaignState): CampaignHubTab {
  return isOnboardingActive(campaign.onboarding) ? 'battle' : 'character'
}

// in create():
hubActiveTab: initialHubTab(readInitialCampaign()),
```

- [ ] **Step 7: CampaignHub Welcome onStart — remove setHubActiveTab**

```ts
onStart={() => {
  dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
}}
```

- [ ] **Step 8: Run tests — PASS**

Run: `npm run test -- src/game/onboarding/steps.test.ts`

- [ ] **Step 9: Commit**

```bash
git add src/game/onboarding/steps.ts src/game/onboarding/steps.test.ts \
  src/features/onboarding/OnboardingChecklist.tsx src/game/onboarding/coachMarks.ts \
  src/store/gameStore.ts src/features/campaign/CampaignHub.tsx
git commit -m "fix(onboarding): battle tab default, checklist hints, coach copy"
```

---

### Task 2: Guided tutorial copy and end-turn step (P0-2, P2-13, P1-10)

**Files:**
- Modify: `src/game/onboarding/guidedTutorial.ts`
- Modify: `src/features/onboarding/GuidedBattleOverlay.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`
- Test: `src/game/onboarding/guidedTutorial.test.ts` (create)

**Interfaces:**
- Produces: `GUIDED_TUTORIAL_STEPS` length 7; step index 4 = end-turn hint.

- [ ] **Step 1: Failing test — step count and copy**

```ts
import { describe, expect, it } from 'vitest'
import { GUIDED_TUTORIAL_STEPS } from './guidedTutorial'

describe('GUIDED_TUTORIAL_STEPS', () => {
  it('step 1 does not mention Ход button', () => {
    expect(GUIDED_TUTORIAL_STEPS[1]?.hint).not.toContain('«Ход»')
    expect(GUIDED_TUTORIAL_STEPS[1]?.hint).toContain('зелёную')
  })

  it('includes end turn step before repeat attacks', () => {
    expect(GUIDED_TUTORIAL_STEPS.some((s) => s.hint.includes('Завершить ход'))).toBe(true)
  })
})
```

- [ ] **Step 2: Update guidedTutorial.ts**

Replace step 1 hint; insert new step at index 4:

```ts
{
  hint: 'Если ходить и бить больше нечем — нажмите «Завершить ход».',
  allowedModes: ['move', 'melee', 'card'],
},
```

Shift former steps 4–5 → 5–6. Update step 1:

```ts
hint: 'Выберите подсвеченную зелёную клетку ближе к врагу.',
```

- [ ] **Step 3: GuidedBattleOverlay — autobattle note**

```tsx
<Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
  Автобой отключён на время обучения.
</Typography.Text>
```

- [ ] **Step 4: BattleScreen — advance on end_turn**

In guided `useEffect`, after melee strike advance (step 3→4), add:

```ts
if (
  guidedBattleStep === 4 &&
  lastLog?.type === 'end_turn' &&
  lastLog.unitId === player.id
) {
  setGuidedBattleStep(5)
}
```

Adjust subsequent step indices in existing conditions (3→melee, 4→was repeat attacks now end-turn, etc.): re-read all `guidedBattleStep === N` comparisons and bump by 1 for steps >= 4.

On `dispatchBattle({ type: 'end_turn' })` click handler, no extra work if log emits `end_turn`.

- [ ] **Step 5: Run tests PASS; commit**

```bash
git commit -m "fix(tutorial): guided copy, end-turn step, autobattle note"
```

---

### Task 3: Guided battle grid a11y and visual (P0-3)

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/layout/game-layout.css`

- [ ] **Step 1: Add CSS**

```css
@media (prefers-reduced-motion: no-preference) {
  .battle-cell--guided-move {
    animation: guided-move-pulse 1.2s ease-in-out infinite;
  }
}
@keyframes guided-move-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.9); }
  50% { box-shadow: 0 0 0 4px rgba(82, 196, 26, 0.5); }
}
```

- [ ] **Step 2: Empty cell button — class + aria-label**

When rendering empty cells:

```ts
const isGuidedMove =
  guidedActive && mode === 'move' && overlaySets.moveCells.has(k)
const cellClassName = `${...}${isGuidedMove ? ' battle-cell--guided-move' : ''}`
const ariaLabel = isGuidedMove
  ? `Ход: клетка (${x + 1}, ${y + 1})`
  : `Пустая клетка (${x + 1}, ${y + 1})`
```

Add `aria-label={ariaLabel}` to empty `<button>`.

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(battle): guided move cell pulse and aria labels"
```

---

### Task 4: Post-win battle and scenario labels (P1-6, P1-7)

**Files:**
- Create: `src/game/campaign/scenarioLabels.ts`
- Create: `src/game/campaign/scenarioLabels.test.ts`
- Modify: `src/features/campaign/buildBattleModeEntries.ts`
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/campaign/buildBattleModeEntries.test.ts`

- [ ] **Step 1: scenarioLabels.test.ts**

```ts
import { describe, expect, it } from 'vitest'
import { getScenarioDisplayLabel } from './scenarioLabels'

describe('getScenarioDisplayLabel', () => {
  it('maps tutorial ids', () => {
    expect(getScenarioDisplayLabel('tutorial')).toBe('Первая схватка')
    expect(getScenarioDisplayLabel('two-front')).toBe('Два фронта')
    expect(getScenarioDisplayLabel('boss-lite')).toBe('Босс')
  })

  it('falls back to id', () => {
    expect(getScenarioDisplayLabel('unknown')).toBe('unknown')
  })
})
```

- [ ] **Step 2: scenarioLabels.ts**

```ts
const SCENARIO_DISPLAY_LABELS: Record<string, string> = {
  tutorial: 'Первая схватка',
  'two-front': 'Два фронта',
  'boss-lite': 'Босс',
}

export function getScenarioDisplayLabel(scenarioId: string): string {
  return SCENARIO_DISPLAY_LABELS[scenarioId] ?? scenarioId
}
```

- [ ] **Step 3: buildBattleModeEntries — use getScenarioDisplayLabel**

- [ ] **Step 4: BattleScreen victory — single button**

Remove duplicate `<Button onClick={finalizeVictoryToHub}>Закончить</Button>`.  
Label primary: `Продолжить в хаб`.

- [ ] **Step 5: Extend buildBattleModeEntries.test.ts**

```ts
expect(entries[0]?.kind === 'chain' && entries[0].badge).toContain('Первая схватка')
```

- [ ] **Step 6: Run tests; commit**

---

### Task 5: Shop equip flow (P1-8)

**Files:**
- Modify: `src/game/onboarding/types.ts`
- Modify: `src/game/onboarding/coachMarks.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/inventory/ShopOffersGrid.tsx`
- Test: `src/game/campaign/runReducer.onboarding.test.ts`

**Interfaces:**
- Produces: `OnboardingStepId` includes `'shop_first_item_bought'`; coach id `'shop-equip-next'`.

- [ ] **Step 1: Add type**

```ts
| 'shop_first_item_bought'
```

- [ ] **Step 2: coachMarks entry**

```ts
{
  id: 'shop-equip-next',
  title: 'Наденьте предмет',
  text: 'Откройте «Сундук» или слот экипировки на «Персонаж» и наденьте предмет.',
},
```

- [ ] **Step 3: BUY_SHOP_OFFER — mark step when item bought during onboarding**

After successful item purchase:

```ts
let next = /* existing result */
if (isOnboardingActive(next.onboarding) && offer.kind === 'item') {
  next = {
    ...next,
    onboarding: completeStep(next.onboarding, 'shop_first_item_bought'),
  }
}
return next
```

- [ ] **Step 4: EQUIP_ITEM — optional: no step clear needed; coach dismissed manually or on equip via dismissCoachMark in UI**

In `CampaignHub`, extend `activeCoachId`:

```ts
if (
  hasCompletedStep(onboarding, 'shop_first_item_bought') &&
  (activeTab === 'character' || activeTab === 'shop')
) {
  return pick('shop-equip-next')
}
```

Priority: place after shop_visited branch, before expedition coach.

- [ ] **Step 5: ShopOffersGrid default destination**

```ts
const onboardingShopDefault =
  isOnboardingActive(campaign.onboarding) &&
  !hasCompletedStep(campaign.onboarding, 'shop_visited')
const [destination, setDestination] = useState<'chest' | 'character'>(
  onboardingShopDefault ? 'character' : 'chest',
)
```

Pass `campaign` if not already available.

- [ ] **Step 6: Test BUY_SHOP_OFFER marks step**

- [ ] **Step 7: Commit**

---

### Task 6: Compact debrief copy (P1-9)

**Files:**
- Modify: `src/game/onboarding/copy.ts`
- Modify: `src/features/onboarding/PostBattleDebriefModal.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx` (pass `onGoHelp` to debrief)

- [ ] **Step 1: Update copy.ts bullets** (3 lines victory, 2 defeat per spec)

Add `helpLinkLabel: 'Подробнее: Справка → Memento Mori'`

- [ ] **Step 2: PostBattleDebriefModal — optional `onGoHelp`**

Footer link button calling `onGoHelp` + `onClose`.

- [ ] **Step 3: CampaignHub — onGoHelp switches to help tab, expands memento panel**

```ts
onGoHelp={() => {
  setHubActiveTab('help')
  // defaultActiveKey can be controlled via Help tab state if needed
}}
```

If `CampaignHelpTab` uses static `defaultActiveKey`, add prop `initialActiveKey?: string` set to `'memento'`.

- [ ] **Step 4: Commit**

---

### Task 7: Reset campaign (P2-11)

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/features/help/CampaignHelpTab.tsx`
- Test: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1: Failing test**

```ts
it('RESET_CAMPAIGN returns initial state', () => {
  let s = initialCampaignState()
  s = applyRunAction(s, { type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
  const next = applyRunAction(s, { type: 'RESET_CAMPAIGN' })
  expect(next.onboarding.completedSteps).toEqual([])
  expect(next.gold).toBe(initialCampaignState().gold)
})
```

- [ ] **Step 2: RunAction + case**

```ts
| { type: 'RESET_CAMPAIGN' }

case 'RESET_CAMPAIGN':
  return syncCompletedMilestones(initialCampaignState())
```

- [ ] **Step 3: gameStore.resetCampaign**

```ts
resetCampaign: () => {
  const st = browserStorage()
  if (st) st.removeItem(STORAGE_KEY)
  set({
    campaign: syncCompletedMilestones(initialCampaignState()),
    hubActiveTab: 'battle',
    onboardingUi: {
      checklistExpanded: true,
      activeCoachMarkId: null,
      guidedBattleStep: 0,
      dismissedCoachMarkIds: [],
    },
  })
},
```

- [ ] **Step 4: CampaignHelpTab UI**

Use `App.useApp().modal.confirm`, `useGameStore` for `resetCampaign` + `dispatchRun({ type: 'RESET_CAMPAIGN' })` (either is enough if store resets campaign — prefer single store method).

Block or warn if `campaign.battle !== null`.

- [ ] **Step 5: Test PASS; commit**

---

### Task 8: Character hub pre-shop empty state (P2-12)

**Files:**
- Modify: `src/features/character/hub/CharacterHubLayout.tsx`

- [ ] **Step 1: Import selectors**

```ts
import { isOnboardingActive } from '../../../game/onboarding/selectors'
import { hasCompletedStep } from '../../../game/onboarding/onboardingState'
import { Alert } from 'antd'
```

- [ ] **Step 2: Conditional stash panel**

```ts
const showPreShopPlaceholder =
  isOnboardingActive(campaign.onboarding) &&
  !hasCompletedStep(campaign.onboarding, 'shop_visited')
```

When true, replace `EquipmentInventoryView` stash tabs content (items tab) with:

```tsx
<Alert
  type="info"
  showIcon
  message="Экипировка и предметы появятся после визита в магазин."
/>
```

Keep build panel (loadout slots) visible.

- [ ] **Step 3: Commit**

---

### Task 9: Post-graduation trials coach (P2-14)

**Files:**
- Modify: `src/game/onboarding/coachMarks.ts`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: Add trials-intro coach**

```ts
{
  id: 'trials-intro',
  title: 'Испытания',
  text: 'Испытания — основной режим после обучения. Выберите любую плитку.',
},
```

- [ ] **Step 2: activeCoachId when graduated && battle tab**

```ts
if (onboarding.graduated && activeTab === 'battle') {
  return pick('trials-intro')
}
```

Place early return before `return null` at end; only when `shouldShowCoachMarks` is false for graduated — use separate check:

```ts
if (onboarding.graduated && activeTab === 'battle') {
  return pick('trials-intro')
}
```

Note: `shouldShowCoachMarks` returns false when graduated — adjust logic:

```ts
const dismissed = new Set(dismissedCoachMarkIds)
const pick = (id: string) => (dismissed.has(id) ? null : id)

if (onboarding.graduated && activeTab === 'battle') {
  return pick('trials-intro')
}
if (!shouldShowCoachMarks(onboarding)) return null
// ... existing onboarding coaches
```

- [ ] **Step 3: Verify TutorialCompleteModal still calls setHubBattleFocusSection('trials')** — no code change if already present.

- [ ] **Step 4: Commit**

---

### Task 10: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 2: Run build**

Run: `npm run build`  
Expected: no TS errors

- [ ] **Step 3: Manual fresh-save checklist** (spec §5)

- [ ] **Step 4: Commit any fixes**

---

## Plan self-review

| Spec item | Task |
|-----------|------|
| P0-1 | Task 1 |
| P0-2, P2-13, P1-10 | Task 2 |
| P0-3 | Task 3 |
| P0-4, P0-5 | Task 1 |
| P1-6, P1-7 | Task 4 |
| P1-8 | Task 5 |
| P1-9 | Task 6 |
| P2-11 | Task 7 |
| P2-12 | Task 8 |
| P2-14 | Task 9 |
| All tests | Task 10 |

No TBD placeholders. Step indices in Task 2 require careful renumbering in BattleScreen — implementer must grep all `guidedBattleStep ===`.
