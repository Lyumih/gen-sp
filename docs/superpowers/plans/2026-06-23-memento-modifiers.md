# Memento Modifiers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить MVP «моды за kill» на систему встроенных модификаторов (L/Lm, слоты на вехах, оффер из 3, боевой пайплайн) для умений, оружия и экипировки.

**Architecture:** Декларативный движок `ModOp` + `modPipeline`; слоты/офферы в `src/game/memento/*`; прогресс L/Lm в `runReducer`; UI в существующей inventory-сетке. Удалить `modKillTarget` / `kill_reward`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-23-memento-modifiers-design.md`

## Global Constraints

- Вехи слотов prod: `firstThreshold: 75`, `step: 100`; dev: `firstThreshold: 5`, `step: 5` (`import.meta.env.DEV`)
- `Lm` бросок = `rollCardLevelUp(Lm, r)`; сила op: `base × (1 + Lm/100)` (percent) или flat по `scaleMode`
- L умения: использование; L оружия: базовая атака; L брони/акс.: получение удара; Lm всех модов: **победа**, каждый слот независимо
- `strike` — канал без L/модов; кулаки = virtual weapon без прогресса
- Удаление мода: L → `milestoneThreshold(slotIndex - 1)` (или 0); новый оффер на слоте
- `requires` = AND по тегам; OR через отдельные записи каталога
- SAVE_VERSION **6** (текущий 5); миграция `modifications` → `modSlots`
- Не добавлять npm-зависимости; `App.useApp().message`; AGENTS.md для UI emoji/tooltip
- Вне scope v1: `mod-mana-save`, реролл оффера за золото, specialization presets

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Core** | 1–5 | Types, slots, offers, catalog, migration, kill MVP removed |
| **B — Campaign** | 6–7 | Hub actions, L sync/offers, victory Lm |
| **C — Combat** | 8–10 | modPipeline, L triggers (weapon/hit), proc mods |
| **D — UI** | 11–12 | M+, picker, remove confirm, inventory integration |
| **E — Polish** | 13–14 | Battle tooltips/log, codex, weapon channel/fists |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/config/modSlotMilestones.ts` | `MOD_SLOT_MILESTONES`, `milestoneThreshold(k)` |
| `src/game/types.ts` | `ModSlotState`, `ModOffer`, `ModOp`; `modSlots` on card/item |
| `src/game/memento/modSlots.ts` | `unlockedSlotCount`, `syncModSlotsForLevel`, `rollbackCarrierLevel` |
| `src/game/memento/modOffers.ts` | `generateOffer`, `filterModsForCarrier` |
| `src/game/memento/modScaling.ts` | `scaleModValue(base, lm, scaleMode)` |
| `src/game/mods/carrierTags.ts` | tags for card templates + item templates |
| `src/game/mods/modPipeline.ts` | apply mods to attack/heal/passive |
| `src/game/content/modTemplates.ts` | full MVP catalog (23 mods) |
| `src/game/campaign/runReducer.ts` | `PICK_MOD_OFFER`, `REMOVE_MOD`, L milestone hooks |
| `src/game/campaign/applyVictoryModRolls.ts` | victory Lm rolls per filled slot |
| `src/game/battle/reducer.ts` | remove kill rewards; thorns/reflect hooks |
| `src/game/persistence/migrate.ts` | v5→v6 |
| `src/features/inventory/ModOfferPicker.tsx` | Modal 3-card picker |
| `src/features/inventory/modSlotBadges.tsx` | M+, slot dots |
| `src/features/inventory/CardsInventoryView.tsx` | mod UI, drop modKillTarget |
| `src/features/inventory/EquipmentInventoryView.tsx` | mod UI on items |

---

### Task 1: Slot milestones & sync

**Files:**
- Create: `src/game/config/modSlotMilestones.ts`
- Create: `src/game/memento/modSlots.ts`
- Create: `src/game/memento/modSlots.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MOD_SLOT_MILESTONES: { firstThreshold: number; step: number }

  export function milestoneThreshold(slotIndex: number): number
  export function unlockedSlotCount(carrierLevel: number): number
  export function rollbackCarrierLevel(slotIndex: number): number
  export function syncModSlotsForLevel(
    slots: ModSlotState[],
    carrierLevel: number,
    makeOffer: (slotIndex: number) => ModOffer,
  ): ModSlotState[]
  ```

- [ ] **Step 1: Write failing tests**

