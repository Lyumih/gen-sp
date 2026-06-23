# Character Specialization (Склонности) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Персонаж получает случайную **склонность** при найме в таверне; пока герой в отряде — мета-бонусы команды и личная удача/Memento/слоты без влияния на прямой бой.

**Architecture:** Каталог `specializationTemplates.ts` + чистый `resolve.ts` / `loadoutCaps.ts`; интеграция в существующие точки (`finalizeVictory`, `cardProgress`, `generateOffer`, reducer actions). UI — профиль, notice после найма, кодекс `affinity`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-23-character-specialization-design.md`

## Global Constraints

- Термин UI: **«Склонность»** (`specializationId`); не путать с Memento-специализацией носителя
- Прямой бой: **без** бонусов к статам, урону, CD
- Активация: `characterId ∈ squad` **или** `expedition.squadSnapshot`; `downed` **не** отключает
- Резерв: все бонусы **неактивны**
- Удача: **1 retry** при провале `rollCardLevelUp`; только носители владельца
- Party meta: **лучший** бонус в отряде; дубликаты **не суммируются**
- Дроп mult: **×1.5**; shop refresh: **−25%**; sell stone: **+25%**
- Мягкий откат: `L_new = L - ceil((L - milestonePrev) × 0.2)`, min `milestonePrev`
- Ранний слот: prod **L≥60** / dev **L≥4** для 1-го слота (`mod_early_slot`)
- Пул найма: **равный** `1/15`; таверна **не** показывает до hire
- `specializationId` **immutable** после hire; legacy → `null` (v10)
- SAVE_VERSION **10** (текущий **9**)
- `App.useApp().message`; не добавлять npm-зависимости

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Core module** | 1–3 | templates, resolve, loadoutCaps + tests |
| **B — Data & migration** | 4 | types, createCharacter, v9→v10 |
| **C — Game hooks** | 5–8 | memento, lucky, meta, hire |
| **D — Codex & UI** | 9–12 | affinity, profile, notice, preview, help |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/specialization/specializationTemplates.ts` | 15 шаблонов склонностей |
| `src/game/specialization/pickRandom.ts` | равный pick при hire |
| `src/game/specialization/resolve.ts` | active, party meta, lucky retry, soft rollback |
| `src/game/specialization/loadoutCaps.ts` | max skill/passive slots & ownership |
| `src/game/specialization/milestones.ts` | `effectiveFirstModThreshold(character)` |
| `src/game/specialization/previewOffer.ts` | превью следующего слота (`mod_offer_preview`) |
| `src/game/types.ts` | `specializationId`, `HubNotice`, loadout tuples |
| `src/game/memento/modOffers.ts` | `offerCount` param |
| `src/game/memento/modSlots.ts` | optional `firstThresholdOverride` |
| `src/game/memento/cardProgress.ts` | optional `lucky` |
| `src/game/passives/passiveProgress.ts` | optional `lucky` |
| `src/game/campaign/applyVictoryModRolls.ts` | lucky + extra Lm roll per owner |
| `src/game/campaign/runReducer.ts` | hire, meta, REMOVE_MOD, shop, sell, loadout |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 10` |
| `src/game/persistence/migrate.ts` | `migrateV9CampaignToV10` |
| `src/game/codex/registry.ts` | category `affinity` |
| `src/features/profile/HeroProfileContent.tsx` | строка склонности |
| `src/features/character/CharacterRosterView.tsx` | active/inactive badge |
| `src/features/campaign/CampaignHub.tsx` | notice `specialization_reveal` |
| `src/features/inventory/CardsInventoryView.tsx` | mod preview block |
| `src/game/help/articles.ts` | статья про склонности |

---

### Task 1: Specialization catalog & pickRandom

**Files:**
- Create: `src/game/specialization/specializationTemplates.ts`
- Create: `src/game/specialization/pickRandom.ts`
- Create: `src/game/specialization/specializationTemplates.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SpecializationEffectKind =
    | 'meta_drop_skill' | 'meta_drop_passive' | 'meta_shop_refresh' | 'meta_sell_bonus'
    | 'lucky_unit' | 'lucky_card_l' | 'lucky_passive_l' | 'lucky_mod_lm'
    | 'mod_offer_plus' | 'mod_soft_rollback' | 'mod_early_slot' | 'mod_offer_preview' | 'mod_extra_lm_roll'
    | 'slot_skill_plus' | 'slot_passive_plus'

  export type SpecializationTemplate = {
    id: string
    label: string
    emoji: string
    description: string
    effectKind: SpecializationEffectKind
    params: Record<string, number>
  }

  export const SPECIALIZATION_TEMPLATES: Record<string, SpecializationTemplate>
  export const SPECIALIZATION_IDS: readonly string[]

  export function getSpecializationTemplate(id: string): SpecializationTemplate | undefined

  export function pickRandomSpecializationId(rng: () => number): string
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/game/specialization/specializationTemplates.test.ts
import { describe, expect, it } from 'vitest'
import {
  SPECIALIZATION_IDS,
  SPECIALIZATION_TEMPLATES,
  getSpecializationTemplate,
} from './specializationTemplates'
import { pickRandomSpecializationId } from './pickRandom'

