# Enemies & Bosses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить MVP-врагов (`grunt`, `boss`) на систему из 16 архетипов, 8 боссов и 3 хаотичных мутантов с расами, умениями, пассивами, пулом спавна и score-based ИИ.

**Architecture:** `EnemyArchetype` + `enemyRaces.ts` + `enemySpawn.ts` (variance, pool); реюз `CARD_ATTACK_TEMPLATES` и `passiveEngine`; `enemyCardsByUnitId` в `BattleState` зеркалит `playerCardsByUnitId`; расовые резисты — хук в damage pipeline; ИИ — расширение `features/battle/enemyAi.ts`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5.

**Spec:** `docs/superpowers/specs/2026-06-23-enemies-bosses-design.md`

## Global Constraints

- **16** обычных + **8** боссов + **3** мутанта; контрпик — роль в **смешанном отряде**; босс — **гибридный** антипод
- Архитектура **B**: `EnemyArchetype` + `SpawnProfile`, не зеркало `Character`
- Умения: реюз героических карт + **6** `monster_*` + **10** `boss_*` скиллов
- Расы **8** с таблицей резистов к тегам (`holy`, `dark`, `poison`, `melee`, `ranged`, `magic`, `fire`)
- Variance: глобальный `U(0.5, 1.5)`; per-stat только у `isChaotic`
- Пассивы врагов: до **4**, фиксированный L + пресет модов; **без** Memento-прокачки в бою
- Кампания: пул + `threatTags`; босс-сценарий каждые **4** боя
- Базовые атаки-фолбэк: `strike` | `shot` | `magic_bolt` (без CD)
- UI: emoji из `labels.ts` / `semanticEmojiId`; tooltip цепочка `база → защита → раса → итог`
- Не добавлять npm-зависимости
- `grunt` / `boss` — оставить как alias или мигрировать tutorial-сценарии на новые id

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Foundation** | 1–3 | расы, архетип-тип, монстр-скиллы |
| **B — Spawn & passives** | 4–5 | variance, pool, enemy-пассивы |
| **C — Battle wiring** | 6–8 | enemy cards в бою, спавн, резисты |
| **D — AI & boss mechanics** | 9–10 | score AI, босс-эффекты |
| **E — Content** | 11–13 | 16 + 8 + 3 архетипа |
| **F — Campaign & codex** | 14–15 | сценарии, кодекс, inspect UI |

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/content/enemyRaces.ts` | `RaceId`, resist/vuln table, trait bonuses |
| `src/game/content/enemyArchetypes.ts` | 27 архетипов + `getEnemyArchetype` |
| `src/game/content/monsterSkillTemplates.ts` | 6 + 10 boss skills; merge в lookup |
| `src/game/content/enemyPassiveTemplates.ts` | 6 enemy + 4 boss passives |
| `src/game/content/enemyTemplates.ts` | thin re-export / backward compat |
| `src/game/battle/enemySpawn.ts` | variance, pool roll, chaotic mutants |
| `src/game/battle/enemyResists.ts` | `applyRaceDamageModifiers` |
| `src/game/battle/enemyCards.ts` | presets → `BattlePlayerCard[]` |
| `src/game/campaign/scenarios.ts` | spawn wiring, boss schedule |
| `src/features/battle/enemyAi.ts` | score-based skill AI |
| `src/game/battle/reducer.ts` | enemy card dispatch, race hook |
| `src/game/descriptions/enemyText.ts` | codex lines |
| `src/game/codex/registry.ts` | all archetypes as entries |
| `src/game/types.ts` | `enemyCardsByUnitId`, optional `raceId` on Unit |

---

### Task 1: Race system and damage modifiers

**Files:**
- Create: `src/game/content/enemyRaces.ts`
- Create: `src/game/battle/enemyResists.ts`
- Create: `src/game/battle/enemyResists.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type RaceId =
    | 'beast' | 'undead' | 'human' | 'orc' | 'elf'
    | 'specter' | 'construct' | 'demon'

  export type RaceDefinition = {
    id: RaceId
    labelRu: string
    resists: Partial<Record<DamageTag, number>>   // 0.30 = −30%
    vulnerables: Partial<Record<DamageTag, number>>
    traitDescriptionRu: string
  }

  export function getRaceDefinition(id: RaceId): RaceDefinition
  export function applyRaceDamageModifiers(
    damage: number,
    tags: readonly string[],
    raceId: RaceId | undefined,
  ): number
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/game/battle/enemyResists.test.ts
import { describe, expect, it } from 'vitest'
import { applyRaceDamageModifiers } from './enemyResists'