```ts
// src/game/memento/modSlots.test.ts
import { describe, expect, it, vi } from 'vitest'
import {
  milestoneThreshold,
  unlockedSlotCount,
  rollbackCarrierLevel,
  syncModSlotsForLevel,
} from './modSlots'
import { MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'

describe('milestoneThreshold', () => {
  it('uses firstThreshold + step * slotIndex', () => {
    const t0 = milestoneThreshold(0)
    const t1 = milestoneThreshold(1)
    expect(t1 - t0).toBe(MOD_SLOT_MILESTONES.step)
  })
})

describe('unlockedSlotCount', () => {
  it('returns 0 below first threshold', () => {
    expect(unlockedSlotCount(MOD_SLOT_MILESTONES.firstThreshold - 1)).toBe(0)
  })
  it('returns 1 at first threshold', () => {
    expect(unlockedSlotCount(MOD_SLOT_MILESTONES.firstThreshold)).toBe(1)
  })
})

describe('rollbackCarrierLevel', () => {
  it('returns 0 when removing slot 0', () => {
    expect(rollbackCarrierLevel(0)).toBe(0)
  })
  it('returns previous milestone for slot 1', () => {
    expect(rollbackCarrierLevel(1)).toBe(milestoneThreshold(0))
  })
})

describe('syncModSlotsForLevel', () => {
  const offer = { modIds: ['a', 'b', 'c'] as const, rollSeed: 1 }

  it('adds empty slot with offer when level crosses milestone', () => {
    const threshold = milestoneThreshold(0)
    const next = syncModSlotsForLevel([], threshold, () => offer)
    expect(next).toHaveLength(1)
    expect(next[0]).toEqual({ status: 'empty', offer })
  })

  it('preserves filled slots when level increases', () => {
    const filled = { status: 'filled' as const, templateId: 'mod-damage-up', lm: 3 }
    const threshold = milestoneThreshold(1)
    const next = syncModSlotsForLevel([filled], threshold, () => offer)
    expect(next[0]).toEqual(filled)
    expect(next.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/memento/modSlots.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`src/game/config/modSlotMilestones.ts`:

```ts
export const MOD_SLOT_MILESTONES = import.meta.env.DEV
  ? { firstThreshold: 5, step: 5 }
  : { firstThreshold: 75, step: 100 }

export function milestoneThreshold(slotIndex: number): number {
  const { firstThreshold, step } = MOD_SLOT_MILESTONES
  return firstThreshold + step * slotIndex
}
```

`src/game/memento/modSlots.ts` — implement `unlockedSlotCount` as max k+1 where `carrierLevel >= milestoneThreshold(k)`; `syncModSlotsForLevel` extends array, sets `{ status: 'empty', offer }` for new indices, `{ status: 'locked' }` not used in array (only append unlocked slots).

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/memento/modSlots.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/config/modSlotMilestones.ts src/game/memento/modSlots.ts src/game/memento/modSlots.test.ts
git commit -m "feat(mods): slot milestones and syncModSlotsForLevel"
```

---

### Task 2: Types — ModSlotState on cards & items

**Files:**
- Modify: `src/game/types.ts`
- Modify: all test fixtures referencing `modifications` (grep `modifications:`)

**Interfaces:**
- Produces:
  ```ts
  export type ModOffer = { modIds: [string, string, string]; rollSeed: number }
  export type ModSlotState =
    | { status: 'empty'; offer: ModOffer | null }
    | { status: 'filled'; templateId: string; lm: number }

  export type CardInstance = {
    // ...
    modSlots: ModSlotState[]
  }
  export type ItemInstance = {
    // ...
    modSlots: ModSlotState[]
  }
  ```
- Removes: `ModificationInstance`, `CardInstance.modifications`

- [ ] **Step 1:** Add types to `types.ts`; remove `ModificationInstance`
- [ ] **Step 2:** Replace `modifications: []` → `modSlots: []` in `STARTER_CARDS`, test helpers, `initialCampaignState`
- [ ] **Step 3:** Run `npm run build` — fix compile errors across codebase (mechanical replace)
- [ ] **Step 4:** Run `npm run test` — expect failures in migrate/kill tests (fixed in Task 5)
- [ ] **Step 5: Commit** — `refactor(types): modSlots replace modifications`

---

### Task 3: Mod scaling & offers

