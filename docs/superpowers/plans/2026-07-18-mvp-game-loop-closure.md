# MVP Game Loop Closure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the MVP game loop — trial-first battle tab, fixed training expedition path, tutorial-complete modal, post-graduation milestones, Memento UX feedback, and inactive Roguelike/PvP placeholder sections.

**Architecture:** Extend persisted `CampaignState` (v12) with `tutorialCompleteSeen` and `completedMilestones`; fix `campaign-main` to route through `START_EXPEDITION` after first solo win; split battle tab into named sections via config helpers; add UI-only placeholder tiles for future modes; surface Memento via battle log → animation float and hub copy.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest, React 19 + React Compiler, Ant Design 6 (`App.useApp()`), Zustand, Vite 8.

**Spec:** `docs/superpowers/specs/2026-07-18-mvp-game-loop-closure-design.md`

## Global Constraints

- Компания / «Обучение» — tutorial track, **not** hero UI or primary progression focus
- Roguelike / PvP sections — **visible, disabled**, no reducer actions, no `RunPhase` changes
- UGC `kind: 'custom'` — **not** in this PR
- After `first_battle_won`: `campaign-main` tile → `START_EXPEDITION`, **never** `START_OR_CONTINUE_BATTLE` from UI
- Solo tutorial exception: `scenarioIndex === 0`, no `first_battle_won`, **not** `skipMode`
- `skipMode` + `scenarioIndex === 0` → `START_EXPEDITION` (3 battles)
- Section order on Battle tab: **Испытания → Обучение → Roguelike → PvP → Разработка**
- Remove standalone **«Скоро»** section for built-in content; `soon` CSS only on disabled placeholders
- Messages via `App.useApp().message`, not static `message`
- Do not add npm dependencies
- Run tests: `npm run test -- <path>`; full check: `npm run build`

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/game/onboarding/types.ts` | Add `tutorialCompleteSeen` |
| `src/game/onboarding/onboardingState.ts` | Default + `markTutorialCompleteSeen()` |
| `src/game/milestones/definitions.ts` | Milestone IDs + labels |
| `src/game/milestones/evaluateMilestones.ts` | Pure milestone evaluation |
| `src/game/milestones/evaluateMilestones.test.ts` | Milestone unit tests |
| `src/game/modes/placeholders.ts` | Roguelike/PvP placeholder defs |
| `src/game/expedition/campaignMainBounds.ts` | `resolveCampaignMainExpeditionBounds()` |
| `src/game/expedition/config.ts` | `campaign-main` tier → `featured`; chain selectors |
| `src/game/expedition/chainSections.ts` | `getTrialChains`, `getTrainingChain`, `getDevChains` |
| `src/game/types.ts` | `completedMilestones`, optional `world_power_gain` log type |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 12` |
| `src/game/persistence/migrate.ts` | `migrateV11CampaignToV12` |
| `src/game/campaign/runReducer.ts` | Expedition bounds, milestone sync, `MARK_TUTORIAL_COMPLETE_SEEN` |
| `src/features/campaign/BattleModePlaceholderTile.tsx` | Disabled soon tile |
| `src/features/campaign/BattleModePlaceholderGrid.tsx` | Section wrapper for placeholders |
| `src/features/campaign/CampaignBattleTab.tsx` | Section layout + fixed click routing |
| `src/features/campaign/TutorialCompleteModal.tsx` | Post-training modal |
| `src/features/onboarding/MilestoneChecklist.tsx` | Post-graduation goals UI |
| `src/features/campaign/CampaignHub.tsx` | Modal trigger, goals drawer content |
| `src/store/gameStore.ts` | `hubBattleFocusSection` ephemeral UI |
| `src/features/campaign/resourceTooltips.ts` | Expanded world power copy |
| `src/features/campaign/InterBattleScreen.tsx` | World power line |
| `src/features/battle/BattleScreen.tsx` | Victory debrief stripe |
| `src/features/battle/animation/*` | Memento float from log |
| `src/game/battle/reducer.ts` | Emit `world_power_gain` log on enemy kill |

---

### Task 1: Persistence v12 — types and migration

