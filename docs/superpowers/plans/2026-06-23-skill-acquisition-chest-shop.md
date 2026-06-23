# Skill Acquisition, Chest & Shop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Редкая добыча умений (бой + магазин), общий сундук кампании, магазин с 5+1 слотами и обновлением, UI «Состав»/облик в модалке; убрать `STARTER_CARDS`.

**Architecture:** `CampaignState.chest` + `shopOffers`; чистые функции в `skillAcquisition.ts` и `generateShopOffers.ts`; reducer actions для сундука/магазина; UI переиспользует `InventoryCell`/`InventoryGrid`. Конфиг dev/prod через `import.meta.env.DEV` (как `modSlotMilestones.ts`).

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, `@dnd-kit/core`, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-23-skill-acquisition-chest-shop-design.md`

## Global Constraints

- Шанс дропа после победы: **1% prod / 10% dev**; шанс умения в магазине при обновлении: **3% prod / 50% dev**
- Цена умения в магазине: **1000 prod / 100 dev**; обновление магазина: **100 prod / 10 dev**
- Пул умений: все `CARD_ATTACK_TEMPLATES` **кроме** `strike`; дубликаты разрешены
- Стартовый герой: только `strike`; таверна: 1 случайное умение сразу на персонажа (без `strike`)
- Привязка из сундука **необратима**; предметы сундук ↔ персонаж в обе стороны (не надеты)
- Магазин: **5 предметов** + опциональный **6-й** слот умения; первая генерация при `shopOffers === null` **бесплатно**
- `enabled: false` умения: в коллекции/кодексе да, в loadout нет (UI only)
- SAVE_VERSION **7** (текущий **6**); жёсткая миграция карт
- Вкладка **Магазин** первая; Roster → **«Состав»**; облик только в Modal (карандаш)
- Не добавлять npm-зависимости; `App.useApp().message`; emoji из `labels.ts` / semantic helpers

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Config & types** | 1–2 | `skillAcquisition.ts`, расширенные типы |
| **B — Shop generation** | 3 | `generateShopOffers.ts` + тесты |
| **C — Reducer core** | 4–6 | chest/shop actions, drop, tavern, initial state |
| **D — Migration** | 7 | v6→v7 |
| **E — UI inventory** | 8–10 | Chest, equipment row, shop grid |
| **F — Hub screens** | 11–13 | Shop tab, Character tab, nav + notices |
| **G — Polish** | 14 | loadout guard, help, cleanup `STARTER_CARDS` |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/config/skillAcquisition.ts` | dev/prod константы + roll/pick хелперы |
| `src/game/shop/generateShopOffers.ts` | 5 items + optional skill offer |
| `src/game/types.ts` | `ShopOffer`, `CampaignChest`, `HubNotice`, state fields |
| `src/game/campaign/runReducer.ts` | новые actions, убрать `STARTER_CARDS` |
| `src/game/character/createCharacter.ts` | `cards: []` по умолчанию |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 7` |
| `src/game/persistence/migrate.ts` | v6→v7 жёсткая миграция |
| `src/features/inventory/ChestInventoryView.tsx` | сетка сундука |
| `src/features/inventory/EquipmentSlotRow.tsx` | 3 compact equip cells |
| `src/features/inventory/ShopOffersGrid.tsx` | 5+1 shop slots |
| `src/features/inventory/ShopInventoryView.tsx` | продажа stash + chest (упрощён) |
| `src/features/campaign/CampaignShopTab.tsx` | новая компоновка магазина |
| `src/features/campaign/CampaignCharacterTab.tsx` | сундук + без inline облика |
| `src/features/character/CharacterRosterView.tsx` | «Состав», modal облика |
| `src/features/campaign/CampaignHubNav.tsx` | shop first |
| `src/features/campaign/CampaignHub.tsx` | default tab shop, новые dispatch |
| `src/features/inventory/inventoryDnD.ts` | `chest:item:`, `chest:card:` ids |
| `src/features/inventory/CardsInventoryView.tsx` | block loadout for `enabled: false` |
| `src/features/profile/HeroProfileContent.tsx` | `includeAppearance?: boolean` |
| `src/game/help/articles.ts` | статьи economy/cards |

---

### Task 1: Skill acquisition config

**Files:**
- Create: `src/game/config/skillAcquisition.ts`
- Create: `src/game/config/skillAcquisition.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SkillAcquisitionConfig = {
    battleDropChance: number
    shopSkillOfferChance: number
    shopSkillPrice: number
    shopRefreshCost: number
  }
  export const SKILL_ACQUISITION: SkillAcquisitionConfig
  export const SKILL_TEMPLATE_POOL: readonly string[]

  export function rollBattleSkillDrop(rngUnit: number, cfg: SkillAcquisitionConfig): boolean
  export function rollShopSkillOffer(rngUnit: number, cfg: SkillAcquisitionConfig): boolean
  export function pickRandomSkillTemplateId(rng: () => number): string
  ```

- [ ] **Step 1: Write failing tests**

```ts
// src/game/config/skillAcquisition.test.ts
import { describe, expect, it } from 'vitest'
import {
  SKILL_TEMPLATE_POOL,
  pickRandomSkillTemplateId,
  rollBattleSkillDrop,
  rollShopSkillOffer,
} from './skillAcquisition'

