# Stat Scaling Balance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Унифицировать скейлинг (+1%/ур → ×2 на 100) для статов героя и перевести бонусы экипировки с плоских уровней на отдельные множители `gearHpMult` / `gearDamageMult`.

**Architecture:** Единый хелпер `scalePercentPerLevel` в `balance.ts`; агрегаты экипировки возвращают множители ≥ 1; урон/heal = `resolvePercentValue(L) × gearMult` без gear в `L`; strike использует `weapon.itemLevel` как L и `gearStrikeDamageMult` (только armor+accessory). Save v7→v8.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5.

**Spec:** `docs/superpowers/specs/2026-06-23-stat-scaling-balance-design.md`

## Global Constraints

- `UNIT_STAT_LEVEL_COEFF = 0.01`, `UNIT_STAT_WORLD_POWER_COEFF = 0.01`
- `PER_LEVEL_RATE = 0.01` — +1% за уровень → ×2 на level 100
- Item fields: `hpPctPerLevel`, `damagePctPerLevel` (1:1 числа из старых полей)
- `gearHpMult = 1 + Σ(hpPctPerLevel × itemLevel / 100)` — все надетые слоты
- `gearDamageMult = 1 + Σ(damagePctPerLevel × itemLevel / 100)` — все слоты (skills/heal)
- `gearStrikeDamageMult` — только `armor` + `accessory` (strike не double-dip weapon L)
- `attack` / `magicPower` **не** в формуле урона карт (вне скоупа)
- `%%CAP` / `%%-P` / `rollCardLevelUp` / mod milestones — без изменений
- `SAVE_VERSION` **8** (from 7)
- `App.useApp()` для сообщений; emoji из `src/game/ui/labels.ts`
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Core math** | 1–2 | `scalePercentPerLevel`, coeffs, item template rename |
| **B — Aggregates** | 3 | `aggregateGearHpMult`, `aggregateGearDamageMult`, `aggregateGearStrikeDamageMult` |
| **C — HP pipeline** | 4 | `effectiveStats`, `scenarios` spawn HP |
| **D — Combat** | 5 | `BattleState`, `runReducer`, heal, AI |
| **E — UI** | 6–7 | `itemText`, `cardText`, profile, battle, equip preview |
| **F — Persistence** | 8 | migrate v8, full test run |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/balance.ts` | `PER_LEVEL_RATE`, `scalePercentPerLevel`, updated coeffs |
| `src/game/balance.test.ts` | unit stat + helper tests |
| `src/game/content/itemTemplates.ts` | renamed pct fields on all templates |
| `src/game/equipment/aggregates.ts` | mult aggregators (replace flat sums) |
| `src/game/equipment/aggregates.test.ts` | mult tests incl. strike filter |
| `src/game/stats/effectiveStats.ts` | HP via `gearHpMult`; drop flat health from `computeGearStatBonuses` |
| `src/game/stats/effectiveStats.test.ts` | HP mult expectations |
| `src/game/stats/previewCandidateStats.ts` | tavern preview via pct at item level 1 |
| `src/game/types.ts` | `gearDamageMult`, `gearStrikeDamageMult` on `BattleState` |
| `src/game/campaign/scenarios.ts` | compute both mults at battle start |
| `src/game/campaign/runReducer.ts` | damage/heal without gear in L |
| `src/game/content/cardAttackDamage.ts` | update doc comment only |
| `src/game/content/cardHealAmount.ts` | update doc comment; mult applied by caller |
| `src/game/descriptions/cardText.ts` | mult chain tooltips |
| `src/game/descriptions/itemText.ts` | `%` copy, mult display |
| `src/features/battle/playerAi.ts` | `base × gearDamageMult` |
| `src/features/inventory/previewEquipDelta.ts` | delta maxHp + damage mult |
| `src/features/profile/HeroProfileContent.tsx` | show mults not flat +N |
| `src/features/battle/BattleScreen.tsx` | `gearDamageMult` / strike mult in UI |
| `src/features/inventory/CardsInventoryView.tsx` | pass mults to `describeCardCombatStats` |
| `src/features/campaign/CampaignCharacterTab.tsx` | hub preview mults |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 8` |
| `src/game/persistence/migrate.ts` | v7→v8 battle field migration |

