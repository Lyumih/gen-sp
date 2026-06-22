# Party, Squad, Expedition & Tavern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перейти от одного героя к roster персонажей (до 100), expedition-цепочкам боёв с freeze, бою с N союзниками и initiative, найму в Таверне.

**Architecture:** Character-first: `Character` в `CampaignState`, `Expedition` фиксирует snapshot отряда; чистая логика в `src/game/**`, UI Ant Design + Zustand. Бой: `playerCardsByUnitId`, initiative пересчёт каждый раунд. Миграция save v2→v3.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md`

## Global Constraints

- `DEFAULT_SQUAD_SLOTS = 4`, `MAX_ROSTER_SIZE = 100`
- Per-character: `unitLevel`, `equipment`, `items`, `cards`, `battleLoadout` (2 слота)
- `worldPower` — глобальный на кампанию
- Expedition freeze: squad/shop/tavern/equip/loadout/item-transfer заблокированы
- Downed mid-expedition: без замены из резерва; inter-battle revive через camp `{ reviveAllDowned: true }` (MVP)
- Initiative: пересчёт **в начале каждого раунда**, tie-break `unitId`
- `partySize` / `battleCount` из конфига сценария (фикс или `{ min, max }`)
- SAVE_VERSION **3**; legacy hero → `char-hero-1`
- Камни — только hook в types, без полной системы
- Не добавлять зависимости; `App.useApp()` для message, не static `message`

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Data** | 1–3 | Character types, migration v3, selectors |
| **B — Campaign** | 4–6 | Per-character inventory reducers, expedition state machine |
| **C — Battle** | 7–10 | Multi-unit spawn, initiative, cards per unit, playerAi |
| **D — Tavern** | 11 | Hire + refresh |
| **E — UI** | 12–14 | Hub tabs, inter-battle, BattleScreen |

Каждая phase — рабочее приложение после прохождения тестов.

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/types.ts` | `Character`, `Expedition`, `CharacterBattleSnapshot`, расширенный `BattleState`, `CampaignState` |
| `src/game/character/constants.ts` | `DEFAULT_SQUAD_SLOTS`, `MAX_ROSTER_SIZE`, `LEGACY_HERO_CHARACTER_ID` |
| `src/game/character/createCharacter.ts` | factory + id generation |
| `src/game/character/selectors.ts` | `getCharacter`, `getSquadCharacters`, `getReserveCharacters` |
| `src/game/expedition/config.ts` | `resolvePartySize`, `resolveBattleCount`, `ExpeditionChainConfig` |
| `src/game/expedition/snapshot.ts` | `buildExpeditionSnapshot`, `buildPartyBattleSnapshot` |
| `src/game/expedition/freeze.ts` | `assertHubActionAllowed(campaign, actionKind)` |
| `src/game/battle/initiative.ts` | `computeUnitInitiative`, `buildRoundTurnOrder` |
| `src/game/battle/playerCards.ts` | `playerCardsByUnitFromParty` |
| `src/game/campaign/scenarios.ts` | `playerSpawns`, expedition config per chain |
| `src/game/campaign/runReducer.ts` | expedition + per-character actions |
| `src/game/persistence/migrate.ts` | v2→v3 |
| `src/game/persistence/schema.ts` | `SAVE_VERSION = 3` |
| `src/game/content/characterClasses.ts` | class templates, initiativeBase, hire pools |
| `src/game/tavern/generateCandidates.ts` | 3 random candidates |
| `src/features/battle/playerAi.ts` | generalize `heroAi` |
| `src/features/campaign/CampaignTavernTab.tsx` | tavern UI |
| `src/features/campaign/InterBattleScreen.tsx` | between-battle status + revive |
| `src/features/campaign/SquadPicker.tsx` | N slots party picker |
| `src/features/character/CharacterRosterView.tsx` | roster + per-char inventory |

---

### Task 1: Character & Expedition types

