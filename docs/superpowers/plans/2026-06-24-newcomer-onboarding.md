# Newcomer Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Провести новичка за 30–60 минут через гибридный путь (solo tutorial → хаб/мета → экспедиция 2 боя) с welcome, чеклистом, coach marks и guided боем.

**Architecture:** Персистентный `CampaignState.onboarding` + эфемерный Zustand `onboardingUi` + статический конфиг `src/game/onboarding/`. Ядро отмечает факты через `runReducer`; UI показывает подсказки. Онбординг-экспедиция: `campaign-main` с `battleIndex: 1`, `battleCount: 2` после solo-победы в `tutorial`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), React 19 + Ant Design 6, Zustand 5, Vite 8.

**Spec:** `docs/superpowers/specs/2026-06-24-newcomer-onboarding-design.md`

## Global Constraints

- Сообщения UI — `App.useApp().message` / `modal`, не static `message`.
- Компактность UI (`AGENTS.md`): чеклист `Alert` `size="small"`; coach marks — краткий текст.
- Guided бой **не** меняет правила боя — только `disabled` кнопок в `BattleScreen`.
- Coach marks / guided **не показывать** при `onboarding.skipMode || onboarding.graduated`.
- Справка не дублируется — дебрифы ссылаются на неё, не копируют полностью.
- `SAVE_VERSION` → **11**; миграция: `graduated: true` если `scenarioIndex > 0`.
- Онбординг-экспедиция: без повторного `tutorial`; при завершении `scenarioIndex: 3`, `graduated: true`.
- Фазы реализации: **P1 → P2 → P3** обязательны; **P4** (иконка «Цели») — в Task 10.

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/onboarding/types.ts` | `OnboardingStepId`, `OnboardingState` |
| `src/game/onboarding/onboardingState.ts` | `DEFAULT_ONBOARDING`, `hasCompletedStep`, `completeStep`, `graduateOnboarding` |
| `src/game/onboarding/onboardingState.test.ts` | Unit-тесты хелперов |
| `src/game/onboarding/steps.ts` | Чеклист: id, label, description |
| `src/game/onboarding/copy.ts` | Welcome, дебрифы |
| `src/game/onboarding/coachMarks.ts` | id, screen, text, order |
| `src/game/onboarding/guidedTutorial.ts` | Шаги guided-боя |
| `src/game/onboarding/selectors.ts` | `isOnboardingActive`, `shouldShowCoachMark`, `isExpeditionPanelVisible`, `isGuidedTutorialActive` |
| `src/game/onboarding/selectors.test.ts` | Селекторы |
| `src/game/types.ts` | `CampaignState.onboarding` |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 11` |
| `src/game/persistence/migrate.ts` | `migrateV10CampaignToV11` |
| `src/game/persistence/migrate.test.ts` | Миграция v11 |
| `src/game/campaign/runReducer.ts` | Actions + auto-steps + onboarding expedition |
| `src/game/campaign/runReducer.onboarding.test.ts` | Reducer onboarding |
| `src/game/expedition/snapshot.ts` | Опциональные overrides `battleIndex` / `battleCount` |
| `src/store/gameStore.ts` | `onboardingUi` slice |
| `src/features/onboarding/WelcomeModal.tsx` | Welcome |
| `src/features/onboarding/OnboardingChecklist.tsx` | Чеклист |
| `src/features/onboarding/CoachMark.tsx` | Popover + spotlight |
| `src/features/onboarding/PostBattleDebriefModal.tsx` | Дебрифы |
| `src/features/onboarding/GuidedBattleOverlay.tsx` | Guided UI |
| `src/features/onboarding/useOnboarding.ts` | Хуки |
| `src/features/campaign/CampaignHub.tsx` | Оркестрация |
| `src/features/campaign/CampaignBattleTab.tsx` | Скрытие экспедиции, CTA |
| `src/features/campaign/GameHeader.tsx` | Coach на «Бой», иконка «Цели» |
| `src/features/battle/BattleScreen.tsx` | Guided overlay, defeat debrief trigger |
| `src/features/campaign/InterBattleScreen.tsx` | Coach лагеря |

