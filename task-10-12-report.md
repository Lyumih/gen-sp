# Tasks 10–12 Report: Battle Passive Engine

**Date:** 2026-06-23  
**Spec:** `docs/superpowers/specs/2026-06-23-passive-skills-design.md` §6

## Commits (no push)

| Task | Commit | Message |
|------|--------|---------|
| 10 | `ffe1bbd` | feat(passives): wire stat bonuses into effectiveStats |
| 11 | `8de32d2` | feat(passives): add progress tracking and trigger engine |
| 12 | `89cb677` | feat(passives): integrate battle hooks merge and victory Lm rolls |

## Task 10 — Passive stat bonuses

**Added**
- `src/game/passives/passiveStatBonuses.ts` — `aggregatePassiveSkillStatBonuses()`
- `src/game/passives/passiveStatBonuses.test.ts` — equipped flat/pct, unequipped ignored

**Modified**
- `src/game/stats/effectiveStats.ts` — optional `passiveBonuses` param on `computeEffectiveStats`
- `src/features/profile/HeroProfileContent.tsx` — hub stat strip includes equipped passive bonuses
- `src/features/battle/BattleScreen.tsx` — unit tooltips include gear + passive bonuses

## Task 11 — Progress + engine core

**Added**
- `src/game/passives/passiveProgress.ts` — `applyPassiveProgress()` (mirror `applyCardUse`)
- `src/game/passives/passiveEngine.ts` — `firePassives()`, `PassiveCombatPatch`, template handlers
- `src/game/passives/passiveEngine.test.ts` — proc-only levels on success; stat_flat on `on_damaged`

**Engine MVP**
- Stat `stat_flat` / `stat_pct`: progress on matching trigger (no combat patch)
- Proc: roll `procChance` (+ mod `crit_chance_add` as proc-up proxy); progress only on success
- Template handlers: riposte counter, smoke_veil dodge-heal, far_sight move progress, holy_reflect, life_tap, desperation damage mult helper, battle_line, intercession, splash heal, frost_ward, double_tap/twin_cleave

## Task 12 — Battle integration

**Types / snapshot**
- `BattleState.passivesByUnitId`, `passiveRng` (test hook)
- `BattleLogEntry` type `passive_proc`
- `PartyMemberBattleSnapshot.passives` + `passiveEquip`
- `battleSnapshot.ts` clones passives; `playerPassivesFromParty.ts` seeds battle state

**Battle reducer hooks**
- `on_move` after player move (≥1 cell)
- `on_strike` / `on_card_attack` after player strikes
- `on_card_heal` after heal card
- `on_damaged` when player takes damage (riposte, smoke_veil, reflect, stat progress)
- `on_kill` when player kills enemy

**Merge / victory**
- `mergeBattlePassives.ts` + `mergeBattlePassivesIntoCollection`
- `mergeBattleCardsToParty` also merges passives from `battle.passivesByUnitId`
- `applyVictoryModRollsToPartyBattle` rolls Lm on equipped battle passives

**Tests**
- `reducer.test.ts`: `on_damaged` riposte → `passive_proc` log + counter damage
- `mergeBattlePassives.test.ts`: battle L/uses merge into collection

**UI**
- `battleLog.ts`: formats `passive_proc` entries

## Verification

```
npm run test   → 76 files, 457 tests PASS
npm run build  → PASS (tsc -b && vite build)
```

## Notes / follow-ups (out of scope)

- `on_turn_start`, `on_regen_tick`, `on_kill` complex procs partially stubbed (progress only where handler returns triggered)
- `defense_add` from battle_line logged via passive_proc but not persisted on unit (stats layer phase 2)
- Task 13 `passiveText.ts` not added; battle log uses template label from `passiveTemplates`