---

### Task 1: `scalePercentPerLevel` and unit stat coefficients

**Files:**
- Modify: `src/game/balance.ts`
- Modify: `src/game/balance.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PER_LEVEL_RATE = 0.01
  export const UNIT_STAT_LEVEL_COEFF = 0.01
  export const UNIT_STAT_WORLD_POWER_COEFF = 0.01
  export function scalePercentPerLevel(base: number, level: number, rate?: number): number
  export function computeUnitStat(input: UnitStatInput): number  // unchanged signature
  ```

- [ ] **Step 1: Write failing tests**

Replace `src/game/balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  computeUnitStat,
  PER_LEVEL_RATE,
  scalePercentPerLevel,
  UNIT_STAT_LEVEL_COEFF,
  UNIT_STAT_WORLD_POWER_COEFF,
} from './balance'

describe('scalePercentPerLevel', () => {
  it('doubles base at level 100 with default rate', () => {
    expect(scalePercentPerLevel(10, 100)).toBe(20)
    expect(scalePercentPerLevel(40, 0)).toBe(40)
  })
})

describe('computeUnitStat', () => {
  it('uses 1% per unitLevel and worldPower', () => {
    expect(UNIT_STAT_LEVEL_COEFF).toBe(0.01)
    expect(UNIT_STAT_WORLD_POWER_COEFF).toBe(0.01)
    expect(PER_LEVEL_RATE).toBe(0.01)
    expect(computeUnitStat({ baseStat: 10, unitLevel: 100, worldPower: 0 })).toBe(20)
    expect(computeUnitStat({ baseStat: 10, unitLevel: 0, worldPower: 100 })).toBe(20)
    expect(computeUnitStat({ baseStat: 10, unitLevel: 2, worldPower: 1 })).toBe(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/balance.test.ts`
Expected: FAIL (`scalePercentPerLevel` not defined; `computeUnitStat` returns 11 not 10)

- [ ] **Step 3: Implement**

Update `src/game/balance.ts`:

```ts
/**
 * Формула стата §7: round(base × (1 + α·unitLevel + β·worldPower))
 * Коэффициенты — один источник правды для баланса MVP.
 */
export const PER_LEVEL_RATE = 0.01
export const UNIT_STAT_LEVEL_COEFF = PER_LEVEL_RATE
export const UNIT_STAT_WORLD_POWER_COEFF = PER_LEVEL_RATE

export type UnitStatInput = {
  baseStat: number
  unitLevel: number
  worldPower: number
}

/** round(base × (1 + level × rate)); default rate = 1% per level. */
export function scalePercentPerLevel(
  base: number,
  level: number,
  rate = PER_LEVEL_RATE,
): number {
  return Math.round(base * (1 + level * rate))
}

export function computeUnitStat(input: UnitStatInput): number {
  const { baseStat, unitLevel, worldPower } = input
  return Math.round(
    baseStat *
      (1 +
        UNIT_STAT_LEVEL_COEFF * unitLevel +
        UNIT_STAT_WORLD_POWER_COEFF * worldPower),
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/balance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/balance.ts src/game/balance.test.ts
git commit -m "refactor(balance): 1% per level scaling helper and coeffs"
```

---

### Task 2: Rename item template fields

**Files:**
- Modify: `src/game/content/itemTemplates.ts`

**Interfaces:**
- Produces: `ItemTemplate.hpPctPerLevel`, `ItemTemplate.damagePctPerLevel` (replaces `hpBonusPerItemLevel`, `cardLevelBonusPerItemLevel`)

- [ ] **Step 1: Rename type and all template entries**

In `ItemTemplate` type:

```ts
hpPctPerLevel: number
damagePctPerLevel: number
```

Replace every `hpBonusPerItemLevel` → `hpPctPerLevel` and `cardLevelBonusPerItemLevel` → `damagePctPerLevel` in `ITEM_TEMPLATES` (values unchanged).

- [ ] **Step 2: Fix compile errors from rename**