---

### Task 1: Типы и чистые хелперы onboarding

**Files:**
- Create: `src/game/onboarding/types.ts`
- Create: `src/game/onboarding/onboardingState.ts`
- Create: `src/game/onboarding/onboardingState.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type OnboardingStepId =
    | 'welcome_seen'
    | 'first_battle_started'
    | 'first_battle_won'
    | 'hub_after_first_win'
    | 'shop_visited'
    | 'expedition_started'
    | 'expedition_completed'
    | 'memento_defeat_debrief'

  export type OnboardingState = {
    skipMode: boolean
    completedSteps: readonly OnboardingStepId[]
    guidedTutorialDone: boolean
    graduated: boolean
  }

  export const DEFAULT_ONBOARDING: OnboardingState

  export function hasCompletedStep(
    onboarding: OnboardingState,
    stepId: OnboardingStepId,
  ): boolean

  export function completeStep(
    onboarding: OnboardingState,
    stepId: OnboardingStepId,
  ): OnboardingState

  export function applyOnboardingSkip(onboarding: OnboardingState): OnboardingState

  export function graduateOnboarding(onboarding: OnboardingState): OnboardingState
  ```

- [ ] **Step 1: Write the failing test**

Create `src/game/onboarding/onboardingState.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ONBOARDING,
  applyOnboardingSkip,
  completeStep,
  graduateOnboarding,
  hasCompletedStep,
} from './onboardingState'

describe('onboardingState', () => {
  it('DEFAULT_ONBOARDING is empty and not graduated', () => {
    expect(DEFAULT_ONBOARDING.completedSteps).toEqual([])
    expect(DEFAULT_ONBOARDING.graduated).toBe(false)
    expect(DEFAULT_ONBOARDING.skipMode).toBe(false)
  })

  it('completeStep is idempotent', () => {
    const once = completeStep(DEFAULT_ONBOARDING, 'welcome_seen')
    const twice = completeStep(once, 'welcome_seen')
    expect(once.completedSteps).toEqual(['welcome_seen'])
    expect(twice.completedSteps).toEqual(['welcome_seen'])
  })

  it('applyOnboardingSkip sets skipMode and guidedTutorialDone', () => {
    const next = applyOnboardingSkip(DEFAULT_ONBOARDING)
    expect(next.skipMode).toBe(true)
    expect(next.guidedTutorialDone).toBe(true)
  })

  it('graduateOnboarding sets graduated', () => {
    const next = graduateOnboarding(
      completeStep(DEFAULT_ONBOARDING, 'expedition_completed'),
    )
    expect(next.graduated).toBe(true)
    expect(hasCompletedStep(next, 'expedition_completed')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/onboarding/onboardingState.test.ts`
Expected: FAIL — cannot resolve `./onboardingState`

- [ ] **Step 3: Implement types and helpers**

`src/game/onboarding/types.ts` — экспорт типов из спеки.

`src/game/onboarding/onboardingState.ts`:

```ts
import type { OnboardingState, OnboardingStepId } from './types'

export const DEFAULT_ONBOARDING: OnboardingState = {
  skipMode: false,
  completedSteps: [],
  guidedTutorialDone: false,
  graduated: false,
}

export function hasCompletedStep(
  onboarding: OnboardingState,
  stepId: OnboardingStepId,
): boolean {
  return onboarding.completedSteps.includes(stepId)
}

export function completeStep(
  onboarding: OnboardingState,
  stepId: OnboardingStepId,
): OnboardingState {
  if (hasCompletedStep(onboarding, stepId)) return onboarding
  return {
    ...onboarding,
    completedSteps: [...onboarding.completedSteps, stepId],
  }
}

export function applyOnboardingSkip(onboarding: OnboardingState): OnboardingState {
  return { ...onboarding, skipMode: true, guidedTutorialDone: true }
}

export function graduateOnboarding(onboarding: OnboardingState): OnboardingState {
  return {
    ...completeStep(onboarding, 'expedition_completed'),
    graduated: true,
    guidedTutorialDone: true,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/onboarding/onboardingState.test.ts`
