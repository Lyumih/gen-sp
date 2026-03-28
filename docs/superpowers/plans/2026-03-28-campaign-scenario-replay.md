# Campaign scenario replay — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the linear campaign is finished (`scenarioIndex >= SCENARIOS.length`), let the player start any scenario again with the same save; victory updates meta but does not advance `scenarioIndex`; retry/abandon keep working via `scenarioSlotIndex` on `BattleAttemptSnapshot`.

**Architecture:** Extend `BattleAttemptSnapshot` with `scenarioSlotIndex` so `RETRY_CURRENT_BATTLE` always resolves `SCENARIOS[slot]` even when `campaign.scenarioIndex` is past the array. Add `START_REPLAY_BATTLE` to `RunAction`. Adjust `finalizeVictory` with the conditional `scenarioIndex` update from the spec. Normalize missing `scenarioSlotIndex` when loading old saves. Update `CampaignHub` to offer scenario choice when the campaign is done.

**Tech Stack:** Vite 8, React 19, TypeScript strict, Ant Design 6, Zustand 5, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-28-campaign-scenario-replay-design.md`  
**Parent design context:** `docs/superpowers/specs/2026-03-28-gen-game-design.md` §7.1

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/game/types.ts` | Add `scenarioSlotIndex` to `BattleAttemptSnapshot`. |
| `src/game/campaign/runReducer.ts` | `RunAction` + `START_REPLAY_BATTLE`; snapshot includes slot; `finalizeVictory` branch; `startBattleFromScenario` / replay start; `RETRY` uses `snap.scenarioSlotIndex`. |
| `src/game/campaign/runReducer.test.ts` | Replay victory, replay retry slot, linear regression; helpers pass `scenarioSlotIndex`. |
| `src/game/persistence/migrate.ts` | If snapshot exists without `scenarioSlotIndex`, infer per spec (done state → `0`, else clamp `scenarioIndex`). |
| `src/features/campaign/CampaignHub.tsx` | When `done`: list or `Select` of scenarios + primary action calling `START_REPLAY_BATTLE`. |
| `docs/superpowers/specs/2026-03-28-campaign-scenario-replay-design.md` | Optional: set status to «реализовано» when feature ships. |

**Note:** `SAVE_VERSION` / `STORAGE_KEY` stay at **1** if migration only fills missing fields on load (recommended for this small delta). Bump version only if you prefer hard rejection of unstripped JSON.

---

### Task 1: Types — `scenarioSlotIndex` on snapshot

**Files:**
- Modify: `src/game/types.ts`
- Test: (types only; compile check via Task 2)

- [ ] **Step 1:** Extend `BattleAttemptSnapshot` with `scenarioSlotIndex: number` (meaning: index into `SCENARIOS` for this attempt).

- [ ] **Step 2:** Commit  
  `git add src/game/types.ts && git commit -m "feat(campaign): add scenarioSlotIndex to battle attempt snapshot"`

---

### Task 2: Tests first — replay and regression

**Files:**
- Modify: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1:** Update helpers so any inline `battleAttemptSnapshot` includes `scenarioSlotIndex` consistent with the battle (e.g. `campaignWithBattle`: use `0` or match `SCENARIOS` index under test).

- [ ] **Step 2:** Add failing test **«replay victory does not advance scenarioIndex when campaign already complete»**  
  - Build state: `scenarioIndex === SCENARIOS.length`, `battle === null`, valid meta.  
  - Dispatch `START_REPLAY_BATTLE` with `scenarioSlotIndex: 0` (will fail until implemented).  
  - Win the battle in one or few dispatches (same pattern as existing victory test).  
  - Expect: `scenarioIndex` still `SCENARIOS.length`, `worldPower` / cards updated from battle, `phase === 'hub'`, `battle === null`.

- [ ] **Step 3:** Add failing test **«replay defeat then retry uses same scenario slot»**  
  - From completed campaign, `START_REPLAY_BATTLE` with `scenarioSlotIndex: 1` (second scenario).  
  - Force defeat.  
  - `RETRY_CURRENT_BATTLE`.  
  - Expect: battle matches `SCENARIOS[1]` (e.g. two enemies for `two-front`), not `undefined` / wrong width.

- [ ] **Step 4:** Add or adjust test **«linear START_OR_CONTINUE_BATTLE snapshot has scenarioSlotIndex === scenarioIndex»**  
  - After start, `battleAttemptSnapshot!.scenarioSlotIndex === state.scenarioIndex` (e.g. `0` on fresh campaign).

- [ ] **Step 5:** Run `npm run test -- src/game/campaign/runReducer.test.ts`  
  **Expected:** new tests FAIL (missing action / field).