**Files:**
- Modify: `src/game/onboarding/types.ts`
- Modify: `src/game/onboarding/onboardingState.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`
- Modify: `src/game/campaign/runReducer.ts` (initialCampaignState only)

**Interfaces:**
- Produces:
  ```ts
  // onboarding/types.ts
  export type OnboardingState = {
    skipMode: boolean
    completedSteps: readonly OnboardingStepId[]
    guidedTutorialDone: boolean
    graduated: boolean
    tutorialCompleteSeen: boolean
  }

  // types.ts — CampaignState
  completedMilestones: readonly MilestoneId[]

  // onboardingState.ts
  export function markTutorialCompleteSeen(onboarding: OnboardingState): OnboardingState

  // migrate.ts
  export function migrateV11CampaignToV12(c: CampaignState): CampaignState
  ```

- [ ] **Step 1: Add failing migration test**

In `src/game/persistence/migrate.test.ts`:

```ts
it('migrateV11CampaignToV12 adds tutorialCompleteSeen and completedMilestones', () => {
  const legacy = {
    ...minimalCampaignV11(),
    onboarding: { ...DEFAULT_ONBOARDING },
  }
  delete (legacy.onboarding as { tutorialCompleteSeen?: boolean }).tutorialCompleteSeen
  const out = migrateFromUnknown({ version: 11, campaign: legacy })
  expect(out.campaign.onboarding.tutorialCompleteSeen).toBe(false)
  expect(out.campaign.completedMilestones).toEqual([])
})

it('migrateV11CampaignToV12 auto-seen for already graduated saves', () => {
  const legacy = {
    ...minimalCampaignV11(),
    scenarioIndex: 3,
    onboarding: { ...DEFAULT_ONBOARDING, graduated: true },
  }
  const out = migrateFromUnknown({ version: 11, campaign: legacy })
  expect(out.campaign.onboarding.tutorialCompleteSeen).toBe(true)
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/persistence/migrate.test.ts`

- [ ] **Step 3: Implement**

1. `SAVE_VERSION = 12` in `schema.ts`
2. Add `MilestoneId` type in `src/game/milestones/types.ts` (create) or `definitions.ts`
3. Add `completedMilestones: []` to `initialCampaignState()` in `runReducer.ts`
4. Update `DEFAULT_ONBOARDING`:
   ```ts
   export const DEFAULT_ONBOARDING: OnboardingState = {
     skipMode: false,
     completedSteps: [],
     guidedTutorialDone: false,
     graduated: false,
     tutorialCompleteSeen: false,
   }
   ```
5. Add `markTutorialCompleteSeen()` helper
6. Implement `migrateV11CampaignToV12`:
   ```ts
   export function migrateV11CampaignToV12(c: CampaignState): CampaignState {
     const onboarding = {
       ...DEFAULT_ONBOARDING,
       ...c.onboarding,
       tutorialCompleteSeen: c.onboarding?.tutorialCompleteSeen ?? false,
     }
     const graduated = onboarding.graduated
     const done = c.scenarioIndex >= SCENARIOS.length
     const autoSeen = graduated || (done && onboarding.skipMode)
     return {
       ...c,
       onboarding: {
         ...onboarding,
         tutorialCompleteSeen: autoSeen ? true : onboarding.tutorialCompleteSeen,
       },
       completedMilestones: c.completedMilestones ?? [],
     }
   }
   ```
7. Wire in `migrateFromUnknown` after v11 step; update `expect(SAVE_VERSION).toBe(12)` in migrate.test.ts

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test -- src/game/persistence/migrate.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/onboarding/types.ts src/game/onboarding/onboardingState.ts src/game/types.ts src/game/persistence/schema.ts src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts src/game/campaign/runReducer.ts src/game/milestones/types.ts
git commit -m "feat: save v12 with tutorialCompleteSeen and completedMilestones"
```

---

### Task 2: Campaign-main expedition bounds + reducer routing

**Files:**
- Create: `src/game/expedition/campaignMainBounds.ts`
- Create: `src/game/expedition/campaignMainBounds.test.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function resolveCampaignMainExpeditionBounds(state: CampaignState): {
    battleIndex: number
    battleCount: number
  }
  ```

- [ ] **Step 1: Write failing tests**

`src/game/expedition/campaignMainBounds.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '../campaign/scenarios'
import { completeStep, DEFAULT_ONBOARDING } from '../onboarding/onboardingState'
import { resolveCampaignMainExpeditionBounds } from './campaignMainBounds'
import { initialCampaignState } from '../campaign/runReducer'
import { isOnboardingExpeditionPending } from '../onboarding/selectors'

