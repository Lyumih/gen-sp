# Passive Skills — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пассивные навыки (до 4 на героя, trigger-hook прокачка, Memento-моды), экономика дропа/магазина/таверны, Кодекс «Навыки», 3 слота умений и cooldown ×2.

**Architecture:** `PassiveInstance` + `passiveTemplates.ts` (32 шаблона); `src/game/passives/` — `passiveBonus.ts`, `passiveEngine.ts`, `equippedPassives.ts`; хуки в `battle/reducer.ts`; хаб — расширение `runReducer`, `skillAcquisition.ts`, `generateShopOffers.ts`; UI — слоты в `CardsInventoryView`, unbound в `ChestInventoryView`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, `@dnd-kit`, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-23-passive-skills-design.md`

## Global Constraints

- ≤**4** пассива на героя; после `BIND` — навсегда; снять/надеть через `passiveEquip` (4 слота)
- **L** растёт только при реальном срабатывании (`applyPassiveProgress` + `rollCardLevelUp`)
- Дроп пул: **равный шанс** из всех 32 `PASSIVE_TEMPLATES`
- Бой/магазин: **два независимых roll'а** (умение + пассив), те же %/цены что `SKILL_ACQUISITION`
- Таверна: 1 умение + **1 пассив** сразу новому герою (слот equip 0)
- Моды: общий движок; пул **`PASSIVE_MOD_TEMPLATES`**; `carrierKind: 'passive'`
- Стакинг: ≤1 `stat_flat` и ≤1 `stat_pct` на `statId` среди **надетых**
- `BattleLoadout`: **3** слота; `cooldownTurns` в `cardTemplates` **×2** (`strike` без CD)
- `SAVE_VERSION` **8 → 9**
- UI: `App.useApp().message`; emoji из `labels.ts` / semantic helpers; expedition freeze — disabled + `Alert`
- Не добавлять npm-зависимости

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Foundation** | 1–4 | типы, фабрика, бонус-математика, шаблоны |
| **B — Balance & migration** | 5–6 | 3 loadout, CD×2, save v9 |
| **C — Hub economy** | 7–9 | shop, drop, tavern, reducer actions |
| **D — Stats layer** | 10 | effectiveStats + стакинг |
| **E — Battle engine** | 11–13 | engine, hooks, victory merge |
| **F — UI & codex** | 14–17 | сундук, слоты, магазин, кодекс |
| **G — Polish** | 18 | help, описания, полный test run |

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/types.ts` | `PassiveInstance`, `PassiveEquipLoadout`, `BattleLoadout`×3, `ShopOffer`, `HubNotice`, `BattleState.passivesByUnitId` |
| `src/game/passives/passiveFactory.ts` | `createPassiveInstance`, `newPassiveId` |
| `src/game/passives/passiveBonus.ts` | `passiveTierMult`, `computePassiveFlatBonus`, `computePassivePctBonus` |
| `src/game/passives/equippedPassives.ts` | `getEquippedPassives`, `canEquipPassive`, stacking check |
| `src/game/passives/passiveProgress.ts` | `applyPassiveProgress` |
| `src/game/passives/passiveEngine.ts` | `firePassives`, proc resolution |
| `src/game/passives/mergeBattlePassives.ts` | merge L/modSlots после боя |
| `src/game/content/passiveTemplates.ts` | 32 шаблона |
| `src/game/content/passiveModTemplates.ts` | 12 пассив-модов |
| `src/game/config/skillAcquisition.ts` | +passive roll/price/pick |
| `src/game/shop/generateShopOffers.ts` | +passive offer roll |
| `src/game/campaign/runReducer.ts` | bind/equip/sell/mod actions, drop, tavern |
| `src/game/campaign/applyVictoryModRolls.ts` | +equipped passives Lm |
| `src/game/campaign/battleSnapshot.ts` | passives в party snapshot |
| `src/game/battle/reducer.ts` | trigger hooks |
| `src/game/stats/effectiveStats.ts` | passive stat bonuses |
| `src/game/mods/carrierTags.ts` | `resolveCarrierTags('passive', …)` |
| `src/game/memento/carrierLevelChange.ts` | `kind: 'passive'`, `PASSIVE_MOD_OFFER_POOL` |
| `src/game/codex/registry.ts` | category `passive` |
| `src/features/codex/codexShared.ts` | порядок и label |
| `src/game/descriptions/passiveText.ts` | tooltip/description |
| `src/features/inventory/CardsInventoryView.tsx` | 3 loadout + 4 passive slots |
| `src/features/inventory/ChestInventoryView.tsx` | unbound passives |
| `src/features/inventory/ShopOffersGrid.tsx` | passive slot |
| `src/game/persistence/migrate.ts` | v8→v9 |