Expected: PASS

---

### Task 2: `CampaignState.onboarding` + миграция v11

**Files:**
- Modify: `src/game/types.ts` (добавить `onboarding: OnboardingState`)
- Modify: `src/game/persistence/schema.ts` (`SAVE_VERSION = 11`)
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`
- Modify: `src/game/campaign/runReducer.ts` (`initialCampaignState`)

**Interfaces:**
- Consumes: `DEFAULT_ONBOARDING` from Task 1
- Produces: `CampaignState` с обязательным полем `onboarding`

- [ ] **Step 1: Write failing migration test**

Add to `src/game/persistence/migrate.test.ts`:

```ts
it('migrateFromUnknown v10 adds onboarding; graduates if scenarioIndex > 0', () => {
  const fresh = initialCampaignState()
  expect(migrateFromUnknown({ version: 10, campaign: fresh })!.onboarding.graduated).toBe(false)

  const progressed = { ...fresh, scenarioIndex: 2 }
  const migrated = migrateFromUnknown({ version: 10, campaign: progressed })!
  expect(migrated.onboarding.graduated).toBe(true)
  expect(migrated.onboarding.guidedTutorialDone).toBe(true)
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/persistence/migrate.test.ts -t "v10 adds onboarding"`

- [ ] **Step 3: Implement**

In `types.ts` add import and field:

```ts
import type { OnboardingState } from './onboarding/types'
// ...
onboarding: OnboardingState
```

In `schema.ts`: `export const SAVE_VERSION = 11`

In `migrate.ts`:

```ts
import { DEFAULT_ONBOARDING } from '../onboarding/onboardingState'

function migrateV10CampaignToV11(campaign: CampaignState): CampaignState {
  if (campaign.onboarding !== undefined) return campaign
  const graduated = campaign.scenarioIndex > 0
  return {
    ...campaign,
    onboarding: graduated
      ? { ...DEFAULT_ONBOARDING, graduated: true, guidedTutorialDone: true }
      : { ...DEFAULT_ONBOARDING },
  }
}
```

In `migrateFromUnknown`: accept `version === 11`; after v10 chain call `migrateV10CampaignToV11`.

In `normalizeLoadedCampaign` / `campaignFromRaw`: default `onboarding` via migrate helper if missing.

In `initialCampaignState()`: `onboarding: { ...DEFAULT_ONBOARDING }`.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/persistence/migrate.test.ts src/game/campaign/runReducer.test.ts`
Expected: PASS (fix any fixtures missing `onboarding`)

---

### Task 3: Reducer actions и автоматические шаги

**Files:**
- Create: `src/game/campaign/runReducer.onboarding.test.ts`
- Modify: `src/game/campaign/runReducer.ts`

**Interfaces:**
- Consumes: `completeStep`, `hasCompletedStep`, `applyOnboardingSkip`, `graduateOnboarding`
- Produces:
  ```ts
  // RunAction +=
  | { type: 'MARK_ONBOARDING_STEP'; stepId: OnboardingStepId }
  | { type: 'SET_ONBOARDING_SKIP' }
  | { type: 'SET_GUIDED_TUTORIAL_DONE' }
  ```

- [ ] **Step 1: Write failing reducer tests**

```ts
import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from './runReducer'
import { hasCompletedStep } from '../onboarding/onboardingState'

describe('onboarding reducer', () => {
  it('MARK_ONBOARDING_STEP adds step', () => {
    const s = initialCampaignState()
    const next = applyRunAction(s, { type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
    expect(hasCompletedStep(next.onboarding, 'welcome_seen')).toBe(true)
  })

  it('SET_ONBOARDING_SKIP enables skipMode', () => {
    const next = applyRunAction(initialCampaignState(), { type: 'SET_ONBOARDING_SKIP' })
    expect(next.onboarding.skipMode).toBe(true)
    expect(next.onboarding.guidedTutorialDone).toBe(true)
  })

  it('START_OR_CONTINUE_BATTLE at scenarioIndex 0 marks first_battle_started', () => {
    const next = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
    expect(hasCompletedStep(next.onboarding, 'first_battle_started')).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement actions in runReducer**

Helper:

```ts
function withOnboarding(
  state: CampaignState,
  fn: (o: OnboardingState) => OnboardingState,
): CampaignState {
  return { ...state, onboarding: fn(state.onboarding) }
}
```

Cases:

```ts
case 'MARK_ONBOARDING_STEP':
  return withOnboarding(state, (o) => completeStep(o, action.stepId))

case 'SET_ONBOARDING_SKIP':
  return withOnboarding(state, applyOnboardingSkip)

case 'SET_GUIDED_TUTORIAL_DONE':
  return withOnboarding(state, (o) => ({ ...o, guidedTutorialDone: true }))
```

In `startBattleFromScenario` when `scenarioIndex === 0`:

```ts
return withOnboarding(
  { ...battleState },
  (o) => completeStep(o, 'first_battle_started'),
)
```

In `finalizeVictory` when solo (`expedition === null`) and `scenarioSlot === 0` (tutorial won):

```ts
onboarding: completeStep(state.onboarding, 'first_battle_won')
```

- [ ] **Step 4: Run tests — PASS**

---

### Task 4: Онбординг-экспедиция (battleIndex 1, graduate на финале)

**Files:**
- Modify: `src/game/expedition/snapshot.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.onboarding.test.ts`

**Interfaces:**
- Consumes: `hasCompletedStep(state.onboarding, 'first_battle_won')`
- Produces:
  ```ts
  export function buildExpeditionSnapshot(
    campaign: CampaignState,
    chain: ExpeditionChainConfig,
    selectedCharacterIds: readonly string[],
    rng: () => number,
    resolvedPartySize?: number,
    overrides?: { battleIndex?: number; battleCount?: number },
  ): Expedition
  ```

- [ ] **Step 1: Write failing test**

```ts
it('START_EXPEDITION campaign-main after first_battle_won starts at battleIndex 1 with 2 battles', () => {
  let s = initialCampaignState()
  s = {
    ...s,
    onboarding: completeStep(s.onboarding, 'first_battle_won'),
  }
  const heroId = s.squad[0]!
  const next = applyRunAction(s, {
    type: 'START_EXPEDITION',
    chainId: 'campaign-main',
    selectedCharacterIds: [heroId!],
  })
  expect(next.expedition?.battleIndex).toBe(1)
  expect(next.expedition?.battleCount).toBe(2)
  expect(hasCompletedStep(next.onboarding, 'expedition_started')).toBe(true)
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

In `START_EXPEDITION` after `buildExpeditionSnapshot`:

```ts
const isOnboardingExpedition =
  chain.id === 'campaign-main' &&
  hasCompletedStep(state.onboarding, 'first_battle_won') &&
  !state.onboarding.graduated

let expedition = buildExpeditionSnapshot(state, chain, selectedCharacterIds, rng, partySize)
if (isOnboardingExpedition) {
  expedition = { ...expedition, battleIndex: 1, battleCount: 2 }
}
```

In `finalizeVictory` when `state.expedition` and last battle (`expedition.battleIndex >= expedition.battleCount` after victory handler — check `battleIndex === battleCount` on snapshot before clear):

```ts
const onboardingExpedition =
  state.expedition.scenarioChainId === 'campaign-main' &&
  state.expedition.battleCount === 2 &&
  hasCompletedStep(state.onboarding, 'first_battle_won') &&
  !state.onboarding.graduated

let next = { ...base, scenarioIndex: onboardingExpedition ? SCENARIOS.length : nextScenarioIndex }
if (onboardingExpedition) {
  next = {
    ...next,
    onboarding: graduateOnboarding(state.onboarding),
    scenarioIndex: SCENARIOS.length,
  }
}
```

Adjust exact condition to match `handleExpeditionBattleVictory` state when `FINALIZE_VICTORY` runs (last battle: `expedition.battleIndex === expedition.battleCount` after increment).

- [ ] **Step 4: Run onboarding reducer tests — PASS**

---

### Task 5: Конфиг и селекторы

**Files:**
- Create: `src/game/onboarding/steps.ts`
- Create: `src/game/onboarding/copy.ts`
- Create: `src/game/onboarding/coachMarks.ts`
- Create: `src/game/onboarding/guidedTutorial.ts`
- Create: `src/game/onboarding/selectors.ts`
- Create: `src/game/onboarding/selectors.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const ONBOARDING_STEPS: readonly { id: OnboardingStepId; label: string; hint?: string }[]
  export const WELCOME_COPY: { title: string; paragraphs: readonly string[]; primaryCta: string; skipCta: string }
  export const FIRST_VICTORY_DEBRIEF: { title: string; bullets: readonly string[] }
  export const FIRST_DEFEAT_DEBRIEF: { title: string; bullets: readonly string[] }
  export const COACH_MARKS: readonly { id: string; text: string }[]
  export const GUIDED_TUTORIAL_STEPS: readonly { hint: string; allowedModes: readonly ('move'|'melee'|'card')[] }[]

  export function isOnboardingActive(onboarding: OnboardingState): boolean
  export function isExpeditionPanelVisible(campaign: CampaignState): boolean
  export function isGuidedTutorialActive(campaign: CampaignState): boolean
  export function shouldShowCoachMark(campaign: CampaignState, markId: string): boolean
  ```

- [ ] **Step 1: Write failing selector tests**

```ts
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { completeStep } from './onboardingState'
import { isExpeditionPanelVisible, isGuidedTutorialActive } from './selectors'

describe('onboarding selectors', () => {
  it('hides expedition panel until first_battle_won', () => {
    const s = initialCampaignState()
    expect(isExpeditionPanelVisible(s)).toBe(false)
    const won = {
      ...s,
      onboarding: completeStep(s.onboarding, 'first_battle_won'),
    }
    expect(isExpeditionPanelVisible(won)).toBe(true)
  })

  it('guided active only for solo tutorial slot 0', () => {
    const s = {
      ...initialCampaignState(),
      phase: 'battle' as const,
      battleAttemptSnapshot: { scenarioSlotIndex: 0 } as CampaignState['battleAttemptSnapshot'],
      battle: { phase: 'ongoing' } as CampaignState['battle'],
    }
    expect(isGuidedTutorialActive(s)).toBe(true)
    const skipped = { ...s, onboarding: { ...s.onboarding, skipMode: true } }
    expect(isGuidedTutorialActive(skipped)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement config files** (тексты из спеки §6–§9)

`isExpeditionPanelVisible`:

```ts
export function isExpeditionPanelVisible(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  if (o.graduated || o.skipMode) return true
  return hasCompletedStep(o, 'first_battle_won')
}
```

`isGuidedTutorialActive`:

```ts
export function isGuidedTutorialActive(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  if (o.skipMode || o.guidedTutorialDone || o.graduated) return false
  if (campaign.expedition !== null) return false
  if (campaign.battleAttemptSnapshot?.scenarioSlotIndex !== 0) return false
  return campaign.battle !== null
}
```

- [ ] **Step 4: Run — PASS**

---

### Task 6: Zustand `onboardingUi`

**Files:**
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Produces:
  ```ts
  onboardingUi: {
    checklistExpanded: boolean
    activeCoachMarkId: string | null
    guidedBattleStep: number
  }
  setChecklistExpanded: (v: boolean) => void
  setActiveCoachMarkId: (id: string | null) => void
  setGuidedBattleStep: (step: number) => void
  resetGuidedBattleStep: () => void
  ```

- [ ] **Step 1: Add slice defaults**

```ts
onboardingUi: {
  checklistExpanded: true,
  activeCoachMarkId: null,
  guidedBattleStep: 0,
},
setChecklistExpanded: (checklistExpanded) =>
  set((s) => ({ onboardingUi: { ...s.onboardingUi, checklistExpanded } })),
// ...etc
```

- [ ] **Step 2: On `SET_ONBOARDING_SKIP` dispatch from UI also** `setChecklistExpanded(false)`

No test required for store-only slice.

---

### Task 7 (P1): WelcomeModal + CampaignHub wiring

**Files:**
- Create: `src/features/onboarding/WelcomeModal.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

**Interfaces:**
- Consumes: `WELCOME_COPY`, `MARK_ONBOARDING_STEP`, `SET_ONBOARDING_SKIP`, `setHubActiveTab`

- [ ] **Step 1: WelcomeModal**

```tsx
export function WelcomeModal({
  open,
  onStart,
  onSkip,
}: {
  open: boolean
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <Modal open={open} title={WELCOME_COPY.title} footer={null} closable={false}>
      {WELCOME_COPY.paragraphs.map((p) => (
        <Typography.Paragraph key={p}>{p}</Typography.Paragraph>
      ))}
      <Space>
        <Button type="primary" onClick={onStart}>{WELCOME_COPY.primaryCta}</Button>
        <Button type="text" onClick={onSkip}>{WELCOME_COPY.skipCta}</Button>
      </Space>
    </Modal>
  )
}
```

- [ ] **Step 2: CampaignHub**

```tsx
const showWelcome =
  !campaign.onboarding.skipMode &&
  !campaign.onboarding.graduated &&
  !hasCompletedStep(campaign.onboarding, 'welcome_seen')

<WelcomeModal
  open={showWelcome}
  onStart={() => {
    dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
    setHubActiveTab('battle')
  }}
  onSkip={() => {
    dispatchRun({ type: 'SET_ONBOARDING_SKIP' })
    dispatchRun({ type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
    setChecklistExpanded(false)
  }}
/>
```

- [ ] **Step 3: Manual check** — новый сейв (очистить localStorage) → welcome → вкладка «Бой»

---

### Task 8 (P1): OnboardingChecklist

**Files:**
- Create: `src/features/onboarding/OnboardingChecklist.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: Component**

Рендер `ONBOARDING_STEPS`: выполненные — `Typography.Text delete`, активный первый незавершённый — `strong`. Показывать если `isOnboardingActive(campaign.onboarding) && checklistExpanded`.

- [ ] **Step 2: Mount под `GameHeader` в `CampaignHub`**

- [ ] **Step 3: Manual check** — список из 7 пунктов, welcome отмечается

---

### Task 9 (P1): CampaignBattleTab — скрытие экспедиции и CTA

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`

- [ ] **Step 1: Conditional expedition panel**

```tsx
import { isExpeditionPanelVisible } from '../../game/onboarding/selectors'

{isExpeditionPanelVisible(campaign) ? (
  <GamePanel title="Экспедиция">...</GamePanel>
) : null}
```

- [ ] **Step 2: CTA label**

```tsx
const soloCtaLabel = hasCompletedStep(campaign.onboarding, 'first_battle_won')
  ? 'Начать / продолжить бой'
  : 'Начать первый бой'
```

- [ ] **Step 3: Manual check** — до первой победы экспедиции нет

---

### Task 10 (P2 + P4): CoachMark, дебрифы, GameHeader «Цели»

**Files:**
- Create: `src/features/onboarding/CoachMark.tsx`
- Create: `src/features/onboarding/PostBattleDebriefModal.tsx`
- Create: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/campaign/GameHeader.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/campaign/InterBattleScreen.tsx`

- [ ] **Step 1: CoachMark** — controlled `Popover` `open`, backdrop optional via CSS class; props: `targetRef`, `content`, `onNext`, `onSkipAll`

- [ ] **Step 2: useOnboarding** — вычисляет `pendingCoachMarkId` из `COACH_MARKS` order + `shouldShowCoachMark`; `dismissCoachMark` → следующий id или null; `skipAll` → `SET_ONBOARDING_SKIP`

- [ ] **Step 3: GameHeader** — `ref` на кнопку «Бой» для `hub-battle-btn`; после `graduated || skipMode` — кнопка `🎯` открывает `Drawer` с `OnboardingChecklist`

- [ ] **Step 4: PostBattleDebriefModal**

Показ в `CampaignHub` при переходе `phase: 'hub'` после первой solo-победы:

```tsx
const showVictoryDebrief =
  hasCompletedStep(onboarding, 'first_battle_won') &&
  !hasCompletedStep(onboarding, 'hub_after_first_win')
```

`onClose` → `MARK_ONBOARDING_STEP` `hub_after_first_win`; кнопка «В магазин» → tab shop + `shop_visited`.

В `BattleScreen` при `defeat` + solo tutorial + `!memento_defeat_debrief` → modal с `FIRST_DEFEAT_DEBRIEF`, mark step on close.

- [ ] **Step 5: InterBattleScreen** — coach `inter-battle-camp` первый раз (mark via dismissed coach id in onboardingUi or complete ad-hoc step in UI store `seenCoachMarks: string[]` persisted optional — **YAGNI:** mark `MARK_ONBOARDING_STEP` only if we add `inter_battle_camp_seen` to steps; alternatively store dismissed coach ids in `completedSteps` via new step `inter_battle_seen` — skip for MVP: use `useRef` session flag `interBattleCoachSeen` in Zustand `onboardingUi.seenCoachMarkIds: string[]` not persisted)

Add to `onboardingUi`:

```ts
dismissedCoachMarkIds: string[]
dismissCoachMark: (id: string) => void
```

- [ ] **Step 6: Manual test plan P2** (спека §12 ручной п.1 частично)

---

### Task 11 (P3): GuidedBattleOverlay + BattleScreen

**Files:**
- Create: `src/features/onboarding/GuidedBattleOverlay.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: `GUIDED_TUTORIAL_STEPS`, `isGuidedTutorialActive`, `guidedBattleStep` from store
- Produces: `advanceGuidedStep()` based on battle events

- [ ] **Step 1: GuidedBattleOverlay**

```tsx
export function GuidedBattleOverlay({
  stepIndex,
  onAck,
}: {
  stepIndex: number
  onAck?: () => void
}) {
  const step = GUIDED_TUTORIAL_STEPS[stepIndex]
  if (!step) return null
  return (
    <Alert
      type="info"
      showIcon
      title={step.hint}
      action={
        stepIndex === 0 && onAck ? (
          <Button size="small" onClick={onAck}>Понятно</Button>
        ) : undefined
      }
    />
  )
}
```

- [ ] **Step 2: BattleScreen integration**

When `isGuidedTutorialActive(campaign)`:

- Render overlay above action panel
- `allowedModes` from current step → disable Radio buttons not in list
- `disabled={true}` on Autobattle Switch
- `useEffect` watch battle log / unit positions:
  - step 1: player moved → `setGuidedBattleStep(2)`
  - step 2: adjacent to enemy → step 3
  - step 3: melee damage dealt → step 4
  - step 5: `battle.phase === 'victory'` → `SET_GUIDED_TUTORIAL_DONE`

On defeat retry: `resetGuidedBattleStep()`

- [ ] **Step 3: Manual check** — guided проходим на tutorial

---

### Task 12: Финальная верификация

- [ ] **Run full test suite**

Run: `npm run test`
Expected: all pass

- [ ] **Run build**

Run: `npm run build`
Expected: no TS errors

- [ ] **Manual acceptance** (спека §15)

1. Новый сейв → welcome → «Начать первый бой» → нет экспедиции
2. Guided tutorial → победа → дебриф Memento
3. Магазин (опционально) → экспедиция 2 боя без tutorial
4. «Я уже играл» → без guided/coach
5. Сейв с `scenarioIndex > 0` → без welcome

---

## Spec self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Welcome + tab battle | Task 7 |
| Чеклист 7 шагов | Task 5, 8 |
| Скрытие экспедиции | Task 5, 9 |
| Coach marks 9 шт | Task 10 |
| Guided 6 шагов | Task 11 |
| Дебрифы победа/поражение | Task 10 |
| Умный пропуск | Task 3, 6, 7 |
| Онбординг-экспедиция battleIndex 1 | Task 4 |
| Миграция v11 | Task 2 |
| graduate scenarioIndex 3 | Task 4 |
| Иконка «Цели» P4 | Task 10 |

No TBD placeholders in plan.