**Files:**
- Create: `src/game/character/constants.ts`
- Create: `src/game/character/createCharacter.ts`
- Modify: `src/game/types.ts`
- Test: `src/game/character/createCharacter.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // constants.ts
  export const DEFAULT_SQUAD_SLOTS = 4
  export const MAX_ROSTER_SIZE = 100
  export const LEGACY_HERO_CHARACTER_ID = 'char-hero-1'

  // types.ts
  export type CharacterMetaStatus = 'active' | 'downed'
  export type Character = {
    id: string
    name: string
    classId: string
    unitLevel: number
    initiativeBase: number
    equipment: Record<EquipmentSlot, string | null>
    items: ItemInstance[]
    cards: CardInstance[]
    battleLoadout: BattleLoadout
  }
  export type CharacterBattleSnapshot = {
    characterId: string
    equipment: Record<EquipmentSlot, string | null>
    battleLoadout: BattleLoadout
    metaStatus: CharacterMetaStatus
  }
  export type Expedition = {
    scenarioChainId: string
    partySize: number
    squadSnapshot: (CharacterBattleSnapshot | null)[]
    battleIndex: number
    battleCount: number
    shopLocked: true
    interBattleReviveAllDowned?: boolean
  }
  ```

- [ ] **Step 1: Write failing test**

Create `src/game/character/createCharacter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createCharacter } from './createCharacter'
import { STARTER_CARDS } from '../campaign/runReducer'

describe('createCharacter', () => {
  it('creates character with starter cards clone and empty equipment', () => {
    const c = createCharacter({
      id: 'char-1',
      name: 'Test',
      classId: 'warrior',
      initiativeBase: 10,
    })
    expect(c.id).toBe('char-1')
    expect(c.unitLevel).toBe(1)
    expect(c.cards.length).toBe(STARTER_CARDS.length)
    expect(c.cards[0].id).not.toBe(STARTER_CARDS[0].id)
    expect(c.equipment.weapon).toBeNull()
    expect(c.battleLoadout).toEqual(['c1', 'c2'])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/character/createCharacter.test.ts`  
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement**

Create `src/game/character/constants.ts` with exports above.

Create `src/game/character/createCharacter.ts`:

```ts
import { cloneCards } from '../campaign/battleSnapshot'
import { STARTER_CARDS } from '../campaign/runReducer'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { Character } from '../types'

export type CreateCharacterInput = {
  id: string
  name: string
  classId: string
  initiativeBase: number
  unitLevel?: number
}

export function createCharacter(input: CreateCharacterInput): Character {
  const cards = cloneCards(STARTER_CARDS).map((c, i) => ({
    ...c,
    id: `c-${input.id}-${i + 1}`,
  }))
  const loadout: [string | null, string | null] = [
    cards[0]?.id ?? null,
    cards[1]?.id ?? null,
  ]
  return {
    id: input.id,
    name: input.name,
    classId: input.classId,
    unitLevel: input.unitLevel ?? 1,
    initiativeBase: input.initiativeBase,
    equipment: { ...EMPTY_EQUIPMENT },
    items: [],
    cards,
    battleLoadout: loadout,
  }
}
```

