# Task 3 Report — Discovery layer + persistence v2

## Review fix: mergeBattleCodexDiscoveries tests

Added unit tests in `src/game/codex/discovery.test.ts`:

1. Enemy kill: prev enemy alive (`archetypeId: grunt`) → next dead → discovers `enemy:grunt`
2. Mod level 0→1 (`templateId: kill_reward`) → discovers `mod:kill_reward`
3. New `battleLog` strike with `fromCard.templateId: strike` → discovers `card:strike`

Verification: `npm test` — 134 passed (25 files)

Commit: `test(codex): cover mergeBattleCodexDiscoveries`