describe('applyRaceDamageModifiers', () => {
  it('undead takes +50% holy damage', () => {
    const out = applyRaceDamageModifiers(100, ['holy', 'attack'], 'undead')
    expect(out).toBe(150)
  })

  it('beast resists poison by 30%', () => {
    const out = applyRaceDamageModifiers(100, ['poison'], 'beast')
    expect(out).toBe(70)
  })

  it('unknown race leaves damage unchanged', () => {
    expect(applyRaceDamageModifiers(100, ['holy'], undefined)).toBe(100)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/battle/enemyResists.test.ts`

- [ ] **Step 3: Implement `enemyRaces.ts` and `enemyResists.ts`**

`enemyRaces.ts` — таблица из spec §4.2 (8 рас).

`enemyResists.ts`:

```ts
import { getRaceDefinition, type RaceId } from '../content/enemyRaces'

export function applyRaceDamageModifiers(
  damage: number,
  tags: readonly string[],
  raceId: RaceId | undefined,
): number {
  if (!raceId || damage <= 0) return damage
  const race = getRaceDefinition(raceId)
  let mult = 1
  for (const tag of tags) {
    const r = race.resists[tag as keyof typeof race.resists]
    if (r !== undefined) mult *= 1 - r
    const v = race.vulnerables[tag as keyof typeof race.vulnerables]
    if (v !== undefined) mult *= 1 + v
  }
  return Math.max(0, Math.round(damage * mult))
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/battle/enemyResists.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/content/enemyRaces.ts src/game/battle/enemyResists.ts src/game/battle/enemyResists.test.ts
git commit -m "feat: add enemy race resist table and damage modifiers"
```

---

### Task 2: EnemyArchetype registry and types

**Files:**
- Create: `src/game/content/enemyArchetypes.ts`
- Create: `src/game/content/enemyArchetypes.test.ts`
- Modify: `src/game/content/enemyTemplates.ts` (re-export `getEnemyArchetype` as `getEnemyTemplate` compat)
- Modify: `src/game/types.ts` (add `raceId?: RaceId` on `Unit`)

**Interfaces:**
- Produces:
  ```ts
  export type EnemySkillPreset = {
    templateId: string
    global_level: number
    modSlots: ModSlotState[]
  }
  export type EnemyPassivePreset = { templateId: string; global_level: number; modSlots: ModSlotState[] }
  export type EnemySkillPriority = {
    skillId: string
    baseScore: number
    preferLowHpTarget?: boolean
    preferRangedTarget?: boolean
    preferHealerTarget?: boolean
    minRange?: number
  }
  export type EnemyArchetype = { /* spec §3.1 */ }
  export function getEnemyArchetype(id: string): EnemyArchetype | undefined
  export const ENEMY_ARCHETYPE_IDS: readonly string[]
  ```

- [ ] **Step 1: Write failing test** — `getEnemyArchetype('enemy_orc_ravager')` returns defined entry with `raceId: 'orc'`, `counterClass: 'mage'`.

- [ ] **Step 2: Run test — FAIL**

- [ ] **Step 3: Add types to `enemyArchetypes.ts`** with **2 sample archetypes** (`enemy_orc_ravager`, `boss_blink_hunter`) and full type exports. Keep `grunt`/`boss` as legacy entries mapping old stats.

- [ ] **Step 4: Update `enemyTemplates.ts`:**

```ts
import { getEnemyArchetype, type EnemyArchetype } from './enemyArchetypes'

export type EnemyTemplate = Pick<EnemyArchetype, 'id' | 'label' | 'baseStats'> & {
  emoji?: string
  iconAccent?: IconAccentId
  baseHpStat: number
}

export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  const a = getEnemyArchetype(id)
  if (!a) return undefined
  return {
    id: a.id,
    label: a.label,
    emoji: a.emoji,
    iconAccent: a.iconAccent,
    baseHpStat: a.baseStats.health,
    baseStats: a.baseStats,
  }
}
```

- [ ] **Step 5: Run tests** — `npm run test -- src/game/content/enemyArchetypes.test.ts src/game/campaign/scenarios.test.ts`

- [ ] **Step 6: Commit** — `feat: add EnemyArchetype registry with sample entries`

---

### Task 3: Monster and boss skill templates

**Files:**
- Create: `src/game/content/monsterSkillTemplates.ts`
- Create: `src/game/content/monsterSkillTemplates.test.ts`
- Modify: `src/game/content/cardTemplates.ts` — `getCardAttackTemplate` falls through to monster pool
- Modify: `src/game/skills/resolveSkillForCard.ts` if lookup is separate

**Interfaces:**
- Produces: 6 `monster_*` + 10 `boss_*` entries per spec §5.2–5.3; `getMonsterSkillTemplate(id)`; merged lookup in `getCardAttackTemplate`.

- [ ] **Step 1: Test** — `getCardAttackTemplate('monster_bite')` returns `kind: 'melee'`, `tags` includes `'poison'` or `'dot'`.

- [ ] **Step 2: Implement templates** using same `CardAttackTemplate` shape as hero cards. Example:

```ts
monster_bite: {
  label: 'Укус',
  kind: 'dot',
  maxRange: 1,
  statSource: 'attack',
  skillFlat: 2,
  scaleToken: '35%%',
  cooldownTurns: 4,
  tags: ['skill', 'attack', 'melee', 'dot'],
  semanticEmojiId: 'drop-green',
},
boss_blink_adjacent: {
  label: 'Мгновенный рывок',
  kind: 'utility',
  maxRange: 8,
  statSource: 'speed',
  skillFlat: 0,
  scaleToken: '0%%',
  cooldownTurns: 6,
  tags: ['skill', 'mobility', 'utility'],
  semanticEmojiId: 'smoke-gray',
},
```

- [ ] **Step 3: Merge lookup in `getCardAttackTemplate`:**

```ts
export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId] ?? MONSTER_SKILL_TEMPLATES[templateId]
}
```

- [ ] **Step 4: Run** `npm run test -- src/game/content/monsterSkillTemplates.test.ts`

- [ ] **Step 5: Commit** — `feat: add monster and boss skill templates`

---

### Task 4: Spawn variance and pool selection

**Files:**
- Create: `src/game/battle/enemySpawn.ts`
- Create: `src/game/battle/enemySpawn.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function rollVarianceMult(rng: () => number, chaotic: boolean, statCount: number): number | number[]
  export function pickEnemyArchetypesFromPool(
    poolTags: readonly string[],
    count: number,
    rng: () => number,
  ): string[]
  export function applyVarianceToBaseStats(
    base: BaseStats,
    variance: number | readonly number[],
  ): BaseStats
  ```

- [ ] **Step 1: Test global variance** — single mult 0.5–1.5 scales all stats proportionally.

- [ ] **Step 2: Test chaotic** — 9 independent multipliers.

- [ ] **Step 3: Test pool** — `poolTags: ['forest']` never returns archetype whose `threatTags` lacks `forest`; respects `spawnWeight`.

- [ ] **Step 4: Implement** using seeded `rng` (pass from scenario seed).

- [ ] **Step 5: Commit** — `feat: enemy spawn variance and weighted pool`

---

### Task 5: Enemy passive templates

**Files:**
- Create: `src/game/content/enemyPassiveTemplates.ts`
- Create: `src/game/content/enemyPassiveTemplates.test.ts`
- Modify: `src/game/content/passiveTemplates.ts` OR merge lookup like cards

**Interfaces:**
- Produces 10 templates per spec §5.4–5.5: `enemy_anti_heal_aura`, `enemy_anti_mana`, `enemy_rage_trait`, `enemy_holy_ward`, `enemy_thorns`, `enemy_dark_affinity`, `boss_ignore_armor`, `boss_ranged_ward`, `boss_no_flank`, `boss_reflect_rage`.

- [ ] **Step 1: Test** — each template has valid `levelTrigger` and `descriptionRu`.

- [ ] **Step 2: Implement** using existing `PassiveTemplate` shape; `getPassiveTemplate` merges pools.

- [ ] **Step 3: Commit** — `feat: enemy and boss passive templates`

---

### Task 6: Enemy cards in battle state

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/battle/enemyCards.ts`
- Create: `src/game/battle/enemyCards.test.ts`
- Modify: `src/game/campaign/scenarios.ts` — `makeEnemies` uses archetype presets

**Interfaces:**
- Produces:
  ```ts
  // BattleState:
  enemyCardsByUnitId?: Readonly<Record<string, readonly BattlePlayerCard[]>>

  export function enemyCardsFromArchetype(
    archetype: EnemyArchetype,
    unitId: string,
  ): BattlePlayerCard[]
  export function enemyPassivesFromArchetype(
    archetype: EnemyArchetype,
    unitId: string,
  ): PassiveInstance[]
  ```

- [ ] **Step 1: Test** — archetype with 3 `skillPresets` → 3 `BattlePlayerCard` with correct `templateId`, `global_level`, `cooldownRemaining: 0`.

- [ ] **Step 2: Implement** — map presets to instances with stable ids `${unitId}-skill-${i}`.

- [ ] **Step 3: Extend `makeEnemies`** — set `raceId` from archetype, populate `enemyCardsByUnitId` / `passivesByUnitId` in `battleStateFromScenario`.

- [ ] **Step 4: Extend `BattleState` type** and fix type errors in reducer tests (optional empty `{}`).

- [ ] **Step 5: Run** `npm run test -- src/game/battle/enemyCards.test.ts src/game/campaign/scenarios.test.ts`

- [ ] **Step 6: Commit** — `feat: wire enemy skills and passives into battle state`

---

### Task 7: Race hook in damage pipeline

**Files:**
- Modify: `src/game/battle/reducer.ts` (or `combat.ts` if damage centralized)
- Create/extend: `src/game/battle/enemyResists.test.ts`

**Interfaces:**
- Consumes: `applyRaceDamageModifiers`, `Unit.raceId`
- Applies after defense calc, before HP subtract

- [ ] **Step 1: Test** — undead enemy takes 150 from holy strike in reducer integration test.

- [ ] **Step 2: Thread `raceId` on enemy units** in `makeEnemies`.

- [ ] **Step 3: Call `applyRaceDamageModifiers`** where card/strike damage is finalized; pass card `tags`.

- [ ] **Step 4: Run** `npm run test -- src/game/battle/reducer.test.ts`

- [ ] **Step 5: Commit** — `feat: apply race resists in battle damage`

---

### Task 8: Score-based enemy AI with skills

**Files:**
- Modify: `src/features/battle/enemyAi.ts`
- Create: `src/features/battle/enemyAi.test.ts`
- Modify: `src/game/battle/reducer.ts` — dispatch enemy `card_attack` actions (reuse player card path where possible)

**Interfaces:**
- Consumes: `enemyCardsByUnitId`, `getEnemyArchetype`, `EnemySkillPriority`
- Produces: `pickEnemyAiAction` returns `card_attack` | `attack` | `move` | null

- [ ] **Step 1: Test** — enemy with off-CD `fireball` in range prefers it over strike.

- [ ] **Step 2: Test** — `boss_blink_hunter` turn 1 scores `boss_blink_adjacent` highest.

- [ ] **Step 3: Implement scoring** — iterate priorities, check CD via `BattlePlayerCard.cooldownRemaining`, range via existing `canRangedAttack` / grid helpers.

- [ ] **Step 4: Implement target selection** — `preferRangedTarget` → player with ranged loadout or mage class heuristic (lowest distance ranger/mage).

- [ ] **Step 5: Wire reducer** to execute enemy card attacks (mirror player card dispatch branch).

- [ ] **Step 6: Commit** — `feat: score-based enemy AI with skills`

---

### Task 9: Boss-exclusive mechanics

**Files:**
- Modify: `src/game/battle/reducer.ts`
- Create: `src/game/battle/bossMechanics.ts`
- Create: `src/game/battle/bossMechanics.test.ts`

**Boss effects to implement:**

| Skill | Behavior |
|-------|----------|
| `boss_blink_adjacent` | Teleport actor to random free ortho cell adjacent to target |
| `boss_spell_eater` | Negate next incoming spell damage on boss (status on unit) |
| `boss_soul_mark` | Debuff: heal received −50% |
| `boss_grave_silence` | Debuff: block resurrect 3 turns |
| `boss_ward_pulse` | AoE damage + strip stealth tag |
| `boss_decay_aura` | Reduce holy buff effectiveness |
| `boss_silence_dark` | Block dark-tagged cards 2 turns |
| `boss_mirror_rage` | Copy attack buff from target |

- [ ] **Step 1: Unit status types** — extend `unitStatus.ts` if needed for `soul_mark`, `grave_silence`, `spell_eaten`.

- [ ] **Step 2: Tests per mechanic** (at least blink + soul_mark + spell_eater).

- [ ] **Step 3: Implement in `bossMechanics.ts`**, call from reducer on card use.

- [ ] **Step 4: Commit** — `feat: boss-exclusive battle mechanics`

---

### Task 10: Full archetype content (16 + 8 + 3)

**Files:**
- Modify: `src/game/content/enemyArchetypes.ts` — all 27 entries
- Create: `src/game/content/enemyArchetypes.content.test.ts`

**Interfaces:**
- Produces: complete roster per spec §6–8 with `baseStats`, `skillPresets`, `passivePresets`, `skillPriorities`, `threatTags`, `spawnWeight: 10` (mutants `3`).

- [ ] **Step 1: Content validation test**

```ts
import { ENEMY_ARCHETYPE_IDS, getEnemyArchetype } from './enemyArchetypes'
import { getCardAttackTemplate } from './cardTemplates'
import { getPassiveTemplate } from './passiveTemplates'

describe('enemy archetype content', () => {
  it('every archetype has valid skills and passives', () => {
    for (const id of ENEMY_ARCHETYPE_IDS) {
      const a = getEnemyArchetype(id)!
      expect(a.skillPresets.length).toBeLessThanOrEqual(4)
      expect(a.passivePresets.length).toBeLessThanOrEqual(4)
      for (const s of a.skillPresets) {
        expect(getCardAttackTemplate(s.templateId), id).toBeDefined()
      }
      for (const p of a.passivePresets) {
        expect(getPassiveTemplate(p.templateId), id).toBeDefined()
      }
    }
  })

  it('has exactly 16 regular, 8 boss, 3 chaotic', () => {
    const all = ENEMY_ARCHETYPE_IDS.map((id) => getEnemyArchetype(id)!)
    expect(all.filter((a) => a.isBoss).length).toBe(8)
    expect(all.filter((a) => a.isChaotic).length).toBe(3)
    expect(all.filter((a) => !a.isBoss).length).toBe(19) // 16 + 3 mutants
  })
})
```

- [ ] **Step 2: Add all archetypes** — copy stats from spec tables; tune `baseStats` to ±grunt/boss MVP power.

- [ ] **Step 3: Run content test**

- [ ] **Step 4: Commit** — `feat: add full enemy and boss archetype roster`

---

### Task 11: Chaotic mutant spawn logic

**Files:**
- Modify: `src/game/battle/enemySpawn.ts`
- Modify: `src/game/battle/enemySpawn.test.ts`

**Interfaces:**
- `enemy_chaos_aberration` — random `classId`, 2 skills from threat pool
- `enemy_mutant_wanderer` — random `raceId`, 3 skills, 0–1 passive
- `enemy_shifting_shaman` — rotate resist tag every 3 turns (store on `Unit.statusEffects`)

- [ ] **Step 1: Test chaos aberration** — spawn produces varied class/skills with fixed seed.

- [ ] **Step 2: Implement `resolveChaoticArchetype(archetype, rng)`** called in `makeEnemies`.

- [ ] **Step 3: Shifting shaman** — `on_turn_start` passive or status rotation.

- [ ] **Step 4: Commit** — `feat: chaotic enemy spawn variants`

---

### Task 12: Scenario pool spawn and boss schedule

**Files:**
- Modify: `src/game/campaign/scenarios.ts`
- Modify: `src/game/types.ts` — `BattleScenario` spawn config
- Modify: `src/game/campaign/scenarios.test.ts`

**Interfaces:**
```ts
export type ScenarioEnemySpawn =
  | { kind: 'fixed'; archetypeId: string; x: number; y: number; unitLevel?: number }
  | { kind: 'pool'; poolTags: string[]; count: number; spawnZone?: SpawnZone }

export type BattleScenario = {
  // ...
  enemySpawns: ScenarioEnemySpawn[]
  isBossScenario?: boolean
  bossIndex?: number
}
```

- [ ] **Step 1: Test** — pool spawn places `count` enemies on free cells.

- [ ] **Step 2: Test** — `bossIndex: 2` maps to `boss_spell_eater`.

- [ ] **Step 3: Add helper `resolveScenarioEnemies(scenario, seed, worldPower)`**.

- [ ] **Step 4: Campaign integration** — every 4th scenario slot uses boss archetype (wire in run/campaign config).

- [ ] **Step 5: Migrate tutorial scenarios** from `grunt` to `enemy_orc_ravager` or keep grunt alias.

- [ ] **Step 6: Commit** — `feat: scenario pool spawn and boss schedule`

---

### Task 13: Codex and inspect UI

**Files:**
- Modify: `src/game/descriptions/enemyText.ts`
- Modify: `src/game/codex/registry.ts`
- Modify: `src/game/codex/codexText.ts`
- Modify: `src/features/battle/` inspect/tooltip if exists

**Interfaces:**
- `describeEnemyCodex` returns: race, class, counterClass, StatStrip base, resists, skills, passives, `descriptionRu`

- [ ] **Step 1: Test** — `describeEnemyCodex('enemy_plague_herald')` includes «Чумной вестник» and counter class.

- [ ] **Step 2: Registry** — iterate `ENEMY_ARCHETYPE_IDS` instead of legacy `ENEMY_TEMPLATES`.

- [ ] **Step 3: Boss badge** in codex UI component.

- [ ] **Step 4: Battle hover** — show race resists in tooltip (AGENTS.md StatStrip pattern).

- [ ] **Step 5: Run** `npm run test -- src/game/codex/` + `npm run build`

- [ ] **Step 6: Commit** — `feat: enemy codex and inspect descriptions`

---

### Task 14: Final verification

- [ ] Run full test suite: `npm run test`
- [ ] Run build: `npm run build`
- [ ] Manual smoke: tutorial + boss scenario — enemy uses skill, codex discovers archetype
- [ ] Update `docs/superpowers/specs/2026-06-23-enemies-bosses-design.md` status → `implemented` if all green

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| §3 Model | 2, 6 |
| §4 Races | 1, 7 |
| §5 Skills | 3, 9 |
| §6 16 enemies | 10 |
| §7 8 bosses | 9, 10 |
| §8 Mutants | 11 |
| §9 Threat tags | 4, 12 |
| §10 AI | 8 |
| §11 L/mods presets | 6, 10 |
| §12 Codex | 13 |
| §14 Tests | all tasks |

## Self-Review Notes

- `specter` wall-pass marked phase 2 — not in tasks
- `race` codex category phase 2 — not in tasks
- `shot` / `magic_bolt` lite templates: add in Task 3 if not reusing scaled-down hero cards
- Legacy `grunt`/`boss` kept for save/scenario compat until Task 12 migration