describe('resolveCampaignMainExpeditionBounds', () => {
  it('onboarding after first win uses battles 1-2', () => {
    let onboarding = completeStep(DEFAULT_ONBOARDING, 'first_battle_won')
    const state = {
      ...initialCampaignState(),
      scenarioIndex: 1,
      onboarding,
    }
    expect(isOnboardingExpeditionPending(state)).toBe(true)
    expect(resolveCampaignMainExpeditionBounds(state)).toEqual({
      battleIndex: 1,
      battleCount: 2,
    })
  })

  it('skip path at scenarioIndex 0 uses all scenarios', () => {
    const state = {
      ...initialCampaignState(),
      scenarioIndex: 0,
      onboarding: { ...DEFAULT_ONBOARDING, skipMode: true },
    }
    expect(resolveCampaignMainExpeditionBounds(state)).toEqual({
      battleIndex: 0,
      battleCount: SCENARIOS.length,
    })
  })

  it('mid campaign at index 1 uses remaining battles', () => {
    const state = {
      ...initialCampaignState(),
      scenarioIndex: 1,
      onboarding: { ...DEFAULT_ONBOARDING, skipMode: true, graduated: true },
    }
    expect(resolveCampaignMainExpeditionBounds(state)).toEqual({
      battleIndex: 1,
      battleCount: SCENARIOS.length - 1,
    })
  })
})
```

Add reducer test in `runReducer.test.ts`:

```ts
it('START_EXPEDITION campaign-main after first_battle_won starts at battleIndex 1', () => {
  let s = initialCampaignState()
  s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
  s = winBattle(s)
  s = applyRunAction(s, { type: 'FINALIZE_VICTORY', itemLevelRolls: {}, playerUnitLevelRoll: 50 })
  expect(s.scenarioIndex).toBe(1)

  s = applyRunAction(s, {
    type: 'START_EXPEDITION',
    chainId: 'campaign-main',
    selectedCharacterIds: [HERO_ID],
  })
  expect(s.expedition!.battleIndex).toBe(1)
  expect(s.expedition!.battleCount).toBe(2)
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test -- src/game/expedition/campaignMainBounds.test.ts src/game/campaign/runReducer.test.ts`

- [ ] **Step 3: Implement**

`src/game/expedition/campaignMainBounds.ts`:

```ts
import { SCENARIOS } from '../campaign/scenarios'
import { isOnboardingExpeditionPending } from '../onboarding/selectors'
import type { CampaignState } from '../types'

export function resolveCampaignMainExpeditionBounds(state: CampaignState): {
  battleIndex: number
  battleCount: number
} {
  if (
    isOnboardingExpeditionPending(state)
  ) {
    return { battleIndex: 1, battleCount: 2 }
  }
  const battleIndex = state.scenarioIndex
  const battleCount = SCENARIOS.length - state.scenarioIndex
  return { battleIndex, battleCount }
}
```

In `runReducer.ts` `START_EXPEDITION` case, replace inline onboarding block:

```ts
if (chain.id === 'campaign-main') {
  const bounds = resolveCampaignMainExpeditionBounds(state)
  built = { ...built, ...bounds }
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/campaignMainBounds.ts src/game/expedition/campaignMainBounds.test.ts src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "fix: derive campaign-main expedition bounds from scenarioIndex"
```

---

### Task 3: Expedition config + chain section helpers

**Files:**
- Modify: `src/game/expedition/config.ts`
- Create: `src/game/expedition/chainSections.ts`
- Create: `src/game/expedition/chainSections.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function getTrialChains(): readonly ExpeditionChainConfig[]
  export function getTrainingChain(): ExpeditionChainConfig | undefined
  export function getDevChains(showDev: boolean): readonly ExpeditionChainConfig[]
  ```

- [ ] **Step 1: Test chain sections**

```ts
import { describe, expect, it } from 'vitest'
import { getDevChains, getTrainingChain, getTrialChains } from './chainSections'

describe('chainSections', () => {
  it('getTrialChains excludes campaign-main', () => {
    expect(getTrialChains().every((c) => c.id !== 'campaign-main')).toBe(true)
    expect(getTrialChains()).toHaveLength(5)
  })

  it('getTrainingChain returns campaign-main', () => {
    expect(getTrainingChain()?.id).toBe('campaign-main')
  })

  it('getDevChains hides test mode by default', () => {
    expect(getDevChains(false)).toHaveLength(0)
    expect(getDevChains(true)[0]?.id).toBe('test-single-battle')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

1. In `config.ts` change `campaign-main` entry: `tier: 'featured'` (was `'soon'`)
2. `chainSections.ts`:
   ```ts
   export function getTrialChains() {
     return EXPEDITION_CHAINS.filter(
       (c) => c.tier === 'featured' && c.kind === 'procedural',
     )
   }
   export function getTrainingChain() {
     return EXPEDITION_CHAINS.find((c) => c.id === 'campaign-main')
   }
   export function getDevChains(showDev: boolean) {
     if (!showDev) return []
     return EXPEDITION_CHAINS.filter((c) => c.id === 'test-single-battle')
   }
   ```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/config.ts src/game/expedition/chainSections.ts src/game/expedition/chainSections.test.ts
git commit -m "refactor: split expedition chains into trial/training/dev sections"
```

---

### Task 4: Placeholder mode tiles (Roguelike / PvP)

**Files:**
- Create: `src/game/modes/placeholders.ts`
- Create: `src/features/campaign/BattleModePlaceholderTile.tsx`
- Create: `src/features/campaign/BattleModePlaceholderGrid.tsx`
- Modify: `src/features/campaign/battle-mode-picker.css`

**Interfaces:**
- Produces:
  ```ts
  export type PlaceholderModeId = 'roguelike-run' | 'pvp-online' | 'pvp-async'
  export type PlaceholderModeDef = {
    id: PlaceholderModeId
    section: 'roguelike' | 'pvp'
    label: string
    iconEmoji: string
    description: string
    paramEmojiLine: string
  }
  export const PLACEHOLDER_MODES: readonly PlaceholderModeDef[]
  export function getPlaceholderModesBySection(section: 'roguelike' | 'pvp'): readonly PlaceholderModeDef[]
  ```

- [ ] **Step 1: Create constants**

`src/game/modes/placeholders.ts` — three entries per spec §8.2–8.3.

- [ ] **Step 2: Create `BattleModePlaceholderTile`**

Mirror `BattleModeTile` markup; always `disabled`; class `game-mode-tile game-mode-tile--soon`; badge text `Скоро`; `aria-label` includes «Скоро».

- [ ] **Step 3: Create `BattleModePlaceholderGrid`**

Same section wrapper as `BattleModeGrid` but maps `PlaceholderModeDef[]`; prop `title: string`.

- [ ] **Step 4: CSS**

Add to `battle-mode-picker.css`:

```css
.game-mode-tile--soon {
  opacity: 0.55;
  cursor: not-allowed;
}

.game-mode-section--inactive .game-mode-section__title {
  color: rgba(0, 0, 0, 0.45);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/game/modes/placeholders.ts src/features/campaign/BattleModePlaceholderTile.tsx src/features/campaign/BattleModePlaceholderGrid.tsx src/features/campaign/battle-mode-picker.css
git commit -m "feat: add disabled Roguelike and PvP placeholder battle tiles"
```

---

### Task 5: Battle tab restructure + training click routing

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/features/campaign/BattleModeGrid.tsx` (optional: support `sectionClassName`)
- Modify: `src/game/campaign/scenarios.ts` (export scenario label helper if missing)

**Interfaces:**
- Consumes: `getTrialChains`, `getTrainingChain`, `getDevChains`, `getPlaceholderModesBySection`, `hasCompletedStep`, `isFeaturedBattleModesVisible`, `isDevTestModeVisible`

- [ ] **Step 1: Add training badge helper**

In `CampaignBattleTab` or small util:

```ts
function trainingBadge(campaign: CampaignState, done: boolean): string | undefined {
  if (done) return 'Пройдено · повторить'
  const scenario = SCENARIOS[campaign.scenarioIndex]
  const label = scenario?.id ?? '…'
  return `Бой ${campaign.scenarioIndex + 1} / ${SCENARIOS.length} — ${label}`
}
```

- [ ] **Step 2: Rewrite section layout**

Remove `soonChains` / «Скоро» block. Render in order:

1. `{showFeaturedModes ? <BattleModeGrid title="Испытания" chains={getTrialChains()} … /> : null}`
2. Training chain single tile in `<BattleModeGrid title="Обучение" chains={training ? [training] : []} getBadge={() => trainingBadge(...)} … />`
3. `<BattleModePlaceholderGrid title="Roguelike" modes={getPlaceholderModesBySection('roguelike')} />`
4. `<BattleModePlaceholderGrid title="PvP" modes={getPlaceholderModesBySection('pvp')} />`
5. `{showDevTestMode ? <BattleModeGrid title="Разработка" chains={getDevChains(true)} … /> : null}`

Add `id="hub-battle-section-trials"` on Испытания section wrapper for scroll target.

- [ ] **Step 3: Fix `handleModeSelect` for campaign-main**

```ts
if (chain.id === 'campaign-main') {
  if (done) {
    setReplayOpen(true)
    return
  }
  const soloTutorial =
    campaign.scenarioIndex === 0 &&
    !hasCompletedStep(campaign.onboarding, 'first_battle_won') &&
    !campaign.onboarding.skipMode
  if (soloTutorial) {
    onStartOrContinue()
    return
  }
  // fall through to party resolution + onStartExpedition(chain.id, party)
}
```

Remove early `return onStartOrContinue()` for all `!done` cases.

- [ ] **Step 4: Manual smoke**

Run: `npm run dev` — verify section order, Roguelike/PvP not clickable, training badge updates.

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/CampaignBattleTab.tsx src/features/campaign/BattleModeGrid.tsx
git commit -m "feat: trial-first battle tab with training expedition routing"
```

---

### Task 6: Milestones evaluation + reducer sync

**Files:**
- Create: `src/game/milestones/definitions.ts`
- Create: `src/game/milestones/evaluateMilestones.ts`
- Create: `src/game/milestones/evaluateMilestones.test.ts`
- Modify: `src/game/campaign/runReducer.ts`

**Interfaces:**
- Produces:
  ```ts
  export type MilestoneId = 'milestone_first_trial_win' | 'milestone_world_power_10' | 'milestone_hire_second' | 'milestone_first_mod' | 'milestone_big_arena_win'
  export const MILESTONE_DEFINITIONS: readonly { id: MilestoneId; label: string }[]
  export function evaluateMilestones(campaign: CampaignState): readonly MilestoneId[]
  export function syncCompletedMilestones(campaign: CampaignState): CampaignState
  ```

- [ ] **Step 1: Failing tests**

```ts
describe('evaluateMilestones', () => {
  it('milestone_world_power_10 when worldPower >= 10', () => {
    const ids = evaluateMilestones({ ...base, worldPower: 10 })
    expect(ids).toContain('milestone_world_power_10')
  })

  it('milestone_hire_second when two characters', () => {
    const ids = evaluateMilestones({ ...base, characters: [a, b] })
    expect(ids).toContain('milestone_hire_second')
  })
})
```

Add reducer test: after procedural win + `worldPower: 10`, `completedMilestones` contains id.

- [ ] **Step 2: Implement evaluation**

Rules per spec §6.1:

- `milestone_first_trial_win`: last finalized expedition was procedural (pass `lastExpeditionChainId` via optional field on campaign OR check in `finalizeVictory` context — **recommended:** evaluate inside `finalizeVictory` with local `expedition.scenarioChainId` before clearing expedition)
- `milestone_big_arena_win`: chain id `big-arena` on victory finalize
- `milestone_first_mod`: scan all character cards for filled mod slot with `lm > 0`
- Others: direct state checks

```ts
export function syncCompletedMilestones(campaign: CampaignState): CampaignState {
  const evaluated = evaluateMilestones(campaign)
  const merged = [...new Set([...campaign.completedMilestones, ...evaluated])]
  if (merged.length === campaign.completedMilestones.length) return campaign
  return { ...campaign, completedMilestones: merged }
}
```

Call `syncCompletedMilestones` at end of `finalizeVictory` and `FINISH_EXPEDITION` return path in `runReducer.ts`.

- [ ] **Step 3: Run tests — expect PASS**

Run: `npm run test -- src/game/milestones/evaluateMilestones.test.ts src/game/campaign/runReducer.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/game/milestones/ src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat: post-graduation milestone tracking in campaign state"
```

---

### Task 7: Tutorial complete modal + goals drawer

**Files:**
- Create: `src/features/campaign/TutorialCompleteModal.tsx`
- Create: `src/features/onboarding/MilestoneChecklist.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/store/gameStore.ts`
- Modify: `src/game/campaign/runReducer.ts` (action `MARK_TUTORIAL_COMPLETE_SEEN`)

**Interfaces:**
- Produces:
  ```ts
  | { type: 'MARK_TUTORIAL_COMPLETE_SEEN' }
  // gameStore
  hubBattleFocusSection: 'trials' | null
  setHubBattleFocusSection: (section: 'trials' | null) => void
  ```

- [ ] **Step 1: Add reducer action**

```ts
case 'MARK_TUTORIAL_COMPLETE_SEEN':
  return {
    ...state,
    onboarding: markTutorialCompleteSeen(state.onboarding),
  }
```

- [ ] **Step 2: Create `TutorialCompleteModal`**

Copy structure from `PostBattleDebriefModal`. Body bullets: Memento three axes + vision line from spec §5.1. Buttons: **К испытаниям** (primary), **Позже**.

- [ ] **Step 3: Wire in `CampaignHub`**

Show when:

```ts
const showTutorialComplete =
  campaign.scenarioIndex >= SCENARIOS.length &&
  !campaign.onboarding.tutorialCompleteSeen &&
  (campaign.onboarding.graduated || campaign.onboarding.skipMode)
```

On close (either button): `dispatchRun({ type: 'MARK_TUTORIAL_COMPLETE_SEEN' })`.

On primary CTA also: `setHubActiveTab('battle')`, `setHubBattleFocusSection('trials')`.

- [ ] **Step 4: Scroll to trials section**

In `CampaignBattleTab`, `useEffect` when `hubBattleFocusSection === 'trials'`: `document.getElementById('hub-battle-section-trials')?.scrollIntoView({ behavior: 'smooth' })`; then clear focus via store.

- [ ] **Step 5: `MilestoneChecklist`**

Mirror `OnboardingChecklist` but use `MILESTONE_DEFINITIONS` + `campaign.completedMilestones.includes(id)`. Render when `graduated || skipMode`.

Update `CampaignHub` Drawer to render `<MilestoneChecklist />` when graduated, else onboarding checklist.

- [ ] **Step 6: Commit**

```bash
git add src/features/campaign/TutorialCompleteModal.tsx src/features/onboarding/MilestoneChecklist.tsx src/features/campaign/CampaignHub.tsx src/store/gameStore.ts src/game/campaign/runReducer.ts src/features/campaign/CampaignBattleTab.tsx
git commit -m "feat: tutorial complete modal and post-graduation milestone goals"
```

---

### Task 8: Memento Mori UX feedback

**Files:**
- Modify: `src/game/types.ts` (battle log union)
- Modify: `src/game/battle/reducer.ts`
- Modify: `src/features/battle/animation/types.ts`
- Modify: `src/features/battle/animation/logToSteps.ts`
- Modify: `src/features/battle/animation/floatTextMap.ts`
- Modify: `src/features/battle/animation/BattleAnimationLayer.tsx`
- Modify: `src/features/campaign/resourceTooltips.ts`
- Modify: `src/features/campaign/InterBattleScreen.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: Add log entry on enemy kill**

In `applyEnemyKillRewards`:

```ts
// append to log in calling strike path OR return log entries — simplest: add optional log push in afterHpChange when worldPower increments
```

Add to `BattleLogEntry`:

```ts
| { type: 'world_power_gain'; amount: number; atUnitId: string }
```

Push in `afterHpChange` when enemy killed (use killed unit id).

- [ ] **Step 2: Animation pipeline**

`logToSteps.ts`:

```ts
case 'world_power_gain':
  return [{ kind: 'memento_float', atUnitId: entry.atUnitId, text: `+${entry.amount} сила мира`, variant: 'buff' }]
```

Add `memento_float` to `AnimationStep`; render in `BattleAnimationLayer` using `FloatingCombatText` at unit cell (reuse heal float positioning).

`floatTextMap.ts`:

```ts
export function formatMementoFloat(text: string): FloatLine[] {
  return [{ text, variant: 'buff' }]
}
```

- [ ] **Step 3: Card level-up float (optional, low spam)**

In `logToSteps` for `card_level_up`:

```ts
return [{ kind: 'memento_float', atUnitId: findCasterForCard(...), text: '+1 ур. карты', variant: 'buff' }]
```

If caster lookup is heavy, skip and rely on battle log only — **acceptable for MVP**.

- [ ] **Step 4: Victory debrief stripe**

In `BattleScreen` victory `Alert`, add description line:

```tsx
const wpBefore = campaign.battleAttemptSnapshot?.worldPower ?? campaign.worldPower
const wpAfter = battle.worldPower
const delta = wpAfter - wpBefore
// «Сила мира: {wpBefore} → {wpAfter} (+{delta} за бой)»
```

- [ ] **Step 5: Hub tooltip + inter-battle**

Update `WORLD_POWER_TOOLTIP` to function accepting `n: number`:

```ts
export function worldPowerTooltip(n: number): string {
  return `Сила мира — ${n} (+${n}% к базовым статам врагов)\nМир помнит каждую победу...`
}
```

Use in `GameHeader.tsx`.

`InterBattleScreen.tsx` — add `Typography.Text type="secondary"` under title.

- [ ] **Step 6: Tests**

`logToSteps.test.ts`: `world_power_gain` → `memento_float` step.

- [ ] **Step 7: Commit**

```bash
git add src/game/types.ts src/game/battle/reducer.ts src/features/battle/animation/ src/features/campaign/resourceTooltips.ts src/features/campaign/GameHeader.tsx src/features/campaign/InterBattleScreen.tsx src/features/battle/BattleScreen.tsx
git commit -m "feat: surface Memento worldPower in battle animations and hub copy"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`  
Expected: all pass

- [ ] **Step 2: Production build**

Run: `npm run build`  
Expected: `tsc -b && vite build` success

- [ ] **Step 3: Manual checklist**

- [ ] New save: only «Обучение» visible until first win
- [ ] After first win: «Испытания» appear; «Компания» starts **expedition** (inter-battle between fights 2–3)
- [ ] Graduation modal once; «Цели» shows milestones
- [ ] Roguelike / PvP tiles visible but disabled
- [ ] Enemy kill shows world power float
- [ ] Upgraded save migrates without crash

- [ ] **Step 4: Commit any fixes**

```bash
git commit -m "chore: fix MVP game loop closure integration issues"
```

---

## Spec Coverage Self-Review

| Spec section | Task |
|--------------|------|
| §3 Battle tab hierarchy | Task 3, 4, 5 |
| §4 Training path fix | Task 2, 5 |
| §5 Tutorial complete modal | Task 1, 7 |
| §6 Milestones | Task 1, 6, 7 |
| §7 Memento UX | Task 8 |
| §8 Placeholder sections | Task 4, 5 |
| §9 Product vision | Documented in spec only — no code |
| §10 Migration | Task 1 |
| §11 Tests | Tasks 1–8, 9 |

No TBD placeholders remain.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-mvp-game-loop-closure.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach?