Run: `npm run build`
Expected: errors listing files still using old field names — note them for Tasks 3–7 (do not fix all in this task; only `itemTemplates.ts` must be clean).

- [ ] **Step 3: Commit**

```bash
git add src/game/content/itemTemplates.ts
git commit -m "refactor(items): rename gear bonus fields to pct per level"
```

---

### Task 3: Gear mult aggregators

**Files:**
- Modify: `src/game/equipment/aggregates.ts`
- Modify: `src/game/equipment/aggregates.test.ts`

**Interfaces:**
- Consumes: `ItemTemplate.hpPctPerLevel`, `ItemTemplate.damagePctPerLevel`
- Produces:
  ```ts
  export function aggregateGearHpMult(items, equipment, getTemplate): number
  export function aggregateGearDamageMult(items, equipment, getTemplate): number
  export function aggregateGearStrikeDamageMult(items, equipment, getTemplate): number
  ```
  All return `number >= 1`; empty equipment → `1`.

- [ ] **Step 1: Write failing tests**

Replace `src/game/equipment/aggregates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'
import { EMPTY_EQUIPMENT } from './equipmentOrder'
import {
  aggregateGearDamageMult,
  aggregateGearHpMult,
  aggregateGearStrikeDamageMult,
} from './aggregates'

function tmpl(p: Partial<ItemTemplate> & Pick<ItemTemplate, 'id' | 'slot'>): ItemTemplate {
  return {
    shopPrice: 1,
    hpPctPerLevel: 0,
    damagePctPerLevel: 0,
    label: p.id,
    tags: [],
    semanticEmojiId: 'sword-red',
    ...p,
  }
}

describe('gear mult aggregators', () => {
  it('returns 1 for empty equipment', () => {
    const get = (): undefined => undefined
    expect(aggregateGearHpMult([], EMPTY_EQUIPMENT, get)).toBe(1)
    expect(aggregateGearDamageMult([], EMPTY_EQUIPMENT, get)).toBe(1)
    expect(aggregateGearStrikeDamageMult([], EMPTY_EQUIPMENT, get)).toBe(1)
  })

  it('sums pct contributions into mult', () => {
    const items: ItemInstance[] = [
      { id: 'i1', templateId: 't_w', itemLevel: 2, modSlots: [] },
      { id: 'i2', templateId: 't_a', itemLevel: 3, modSlots: [] },
    ]
    const equipment = { ...EMPTY_EQUIPMENT, weapon: 'i1', armor: 'i2' }
    const catalog: Record<string, ItemTemplate> = {
      t_w: tmpl({ id: 't_w', slot: 'weapon', damagePctPerLevel: 5 }),
      t_a: tmpl({ id: 't_a', slot: 'armor', hpPctPerLevel: 4 }),
    }
    const get = (id: string) => catalog[id]
    expect(aggregateGearHpMult(items, equipment, get)).toBe(1 + (4 * 3) / 100)
    expect(aggregateGearDamageMult(items, equipment, get)).toBe(1 + (5 * 2) / 100)
  })

  it('strike damage mult excludes weapon slot', () => {
    const items: ItemInstance[] = [
      { id: 'i1', templateId: 't_w', itemLevel: 10, modSlots: [] },
      { id: 'i2', templateId: 't_r', itemLevel: 10, modSlots: [] },
    ]
    const equipment = { ...EMPTY_EQUIPMENT, weapon: 'i1', accessory: 'i2' }
    const catalog: Record<string, ItemTemplate> = {
      t_w: tmpl({ id: 't_w', slot: 'weapon', damagePctPerLevel: 10 }),
      t_r: tmpl({ id: 't_r', slot: 'accessory', damagePctPerLevel: 2 }),
    }
    const get = (id: string) => catalog[id]
    expect(aggregateGearDamageMult(items, equipment, get)).toBe(1 + (10 * 10 + 2 * 10) / 100)
    expect(aggregateGearStrikeDamageMult(items, equipment, get)).toBe(1 + (2 * 10) / 100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/equipment/aggregates.test.ts`
Expected: FAIL (old exports / wrong field names)

- [ ] **Step 3: Implement**

Replace `src/game/equipment/aggregates.ts`:

```ts
import type { EquipmentSlot, ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'
import { EQUIPMENT_ROLL_ORDER } from './equipmentOrder'

const STRIKE_DAMAGE_SLOTS: readonly EquipmentSlot[] = ['armor', 'accessory']

function sumPctMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
  slots: readonly EquipmentSlot[],
  pickPct: (t: ItemTemplate) => number,
): number {
  let sum = 0
  for (const slot of slots) {
    const itemId = equipment[slot]
    if (itemId === null) continue
    const inst = items.find((i) => i.id === itemId)
    if (!inst) continue
    const t = getTemplate(inst.templateId)
    if (!t) continue
    sum += pickPct(t) * inst.itemLevel
  }
  return 1 + sum / 100
}

export function aggregateGearHpMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, EQUIPMENT_ROLL_ORDER, (t) => t.hpPctPerLevel)
}

export function aggregateGearDamageMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, EQUIPMENT_ROLL_ORDER, (t) => t.damagePctPerLevel)
}

export function aggregateGearStrikeDamageMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, STRIKE_DAMAGE_SLOTS, (t) => t.damagePctPerLevel)
}
```

Remove `aggregateGearHpBonus` and `aggregateGearCardLevelBonus`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/equipment/aggregates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/equipment/aggregates.ts src/game/equipment/aggregates.test.ts
git commit -m "refactor(gear): replace flat gear bonuses with pct mult aggregators"
```

---

### Task 4: HP via `gearHpMult`

**Files:**
- Modify: `src/game/stats/effectiveStats.ts`
- Modify: `src/game/stats/effectiveStats.test.ts`
- Modify: `src/game/stats/previewCandidateStats.ts`

**Interfaces:**
- Consumes: `aggregateGearHpMult`
- Produces:
  ```ts
  export function computeGearHpMult(items, equipment, getTemplate): number
  export function computeCharacterMaxHp(member, worldPower, getTemplate): number
  // computeGearStatBonuses no longer includes flat health
  ```

- [ ] **Step 1: Update failing HP test**

In `src/game/stats/effectiveStats.test.ts`, change expectations:

```ts
it('scales base stat with unitLevel and worldPower', () => {
  expect(computeEffectiveStat(sampleBaseStats, 'health', 1, 0)).toBe(Math.round(20 * 1.01))
})

