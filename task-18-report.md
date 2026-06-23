# Task 18 Report — Help + verification

**Status:** ✅ Complete

## Changes

### Help article (`src/game/help/articles.ts`)

- Added **`passives`** article **«Навыки»** after «Карты и умения»:
  - Passive vs active skills, 4 owned / 4 equip slots
  - L progression on real trigger proc (not card use)
  - Permanent bind, chest/shop/tavern acquisition
  - Memento mods on L milestones
  - Stat stacking guardrails (≤1 flat + ≤1 pct per stat)
  - Pointer to Codex «Навыки»
- Updated loadout copy in **Бой** and **Карты и умения**: **2 → 3** active skill slots (passive-skills balance)

### Tests (`src/game/help/articles.test.ts`)

- Article count **9 → 10** for new section

## Verification

### `npm run test`

```
Test Files  77 passed (77)
     Tests  464 passed (464)
  Duration  3.19s
```

Exit code: **0**

### `npm run build`

```
tsc -b && vite build — success
✓ 3151 modules transformed, built in ~2.5s
```

Exit code: **0** (chunk size warning only, pre-existing)

## Commits

| Hash | Message |
|------|---------|
| `6a827cc` | docs(help): add Навыки article and 3-slot loadout copy |

**Push:** not performed (per task brief).