const testCfg = {
  battleDropChance: 0.1,
  shopSkillOfferChance: 0.5,
  shopSkillPrice: 100,
  shopRefreshCost: 10,
}

describe('skillAcquisition', () => {
  it('pool excludes strike', () => {
    expect(SKILL_TEMPLATE_POOL).not.toContain('strike')
    expect(SKILL_TEMPLATE_POOL.length).toBeGreaterThan(10)
  })

  it('pickRandomSkillTemplateId never returns strike', () => {
    let i = 0
    const rng = () => (i++ % 97) / 97
    for (let n = 0; n < 50; n++) {
      expect(pickRandomSkillTemplateId(rng)).not.toBe('strike')
    }
  })

  it('rollBattleSkillDrop respects threshold', () => {
    expect(rollBattleSkillDrop(0.09, testCfg)).toBe(true)
    expect(rollBattleSkillDrop(0.11, testCfg)).toBe(false)
  })

  it('rollShopSkillOffer respects threshold', () => {
    expect(rollShopSkillOffer(0.49, testCfg)).toBe(true)
    expect(rollShopSkillOffer(0.51, testCfg)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/config/skillAcquisition.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```ts
// src/game/config/skillAcquisition.ts
import { CARD_ATTACK_TEMPLATES } from '../content/cardTemplates'

export type SkillAcquisitionConfig = {
  battleDropChance: number
  shopSkillOfferChance: number
  shopSkillPrice: number
  shopRefreshCost: number
}

export const SKILL_ACQUISITION: SkillAcquisitionConfig = import.meta.env.DEV
  ? {
      battleDropChance: 0.1,
      shopSkillOfferChance: 0.5,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    }
  : {
      battleDropChance: 0.01,
      shopSkillOfferChance: 0.03,
      shopSkillPrice: 1000,
      shopRefreshCost: 100,
    }

export const SKILL_TEMPLATE_POOL: readonly string[] = Object.keys(
  CARD_ATTACK_TEMPLATES,
).filter((id) => id !== 'strike')

export function rollBattleSkillDrop(
  rngUnit: number,
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): boolean {
  return rngUnit < cfg.battleDropChance
}

export function rollShopSkillOffer(
  rngUnit: number,
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): boolean {
  return rngUnit < cfg.shopSkillOfferChance
}

export function pickRandomSkillTemplateId(rng: () => number): string {
  const pool = SKILL_TEMPLATE_POOL
  const idx = Math.floor(rng() * pool.length)
  return pool[Math.min(idx, pool.length - 1)]!
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/config/skillAcquisition.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/config/skillAcquisition.ts src/game/config/skillAcquisition.test.ts
git commit -m "feat(config): add skill acquisition dev/prod rates and pool helpers"
```

---

### Task 2: Campaign types — chest, shop, notices

**Files:**
- Modify: `src/game/types.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ShopOffer =
    | { kind: 'item'; templateId: string }
    | { kind: 'skill'; templateId: string }

  export type CampaignChest = {
    items: ItemInstance[]
    unboundCards: CardInstance[]
  }

  export type HubNotice = { kind: 'skill_drop'; templateId: string }

  // CampaignState additions:
  chest: CampaignChest
  shopOffers: ShopOffer[] | null
  shopRefreshSeed: number
  pendingHubNotice: HubNotice | null
  ```

- [ ] **Step 1: Add types to `types.ts`** (after `CardInstance`, before `Character`)

```ts
export type ShopOffer =
  | { kind: 'item'; templateId: string }
  | { kind: 'skill'; templateId: string }

export type CampaignChest = {
  items: ItemInstance[]
  unboundCards: CardInstance[]
}

export type HubNotice = { kind: 'skill_drop'; templateId: string }
```

- [ ] **Step 2: Extend `CampaignState`**

```ts
export type CampaignState = {
  // ...existing fields...
  chest: CampaignChest
  shopOffers: ShopOffer[] | null
  shopRefreshSeed: number
  pendingHubNotice: HubNotice | null
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run build`  
Expected: errors in `runReducer.ts`, `migrate.ts`, tests — fixed in later tasks

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(types): add chest, shop offers, and hub notice to campaign state"
```

---

### Task 3: Shop offer generation

**Files:**
- Create: `src/game/shop/generateShopOffers.ts`
- Create: `src/game/shop/generateShopOffers.test.ts`

**Interfaces:**
- Consumes: `pickRandomSkillTemplateId`, `rollShopSkillOffer` from Task 1; `ITEM_TEMPLATES` keys
- Produces:
  ```ts
  export const SHOP_ITEM_SLOT_COUNT = 5

  export function generateShopOffers(
    rng: () => number,
    cfg?: SkillAcquisitionConfig,
  ): ShopOffer[]
  ```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { seededRng } from '../tavern/generateCandidates'
import { generateShopOffers, SHOP_ITEM_SLOT_COUNT } from './generateShopOffers'

describe('generateShopOffers', () => {
  it('returns 5 unique item offers by default', () => {
    const offers = generateShopOffers(seededRng(42), {
      battleDropChance: 0,
      shopSkillOfferChance: 0,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    })
    const items = offers.filter((o) => o.kind === 'item')
    expect(items).toHaveLength(SHOP_ITEM_SLOT_COUNT)
    const ids = items.map((o) => o.templateId)
    expect(new Set(ids).size).toBe(SHOP_ITEM_SLOT_COUNT)
  })

  it('may append skill offer when roll succeeds', () => {
    const offers = generateShopOffers(seededRng(1), {
      battleDropChance: 0,
      shopSkillOfferChance: 1,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    })
    expect(offers.some((o) => o.kind === 'skill')).toBe(true)
    expect(offers.length).toBe(SHOP_ITEM_SLOT_COUNT + 1)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/shop/generateShopOffers.test.ts`

- [ ] **Step 3: Implement**

```ts
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import {
  pickRandomSkillTemplateId,
  rollShopSkillOffer,
  SKILL_ACQUISITION,
  type SkillAcquisitionConfig,
} from '../config/skillAcquisition'
import type { ShopOffer } from '../types'

export const SHOP_ITEM_SLOT_COUNT = 5

function pickUniqueItemTemplateIds(rng: () => number, count: number): string[] {
  const pool = [...Object.keys(ITEM_TEMPLATES)]
  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length)
    picked.push(pool.splice(idx, 1)[0]!)
  }
  return picked
}

export function generateShopOffers(
  rng: () => number,
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): ShopOffer[] {
  const itemIds = pickUniqueItemTemplateIds(rng, SHOP_ITEM_SLOT_COUNT)
  const offers: ShopOffer[] = itemIds.map((templateId) => ({
    kind: 'item',
    templateId,
  }))
  if (rollShopSkillOffer(rng(), cfg)) {
    offers.push({ kind: 'skill', templateId: pickRandomSkillTemplateId(rng) })
  }
  return offers
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/shop/generateShopOffers.ts src/game/shop/generateShopOffers.test.ts
git commit -m "feat(shop): generate 5 item offers plus optional skill slot"
```

---

### Task 4: Card factory + initial campaign state

**Files:**
- Create: `src/game/campaign/cardFactory.ts`
- Modify: `src/game/character/createCharacter.ts`
- Modify: `src/game/campaign/runReducer.ts` (`initialCampaignState`, remove `STARTER_CARDS` usage)
- Modify: `src/game/character/createCharacter.test.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function newCardId(): string
  export function createCardInstance(templateId: string, id?: string): CardInstance
  export function createStrikeCardForHero(heroId: string): CardInstance
  ```

- [ ] **Step 1: Write failing test for initial state**

```ts
// in runReducer.test.ts
it('initialCampaignState gives starter hero only strike', () => {
  const s = initialCampaignState()
  const hero = s.characters[0]!
  expect(hero.cards).toHaveLength(1)
  expect(hero.cards[0]!.templateId).toBe('strike')
  expect(hero.battleLoadout[0]).toBe(hero.cards[0]!.id)
  expect(s.chest.unboundCards).toEqual([])
  expect(s.shopOffers).toBeNull()
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `cardFactory.ts`**

```ts
import type { CardInstance } from '../types'

let cardSeq = 0
export function newCardId(): string {
  cardSeq += 1
  return `card-${Date.now()}-${cardSeq}`
}

export function createCardInstance(templateId: string, id?: string): CardInstance {
  return {
    id: id ?? newCardId(),
    templateId,
    global_level: 1,
    uses_count: 0,
    modSlots: [],
  }
}

export function createStrikeCardForHero(heroId: string): CardInstance {
  return createCardInstance('strike', `c-${heroId}-strike`)
}
```

- [ ] **Step 4: Update `createCharacter.ts`** — remove `STARTER_CARDS` import; `cards: []`, `battleLoadout: [null, null]`

- [ ] **Step 5: Update `initialCampaignState`** in `runReducer.ts`:

```ts
import { createStrikeCardForHero } from './cardFactory'

// remove STARTER_CARDS export
export function initialCampaignState(): CampaignState {
  const hero = createCharacter({ /* unchanged */ })
  const strike = createStrikeCardForHero(hero.id)
  hero.cards = [strike]
  hero.battleLoadout = [strike.id, null]
  return {
    // ...existing...
    chest: { items: [], unboundCards: [] },
    shopOffers: null,
    shopRefreshSeed: 0,
    pendingHubNotice: null,
  }
}
```

- [ ] **Step 6: Fix `createCharacter.test.ts`** — expect `cards.length === 0`

- [ ] **Step 7: Run tests**

Run: `npm run test -- src/game/campaign/runReducer.test.ts src/game/character/createCharacter.test.ts`

- [ ] **Step 8: Commit**

```bash
git add src/game/campaign/cardFactory.ts src/game/character/createCharacter.ts src/game/campaign/runReducer.ts src/game/character/createCharacter.test.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): starter hero gets strike only; empty cards on createCharacter"
```

---

### Task 5: Reducer — shop & chest actions

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Consumes: `generateShopOffers`, `SKILL_ACQUISITION`, `createCardInstance`, `newItemId`
- Produces new `RunAction` variants:
  ```ts
  | { type: 'REFRESH_SHOP'; seed?: number; free?: boolean }
  | { type: 'BUY_SHOP_OFFER'; offerIndex: number; destination?: 'chest' | 'character'; characterId?: string }
  | { type: 'MOVE_CHEST_ITEM_TO_CHARACTER'; itemId: string; characterId: string }
  | { type: 'MOVE_CHARACTER_ITEM_TO_CHEST'; itemId: string; characterId: string }
  | { type: 'BIND_CHEST_CARD'; cardId: string; characterId: string }
  | { type: 'SELL_CHEST_ITEM'; itemId: string }
  | { type: 'MARK_HUB_NOTICE_SEEN' }
  ```

- [ ] **Step 1: Write failing tests** (one describe block `chest and shop`)

```ts
describe('REFRESH_SHOP', () => {
  it('free refresh when shopOffers is null', () => {
    let s = initialCampaignState()
    expect(s.shopOffers).toBeNull()
    s = applyRunAction(s, { type: 'REFRESH_SHOP', seed: 42, free: true })
    expect(s.shopOffers?.length).toBeGreaterThanOrEqual(5)
    expect(s.gold).toBe(0)
  })

  it('paid refresh deducts gold', () => {
    let s = { ...initialCampaignState(), gold: 200, shopOffers: [] }
    s = applyRunAction(s, { type: 'REFRESH_SHOP', seed: 7 })
    expect(s.gold).toBe(200 - SKILL_ACQUISITION.shopRefreshCost)
  })
})

describe('BUY_SHOP_OFFER', () => {
  it('buys item into chest by default', () => {
    let s = initialCampaignState()
    s = { ...s, gold: 500, shopOffers: [{ kind: 'item', templateId: 'warrior_blade' }] }
    s = applyRunAction(s, { type: 'BUY_SHOP_OFFER', offerIndex: 0 })
    expect(s.chest.items).toHaveLength(1)
    expect(s.chest.items[0]!.templateId).toBe('warrior_blade')
    expect(s.shopOffers).toHaveLength(0)
  })
})

describe('BIND_CHEST_CARD', () => {
  it('moves card from chest to character permanently', () => {
    const card = createCardInstance('fireball', 'unbound-1')
    let s = initialCampaignState()
    s = {
      ...s,
      chest: { items: [], unboundCards: [card] },
      characters: s.characters.map((c) => ({ ...c, cards: c.cards.filter((x) => x.templateId === 'strike') })),
    }
    const heroId = s.characters[0]!.id
    s = applyRunAction(s, { type: 'BIND_CHEST_CARD', cardId: 'unbound-1', characterId: heroId })
    expect(s.chest.unboundCards).toHaveLength(0)
    expect(s.characters[0]!.cards.some((c) => c.templateId === 'fireball')).toBe(true)
  })
})
```

Import `SKILL_ACQUISITION` and `createCardInstance` in test file.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Add action types to `RunAction` union**

- [ ] **Step 4: Implement handlers** in `applyRunAction`:

Key logic snippets:

```ts
case 'REFRESH_SHOP': {
  if (!assertHubActionAllowed(state, 'shop')) return state
  const free = action.free === true && state.shopOffers === null
  if (!free && state.gold < SKILL_ACQUISITION.shopRefreshCost) return state
  const rng = action.seed !== undefined ? seededRng(action.seed) : () => Math.random()
  return {
    ...state,
    gold: free ? state.gold : state.gold - SKILL_ACQUISITION.shopRefreshCost,
    shopOffers: generateShopOffers(rng),
    shopRefreshSeed: action.seed ?? state.shopRefreshSeed + 1,
  }
}

case 'BUY_SHOP_OFFER': {
  if (!assertHubActionAllowed(state, 'shop')) return state
  const offer = state.shopOffers?.[action.offerIndex]
  if (!offer) return state
  if (offer.kind === 'skill') {
    if (state.gold < SKILL_ACQUISITION.shopSkillPrice) return state
    const card = createCardInstance(offer.templateId)
    return withCodexDiscoveries({
      ...state,
      gold: state.gold - SKILL_ACQUISITION.shopSkillPrice,
      chest: { ...state.chest, unboundCards: [...state.chest.unboundCards, card] },
      shopOffers: state.shopOffers!.filter((_, i) => i !== action.offerIndex),
    }, [codexEntryId('skill', offer.templateId)])
  }
  const tmpl = getItemTemplate(offer.templateId)
  if (!tmpl || state.gold < tmpl.shopPrice) return state
  const inst: ItemInstance = { id: newItemId(), templateId: offer.templateId, itemLevel: 1, modSlots: [] }
  const dest = action.destination ?? 'chest'
  // ...add to chest or character.items...
}
```

Implement `MOVE_*`, `SELL_CHEST_ITEM` (mirror `SELL_ITEM` but from `chest.items`), `MARK_HUB_NOTICE_SEEN` → `pendingHubNotice: null`.

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): shop refresh, buy offer, and chest item/card actions"
```

---

### Task 6: Victory skill drop + tavern random skill

**Files:**
- Modify: `src/game/campaign/runReducer.ts` (`finalizeVictory`, `HIRE_TAVERN_CANDIDATE`)
- Modify: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1: Failing test — tavern hire grants one non-strike skill**

```ts
it('HIRE_TAVERN_CANDIDATE adds one random skill card', () => {
  let s = initialCampaignState()
  s = { ...s, gold: 500, tavernCandidates: generateTavernCandidates(seededRng(1)) }
  const id = s.tavernCandidates![0]!.candidateId
  s = applyRunAction(s, { type: 'HIRE_TAVERN_CANDIDATE', candidateId: id })
  const hired = s.characters.find((c) => c.id !== LEGACY_HERO_CHARACTER_ID)!
  expect(hired.cards).toHaveLength(1)
  expect(hired.cards[0]!.templateId).not.toBe('strike')
  expect(hired.battleLoadout[0]).toBe(hired.cards[0]!.id)
})
```

- [ ] **Step 2: Failing test — victory drop with seeded rng**

Use `battleAttemptId` seed; mock battle victory state; call `FINALIZE_VICTORY` with matching `itemLevelRolls`; assert `chest.unboundCards` or `pendingHubNotice` when seed forces drop (find seed where `rollBattleSkillDrop` is true).

- [ ] **Step 3: In `finalizeVictory`**, after gold merge:

```ts
const dropRng = seededRng(state.battleAttemptId * 9973 + 13)
let chest = state.chest ?? { items: [], unboundCards: [] }
let pendingHubNotice = state.pendingHubNotice
if (rollBattleSkillDrop(dropRng(), SKILL_ACQUISITION)) {
  const templateId = pickRandomSkillTemplateId(dropRng)
  const card = createCardInstance(templateId)
  chest = { ...chest, unboundCards: [...chest.unboundCards, card] }
  pendingHubNotice = { kind: 'skill_drop', templateId }
}
// return { ...state, chest, pendingHubNotice, ... }
```

- [ ] **Step 4: In `HIRE_TAVERN_CANDIDATE`**, after gear loop:

```ts
const skillTemplateId = pickRandomSkillTemplateId(
  seededRng(state.characters.length * 31 + candidate.classId.length),
)
const skillCard = createCardInstance(skillTemplateId)
character = {
  ...character,
  cards: [...character.cards, skillCard],
  battleLoadout: [skillCard.id, null],
}
```

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/game/campaign/runReducer.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): skill drop on victory and random skill on tavern hire"
```

---

### Task 7: Migration v6 → v7

**Files:**
- Modify: `src/game/persistence/schema.ts` (`SAVE_VERSION = 7`)
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/persistence/migrate.test.ts`

- [ ] **Step 1: Failing migration test**

```ts
it('migrates v6 starter cards to chest and keeps strike on hero', () => {
  const v6 = { version: 6, campaign: { /* hero with strike+fireball+heal */ } }
  const out = normalizeLoadedCampaign(v6)
  expect(out.version).toBe(7)
  const hero = out.campaign.characters[0]!
  expect(hero.cards.map((c) => c.templateId)).toEqual(['strike'])
  expect(out.campaign.chest.unboundCards.map((c) => c.templateId).sort()).toEqual(['fireball', 'heal'])
})
```

- [ ] **Step 2: Implement `migrateV6ToV7`** — remove `mergeMissingStarterCards`; use `pickRandomSkillTemplateId(seededRng(hash(characterId)))` for hired chars

- [ ] **Step 3: Default empty chest/shop for new fields in `normalizeLoadedCampaign`**

- [ ] **Step 4: Run** `npm run test -- src/game/persistence/migrate.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/persistence/schema.ts src/game/persistence/migrate.ts src/game/persistence/migrate.test.ts
git commit -m "feat(persistence): v7 migration for chest, shop, and starter card reset"
```

---

### Task 8: DnD ids for chest

**Files:**
- Modify: `src/features/inventory/inventoryDnD.ts`
- Modify: `src/features/inventory/inventoryDnD.test.ts` (create if missing)

- [ ] **Step 1: Add helpers**

```ts
export function chestItemDragId(itemId: string): string {
  return `chest-item:${itemId}`
}
export function chestCardDragId(cardId: string): string {
  return `chest-card:${cardId}`
}
```

- [ ] **Step 2: Extend `parseDragId` COMPOUND_PREFIXES** with `chest-item:`, `chest-card:`

- [ ] **Step 3: Commit**

---

### Task 9: `ChestInventoryView` + `EquipmentSlotRow`

**Files:**
- Create: `src/features/inventory/ChestInventoryView.tsx`
- Create: `src/features/inventory/EquipmentSlotRow.tsx`

- [ ] **Step 1: `EquipmentSlotRow`** — props:

```ts
type EquipmentSlotRowProps = {
  character: Character
  inBattle: boolean
  onUnequip: (slot: EquipmentSlot) => void
  getTemplate: typeof getItemTemplate
}
```

Render 3 `InventoryCell` from `EQUIPMENT_ROLL_ORDER`; equipped items show level badge; popover «Снять».

- [ ] **Step 2: `ChestInventoryView`** — props:

```ts
type ChestInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  onSellChestItem: (itemId: string) => void
  selectedCharacterId?: string
  onBindCard?: (cardId: string, characterId: string) => void
}
```

Grid: `chest.items` then `chest.unboundCards` (card emoji via `getCardDisplayLabel` / semantic emoji). Items: sell popover like stash. Cards: popover «Назначить» → bind to `selectedCharacterId` or drag to roster drop.

- [ ] **Step 3: Manual smoke** — import in Story-less app after Task 11

- [ ] **Step 4: Commit**

---

### Task 10: `ShopOffersGrid`

**Files:**
- Create: `src/features/inventory/ShopOffersGrid.tsx`
- Modify: `src/features/inventory/ShopInventoryView.tsx` (stash sell only OR deprecate shop grid portion)

- [ ] **Step 1: `ShopOffersGrid` props**

```ts
type ShopOffersGridProps = {
  offers: ShopOffer[]
  gold: number
  inBattle: boolean
  onBuy: (offerIndex: number, destination?: 'chest' | 'character', characterId?: string) => void
  selectedCharacterId: string
  onInsufficientGold: () => void
}
```

Item popover: `Radio.Group` default `chest`; skill popover: price `SKILL_ACQUISITION.shopSkillPrice`, buy to chest only. Skill cells: distinct border/badge «Умение».

- [ ] **Step 2: Commit**

---

### Task 11: Rework `CampaignShopTab` + `CampaignHub`

**Files:**
- Modify: `src/features/campaign/CampaignShopTab.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`

- [ ] **Step 1: `CampaignShopTab` layout** (top to bottom):
  - Title + Refresh button → `dispatchRun({ type: 'REFRESH_SHOP' })` or `{ free: true }` when `shopOffers === null` on mount (`useEffect`)
  - `ShopOffersGrid`
  - `SquadSlotRow` + reserve list OR compact `CharacterRosterView` with `onSelectCharacter` only (no squad actions duplicate — reuse squad row)
  - `Typography.Title` with `{selectedCharacter.name}`
  - `StatStrip` + `EquipmentSlotRow`
  - Character stash grid (extract from `EquipmentInventoryView` stash section or reuse)
  - `ChestInventoryView`

- [ ] **Step 2: Remove `HeroProfileContent` from shop tab**

- [ ] **Step 3: `CampaignHub` handlers**

```ts
const refreshShop = (free?: boolean) =>
  dispatchRun({ type: 'REFRESH_SHOP', seed: Date.now(), free })
const buyOffer = (offerIndex, destination?, characterId?) =>
  dispatchRun({ type: 'BUY_SHOP_OFFER', offerIndex, destination, characterId })
// bind, move chest, sell chest...
```

- [ ] **Step 4: `useEffect` hub notice**

```ts
useEffect(() => {
  if (campaign.pendingHubNotice?.kind === 'skill_drop') {
    const label = getCardDisplayLabel(campaign.pendingHubNotice.templateId)
    message.success(`В сундук попало умение: ${label}`)
    dispatchRun({ type: 'MARK_HUB_NOTICE_SEEN' })
  }
}, [campaign.pendingHubNotice])
```

- [ ] **Step 5: Commit**

---

### Task 12: Character tab — Состав, modal облик, сундук

**Files:**
- Modify: `src/features/character/CharacterRosterView.tsx`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/profile/HeroProfileContent.tsx`

- [ ] **Step 1: `HeroProfileContent`** — add `includeAppearance?: boolean` default `false`; render `HeroAppearanceEditor` only when `includeAppearance && mode === 'hub'`

- [ ] **Step 2: `CharacterRosterView`**
  - Title: `Состав ({roster.length})`
  - Add `onEditAppearance?: (characterId: string) => void` prop
  - In `RosterRow.actions`, prepend:
    ```tsx
    <Button
      key="edit"
      size="small"
      icon={<EditOutlined />}
      aria-label="Редактировать облик"
      onClick={(e) => { e.stopPropagation(); onEditAppearance?.(character.id) }}
    />
    ```

- [ ] **Step 3: `CampaignCharacterTab`** — local state `appearanceModalCharacterId`; Modal with `HeroAppearanceEditor`; add `ChestInventoryView` below cards section; pass `onEditAppearance`

- [ ] **Step 4: Verify name in titles updates** — already uses `selectedCharacter.name`; add test or manual check

- [ ] **Step 5: Commit**

---

### Task 13: Hub navigation + help

**Files:**
- Modify: `src/features/campaign/CampaignHubNav.tsx`
- Modify: `src/features/campaign/CampaignHubNav.test.ts`
- Modify: `src/features/campaign/CampaignHub.tsx` (`useState<CampaignHubTab>('shop')`)
- Modify: `src/game/help/articles.ts`

- [ ] **Step 1: `TAB_ORDER`** → `['shop', 'character', 'battle', 'tavern', 'codex', 'help']`

- [ ] **Step 2: Update nav test** — first tab is shop

- [ ] **Step 3: Help articles** — economy: магазин 5+1, обновление, сундук; cards: добыча, привязка

- [ ] **Step 4: Commit**

---

### Task 14: Loadout guard + cleanup

**Files:**
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/game/campaign/runReducer.ts` (`SET_BATTLE_LOADOUT` — reject disabled templates)
- Remove: `STARTER_CARDS`, `mergeMissingStarterCards` from `migrate.ts`
- Modify: `src/game/content/itemTemplates.ts` — deprecate `SHOP_TEMPLATE_IDS` for shop grid (keep for tests if needed)

- [ ] **Step 1: `SET_BATTLE_LOADOUT` server-side guard**

```ts
if (cardId !== null) {
  const card = hero.cards.find((c) => c.id === cardId)
  const tmpl = card ? CARD_ATTACK_TEMPLATES[card.templateId] : undefined
  if (!card || tmpl?.enabled === false) return c
}
```

- [ ] **Step 2: UI** — loadout slot button `disabled` + `Tooltip title="Скоро"` when `enabled === false`

- [ ] **Step 3: Remove dead `STARTER_CARDS` references** across codebase (`grep STARTER_CARDS`)

- [ ] **Step 4: Full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 5: Build**

Run: `npm run build`  
Expected: success

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: skill acquisition chest shop UI and loadout guards"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| Config dev/prod | 1 |
| Types chest/shop/notice | 2 |
| Shop 5+1 generation | 3 |
| Starter strike only | 4 |
| Shop/chest reducer | 5 |
| Victory drop + tavern skill | 6 |
| Migration v7 | 7 |
| Chest DnD | 8 |
| ChestInventoryView | 9 |
| ShopOffersGrid | 10 |
| CampaignShopTab | 11 |
| Состав + modal + chest on character | 12 |
| Nav shop first + help | 13 |
| enabled:false loadout | 14 |
| Sell from chest | 5, 9 |
| Free first shop refresh | 5, 11 |
| BUY destination default chest | 5, 10 |

## Self-Review Notes

- `BUY_ITEM` kept in reducer for tests/legacy but UI uses `BUY_SHOP_OFFER` only
- `CampaignBattleNav` may need same `TAB_ORDER` if duplicated — check and align in Task 13
- Expedition freeze: reuse `assertHubActionAllowed(state, 'shop')` for all chest actions
- `finalizeVictory` must spread `chest` on all return paths after Task 6