**Files:**
- Create: `src/game/memento/modScaling.ts`, `modScaling.test.ts`
- Create: `src/game/memento/modOffers.ts`, `modOffers.test.ts`
- Create: `src/game/mods/carrierTags.ts`, `carrierTags.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function scaleModValue(base: number, lm: number, scaleMode: 'percent' | 'flat'): number

  export function resolveCarrierTags(
    kind: 'card' | 'item',
    templateId: string,
  ): readonly string[]

  export function filterModsForCarrier(
    pool: readonly ModTemplate[],
    carrierTags: readonly string[],
    occupiedTemplateIds: readonly string[],
  ): ModTemplate[]

  export function generateOffer(
    pool: readonly ModTemplate[],
    carrierTags: readonly string[],
    occupiedTemplateIds: readonly string[],
    slotIndex: number,
    seed: number,
  ): ModOffer
  ```

- [ ] **Step 1: modScaling tests**

```ts
import { describe, expect, it } from 'vitest'
import { scaleModValue } from './modScaling'

describe('scaleModValue', () => {
  it('doubles percent base at lm 100', () => {
    expect(scaleModValue(50, 100, 'percent')).toBe(100)
  })
  it('scales flat base at lm 100', () => {
    expect(scaleModValue(1, 100, 'flat')).toBe(2)
  })
})
```

- [ ] **Step 2: modOffers tests** — requires/excludes, deterministic 3 ids from seed, pool size 1 still returns 3 repeats
- [ ] **Step 3: carrierTags** — `strike` card template → not used (no mod slots); `fireball` → `['skill','ranged','aoe','attack']`; `wooden_sword` → `['weapon','attack','melee']`; `leather_armor` → `['armor']`
- [ ] **Step 4: Implement all three modules**
- [ ] **Step 5: Run** `npm run test -- src/game/memento/modScaling.test.ts src/game/memento/modOffers.test.ts src/game/mods/carrierTags.test.ts`
- [ ] **Step 6: Commit** — `feat(mods): scaling, offers, carrier tags`

---

### Task 4: Mod template catalog

**Files:**
- Rewrite: `src/game/content/modTemplates.ts`
- Create: `src/game/content/modTemplates.test.ts`

**Interfaces:**
- Produces: `MOD_TEMPLATES`, `getModTemplate(id)`, 22 mods (exclude `mod-mana-save` from v1 pool or mark `enabled: false`)

- [ ] **Step 1:** Test every spec id exists; each has `requires`, `ops`, `group`
- [ ] **Step 2:** Implement catalog per spec §4.3 table
- [ ] **Step 3:** Test `filterModsForCarrier` returns `mod-heal-up` for heal card, not for weapon
- [ ] **Step 4: Commit** — `feat(mods): MVP mod template catalog`

---

### Task 5: Persistence migration v5→v6 & remove kill MVP

**Files:**
- Modify: `src/game/persistence/schema.ts` — `SAVE_VERSION = 6`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`
- Modify: `src/game/types.ts` — remove `modKillTargetCardId` from `CampaignState`
- Modify: `src/game/campaign/runReducer.ts` — remove `SET_MOD_KILL_TARGET`, `DEFAULT_MOD_KILL_TEMPLATE_ID` from STARTER_CARDS
- Delete/trim: `src/game/memento/modifications.ts` kill logic (keep file only if `modSlotsUnlocked` renamed — prefer delete unused)
- Modify: `src/game/battle/reducer.ts` — remove `applyModKillReward`, `MOD_POINTS_PER_ENEMY_KILL`, `applyEnemyKillRewards` mod branch

**Interfaces:**
- Migration maps `{ templateId: 'kill_reward', level: N }` → filled `mod-damage-up` with `lm: N` when `L >= firstThreshold`

- [ ] **Step 1: migrate.test.ts**

```ts
it('v5 kill_reward becomes modSlots filled mod-damage-up', () => {
  // campaign with modifications: [{ templateId: 'kill_reward', level: 2 }]
  // expect modSlots[0].status === 'filled' && lm === 2 after migrate
})