Add types to `src/game/types.ts` (keep legacy `CampaignState` fields until Task 3 migration — add optional `characters?`, `squad?`, `expedition?` alongside for incremental compile, or add all at once in Task 3).

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/character/createCharacter.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/game/character/ src/game/types.ts
git commit -m "feat(character): Character type and createCharacter factory"
```

---

### Task 2: Save migration v2 → v3

**Files:**
- Modify: `src/game/persistence/schema.ts`
- Modify: `src/game/persistence/migrate.ts`
- Test: `src/game/persistence/migrate.test.ts`

**Interfaces:**
- Consumes: `createCharacter`, `LEGACY_HERO_CHARACTER_ID`, `DEFAULT_SQUAD_SLOTS`
- Produces:
  ```ts
  export function migrateV2CampaignToV3(c: LegacyCampaignStateV2): CampaignState
  // migrateFromUnknown accepts version 2 → v3 transform, version 3 passthrough
  ```

- [ ] **Step 1: Write failing test**

Add to `src/game/persistence/migrate.test.ts`:

```ts
it('migrates v2 save with flat hero fields to v3 Character roster', () => {
  const v2 = {
    version: 2,
    campaign: {
      scenarioIndex: 0,
      worldPower: 2,
      playerUnitLevel: 3,
      cards: [{ id: 'c1', templateId: 'strike', global_level: 1, uses_count: 0, modifications: [] }],
      battleLoadout: ['c1', null] as const,
      modKillTargetCardId: 'c1',
      gold: 50,
      items: [],
      equipment: { weapon: null, armor: null, accessory: null },
      phase: 'hub',
      battle: null,
      battleAttemptId: 0,
      battleAttemptSnapshot: null,
      codexDiscovered: [],
      codexSeenEntryIds: [],
    },
  }
  const c = migrateFromUnknown(v2)
  expect(c).not.toBeNull()
  expect(c!.characters).toHaveLength(1)
  expect(c!.characters[0].id).toBe('char-hero-1')
  expect(c!.characters[0].unitLevel).toBe(3)
  expect(c!.characters[0].cards[0].id).toBe('c1')
  expect(c!.squad).toEqual(['char-hero-1', null, null, null])
  expect(c!.expedition).toBeNull()
  expect('playerUnitLevel' in c!).toBe(false)
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/persistence/migrate.test.ts`

- [ ] **Step 3: Implement**

In `schema.ts`: `export const SAVE_VERSION = 3`

In `migrate.ts`:

```ts
function migrateV2CampaignToV3(c: Record<string, unknown>): CampaignState {
  const hero = createCharacter({
    id: LEGACY_HERO_CHARACTER_ID,
    name: 'Герой',
    classId: 'warrior',
    initiativeBase: 10,
    unitLevel: typeof c.playerUnitLevel === 'number' ? c.playerUnitLevel : 1,
  })
  hero.cards = Array.isArray(c.cards) ? (c.cards as CardInstance[]).map((x) => ({ ...x })) : hero.cards
  hero.items = Array.isArray(c.items) ? (c.items as ItemInstance[]).map((x) => ({ ...x })) : []
  hero.equipment = normalizeEquipmentRecord(c.equipment, hero.items)
  hero.battleLoadout = /* normalize from c.battleLoadout or ['c1','c2'] */

  const { playerUnitLevel, cards, items, equipment, battleLoadout, ...rest } = c
  return normalizeLoadedCampaign({
    ...(rest as CampaignState),
    characters: [hero],
    squad: [LEGACY_HERO_CHARACTER_ID, null, null, null],
    expedition: null,
  })
}
```

Update `migrateFromUnknown`: if `version === 2` → `migrateV2CampaignToV3`; if `version === 3` → normalize passthrough.

Update `CampaignState` in `types.ts` — remove legacy flat fields, require `characters`, `squad`, `expedition`.

- [ ] **Step 4: Fix all compile errors** — grep `playerUnitLevel`, `c.cards`, `c.equipment` on campaign; introduce temporary helpers in `selectors.ts` (Task 3) or shim `getPrimaryCharacter(campaign)` used until Task 4 refactors reducers.

- [ ] **Step 5: Run full test suite**

Run: `npm run test`  
Expected: PASS (fix breakages iteratively)

- [ ] **Step 6: Commit**

```bash
git add src/game/persistence/ src/game/types.ts
git commit -m "feat(save): migrate v2 campaign to v3 Character roster"
```

---

### Task 3: Character selectors & hub squad actions

**Files:**
- Create: `src/game/character/selectors.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Test: `src/game/character/selectors.test.ts`
- Test: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function getCharacter(c: CampaignState, id: string): Character | undefined
  export function getSquadCharacters(c: CampaignState): Character[]
  export function getReserveCharacters(c: CampaignState): Character[]
  export function getActiveCharacter(c: CampaignState): Character // first squad slot for UI compat

  // RunAction additions:
  | { type: 'SET_SQUAD_SLOT'; slotIndex: number; characterId: string | null }
  | { type: 'SWAP_SQUAD_SLOTS'; from: number; to: number }
  | { type: 'TRANSFER_ITEM'; itemId: string; fromCharacterId: string; toCharacterId: string }
  ```

- [ ] **Step 1: Write failing selector tests**

```ts
it('getReserveCharacters excludes squad ids', () => {
  const c = campaignWithTwoCharacters()
  expect(getReserveCharacters(c).map((x) => x.id)).toEqual(['char-2'])
})
```

- [ ] **Step 2: Implement selectors**

- [ ] **Step 3: Refactor runReducer equip/buy/sell/loadout**

Change actions to include `characterId: string`:

```ts
| { type: 'EQUIP_ITEM'; characterId: string; itemId: string; slot: EquipmentSlot }
| { type: 'SET_BATTLE_LOADOUT'; characterId: string; loadout: BattleLoadout }
```

Default `characterId` in UI = first non-null squad slot.

Add `SET_SQUAD_SLOT` — rejected when `expedition !== null` (use freeze helper stub returning true for now).

Add `TRANSFER_ITEM` — move item between character stashes if not equipped; rejected during expedition.

- [ ] **Step 4: Update runReducer.test.ts** — all equip tests pass `characterId: 'char-hero-1'`

- [ ] **Step 5: Run tests & commit**

```bash
npm run test -- src/game/character/selectors.test.ts src/game/campaign/runReducer.test.ts
git commit -m "feat(campaign): per-character inventory and squad slot actions"
```

---

### Task 4: Expedition config & snapshot

**Files:**
- Create: `src/game/expedition/config.ts`
- Create: `src/game/expedition/snapshot.ts`
- Create: `src/game/expedition/freeze.ts`
- Modify: `src/game/campaign/scenarios.ts`
- Test: `src/game/expedition/config.test.ts`
- Test: `src/game/expedition/snapshot.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PartySizeConfig = number | { min: number; max: number }
  export type BattleCountConfig = number | { min: number; max: number }

  export type ExpeditionChainConfig = {
    id: string
    partySize: PartySizeConfig
    battleCount: BattleCountConfig
    interBattleReviveAllDowned?: boolean
    /** SCENARIOS indices or scenario ids per battle in chain */
    battleScenarioIds: readonly string[]
  }

  export function resolvePartySize(config: PartySizeConfig, rng: () => number): number
  export function resolveBattleCount(config: BattleCountConfig, rng: () => number): number

  export function buildExpeditionSnapshot(
    campaign: CampaignState,
    chain: ExpeditionChainConfig,
    selectedCharacterIds: readonly string[],
    rng: () => number,
  ): Expedition

  export function assertHubActionAllowed(
    campaign: CampaignState,
    action: 'shop' | 'tavern' | 'squad' | 'equip' | 'transfer',
  ): void // throws or returns false — pick one pattern, use in reducer
  ```

- [ ] **Step 1: Write failing config tests**

```ts
expect(resolvePartySize(4, () => 0)).toBe(4)
expect(resolvePartySize({ min: 2, max: 5 }, () => 0.5)).toBe(4) // floor(min + rng*(max-min+1)) document formula
```

- [ ] **Step 2: Implement config.ts**

- [ ] **Step 3: Write snapshot test** — 4 selected ids → `squadSnapshot.length === partySize`, deep copy equipment/loadout refs

- [ ] **Step 4: Add EXPEDITION_CHAINS** wrapping existing SCENARIOS:

```ts
export const EXPEDITION_CHAINS: readonly ExpeditionChainConfig[] = [
  {
    id: 'campaign-main',
    partySize: 1, // tutorial solo; later scenarios { min: 1, max: 4 }
    battleCount: 3,
    interBattleReviveAllDowned: true,
    battleScenarioIds: ['tutorial', 'two-front', 'boss-lite'],
  },
]
```

Extend `BattleScenario` with `playerSpawns: { x: number; y: number }[]` (migrate `heroStart` → `playerSpawns[0]`).

- [ ] **Step 5: Implement freeze.ts + snapshot.ts**

- [ ] **Step 6: Run tests & commit**

```bash
git commit -m "feat(expedition): chain config, party snapshot, hub freeze guards"
```

---

### Task 5: Expedition state machine in runReducer

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/campaign/battleSnapshot.ts`
- Test: `src/game/campaign/runReducer.test.ts`

**Interfaces:**
- Consumes: `buildExpeditionSnapshot`, `assertHubActionAllowed`, `EXPEDITION_CHAINS`
- Produces actions:
  ```ts
  | { type: 'START_EXPEDITION'; chainId: string; selectedCharacterIds: readonly string[] }
  | { type: 'ADVANCE_EXPEDITION_BATTLE' } // inter-battle → next battle
  | { type: 'INTER_BATTLE_REVIVE_ALL' }  // when interBattleReviveAllDowned
  | { type: 'FINISH_EXPEDITION' }        // internal after last victory
  ```

- [ ] **Step 1: Write failing test — START_EXPEDITION**

```ts
it('START_EXPEDITION freezes squad and starts first battle', () => {
  const next = runReducer(state, {
    type: 'START_EXPEDITION',
    chainId: 'campaign-main',
    selectedCharacterIds: ['char-hero-1'],
  })
  expect(next.expedition).not.toBeNull()
  expect(next.expedition!.battleIndex).toBe(0)
  expect(next.battle).not.toBeNull()
  expect(runReducer(next, { type: 'BUY_ITEM', ... })).toBe(next) // frozen
})
```

- [ ] **Step 2: Implement START_EXPEDITION** — build expedition, build battle from chain's first scenario id, set `phase: 'battle'`

- [ ] **Step 3: Write test — victory mid-chain → inter-battle phase**

Add `RunPhase`: `'inter_battle'` or use `phase: 'hub'` with `battle: null` and `expedition.battleIndex` incremented — **DECIDED: `phase: 'inter_battle'`** for clarity.

- [ ] **Step 4: On battle victory** — if `battleIndex + 1 < battleCount`: sync downed from battle units to `squadSnapshot.metaStatus`, apply camp revive if configured, set `phase: 'inter_battle'`. Else `FINISH_EXPEDITION`.

- [ ] **Step 5: INTER_BATTLE_REVIVE_ALL** — all `downed` → `active` in snapshot

- [ ] **Step 6: ADVANCE_EXPEDITION_BATTLE** — spawn next scenario battle; skip units with `metaStatus: 'downed'` (not on grid, or on grid at 0 hp non-participating — **DECIDED: not spawned** until revived)

- [ ] **Step 7: Defeat** — if all player units downed → `phase: 'defeat'`, keep expedition for retry

- [ ] **Step 8: Run tests & commit**

```bash
git commit -m "feat(expedition): start, inter-battle, advance, finish flow"
```

---

### Task 6: Multi-unit battle spawn & BattleAttemptSnapshot

**Files:**
- Modify: `src/game/campaign/battleSnapshot.ts`
- Modify: `src/game/campaign/scenarios.ts`
- Modify: `src/game/campaign/heroMaxHp.ts` → rename `computeCharacterMaxHpForScenario`
- Test: `src/game/campaign/scenarios.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PartyMemberBattleSnapshot = {
    characterId: string
    unitLevel: number
    equipment: Record<EquipmentSlot, string | null>
    cards: CardInstance[]
    battleLoadout: BattleLoadout
    metaStatus: CharacterMetaStatus
    spawnIndex: number
  }

  export type BattleAttemptSnapshot = {
    worldPower: number
    scenarioSlotIndex: number
    gold: number
    modKillTargetCardId: string | null
    party: readonly PartyMemberBattleSnapshot[]
  }

  export function makePlayerUnits(
    snapshot: BattleAttemptSnapshot,
    scenario: BattleScenario,
  ): Unit[]
  ```

- [ ] **Step 1: Write failing test — 2 active party members spawn at playerSpawns[0] and [1]**

- [ ] **Step 2: Replace makeHero with makePlayerUnits** — unit `id = characterId`

- [ ] **Step 3: Update battleStateFromScenario** — no hardcoded `'hero'` in turnOrder initial (initiative Task 7)

- [ ] **Step 4: Update all tests** referencing `'hero'` → use `char-hero-1` or first party id

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(battle): spawn N player units from party snapshot"
```

---

### Task 7: Initiative system

**Files:**
- Create: `src/game/battle/initiative.ts`
- Modify: `src/game/battle/reducer.ts`
- Modify: `src/game/types.ts` — add `roundNumber: number` to `BattleState`
- Test: `src/game/battle/initiative.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function computeUnitInitiative(
    unit: Unit,
    ctx: { gearBonus?: number; battleBuffs?: number },
  ): number

  export function buildRoundTurnOrder(
    units: readonly Unit[],
    ctx: InitiativeContext,
  ): readonly string[]

  export function advanceTurn(state: BattleState): BattleState
  // When currentTurnIndex wraps → new round → rebuild turnOrder
  ```

- [ ] **Step 1: Write failing test — higher initiative goes first; downed excluded**

- [ ] **Step 2: Implement initiative.ts** — `initiative = unit.initiativeBase ?? 10 + gearBonus` (extend Unit with optional `initiativeBase` snapshot at spawn)

- [ ] **Step 3: Modify battle reducer end-of-turn** — when index wraps, increment `roundNumber`, rebuild `turnOrder`

- [ ] **Step 4: Remove static defaultTurnOrder from scenarios** for player/enemy mix — all units in initiative pool

- [ ] **Step 5: Run battle reducer tests & commit**

```bash
git commit -m "feat(battle): per-round initiative turn order"
```

---

### Task 8: Per-unit player cards in battle

**Files:**
- Create: `src/game/battle/playerCards.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/battle/reducer.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Test: `src/game/battle/playerCards.test.ts`

**Interfaces:**
- BattleState change:
  ```ts
  playerCardsByUnitId: Readonly<Record<string, readonly BattlePlayerCard[]>>
  /** @deprecated remove after migration */ playerCards?: never
  activePlayerCardUnitId?: string // current actor owns card UI
  ```

- Produces:
  ```ts
  export function playerCardsByUnitFromParty(
    party: readonly PartyMemberBattleSnapshot[],
  ): Record<string, BattlePlayerCard[]>

  export function mergeBattleCardsToParty(
    party: Character[],
    battle: BattleState,
  ): Character[] // merge uses_count/global_level per characterId
  ```

- [ ] **Step 1: Write failing test for playerCardsByUnitFromParty**

- [ ] **Step 2: Implement playerCards.ts**

- [ ] **Step 3: Update USE_CARD_* in runReducer** — use `getCurrentActorId(battle)` instead of `'hero'`

- [ ] **Step 4: Update cardCooldown** — tick cooldown for current actor's cards only

- [ ] **Step 5: Victory merge** — iterate `playerCardsByUnitId` keys, update matching `Character.cards`

- [ ] **Step 6: Run tests & commit**

```bash
git commit -m "feat(battle): per-unit player card loadouts and merge on victory"
```

---

### Task 9: Downed state & party wipe detection

**Files:**
- Modify: `src/game/battle/reducer.ts`
- Modify: `src/game/battle/outcomes.ts`
- Modify: `src/game/campaign/runReducer.ts`
- Test: `src/game/battle/outcomes.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function syncDownedAfterBattle(
    expedition: Expedition,
    battle: BattleState,
  ): CharacterBattleSnapshot[]

  export function isPartyWipe(battle: BattleState): boolean
  // all player-side units hp === 0
  ```

- [ ] **Step 1: Write test — player unit hp 0 → excluded from next round turn order**

- [ ] **Step 2: Replace `getCurrentActorId === 'hero'` defeat check** with `isPartyWipe`

- [ ] **Step 3: On battle end** — update expedition snapshot metaStatus for units with hp 0

- [ ] **Step 4: Memento death roll** — per downed character `unitLevel` in runReducer (reuse existing roll helper)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(battle): downed units, party wipe, expedition status sync"
```

---

### Task 10: Tavern — generate & hire

**Files:**
- Create: `src/game/content/characterClasses.ts`
- Create: `src/game/tavern/generateCandidates.ts`
- Modify: `src/game/types.ts` — add `tavernCandidates: TavernCandidate[] | null` to CampaignState (hub only)
- Modify: `src/game/campaign/runReducer.ts`
- Test: `src/game/tavern/generateCandidates.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CharacterClassTemplate = {
    id: string
    label: string
    initiativeBase: number
    hirePrice: number
    gearPool: { slot: EquipmentSlot; templateId: string; weight: number }[]
  }

  export type TavernCandidate = {
    candidateId: string
    classId: string
    price: number
    previewGear: Partial<Record<EquipmentSlot, string>>
  }

  export function generateTavernCandidates(
    rng: () => number,
    count?: number,
  ): TavernCandidate[]

  // Actions:
  | { type: 'REFRESH_TAVERN'; seed?: number }
  | { type: 'HIRE_TAVERN_CANDIDATE'; candidateId: string }
  ```

- [ ] **Step 1: Write failing test — generates 3 candidates, hire adds Character, respects MAX_ROSTER_SIZE**

- [ ] **Step 2: Implement characterClasses.ts** — min 2 classes: `warrior`, `ranger`

- [ ] **Step 3: Implement generateCandidates.ts**

- [ ] **Step 4: HIRE creates character with rolled gear in stash/equipped**, refresh costs gold (constant `TAVERN_REFRESH_COST = 15`)

- [ ] **Step 5: Rejected when expedition active or roster full**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(tavern): random candidates and hire into roster"
```

---

### Task 11: playerAi (generalize heroAi)

**Files:**
- Create: `src/features/battle/playerAi.ts`
- Create: `src/features/battle/playerAi.test.ts`
- Modify: `src/features/battle/BattleScreen.tsx`
- Deprecate: `src/features/battle/heroAi.ts` — re-export from playerAi

**Interfaces:**
- Produces:
  ```ts
  export type PlayerAiDecision =
    | { kind: 'battle'; action: BattleAction }
    | { kind: 'card'; cardId: string; targetId: string }
    | null

  export function pickPlayerAiAction(state: BattleState): PlayerAiDecision
  // Uses getCurrentActorId; cards from playerCardsByUnitId[currentId]
  ```

- [ ] **Step 1: Copy heroAi.test.ts → playerAi.test.ts**, replace `'hero'` with `'char-hero-1'`, cards keyed by unit

- [ ] **Step 2: Implement pickPlayerAiAction**

- [ ] **Step 3: BattleScreen autobattle** — run when current actor is any player unit

- [ ] **Step 4: Run tests & commit**

```bash
git commit -m "feat(battle): playerAi for any allied unit turn"
```

---

### Task 12: Hub UI — roster, squad, per-character inventory

**Files:**
- Create: `src/features/character/CharacterRosterView.tsx`
- Create: `src/features/character/SquadSlotRow.tsx`
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`
- Modify: `src/features/inventory/EquipmentInventoryView.tsx` — prop `characterId`
- Modify: `src/features/inventory/CardsInventoryView.tsx` — prop `characterId`
- Modify: `src/features/campaign/campaignHubShared.ts` — tab type + `'tavern'`

- [ ] **Step 1: CharacterRosterView** — list reserve + squad slots (4 default), click to select active character for inventory pane

- [ ] **Step 2: SquadSlotRow** — drag or select to `SET_SQUAD_SLOT`; disabled when `expedition !== null`

- [ ] **Step 3: Wire EquipmentInventoryView/CardsInventoryView** to selected `characterId`

- [ ] **Step 4: Item transfer** — drag item onto another character in roster list → `TRANSFER_ITEM`

- [ ] **Step 5: Manual smoke test** — `npm run start`, verify equip on char-hero-1 still works

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(ui): character roster, squad slots, per-character inventory"
```

---

### Task 13: Tavern tab & expedition picker

**Files:**
- Create: `src/features/campaign/CampaignTavernTab.tsx`
- Create: `src/features/campaign/SquadPicker.tsx`
- Modify: `src/features/campaign/CampaignHubNav.tsx`
- Modify: `src/features/campaign/CampaignBattleTab.tsx`

- [ ] **Step 1: CampaignTavernTab** — 3 candidates, refresh button, hire → `HIRE_TAVERN_CANDIDATE`; warning at 90+ roster

- [ ] **Step 2: SquadPicker** — dynamic N slots from selected chain's `partySize`; validation message if roster too small

- [ ] **Step 3: CampaignBattleTab** — list EXPEDITION_CHAINS, preview battleCount/partySize, SquadPicker, «Начать expedition» → `START_EXPEDITION`

- [ ] **Step 4: Disable shop/tavern tabs when expedition !== null**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): tavern tab and expedition squad picker"
```

---

### Task 14: Inter-battle screen & BattleScreen updates

**Files:**
- Create: `src/features/campaign/InterBattleScreen.tsx`
- Create: `src/features/battle/InitiativeQueue.tsx`
- Modify: `src/App.tsx` — route `phase === 'inter_battle'`
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: InterBattleScreen** — show squad snapshot statuses; if `interBattleReviveAllDowned`, auto-revive or button; «Следующий бой» → `ADVANCE_EXPEDITION_BATTLE`; disable if all downed

- [ ] **Step 2: InitiativeQueue** — horizontal list of unit ids from `turnOrder`

- [ ] **Step 3: BattleScreen** — highlight current actor; card panel uses `playerCardsByUnitId[currentActorId]`; click player unit to select actor on your turn

- [ ] **Step 4: App.tsx routing**:

```tsx
if (campaign.phase === 'inter_battle') return <InterBattleScreen />
if (campaign.battle !== null) return <BattleScreen />
return <CampaignHub />
```

- [ ] **Step 5: Run build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(ui): inter-battle screen, initiative queue, multi-actor battle"
```

---

### Task 15: Integration tests & codex/profile updates

**Files:**
- Modify: `src/features/profile/HeroProfileContent.tsx` → accept `characterId`
- Modify: `src/game/campaign/runReducer.test.ts` — end-to-end expedition 3 battles
- Modify: `src/features/campaign/CampaignHubHud.tsx` — remove single `playerUnitLevel`, show squad summary

- [ ] **Step 1: Write integration test — full expedition with 1 character completes 3 battles**

- [ ] **Step 2: Profile modal** — show selected squad member or first squad slot

- [ ] **Step 3: Full test suite + build**

Run: `npm run test && npm run build`

- [ ] **Step 4: Commit**

```bash
git commit -m "test(expedition): integration test and profile/hud updates"
```

---

## Spec Coverage Self-Review

| Spec § | Task |
|--------|------|
| Character model | 1, 3 |
| CampaignState roster/squad | 1, 2, 3 |
| Expedition freeze | 4, 5 |
| Variable partySize | 4, 13 |
| Initiative | 7, 14 |
| Downed / inter-battle revive | 5, 9, 14 |
| Tavern | 10, 13 |
| Per-character cards | 8 |
| Migration v3 | 2 |
| Multi-unit battle | 6, 11 |
| UI tabs | 12, 13, 14 |
| Stones hook | defer — add `// stone-currency-hook` comment in types Task 1 optional |

**Gaps intentionally deferred:** consumables, in-battle revive cards, procedural chains, 10-slot UI polish — hooks only.

---

## Verification Checklist (final)

- [ ] `npm run test` — all pass
- [ ] `npm run build` — no TS errors
- [ ] Fresh save: hire in tavern, set squad, run expedition 3 battles
- [ ] Legacy v2 save loads as char-hero-1
- [ ] Shop/tavern disabled during expedition
- [ ] Downed character skips next battle until inter-battle revive