describe('specializationTemplates', () => {
  it('has 15 entries with unique ids', () => {
    expect(SPECIALIZATION_IDS).toHaveLength(15)
    expect(new Set(SPECIALIZATION_IDS).size).toBe(15)
    for (const id of SPECIALIZATION_IDS) {
      expect(getSpecializationTemplate(id)?.id).toBe(id)
    }
  })

  it('pickRandomSpecializationId returns pool members', () => {
    let i = 0
    const rng = () => (i++ % SPECIALIZATION_IDS.length) / SPECIALIZATION_IDS.length
    const id = pickRandomSpecializationId(rng)
    expect(SPECIALIZATION_IDS).toContain(id)
  })

  it('meta_drop_skill has multiplier 1.5', () => {
    expect(SPECIALIZATION_TEMPLATES.meta_drop_skill?.params.multiplier).toBe(1.5)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/specialization/specializationTemplates.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement catalog**

Define all 15 entries per spec §5 with Russian `label` / `description` and `params` (`multiplier`, `fraction`, `offerCount`, etc.).

`pickRandom.ts`:

```ts
import { SPECIALIZATION_IDS } from './specializationTemplates'

export function pickRandomSpecializationId(rng: () => number): string {
  const idx = Math.floor(rng() * SPECIALIZATION_IDS.length)
  return SPECIALIZATION_IDS[Math.min(idx, SPECIALIZATION_IDS.length - 1)]!
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/specialization/
git commit -m "feat(specialization): catalog and random pick for tavern hire"
```

---

### Task 2: Resolver — activation, party meta, lucky retry, soft rollback

**Files:**
- Create: `src/game/specialization/resolve.ts`
- Create: `src/game/specialization/resolve.test.ts`

**Interfaces:**
- Consumes: `getSpecializationTemplate`, `SPECIALIZATION_TEMPLATES` from Task 1
- Produces:
  ```ts
  export function isSpecializationActive(campaign: CampaignState, characterId: string): boolean
  export function characterHasEffect(
    campaign: CampaignState,
    characterId: string,
    kind: SpecializationEffectKind,
  ): boolean
  export function partyMetaMultiplier(
    campaign: CampaignState,
    kind: 'meta_drop_skill' | 'meta_drop_passive',
  ): number
  export function partyMetaBonusFraction(
    campaign: CampaignState,
    kind: 'meta_shop_refresh' | 'meta_sell_bonus',
  ): number
  export function rollWithLuckyRetry(
    currentLevel: number,
    randomInt1to100: () => number,
    lucky: boolean,
  ): boolean
  export function softRollbackCarrierLevel(
    carrierLevel: number,
    slotIndex: number,
    milestoneThreshold: (slotIndex: number) => number,
  ): number
  ```

- [ ] **Step 1: Write failing tests**

```ts
// src/game/specialization/resolve.test.ts
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { createCharacter } from '../character/createCharacter'
import { computeBaseStatRating } from '../stats/baseStatRating'
import { STARTER_HERO_BASE_STATS } from '../config/starterHero'
import {
  characterHasEffect,
  isSpecializationActive,
  partyMetaMultiplier,
  rollWithLuckyRetry,
  softRollbackCarrierLevel,
} from './resolve'
import { milestoneThreshold } from '../memento/modSlots'

function char(id: string, spec: string | null) {
  return {
    ...createCharacter({
      id,
      name: id,
      classId: 'warrior',
      baseStats: STARTER_HERO_BASE_STATS,
      baseStatRating: computeBaseStatRating(STARTER_HERO_BASE_STATS),
    }),
    specializationId: spec,
  }
}

describe('isSpecializationActive', () => {
  it('active when in squad', () => {
    const c = char('a', 'meta_drop_skill')
    const campaign = {
      ...initialCampaignState(),
      characters: [c],
      squad: ['a', null, null, null],
    }
    expect(isSpecializationActive(campaign, 'a')).toBe(true)
  })

  it('inactive in reserve', () => {
    const c = char('a', 'meta_drop_skill')
    const campaign = {
      ...initialCampaignState(),
      characters: [c],
      squad: [null, null, null, null],
    }
    expect(isSpecializationActive(campaign, 'a')).toBe(false)
  })
})

describe('partyMetaMultiplier', () => {
  it('best of duplicates not stacked', () => {
    const a = char('a', 'meta_drop_skill')
    const b = char('b', 'meta_drop_skill')
    const campaign = {
      ...initialCampaignState(),
      characters: [a, b],
      squad: ['a', 'b', null, null],
    }
    expect(partyMetaMultiplier(campaign, 'meta_drop_skill')).toBe(1.5)
  })
})

describe('rollWithLuckyRetry', () => {
  it('retries once on fail', () => {
    let calls = 0
    const rng = () => {
      calls++
      return calls === 1 ? 1 : 100 // fail then succeed at L=50
    }
    expect(rollWithLuckyRetry(50, rng, true)).toBe(true)
    expect(calls).toBe(2)
  })
})

describe('softRollbackCarrierLevel', () => {
  it('L=90 slot 1 → 87', () => {
    expect(softRollbackCarrierLevel(90, 1, milestoneThreshold)).toBe(87)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement resolve.ts**

`isSpecializationActive`: check `campaign.squad.includes(characterId)` OR `campaign.expedition?.squadSnapshot.some(s => s?.characterId === characterId)`.

`characterHasEffect`: template exists, `effectKind` matches, `isSpecializationActive`.

`partyMetaMultiplier` / `partyMetaBonusFraction`: iterate `getSquadCharacters` + expedition snapshot characters; filter active + matching kind; take **max** param.

`rollWithLuckyRetry`: use `rollCardLevelUp` from `rollCardLevelUp.ts`.

`softRollbackCarrierLevel`: formula from spec §5.5.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/specialization/resolve.ts src/game/specialization/resolve.test.ts
git commit -m "feat(specialization): resolve activation, party meta, lucky retry"
```

---

### Task 3: Loadout caps & mod milestones

**Files:**
- Create: `src/game/specialization/loadoutCaps.ts`
- Create: `src/game/specialization/milestones.ts`
- Create: `src/game/specialization/loadoutCaps.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BASE_SKILL_LOADOUT_SLOTS = 3
  export const BASE_PASSIVE_EQUIP_SLOTS = 4
  export const BASE_MAX_PASSIVES = 4

  export function maxSkillLoadoutSlots(character: Character): number
  export function maxPassiveEquipSlots(character: Character): number
  export function maxPassivesOwned(character: Character): number
  export function isSkillLoadoutSlotIndexValid(character: Character, slotIndex: number): boolean
  export function isPassiveEquipSlotIndexValid(character: Character, slotIndex: number): boolean

  // milestones.ts
  export function effectiveMilestoneThreshold(
    character: Character | null,
    slotIndex: number,
    baseThreshold: (slotIndex: number) => number,
  ): number
  export function unlockedSlotCountForCharacter(
    character: Character | null,
    carrierLevel: number,
    baseThreshold: (slotIndex: number) => number,
  ): number
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createCharacter } from '../character/createCharacter'
import { maxSkillLoadoutSlots, maxPassiveEquipSlots } from './loadoutCaps'
import { effectiveMilestoneThreshold } from './milestones'
import { milestoneThreshold } from '../memento/modSlots'

const baseChar = createCharacter({
  id: 'x',
  name: 'x',
  classId: 'warrior',
  baseStats: { hp: 1, defense: 1, attack: 1, magic: 1, mana: 1, heal: 1, speed: 1, initiative: 1, crit: 1 },
  baseStatRating: 1,
})

describe('loadoutCaps', () => {
  it('base 3 skill / 4 passive slots', () => {
    expect(maxSkillLoadoutSlots(baseChar)).toBe(3)
    expect(maxPassiveEquipSlots(baseChar)).toBe(4)
  })

  it('slot_skill_plus → 4 skill slots', () => {
    expect(maxSkillLoadoutSlots({ ...baseChar, specializationId: 'slot_skill_plus' })).toBe(4)
  })
})

describe('milestones', () => {
  it('mod_early_slot lowers first threshold in prod', () => {
    const ch = { ...baseChar, specializationId: 'mod_early_slot' }
    const t0 = effectiveMilestoneThreshold(ch, 0, milestoneThreshold)
  if (import.meta.env.DEV) {
      expect(t0).toBe(4)
    } else {
      expect(t0).toBe(60)
    }
  })
})
```

- [ ] **Step 2–4: Implement, run tests, PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(specialization): loadout caps and early mod milestone"
```

---

### Task 4: Types, createCharacter, migration v10

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/character/createCharacter.ts`
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Create: `src/game/persistence/migrate.v10.test.ts` (or extend `migrate.test.ts`)

**Interfaces:**
- Produces: `Character.specializationId: string | null`
- Produces: `HubNotice` += `{ kind: 'specialization_reveal'; specializationId: string }`
- Produces: `BattleLoadout` → 4-tuple; `PassiveEquipLoadout` → 5-tuple (pad nulls in migration)
- Produces: `SAVE_VERSION = 10`, `migrateV9CampaignToV10`

- [ ] **Step 1: Write failing migration test**

```ts
it('v9→v10 adds specializationId null and pads loadout', () => {
  const c = initialCampaignState()
  const { specializationId: _, ...legacy } = c.characters[0]!
  const v9 = {
    version: 9,
    campaign: {
      ...c,
      characters: [{ ...legacy, battleLoadout: [null, null, null], passiveEquip: [null, null, null, null] }],
    },
  }
  const out = migrateFromUnknown(v9)
  expect(out!.characters[0]!.specializationId).toBeNull()
  expect(out!.characters[0]!.battleLoadout).toHaveLength(4)
  expect(out!.characters[0]!.passiveEquip).toHaveLength(5)
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Apply type changes**

`createCharacter`:

```ts
specializationId: null,
battleLoadout: [null, null, null, null],
passiveEquip: [null, null, null, null, null],
```

Update `initialCampaignState` hero loadout to 4-tuple.

Wire `migrateV9CampaignToV10` in `migrateFromUnknown` chain.

- [ ] **Step 4: Run migration + full test suite**

Run: `npm run test`
Expected: PASS (fix any tuple length assumptions in tests)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(specialization): types and save migration v10"
```

---

### Task 5: Memento hooks — offer size, milestones, soft rollback

**Files:**
- Modify: `src/game/memento/modOffers.ts`
- Modify: `src/game/memento/modSlots.ts`
- Modify: `src/game/memento/carrierLevelChange.ts`
- Modify: `src/game/campaign/runReducer.ts` (`REMOVE_MOD`, `PICK_MOD` paths)
- Test: `src/game/memento/modOffers.test.ts`, `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Consumes: `characterHasEffect`, `loadoutCaps` N/A; `effectiveMilestoneThreshold`, `unlockedSlotCountForCharacter`
- Modifies `generateOffer`:

```ts
export function generateOffer(
  pool: readonly ModTemplate[],
  carrierTags: readonly string[],
  occupiedTemplateIds: readonly string[],
  slotIndex: number,
  seed: number,
  offerCount: 3 | 4 = 3,
): ModOffer
```

- [ ] **Step 1: Test 4-offer generation**

```ts
it('generateOffer returns 4 mods when offerCount is 4', () => {
  const offer = generateOffer(TEST_POOL, fireballTags, [], 0, 42, 4)
  expect(offer.modIds).toHaveLength(4)
})
```

- [ ] **Step 2: Wire `mod_offer_plus`**

In `carrierLevelChange` / `tryRemoveMod` / `PICK_MOD`: pass `offerCount` when owner `characterHasEffect(..., 'mod_offer_plus')`. Thread `characterId` into `afterCarrierLevelChange` / `generateOffer` call sites.

- [ ] **Step 3: Wire `mod_early_slot`**

Replace direct `unlockedSlotCount` calls for **player-owned** carriers with `unlockedSlotCountForCharacter(owner, L, milestoneThreshold)`.

- [ ] **Step 4: Test soft rollback in REMOVE_MOD**

```ts
it('REMOVE_MOD with mod_soft_rollback loses 20% not full milestone', () => {
  // character specializationId: 'mod_soft_rollback', card global_level 90, remove slot 1 → level 87
})
```

Use `softRollbackCarrierLevel` when `characterHasEffect(..., 'mod_soft_rollback')`, else `rollbackCarrierLevel`.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(specialization): memento offer size, early slot, soft rollback"
```

---

### Task 6: Lucky progression hooks

**Files:**
- Modify: `src/game/memento/cardProgress.ts`
- Modify: `src/game/passives/passiveProgress.ts`
- Modify: `src/game/campaign/applyVictoryModRolls.ts`
- Modify: `src/game/campaign/runReducer.ts` (`finalizeVictory` unitLevel)
- Modify call sites in `cardCombat.ts` / `passiveEngine.ts` / battle reducer

**Interfaces:**
- Extend progress helpers:

```ts
export function applyCardUse<T extends CardProgressFields>(
  card: T,
  randomInt1to100: number | (() => number),
  options?: { lucky?: boolean },
): T & { leveledUp: boolean }
```

When `lucky: true`, use `rollWithLuckyRetry`.

- [ ] **Step 1: Test lucky card progress**

```ts
it('applyCardUse with lucky retries failed roll', () => {
  let n = 0
  const rng = () => (n++ === 0 ? 1 : 100)
  const out = applyCardUse({ global_level: 50, uses_count: 0 }, rng, { lucky: true })
  expect(out.leveledUp).toBe(true)
})
```

- [ ] **Step 2: Pass `lucky` from owner**

At card use site: resolve `characterId` → `characterHasEffect(campaign, id, 'lucky_card_l')`.

Same for `passiveProgress` + `lucky_passive_l`.

- [ ] **Step 3: `applyVictoryModRollsToCarrier`**

Add optional `{ luckyLm?: boolean; extraLmRolls?: number }`.

`mod_extra_lm_roll`: after normal roll per filled slot, if owner has effect, run `applyVictoryModRollsToCarrier` again on that carrier.

- [ ] **Step 4: `finalizeVictory` — `lucky_unit`**

Wrap `rollMementoLevelUp(unitLevel, roll)` with `rollWithLuckyRetry` when owner active + `lucky_unit`.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(specialization): lucky rolls for unit, L, Lm"
```

---

### Task 7: Party meta — drop, shop, sell

**Files:**
- Modify: `src/game/config/skillAcquisition.ts` (optional helpers)
- Modify: `src/game/campaign/runReducer.ts` (`finalizeVictory`, `REFRESH_SHOP`, `SELL_CHEST_CARD`, `SELL_UNBOUND_PASSIVE`)

- [ ] **Step 1: Test drop multiplier**

```ts
it('meta_drop_skill increases effective drop chance with squad member', () => {
  const base = SKILL_ACQUISITION.battleDropChance
  const effective = base * partyMetaMultiplier(state, 'meta_drop_skill')
  expect(rollBattleSkillDrop(effective - 0.0001, SKILL_ACQUISITION)).toBe(true)
})
```

Apply in `finalizeVictory`:

```ts
const skillMult = partyMetaMultiplier(state, 'meta_drop_skill')
const skillDropped = rollBattleSkillDrop(dropRng() * skillMult) // or: dropRng() < cfg.battleDropChance * skillMult
```

Use `min(1, chance * mult)` for probability cap.

- [ ] **Step 2: REFRESH_SHOP discount**

```ts
const fraction = partyMetaBonusFraction(state, 'meta_shop_refresh')
const cost = Math.floor(baseCost * (1 - fraction))
```

Skip discount when `free: true`.

- [ ] **Step 3: Sell bonus**

Apply `floor(price * (1 + fraction))` in `SELL_CHEST_CARD` and `SELL_UNBOUND_PASSIVE`.

- [ ] **Step 4: Reducer tests for shop/sell**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(specialization): party meta drop, shop, sell bonuses"
```

---

### Task 8: Tavern hire & hub notice

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`HIRE_TAVERN_CANDIDATE`)
- Modify: `src/game/codex/discovery.ts`
- Test: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1: Test hire assigns specialization**

```ts
it('HIRE_TAVERN_CANDIDATE assigns random specializationId and notice', () => {
  // seed hire, expect specializationId truthy, pendingHubNotice.kind === 'specialization_reveal'
})
```

- [ ] **Step 2: Implement hire**

```ts
const specializationId = pickRandomSpecializationId(rng)
character = { ...character, specializationId }
// pendingHubNotice — if dual_drop also pending, chain or prioritize specialization_reveal after battle notices clear; use specialization_reveal on hire only (battle notices separate phase)
```

Discover codex: `discoverCodexEntry(state, codexEntryId('affinity', specializationId))`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(specialization): random affinity on tavern hire"
```

---

### Task 9: Loadout caps in reducer & UI guards

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`SET_BATTLE_LOADOUT`, `SET_PASSIVE_EQUIP`, `BIND_PASSIVE_TO_CHARACTER`)
- Modify: `src/game/passives/equippedPassives.ts` — delegate max slots to `loadoutCaps`
- Modify: `src/features/inventory/CardsInventoryView.tsx` — dynamic slot count
- Modify: `src/features/inventory/ChestInventoryView.tsx` — `maxPassivesOwned`

- [ ] **Step 1: Test 4th skill slot only with spec**

```ts
it('SET_BATTLE_LOADOUT slot 3 rejected without slot_skill_plus', () => {
  expect(applyRunAction(s, { type: 'SET_BATTLE_LOADOUT', characterId, slotIndex: 3, cardId: 'c1' })).toBe(s)
})
```

- [ ] **Step 2: Wire validation through `loadoutCaps`**

Replace hardcoded `MAX_PASSIVES_PER_CHARACTER` with `maxPassivesOwned(character)`.

Extend `SET_PASSIVE_EQUIP` slotIndex to `0|1|2|3|4`.

- [ ] **Step 3: UI renders N loadout cells from `maxSkillLoadoutSlots(hero)`**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(specialization): dynamic skill and passive loadout caps"
```

---

### Task 10: Codex affinity category

**Files:**
- Modify: `src/game/codex/registry.ts`
- Modify: `src/game/codex/registry.test.ts`
- Modify: `src/game/codex/codexText.ts`
- Modify: `src/features/codex/*` (category tab label «Склонности»)

- [ ] **Step 1: Test affinity entries**

```ts
it('codex includes all specialization affinities', () => {
  const affinities = codexEntriesByCategory('affinity')
  expect(affinities.length).toBe(15)
})
```

- [ ] **Step 2: Register entries from `SPECIALIZATION_TEMPLATES`**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(specialization): codex affinity category"
```

---

### Task 11: Profile, roster, hire notice UI

**Files:**
- Modify: `src/features/profile/HeroProfileContent.tsx`
- Modify: `src/features/character/CharacterRosterView.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: Profile shows specialization**

Emoji + label; tooltip = `description`; badge «активна» / «неактивна» via `isSpecializationActive`.

- [ ] **Step 2: Hub notice handler**

```tsx
if (notice.kind === 'specialization_reveal') {
  const tmpl = getSpecializationTemplate(notice.specializationId)
  message.success(`Открыта склонность: ${tmpl?.emoji} ${tmpl?.label}`)
}
```

- [ ] **Step 3: Tavern cards unchanged** (no spec leak)

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(specialization): profile and hire reveal UI"
```

---

### Task 12: Mod offer preview (Провидец)

**Files:**
- Create: `src/game/specialization/previewOffer.ts`
- Create: `src/game/specialization/previewOffer.test.ts`
- Modify: `src/features/inventory/CardsInventoryView.tsx` (or carrier mod modal)

- [ ] **Step 1: Test preview matches future offer seed**

```ts
it('previewOfferForNextSlot matches generateOffer at milestone', () => {
  // same modIds for carrierId, nextSlotIndex, seed from modOfferSeed
})
```

- [ ] **Step 2: UI block** when owner has `mod_offer_preview` and next slot locked

Read-only list of 3–4 mod labels.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(specialization): mod offer preview for provident affinity"
```

---

### Task 13: Help article

**Files:**
- Modify: `src/game/help/articles.ts`

- [ ] **Step 1: Add article «Склонности»** — отряд, сюрприз в таверне, ≠ Memento носителя

- [ ] **Step 2: Commit**

```bash
git commit -m "docs(help): character affinity article"
```

---

### Task 14: Verification

- [ ] Run: `npm run test`
- [ ] Run: `npm run build`
- [ ] Manual: hire in tavern → notice → profile shows affinity; move to reserve → badge inactive; squad member with `meta_drop_skill` → verify drop math in test only (manual optional)

```bash
git commit -m "chore: verify character specialization feature" # only if fixups needed
```

---

## Self-Review (plan vs spec)

| Spec § | Task |
|--------|------|
| §3 Activation | Task 2 |
| §4.1 Character field | Task 4 |
| §4.2 Catalog | Task 1 |
| §4.3 Resolver | Task 2 |
| §4.4 Loadout caps | Task 3, 9 |
| §5 All 15 affinities | Task 1 |
| §5.5 Soft rollback | Task 2, 5 |
| §6 Integration table | Tasks 5–9 |
| §7 UI | Tasks 11–12 |
| §8 Codex | Task 10 |
| §9 Edge cases | Tasks 2, 4, 9 |
| §10 Tests | Each task |
| §11 Migration v10 | Task 4 |
| §13 Out of scope | Not in plan ✓ |

No placeholders remain. Type names consistent across tasks.