it('drops modKillTargetCardId', () => {
  // expect migrated state has no modKillTargetCardId
})
```

- [ ] **Step 2:** Implement migrate v5→v6; strip kill fields from snapshots (`battleSnapshot.ts`, `scenarios.ts`)
- [ ] **Step 3:** Remove kill from battle reducer; fix `outcomes.test.ts`, `reducer.test.ts`
- [ ] **Step 4:** Run `npm run test`
- [ ] **Step 5: Commit** — `feat(mods): migration v6, remove kill-target MVP`

---

### Task 6: Hub actions PICK_MOD_OFFER & REMOVE_MOD

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces RunActions:
  ```ts
  | { type: 'PICK_MOD_OFFER'; characterId: string; carrierKind: 'card' | 'item'; carrierId: string; slotIndex: number; modTemplateId: string }
  | { type: 'REMOVE_MOD'; characterId: string; carrierKind: 'card' | 'item'; carrierId: string; slotIndex: number }
  ```

- [ ] **Step 1: Tests**
  - `PICK_MOD_OFFER` validates modId in pending offer → filled lm=0
  - `REMOVE_MOD` slot 1 at L=82 → L=75, slot empty with new offer, slot 2 filled unchanged
  - hub-only; blocked in battle/expedition freeze

- [ ] **Step 2:** Implement pick/remove on character cards/items
- [ ] **Step 3:** Helper `afterCarrierLevelChange(carrier, newLevel, seed)` calls `syncModSlotsForLevel` + generateOffer
- [ ] **Step 4:** Run `npm run test -- src/game/campaign/runReducer.test.ts`
- [ ] **Step 5: Commit**

---

### Task 7: Victory Lm rolls

**Files:**
- Create: `src/game/campaign/applyVictoryModRolls.ts`, `applyVictoryModRolls.test.ts`
- Modify: `src/game/campaign/runReducer.ts` (victory path / `applyBattleOutcome`)
- Modify: `src/game/campaign/mergeBattleCards.ts` — merge `modSlots` not `modifications`

**Interfaces:**
- Produces:
  ```ts
  export function applyVictoryModRollsToCarrier<T extends { modSlots: ModSlotState[] }>(
    carrier: T,
    randomInt1to100ForSlot: (slotIndex: number) => number,
  ): T
  ```

- [ ] **Step 1:** Test 2 filled slots get independent Lm increments on successful rolls
- [ ] **Step 2:** Wire into victory outcome for all party cards + equipped items
- [ ] **Step 3:** Update codex discovery in `discovery.ts` for `lm: 0 → 1` on mod templateId
- [ ] **Step 4:** Run tests
- [ ] **Step 5: Commit**

---

### Task 8: modPipeline — simple combat ops

**Files:**
- Create: `src/game/mods/modPipeline.ts`, `modPipeline.test.ts`
- Modify: `src/game/campaign/runReducer.ts` — `tryUseCardAttack`, `tryUseCardAoE`, heal paths
- Modify: `src/game/descriptions/cardText.ts` — show mod-adjusted expected damage/range

**Interfaces:**
- Produces:
  ```ts
  export type ModCombatContext = {
    carrierTags: readonly string[]
    modSlots: readonly ModSlotState[]
    rng: () => number // 1-100 for procs later
  }

  export function applyDamageMods(baseDamage: number, ctx: ModCombatContext): number
  export function applyHealMods(baseHeal: number, ctx: ModCombatContext): number
  export function applyRangeMods(baseRange: number, ctx: ModCombatContext): number
  export function applyCooldownMods(baseCd: number, ctx: ModCombatContext): number
  ```

- [ ] **Step 1:** Tests — +50% damage_mult at lm=0 → 1.5×; range_add +1
- [ ] **Step 2:** Implement op walkers for damage_mult, heal_mult, range_add, cooldown_add, aoe_size_add
- [ ] **Step 3:** Integrate in card attack/heal/aoe before `BattleAction` dispatch
- [ ] **Step 4:** Run combat-related tests
- [ ] **Step 5: Commit**

---

### Task 9: L triggers — weapon on basic attack, gear on hit

**Files:**
- Create: `src/game/memento/itemProgress.ts`, `itemProgress.test.ts`
- Modify: `src/game/campaign/runReducer.ts` — on strike use roll weapon `itemLevel`; on player damage roll armor/accessory levels
- Modify: `src/game/battle/reducer.ts` or runReducer wrapper for player hit detection

**Interfaces:**
- Produces:
  ```ts
  export function applyItemUseRoll(
    item: ItemInstance,
    randomInt1to100: number,
  ): ItemInstance & { leveledUp: boolean }
  ```

- [ ] **Step 1:** Test weapon itemLevel increments on successful roll when strike used
- [ ] **Step 2:** Test armor itemLevel increments when player unit takes damage
- [ ] **Step 3:** After item level change, call `syncModSlotsForLevel` on that item
- [ ] **Step 4:** Skip progression when weapon slot empty (fists)
- [ ] **Step 5: Commit**

---

### Task 10: Proc & complex mods + battle log

**Files:**
- Modify: `src/game/mods/modPipeline.ts`
- Modify: `src/game/battle/reducer.ts` — self_heal_on_use, lifesteal, proc_extra_hit, reflect, heal_splash
- Modify: `src/game/types.ts` — extend `BattleLogEntry` for mod procs if needed

- [ ] **Step 1:** Tests for double-strike independent RNG; thorns on player hit
- [ ] **Step 2:** Implement remaining ops from spec §4.2
- [ ] **Step 3:** Log entries: `{ type: 'mod_proc', modTemplateId, label }`
- [ ] **Step 4:** Run full test suite
- [ ] **Step 5: Commit**

---

### Task 11: Passive gear mods (HP, defense, initiative)

**Files:**
- Modify: `src/game/stats/effectiveStats.ts` or `heroMaxHp.ts`
- Modify: `src/game/mods/modPipeline.ts` — `aggregatePassiveModBonuses(equippedItems)`

- [ ] **Step 1:** Test mod-hp-bonus-armor increases maxHp when armor equipped with filled mod
- [ ] **Step 2:** Wire `carrier_hp_add`, `defense_add`, `initiative_add` into effective stats at spawn/hub preview
- [ ] **Step 3:** Run tests
- [ ] **Step 4: Commit**

---

### Task 12: Inventory UI — M+, picker, remove

**Files:**
- Create: `src/features/inventory/modSlotBadges.tsx`
- Create: `src/features/inventory/ModOfferPicker.tsx`
- Modify: `src/features/inventory/InventoryCell.tsx` — `showModPendingBadge`, slot dots
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/features/inventory/EquipmentInventoryView.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx` — callbacks `onPickModOffer`, `onRemoveMod`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/inventory/inventory.css`

- [ ] **Step 1:** Remove modKillTarget UI (🎯, `onSetModKillTarget`, `modKillTarget` cell state)
- [ ] **Step 2:** M+ badge when any slot `empty` with offer
- [ ] **Step 3:** `ModOfferPicker` Modal — 3 cards, dispatch pick
- [ ] **Step 4:** Remove flow with `Modal.confirm` showing rollback L text via `rollbackCarrierLevel`
- [ ] **Step 5:** Manual check in dev server — character tab collection
- [ ] **Step 6: Commit**

---

### Task 13: Battle UI & descriptions

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx` — mod summary on card tooltip
- Modify: `src/game/descriptions/modText.ts` — `describeModCombat(templateId, lm)`
- Modify: `src/game/codex/codexText.ts`
- Modify: `src/features/battle/playerAi.ts` — remove modKillTarget preference