---

### Task 1: Core types and passive factory

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/passives/passiveFactory.ts`
- Create: `src/game/passives/passiveFactory.test.ts`
- Modify: `src/game/character/createCharacter.ts`
- Modify: `src/game/campaign/chestDefaults.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PassiveInstance = {
    id: string
    templateId: string
    global_level: number
    uses_count: number
    modSlots: ModSlotState[]
  }
  export type PassiveEquipLoadout = [string | null, string | null, string | null, string | null]
  // Character: passives: PassiveInstance[]; passiveEquip: PassiveEquipLoadout
  // CampaignChest: unboundPassives: PassiveInstance[]
  export function createPassiveInstance(templateId: string, id?: string): PassiveInstance
  export function newPassiveId(): string
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/game/passives/passiveFactory.test.ts
import { describe, expect, it } from 'vitest'
import { createPassiveInstance } from './passiveFactory'

describe('createPassiveInstance', () => {
  it('creates level-1 passive with empty mod slots', () => {
    const p = createPassiveInstance('warrior_fortitude')
    expect(p.templateId).toBe('warrior_fortitude')
    expect(p.global_level).toBe(1)
    expect(p.uses_count).toBe(0)
    expect(p.modSlots).toEqual([])
    expect(p.id.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/passives/passiveFactory.test.ts`

- [ ] **Step 3: Implement types + factory**

`createCharacter` defaults: `passives: []`, `passiveEquip: [null, null, null, null]`.

`EMPTY_CHEST`: `{ items: [], unboundCards: [], unboundPassives: [] }`.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/passives/passiveFactory.ts src/game/passives/passiveFactory.test.ts src/game/character/createCharacter.ts src/game/campaign/chestDefaults.ts
git commit -m "feat(passives): add PassiveInstance types and factory"
```

---

### Task 2: Passive bonus math

**Files:**
- Create: `src/game/passives/passiveBonus.ts`
- Create: `src/game/passives/passiveBonus.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function passiveTierMult(level: number): number
  export function computePassiveFlatBonus(baseFlat: number, level: number): number
  export function computePassivePctBonus(baseStat: number, basePct: number, level: number): number
  ```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  computePassiveFlatBonus,
  computePassivePctBonus,
  passiveTierMult,
} from './passiveBonus'

describe('passiveBonus', () => {
  it('tier mult steps every 100 levels', () => {
    expect(passiveTierMult(0)).toBe(1)
    expect(passiveTierMult(99)).toBe(1)
    expect(passiveTierMult(100)).toBe(1.5)
    expect(passiveTierMult(200)).toBe(2)
  })

  it('flat bonus scales with tier', () => {
    expect(computePassiveFlatBonus(2, 0)).toBe(2)
    expect(computePassiveFlatBonus(2, 100)).toBe(3)
  })

  it('pct bonus scales with tier', () => {
    expect(computePassivePctBonus(20, 15, 0)).toBe(3)
    expect(computePassivePctBonus(20, 15, 100)).toBe(5)
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

```ts
export function passiveTierMult(level: number): number {
  const tier = Math.floor(level / 100)
  return 1 + 0.5 * tier
}

export function computePassiveFlatBonus(baseFlat: number, level: number): number {
  return Math.round(baseFlat * passiveTierMult(level))
}

export function computePassivePctBonus(
  baseStat: number,
  basePct: number,
  level: number,
): number {
  return Math.round((baseStat * basePct) / 100 * passiveTierMult(level))
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

---

### Task 3: Passive templates (32 skills)

**Files:**
- Create: `src/game/content/passiveTemplates.ts`
- Create: `src/game/content/passiveTemplates.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PassiveTrigger = 'on_strike' | 'on_card_attack' | 'on_card_heal' | 'on_regen_tick' | 'on_damaged' | 'on_move' | 'on_turn_start' | 'on_kill'
  export type PassiveEffectKind = 'stat_flat' | 'stat_pct' | 'proc' | 'conditional'
  export type PassiveTemplate = { /* spec §3.4 */ }
  export const PASSIVE_TEMPLATES: Readonly<Record<string, PassiveTemplate>>
  export const PASSIVE_TEMPLATE_IDS: readonly string[]
  export function getPassiveTemplate(id: string): PassiveTemplate | undefined
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PASSIVE_TEMPLATE_IDS, PASSIVE_TEMPLATES, getPassiveTemplate } from './passiveTemplates'

const EXPECTED_IDS = [
  'warrior_fortitude', 'warrior_vigor', 'warrior_riposte', 'warrior_battle_line',
  'mage_arcane_focus', 'mage_mana_well', 'mage_ignite', 'mage_frost_ward',
  'ranger_keen_eye', 'ranger_swiftness', 'ranger_double_tap', 'ranger_far_sight',
  'healer_gentle_hands', 'healer_vitality', 'healer_splash_heal', 'healer_renewal',
  'rogue_precision', 'rogue_agility', 'rogue_venom', 'rogue_smoke_veil',
  'paladin_aegis', 'paladin_faith', 'paladin_holy_reflect', 'paladin_intercession',
  'warlock_dark_power', 'warlock_soul_harvest', 'warlock_spread_plague', 'warlock_life_tap',
  'berserker_rage', 'berserker_bloodlust', 'berserker_twin_cleave', 'berserker_desperation',
] as const

describe('passiveTemplates', () => {
  it('has exactly 32 enabled templates per spec', () => {
    expect(PASSIVE_TEMPLATE_IDS).toHaveLength(32)
    for (const id of EXPECTED_IDS) {
      expect(PASSIVE_TEMPLATES[id]).toBeDefined()
      expect(PASSIVE_TEMPLATES[id]?.enabled !== false).toBe(true)
    }
  })

  it('stat passives have statId and levelTrigger', () => {
    const fort = getPassiveTemplate('warrior_fortitude')!
    expect(fort.effectKind).toBe('stat_flat')
    expect(fort.statId).toBe('defense')
    expect(fort.levelTrigger).toBe('on_damaged')
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement all 32 entries** per spec §9.1–§9.8. Minimal `ops` for proc entries (reuse existing `ModOp` kinds: `proc_extra_hit`, `heal_splash`, `reflect_on_hit`, `lifesteal_pct`, etc.). Each template: `label`, `semanticEmojiId`, `classFlavor`, `descriptionRu`, `synergies`.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

---

### Task 4: Passive mod templates

**Files:**
- Create: `src/game/content/passiveModTemplates.ts`
- Create: `src/game/content/passiveModTemplates.test.ts`
- Modify: `src/game/mods/carrierTags.ts`
- Modify: `src/game/memento/carrierLevelChange.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PASSIVE_MOD_TEMPLATES: readonly ModTemplate[]
  export const PASSIVE_MOD_OFFER_POOL: readonly ModTemplate[]
  export function resolveCarrierTags(kind: 'card' | 'item' | 'passive', templateId: string): readonly string[]
  // afterCarrierLevelChange kind: 'card' | 'item' | 'passive'
  ```

- [ ] **Step 1: Test — 12 mod ids exist, all require passive-friendly tags**

```ts
const IDS = [
  'pmod-flat-up', 'pmod-pct-up', 'pmod-proc-up', 'pmod-move-range',
  'pmod-heal-splash-up', 'pmod-counter-up', 'pmod-regen-up', 'pmod-reflect-up',
  'pmod-lifesteal-up', 'pmod-range-up', 'pmod-thorns', 'pmod-initiative',
]
```

- [ ] **Step 2: Implement mods** with `requires` tags like `passive`, `stat_flat`, `proc`, `on_move` derived in `resolveCarrierTags` from passive template.

- [ ] **Step 3: `carrierLevelChange`** — when `kind === 'passive'`, use `PASSIVE_MOD_OFFER_POOL` instead of `MOD_OFFER_POOL`.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

---

### Task 5: Three skill loadout slots + cooldown ×2

**Files:**
- Modify: `src/game/types.ts` (`BattleLoadout`)
- Modify: `src/game/campaign/playerCardsFromLoadout.ts`
- Modify: `src/game/content/cardTemplates.ts` (all `cooldownTurns` ×2)
- Modify: `src/features/inventory/CardsInventoryView.tsx` (`slotIndex: 0 | 1 | 2`)
- Modify: `src/game/campaign/runReducer.ts` (`SET_BATTLE_LOADOUT`)
- Modify: tests referencing 2-slot loadout

**Interfaces:**
- Produces: `export type BattleLoadout = [string | null, string | null, string | null]`

- [ ] **Step 1: Update `cardTemplates.test` / `cardCooldown.test` expectations** (e.g. fireball CD 3→6).

- [ ] **Step 2: Change types and `playerCardsFromLoadout`** to iterate 3 slots.

- [ ] **Step 3: Double every `cooldownTurns`** in `cardTemplates.ts` (skip `strike`).

- [ ] **Step 4: UI third loadout droppable** in `CardsInventoryView`.

- [ ] **Step 5: Run** `npm run test -- src/game/battle/cardCooldown.test.ts src/game/campaign/playerCardsFromLoadout.test.ts`

- [ ] **Step 6: Commit**

---

### Task 6: Save migration v8 → v9

**Files:**
- Modify: `src/game/persistence/schema.ts` (`SAVE_VERSION = 9`)
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

**Interfaces:**
- Produces: migrated saves with `passives: []`, `passiveEquip: [null×4]`, `unboundPassives: []`, `battleLoadout` padded to 3

- [ ] **Step 1: Failing migration test**

```ts
it('v8→v9 adds passives and extends loadout to 3', () => {
  const v8 = /* fixture with 2-slot loadout, no passives */
  const out = migrateSave(v8)
  expect(out.version).toBe(9)
  expect(hero(out).passives).toEqual([])
  expect(hero(out).passiveEquip).toEqual([null, null, null, null])
  expect(hero(out).battleLoadout).toHaveLength(3)
})
```

- [ ] **Step 2: Implement migration branch**

- [ ] **Step 3: Run migrate tests — PASS**

- [ ] **Step 4: Commit**

---

### Task 7: Acquisition config + shop passive offer

**Files:**
- Modify: `src/game/config/skillAcquisition.ts`
- Modify: `src/game/config/skillAcquisition.test.ts`
- Modify: `src/game/shop/generateShopOffers.ts`
- Modify: `src/game/shop/generateShopOffers.test.ts`
- Modify: `src/game/types.ts` (`ShopOffer`)

**Interfaces:**
- Produces:
  ```ts
  shopPassiveOfferChance: number  // same value as shopSkillOfferChance
  shopPassivePrice: number
  export function rollShopPassiveOffer(rngUnit: number, cfg): boolean
  export function pickRandomPassiveTemplateId(rng: () => number): string
  export function sellPriceForPassive(cfg): number
  ```

- [ ] **Step 1: Tests for passive pick + independent shop roll**

- [ ] **Step 2: Extend config; `generateShopOffers` appends `{ kind: 'passive', templateId }` on separate roll**

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

---

### Task 8: Hub reducer — bind, equip, sell, mod pick

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`
- Create: `src/game/passives/equippedPassives.ts`
- Create: `src/game/passives/equippedPassives.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function canEquipPassive(
    passives: readonly PassiveInstance[],
    passiveEquip: PassiveEquipLoadout,
    passiveId: string,
    slotIndex: 0 | 1 | 2 | 3,
  ): { ok: true } | { ok: false; reason: string }
  ```
- Actions: `BIND_PASSIVE_TO_CHARACTER`, `SET_PASSIVE_EQUIP`, `SELL_UNBOUND_PASSIVE`, extend `PICK_MOD_OFFER` / `REMOVE_MOD` with `carrierKind: 'passive'`

- [ ] **Step 1: Tests — bind from chest; reject 5th; equip conflict on duplicate stat_flat defense; sell unbound**

- [ ] **Step 2: Implement `equippedPassives` stacking rules**

- [ ] **Step 3: Implement reducer cases** (mirror card bind/sell/mod patterns)

- [ ] **Step 4: Run `runReducer.test.ts` — PASS**

- [ ] **Step 5: Commit**

---

### Task 9: Battle drop, tavern hire, hub notices

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`finalizeVictory`, `HIRE_TAVERN_CANDIDATE`)
- Modify: `src/game/types.ts` (`HubNotice`)
- Modify: `src/features/campaign/CampaignHub.tsx`

**Interfaces:**
- `HubNotice`: `| { kind: 'skill_drop'; templateId: string } | { kind: 'passive_drop'; templateId: string }`

- [ ] **Step 1: Test — victory can drop both skill and passive with separate rng calls**

- [ ] **Step 2: `finalizeVictory` — second roll → `unboundPassives`; codex `passive:` entry**

- [ ] **Step 3: Tavern — `createPassiveInstance` + `passives: [p]`, `passiveEquip: [p.id, null, null, null]`**

- [ ] **Step 4: Hub notice message for `passive_drop`**

- [ ] **Step 5: Commit**

---

### Task 10: Passive stat bonuses in effectiveStats

**Files:**
- Create: `src/game/passives/passiveStatBonuses.ts`
- Create: `src/game/passives/passiveStatBonuses.test.ts`
- Modify: `src/game/stats/effectiveStats.ts`

**Interfaces:**
- Produces:
  ```ts
  export function aggregatePassiveSkillStatBonuses(
    passives: readonly PassiveInstance[],
    passiveEquip: PassiveEquipLoadout,
    baseStats: BaseStats,
  ): Partial<Record<StatId, number>>
  ```

- [ ] **Step 1: Test — equipped flat defense adds bonus; unequipped does not; pct uses baseStat**

- [ ] **Step 2: Wire into `computeEffectiveStats`** (add param or overload with optional passives)

- [ ] **Step 3: Update call sites** (`HeroProfileContent`, battle tooltips) to pass character passives

- [ ] **Step 4: Commit**

---

### Task 11: Passive progress + engine core

**Files:**
- Create: `src/game/passives/passiveProgress.ts`
- Create: `src/game/passives/passiveEngine.ts`
- Create: `src/game/passives/passiveEngine.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function applyPassiveProgress<T extends Pick<PassiveInstance, 'global_level' | 'uses_count'>>(
    passive: T,
    randomInt1to100: number,
  ): T & { leveledUp: boolean; effectTriggered: boolean }

  export type PassiveFireResult = {
    passives: PassiveInstance[]
    log: BattleLogEntry[]
    combatPatches: /* damage/heal side effects */
  }

  export function firePassives(input: {
    trigger: PassiveTrigger
    passives: readonly PassiveInstance[]
    passiveEquip: PassiveEquipLoadout
    actor: Unit
    battle: BattleState
    rng: () => number
    randomInt1to100: () => number
  }): PassiveFireResult
  ```

- [ ] **Step 1: Test — proc only levels on success; stat_flat levels on matching trigger**

- [ ] **Step 2: Implement progress (mirror `applyCardUse`)**

- [ ] **Step 3: Implement engine MVP** — stat triggers mark triggered; proc rolls `procChance`; defer complex conditional to Task 12

- [ ] **Step 4: Commit**

---

### Task 12: Battle integration — state, hooks, merge, victory Lm

**Files:**
- Modify: `src/game/types.ts` (`BattleState.passivesByUnitId`, `BattleLogEntry`)
- Modify: `src/game/campaign/battleSnapshot.ts`
- Modify: `src/game/battle/reducer.ts`
- Create: `src/game/passives/mergeBattlePassives.ts`
- Modify: `src/game/campaign/applyVictoryModRolls.ts`
- Modify: `src/game/battle/playerCards.ts` or new `mergeBattlePassivesToParty`

**Interfaces:**
- Battle start: populate `passivesByUnitId[unitId]` from snapshot equipped passives
- Hooks after: move, strike, card uses, damage to player, turn start, kill
- `mergeBattlePassivesIntoCollection` analog of cards
- Victory: `applyVictoryModRollsToCarrier` on **equipped** passives only

- [ ] **Step 1: Test reducer — `on_damaged` riposte proc adds log entry `passive_proc`**

- [ ] **Step 2: Wire hooks in `battle/reducer.ts`** (minimal set: `on_strike`, `on_damaged`, `on_move`, `on_card_attack`, `on_card_heal`)

- [ ] **Step 3: Merge passives on victory alongside cards**

- [ ] **Step 4: Extend `applyVictoryModRollsToPartyBattle` for character.passives where id in passiveEquip**

- [ ] **Step 5: Run battle tests — PASS**

- [ ] **Step 6: Commit**

---

### Task 13: passiveText descriptions

**Files:**
- Create: `src/game/descriptions/passiveText.ts`
- Create: `src/game/descriptions/passiveText.test.ts`

**Interfaces:**
- Produces: `describePassiveStats(passive, character, campaign)`, `getPassiveDisplayLabel(templateId)`

- [ ] **Step 1: Test tooltip lines include trigger + bonus at L and L=100 preview**

- [ ] **Step 2: Implement using `passiveBonus` + `BASE_STAT_META` emoji**

- [ ] **Step 3: Commit**

---

### Task 14: Codex category «Навыки»

**Files:**
- Modify: `src/game/codex/registry.ts`
- Modify: `src/features/codex/codexShared.ts`
- Modify: `src/game/codex/discovery.ts` (if needed)
- Modify: `src/game/codex/registry.test.ts`

- [ ] **Step 1: Test — `codexEntriesByCategory('passive')` length 32; order after `card`**

- [ ] **Step 2: Register passives; label «Навыки»; hint text**

- [ ] **Step 3: Discovery on bind and tavern**

- [ ] **Step 4: Commit**

---

### Task 15: Chest UI — unbound passives

**Files:**
- Modify: `src/features/inventory/ChestInventoryView.tsx`
- Modify: `src/features/inventory/inventoryDnD.ts` (`chest:passive:`)
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: Render `chest.unboundPassives` grid** with bind + sell (price `sellPriceForPassive`)

- [ ] **Step 2: Dispatch `BIND_PASSIVE_TO_CHARACTER`**

- [ ] **Step 3: Manual smoke — bind when <4 passives**

- [ ] **Step 4: Commit**

---

### Task 16: Character cards UI — 4 passive equip slots

**Files:**
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/features/inventory/inventory.css` (if needed)
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`

- [ ] **Step 1: Section «Навыки»** — 4 droppable slots below cards divider

- [ ] **Step 2: Drag from character's `passives` list** (owned bound passives only); `SET_PASSIVE_EQUIP`

- [ ] **Step 3: Mod picker** — extend `carrierKind: 'passive'` in `ModOfferPicker`

- [ ] **Step 4: Show stacking conflict on drag reject**

- [ ] **Step 5: Commit**

---

### Task 17: Shop UI — passive offer slot

**Files:**
- Modify: `src/features/inventory/ShopOffersGrid.tsx`
- Modify: `src/features/campaign/CampaignShopTab.tsx`
- Modify: `src/game/campaign/runReducer.ts` (`BUY_SHOP_OFFER` passive branch)

- [ ] **Step 1: Render `kind:'passive'`** with price `shopPassivePrice` → chest `unboundPassives`

- [ ] **Step 2: Test buy flow in `runReducer.test.ts`**

- [ ] **Step 3: Commit**

---

### Task 18: Help + verification

**Files:**
- Modify: `src/game/help/articles.ts` (optional short «Навыки» section)
- Run full test suite

- [ ] **Step 1:** `npm run test`
- [ ] **Step 2:** `npm run build`
- [ ] **Step 3:** Commit any help copy

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| §2 decisions | All tasks |
| §3 data model | 1, 6 |
| §4 progression | 8, 11, 12 |
| §5 math | 2, 10, 13 |
| §6 battle engine | 11, 12 |
| §7 economy | 7, 9, 17 |
| §8 UI | 14–17 |
| §9 catalog | 3 |
| §10 passive mods | 4, 8, 12 |
| §11 loadout/CD | 5 |
| §12 actions | 8 |
| §13 migration | 6 |
| §14 guardrails | 8, 16 |
| §15 tests | per task |
| §16 phase 2 enemies | — (out of scope) |

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-23-passive-skills.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — отдельный subagent на каждый Task, ревью между задачами  
2. **Inline Execution** — выполнение в этой сессии по Task 1→18 с чекпоинтами

**Which approach?**