it('uses character base health not scenario heroBaseHpStat', () => {
  const hp = computeCharacterMaxHp(/* ... same setup, itemLevel 1 leather ... */)
  const scaledBase = Math.round(20 * (1 + 0.01 + 0))
  const gearMult = 1 + (2 * 1) / 100
  const modHp = 3
  expect(hp).toBe(Math.round(scaledBase * gearMult) + modHp)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/stats/effectiveStats.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `effectiveStats.ts`**

```ts
import { aggregateGearHpMult } from '../equipment/aggregates'

export function computeGearHpMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return aggregateGearHpMult(items, equipment, getTemplate)
}

export function computeGearStatBonuses(...) {
  const passive = aggregatePassiveModBonuses(getEquippedItems(items, equipment))
  return {
    defense: passive.defense,
    initiative: passive.initiative,
    // flat mod HP applied after mult in computeCharacterMaxHp
    health: passive.health,
  }
}

export function computeCharacterMaxHp(member, worldPower, getTemplate): number {
  const scaled = computeUnitStat({
    baseStat: member.baseStats.health,
    unitLevel: member.unitLevel,
    worldPower,
  })
  const gearMult = computeGearHpMult(member.items, member.equipment, getTemplate)
  const passiveHp = computeGearStatBonuses(member.items, member.equipment, getTemplate).health ?? 0
  return Math.round(scaled * gearMult) + passiveHp
}
```

Update `previewCandidateStats.ts`:

```ts
export function previewGearHpMult(
  previewGear: Partial<Record<EquipmentSlot, string>>,
): number {
  let sum = 0
  for (const templateId of Object.values(previewGear)) {
    if (!templateId) continue
    const t = getItemTemplate(templateId)
    if (t) sum += t.hpPctPerLevel // item level 1 at hire preview
  }
  return 1 + sum / 100
}

export function previewCandidateEffectiveStats(...) {
  const scaled = computeEffectiveStats(baseStats, 1, worldPower)
  return {
    ...scaled,
    health: Math.round(scaled.health * previewGearHpMult(previewGear)),
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/stats/effectiveStats.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/stats/effectiveStats.ts src/game/stats/effectiveStats.test.ts src/game/stats/previewCandidateStats.ts
git commit -m "refactor(stats): apply gear HP as percent mult on scaled health"
```

---

### Task 5: Combat damage/heal pipeline

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/campaign/scenarios.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/content/cardAttackDamage.ts` (comment)
- Modify: `src/game/content/cardHealAmount.ts` (comment)
- Modify: `src/features/battle/playerAi.ts`
- Modify: `src/game/campaign/runReducer.test.ts` (and other battle tests using `gearCardLevelBonus`)

**Interfaces:**
- Consumes: `aggregateGearDamageMult`, `aggregateGearStrikeDamageMult`
- Produces on `BattleState`:
  ```ts
  gearDamageMult: number       // default 1
  gearStrikeDamageMult: number // default 1
  ```

- [ ] **Step 1: Update `BattleState` type**

In `src/game/types.ts`, replace:

```ts
/** Множители урона/heal от экипировки на старт боя (снимок). */
gearDamageMult: number
gearStrikeDamageMult: number
```

Remove `gearCardLevelBonus`.

- [ ] **Step 2: Set mults in `scenarios.ts`**

```ts
import { aggregateGearDamageMult, aggregateGearStrikeDamageMult } from '../equipment/aggregates'

// in battleStateFromScenario return:
gearDamageMult: primary
  ? aggregateGearDamageMult(primary.items, primary.equipment, getItemTemplate)
  : 1,
gearStrikeDamageMult: primary
  ? aggregateGearStrikeDamageMult(primary.items, primary.equipment, getItemTemplate)
  : 1,
```

Update `makeHero` HP path if it still uses flat gear HP — use `computeCharacterMaxHp` or `gearHpMult`.

- [ ] **Step 3: Update `runReducer.ts` damage/heal**

Strike branch (~line 761):

```ts
const levelForDamage = isStrike && weaponChannel ? weaponChannel.itemLevel : card.global_level
const gearMult = isStrike && weaponChannel ? b.gearStrikeDamageMult : b.gearDamageMult
const baseDamage = computeCardAttackDamage(tmpl, levelForDamage)
const damage = applyDamageMods(Math.round(baseDamage * gearMult), modCtx)
```

Heal branch (~line 912):

```ts
const baseHeal = computeCardHealAmount(tmpl, card.global_level)
const healAmount = applyHealMods(Math.round(baseHeal * b.gearDamageMult), modCtx)
```

- [ ] **Step 4: Update `playerAi.ts`**

```ts
const base = computeCardAttackDamage(tmpl, card.global_level)
return Math.round(base * state.gearDamageMult)
```

- [ ] **Step 5: Fix all test fixtures**

Replace `gearCardLevelBonus: 0` → `gearDamageMult: 1, gearStrikeDamageMult: 1`.

Update `runReducer.test.ts`:
- `applies gearCardLevelBonus to card damage` → test `gearDamageMult: 1.05` with `global_level` only in L; expect `round(base * 1.05)`.
- `strike weapon channel` tests: strike L = weapon `itemLevel` only; adjust enemy HP expectations.
- Fists baseline: still 40 damage at L=0, mult 1.

Run: `npm run test -- src/game/campaign/runReducer.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/campaign/scenarios.ts src/game/campaign/runReducer.ts src/game/content/cardAttackDamage.ts src/game/content/cardHealAmount.ts src/features/battle/playerAi.ts src/game/campaign/runReducer.test.ts
git commit -m "refactor(combat): gear damage as mult separate from card level"
```

---

### Task 6: Description layer (`itemText`, `cardText`)

**Files:**
- Modify: `src/game/descriptions/itemText.ts`
- Modify: `src/game/descriptions/cardText.ts`
- Modify: `src/game/descriptions/cardText.test.ts` (if present)

**Interfaces:**
- `describeCardCombatStats(card, gearDamageMult, gearStrikeDamageMult, equippedWeapon?)`
- `itemPerLevelBonusesLines` uses `%` wording
- `itemTotalBonusesAtLevel` returns `{ hpMult, damageMult }` or pct totals

- [ ] **Step 1: Update `itemText.ts`**

```ts
export function itemGearHpMult(t: ItemTemplate, itemLevel: number): number {
  return 1 + (t.hpPctPerLevel * itemLevel) / 100
}

export function itemGearDamageMult(t: ItemTemplate, itemLevel: number): number {
  return 1 + (t.damagePctPerLevel * itemLevel) / 100
}

// itemPerLevelBonusesLines:
// `+${t.hpPctPerLevel}% к max ${UI_HEART} за уровень предмета`
// `+${t.damagePctPerLevel}% к ${UI_DAMAGE} за уровень предмета`
```

- [ ] **Step 2: Update `cardText.ts`**

```ts
export function describeCardCombatStats(
  card: CardInstance,
  gearDamageMult: number,
  gearStrikeDamageMult: number,
  equippedWeapon: ItemInstance | null = null,
): CardCombatStatsDescription {
  const isStrikeChannel = card.templateId === 'strike'
  const weaponChannel = isStrikeChannel ? resolveStrikeWeaponChannel(...) : null
  const levelForEffect =
    weaponChannel !== null ? weaponChannel.itemLevel : card.global_level
  const gearMult = weaponChannel !== null ? gearStrikeDamageMult : gearDamageMult
  const baseDamage = computeCardAttackDamage(tmpl, levelForEffect)
  const afterGear = Math.round(baseDamage * gearMult)
  const expectedDamage = applyDamageMods(afterGear, modCtx)
  // lines: база (⭐L): baseDamage; Экипировка: ×gearMult; Итого после модов: expectedDamage
}
```

- [ ] **Step 3: Run description tests**

Run: `npm run test -- src/game/descriptions/`
Expected: PASS (update assertions in tests)

- [ ] **Step 4: Commit**

```bash
git add src/game/descriptions/itemText.ts src/game/descriptions/cardText.ts src/game/descriptions/cardText.test.ts
git commit -m "refactor(descriptions): gear pct mult tooltips for items and cards"
```

---

### Task 7: React UI and equip preview

**Files:**
- Modify: `src/features/profile/HeroProfileContent.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/inventory/previewEquipDelta.ts`
- Modify: `src/game/codex/codexText.ts`
- Modify: any remaining test files with `gearCardLevelBonus`

**Interfaces:**
- Consumes: `aggregateGearHpMult`, `aggregateGearDamageMult`, `aggregateGearStrikeDamageMult`
- `previewEquipDelta` returns:
  ```ts
  export type EquipDelta = {
    deltaMaxHp: number
    deltaDamageMult: number
  }
  ```

- [ ] **Step 1: Update `previewEquipDelta.ts`**

```ts
import { aggregateGearDamageMult, aggregateGearHpMult } from '../../game/equipment/aggregates'
import { computeCharacterMaxHp } from '../../game/stats/effectiveStats'

export function previewEquipDelta(...): EquipDelta | null {
  const worldPower = campaign.worldPower
  const beforeHp = computeCharacterMaxHp(hero, worldPower, getTemplate)
  const afterHp = computeCharacterMaxHp({ ...hero, equipment: nextEquipment }, worldPower, getTemplate)
  const beforeMult = aggregateGearDamageMult(hero.items, hero.equipment, getTemplate)
  const afterMult = aggregateGearDamageMult(hero.items, nextEquipment, getTemplate)
  return { deltaMaxHp: afterHp - beforeHp, deltaDamageMult: afterMult - beforeMult }
}
```

- [ ] **Step 2: Update profile and hub**

`HeroProfileContent.tsx`:

```ts
const gearHpMultHub = aggregateGearHpMult(hero.items, hero.equipment, getItemTemplate)
const gearDamageMultHub = aggregateGearDamageMult(hero.items, hero.equipment, getItemTemplate)
// Display: `Экипировка: HP ×${gearHpMultHub.toFixed(2)}, урон ×${gearDamageMultHub.toFixed(2)}`
```

Pass `battle.gearDamageMult` / `battle.gearStrikeDamageMult` to `describeCardCombatStats` in battle mode.

- [ ] **Step 3: Update `BattleScreen.tsx`**

Remove `global_level + battle.gearCardLevelBonus` display; use `describeCardCombatStats(c, battle.gearDamageMult, battle.gearStrikeDamageMult, weapon)`.

- [ ] **Step 4: Grep cleanup**

Run: `rg "gearCardLevelBonus|hpBonusPerItemLevel|cardLevelBonusPerItemLevel|aggregateGearHpBonus|aggregateGearCardLevelBonus" src`
Expected: no matches

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/ src/game/codex/
git commit -m "refactor(ui): show gear hp/damage mults instead of flat level bonus"
```

---

### Task 8: Save migration v7→v8

**Files:**
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

**Interfaces:**
- `SAVE_VERSION = 8`
- Migrates `battle.gearCardLevelBonus` → `gearDamageMult` / `gearStrikeDamageMult`

- [ ] **Step 1: Write failing migration test**

In `src/game/persistence/migrate.test.ts`:

```ts
it('migrates v7 battle gearCardLevelBonus to gear mult fields', () => {
  const raw = {
    version: 7,
    campaign: {
      // ... minimal campaign with battle.gearCardLevelBonus: 50
      battle: { /* ... */, gearCardLevelBonus: 50 },
      characters: [/* hero with items for recompute */],
    },
  }
  const loaded = loadAndNormalize(raw)
  expect(loaded.campaign.battle?.gearDamageMult).toBeCloseTo(1.5, 5)
  expect(loaded.campaign.battle?.gearStrikeDamageMult).toBeGreaterThanOrEqual(1)
  expect((loaded.campaign.battle as { gearCardLevelBonus?: number }).gearCardLevelBonus).toBeUndefined()
})
```

- [ ] **Step 2: Implement migration**

`schema.ts`: `SAVE_VERSION = 8`

`migrate.ts` in `normalizeCampaignEconomy`:

```ts
import { aggregateGearDamageMult, aggregateGearStrikeDamageMult } from '../equipment/aggregates'
import { getPrimaryCharacter } from '../campaign/selectors'

function normalizeBattleGearMults(c: CampaignState): CampaignState {
  if (!c.battle) return c
  const primary = getPrimaryCharacter(c)
  const legacy = (c.battle as { gearCardLevelBonus?: number }).gearCardLevelBonus
  const canRecompute = primary.items.length > 0
  const gearDamageMult = canRecompute
    ? aggregateGearDamageMult(primary.items, primary.equipment, getItemTemplate)
    : typeof legacy === 'number' && Number.isFinite(legacy)
      ? 1 + legacy / 100
      : 1
  const gearStrikeDamageMult = canRecompute
    ? aggregateGearStrikeDamageMult(primary.items, primary.equipment, getItemTemplate)
    : gearDamageMult
  const { gearCardLevelBonus: _drop, ...rest } = c.battle as BattleState & { gearCardLevelBonus?: number }
  return {
    ...c,
    battle: { ...rest, gearDamageMult, gearStrikeDamageMult },
  }
}
```

Wire into v7→v8 migration path.

- [ ] **Step 3: Run migration tests**

Run: `npm run test -- src/game/persistence/migrate.test.ts`
Expected: PASS

- [ ] **Step 4: Full verification**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/persistence/schema.ts src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts
git commit -m "chore(persistence): migrate save v8 with gear damage mult fields"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| §3 unified 1% rule | Task 1 |
| §4.1 unit stats 1% | Task 1 |
| §4.2 HP gear mult | Tasks 3–4 |
| §4.3 damage/heal gear mult, strike split | Tasks 5–6 |
| §5 item template rename 1:1 | Task 2 |
| §6 code file map | Tasks 1–8 |
| §6.4 UI tooltips | Tasks 6–7 |
| §7 save v8 | Task 8 |
| §10 out of scope | not in plan |

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-stat-scaling-balance.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
