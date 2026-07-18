# Expedition Abandon & Resume — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix expedition soft lock after «Выйти» by routing abandon to inter_battle, add orphan-save fallback on battle tab, and show human-readable mode labels.

**Architecture:** Extend `ABANDON_BATTLE` to branch on `expedition`; add `RESUME_EXPEDITION_FROM_HUB` action; extract shared expedition label helper; fallback panel in `CampaignBattleTab` for `expedition + hub` edge case.

**Tech Stack:** TypeScript strict, Vitest, React 19, Ant Design 6.

**Spec:** `docs/superpowers/specs/2026-07-18-expedition-abandon-resume-design.md`

## Global Constraints

- Solo abandon (no expedition) → `phase: 'hub'` unchanged
- Expedition abandon → `phase: 'inter_battle'`, `battleIndex` unchanged
- Use `getExpeditionChainById(id)?.label` for UI, not raw `scenarioChainId`
- `App.useApp().modal.confirm` for finish expedition (match `InterBattleScreen`)
- Do not add npm dependencies

---

### Task 1: Reducer — ABANDON_BATTLE + RESUME_EXPEDITION_FROM_HUB

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  | { type: 'RESUME_EXPEDITION_FROM_HUB' }
  ```

- [ ] **Step 1: Add failing tests**

After existing `ABANDON_BATTLE rolls back meta and returns to hub` test, add:

```ts
it('ABANDON_BATTLE during expedition returns to inter_battle', () => {
  let s = applyRunAction(hubState(), {
    type: 'START_EXPEDITION',
    chainId: 'small-skirmish',
    selectedCharacterIds: [HERO_ID],
  })
  expect(s.expedition).not.toBeNull()
  const battleIndex = s.expedition!.battleIndex

  s = applyRunAction(s, { type: 'ABANDON_BATTLE' })
  expect(s.battle).toBeNull()
  expect(s.phase).toBe('inter_battle')
  expect(s.expedition).not.toBeNull()
  expect(s.expedition!.battleIndex).toBe(battleIndex)
})

it('RESUME_EXPEDITION_FROM_HUB moves orphan hub+expedition to inter_battle', () => {
  let s = applyRunAction(hubState(), {
    type: 'START_EXPEDITION',
    chainId: 'tunnel',
    selectedCharacterIds: [HERO_ID],
  })
  s = { ...s, battle: null, battleAttemptSnapshot: null, phase: 'hub' as const }

  const next = applyRunAction(s, { type: 'RESUME_EXPEDITION_FROM_HUB' })
  expect(next.phase).toBe('inter_battle')
  expect(next.expedition).not.toBeNull()
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test -- src/game/campaign/runReducer.test.ts`

- [ ] **Step 3: Implement**

1. Add `RESUME_EXPEDITION_FROM_HUB` to `RunAction` union
2. Implement case (spec §4)
3. Update `ABANDON_BATTLE` (spec §3)

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "fix: route expedition battle abandon to inter_battle camp"
```

---

### Task 2: Expedition label helper

**Files:**
- Create: `src/game/expedition/expeditionLabels.ts`
- Create: `src/game/expedition/expeditionLabels.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function getExpeditionChainLabel(chainId: string): string
  ```

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from 'vitest'
import { getExpeditionChainLabel } from './expeditionLabels'

describe('getExpeditionChainLabel', () => {
  it('returns UI label for known chain', () => {
    expect(getExpeditionChainLabel('small-skirmish')).toBe('Дуэль')
  })
  it('falls back to id for unknown', () => {
    expect(getExpeditionChainLabel('unknown')).toBe('unknown')
  })
})
```

- [ ] **Step 2–4: Implement + verify**

```ts
import { getExpeditionChainById } from './config'

export function getExpeditionChainLabel(chainId: string): string {
  return getExpeditionChainById(chainId)?.label ?? chainId
}
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add getExpeditionChainLabel helper"
```

---

### Task 3: UI labels + abandon modal copy

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Modify: `src/features/campaign/InterBattleScreen.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: CampaignBattleTab Alert**

Replace `campaign.expedition!.scenarioChainId` with `getExpeditionChainLabel(...)`.

- [ ] **Step 2: InterBattleScreen**

Replace `chain?.id ?? expedition.scenarioChainId` with `getExpeditionChainLabel(expedition.scenarioChainId)`.

- [ ] **Step 3: BattleScreen confirmAbandon**

If `campaign.expedition !== null`, append to modal content:

```tsx
' Экспедиция продолжится. Вы вернётесь в лагерь; текущий бой не засчитается.'
```

- [ ] **Step 4: Run build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git commit -m "fix: show expedition mode labels and clarify abandon modal"
```

---

### Task 4: Orphan fallback panel on battle tab

**Files:**
- Create: `src/features/campaign/ExpeditionOrphanPanel.tsx`
- Modify: `src/features/campaign/CampaignBattleTab.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export function ExpeditionOrphanPanel(): JSX.Element | null
  ```

- [ ] **Step 1: Component**

Show when `expedition !== null && campaign.phase === 'hub' && !inBattle`:

```tsx
<Alert
  type="warning"
  showIcon
  message={`Экспедиция: ${label}`}
  description={`Бой ${battleIndex + 1} / ${battleCount}. Продолжите или завершите экспедицию.`}
  action={
    <Space direction="vertical">
      <Button type="primary" onClick={() => dispatchRun({ type: 'RESUME_EXPEDITION_FROM_HUB' })}>
        Продолжить экспедицию
      </Button>
      <Button danger onClick={confirmFinish}>Завершить экспедицию</Button>
    </Space>
  }
/>
```

Reuse confirm pattern from `InterBattleScreen.confirmFinishExpedition`.

- [ ] **Step 2: Wire in CampaignBattleTab**

Render `ExpeditionOrphanPanel` when orphan condition true **instead of** the generic info Alert (or above disabled tiles).

- [ ] **Step 3: Manual verify**

Reload save with orphan state OR simulate via reducer in test optional SSR test.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add expedition orphan resume panel on battle tab"
```

---

### Task 5: Full verification

- [ ] Run: `npm run test && npm run build`
- [ ] Manual: Дуэль → Выйти → InterBattleScreen with «Следующий бой»
- [ ] Manual: «Следующий бой» starts battle again

---

## Spec Coverage

| Requirement | Task |
|-------------|------|
| ABANDON → inter_battle | 1 |
| RESUME from hub | 1, 4 |
| Label not id | 2, 3 |
| Abandon modal copy | 3 |
| Orphan fallback | 4 |
| Solo abandon unchanged | 1 (existing test) |