- [ ] **Step 6:** Commit  
  `git add src/game/campaign/runReducer.test.ts && git commit -m "test(campaign): scenario replay and snapshot slot expectations"`

---

### Task 3: `runReducer` — core logic

**Files:**
- Modify: `src/game/campaign/runReducer.ts`

- [ ] **Step 1:** Extend `RunAction` with  
  `{ type: 'START_REPLAY_BATTLE'; scenarioSlotIndex: number }`.

- [ ] **Step 2:** Change `snapshotFromCampaign` to accept `scenarioSlotIndex: number` and include it in the returned object (or inline in callers — one place must set it for every new snapshot).

- [ ] **Step 3:** In `startBattleFromScenario`, pass `scenarioSlotIndex: state.scenarioIndex` into the snapshot (only called when `scenarioIndex < SCENARIOS.length`).

- [ ] **Step 4:** Add `startReplayBattle(state, scenarioSlotIndex)` (or inline in switch): guard `state.battle === null`, `state.scenarioIndex >= SCENARIOS.length`, `scenarioSlotIndex` in `[0, SCENARIOS.length - 1]`; build battle from `SCENARIOS[scenarioSlotIndex]` and snapshot with that slot.

- [ ] **Step 5:** `finalizeVictory`: set  
  `scenarioIndex: state.scenarioIndex >= SCENARIOS.length ? state.scenarioIndex : state.scenarioIndex + 1`  
  (keep existing meta merge from `state.battle`).

- [ ] **Step 6:** `RETRY_CURRENT_BATTLE`: resolve scenario with  
  `const scenario = SCENARIOS[snap.scenarioSlotIndex]`  
  and guard `if (!scenario) return state`. Copy `scenarioSlotIndex` into the restored snapshot unchanged.

- [ ] **Step 7:** `ABANDON_BATTLE`: unchanged except types if snapshot now has extra field (spread still works).

- [ ] **Step 8:** Run `npm run test -- src/game/campaign/runReducer.test.ts`  
  **Expected:** PASS.

- [ ] **Step 9:** Run `npm run build`  
  **Expected:** PASS.

- [ ] **Step 10:** Commit  
  `git add src/game/campaign/runReducer.ts && git commit -m "feat(campaign): replay scenarios after finale with snapshot slot"`

---

### Task 4: Persistence migration

**Files:**
- Modify: `src/game/persistence/migrate.ts`

- [ ] **Step 1:** In `normalizeLoadedCampaign` (or a small helper used from it), if `c.battleAttemptSnapshot` exists and `scenarioSlotIndex` is missing / not a number: set  
  `scenarioSlotIndex = c.scenarioIndex < SCENARIOS.length ? Math.min(c.scenarioIndex, SCENARIOS.length - 1) : 0`  
  (matches spec: finished campaign → `0`).

- [ ] **Step 2:** Import `SCENARIOS` from `../campaign/scenarios` (avoid circular imports — if problematic, duplicate `length` constant or move helper next to campaign).

- [ ] **Step 3:** Add a Vitest test file e.g. `src/game/persistence/migrate.test.ts` loading a minimal fake `CampaignState` without `scenarioSlotIndex` on snapshot → after normalize, field present.

- [ ] **Step 4:** Run `npm run test`  
  **Expected:** PASS.

- [ ] **Step 5:** Commit  
  `git add src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts && git commit -m "fix(persistence): default scenarioSlotIndex for old saves"`

---

### Task 5: `CampaignHub` UI

**Files:**
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1:** When `done` (`scenarioIndex >= SCENARIOS.length`): show Ant Design `Select` or `Space` of buttons for each `scenario.id`, local state `selectedSlotIndex` default `0`.

- [ ] **Step 2:** Primary button: «Играть сценарий» / «Повтор» calling `dispatchRun({ type: 'START_REPLAY_BATTLE', scenarioSlotIndex: selected })` when `campaign.battle === null`.

- [ ] **Step 3:** Keep showing meta (worldPower, cards, etc.). Optional short `Typography.Text` that campaign is complete.

- [ ] **Step 4:** Manual check: `npm run start`, finish or cheat-save to post-finale, start replay, win/lose/retry.

- [ ] **Step 5:** Commit  
  `git add src/features/campaign/CampaignHub.tsx && git commit -m "feat(ui): choose scenario replay when campaign complete"`

---

## Plan review

- Per @superpowers:writing-plans: dispatch **plan-document-reviewer** with this plan path + spec path; fix up to 3 rounds; then hand off to execution.

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-28-campaign-scenario-replay.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.

**2. Inline execution** — run tasks in this session with executing-plans checkpoints.

**Which approach do you want?**