- [ ] **Step 1:** Card tooltip includes active mod labels + scaled values
- [ ] **Step 2:** Codex entries for new mod ids
- [ ] **Step 3:** Run tests + lint changed files
- [ ] **Step 4: Commit**

---

### Task 14: Weapon channel — strike drives weapon item

**Files:**
- Modify: `src/game/campaign/runReducer.ts` — strike uses equipped weapon template for damage (`itemLevel` + weapon modSlots)
- Create: `src/game/equipment/virtualFists.ts` — fallback when no weapon
- Modify: `src/game/content/cardTemplates.ts` — document strike as channel
- Test: `src/game/campaign/runReducer.test.ts` — strike without weapon no item progress; with sword progresses sword

- [ ] **Step 1:** Test fists fallback damage baseline
- [ ] **Step 2:** Route strike damage through weapon item level + weapon mods
- [ ] **Step 3:** Ensure strike card has no modSlots in save
- [ ] **Step 4:** Full `npm run test && npm run build`
- [ ] **Step 5: Commit**

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| 3.1 Carriers & L triggers | 7, 9, 14 |
| 3.2 Milestones config | 1 |
| 3.3 Lm victory rolls | 7 |
| 3.4 Remove mod rollback | 1, 6 |
| 4 Catalog & ops | 4, 8, 10 |
| 5 Offer of 3 | 3, 6 |
| 6 UI | 12, 13 |
| 7 Architecture / remove legacy | 2, 5 |
| 8 Migration | 5 |
| 9 Tests | per task |
| 10 Phases | A=1-5, B=6-7, C=8-11, D=12-13, E=14 |
| 11 Out of scope | mod-mana-save omitted |

## Final Verification

```bash
npm run test
npm run build
```

Manual: dev thresholds (L=5 opens slot), pick mod from 3, win battle → Lm increases, strike with/without weapon, remove mod confirms rollback.
