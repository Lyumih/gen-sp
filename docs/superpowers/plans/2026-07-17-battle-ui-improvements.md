# Battle UI Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Улучшить тактическую читаемость боя (журнал с поглощением и цветами, очерёдность хода, мини-статы на клетках, завершение хода, пассивы в панели) и UX loadout на странице «Персонаж» (переименования, «Надеть»/«Снять»).

**Architecture:** Ядро — расширение `BattleLogEntry` и `applySingleStrike` для `absorbedDamage`, новый `BattleAction` `end_turn`; UI — выделенные компоненты `TurnOrderStrip`, `BattleLogLine`, `ActorPassivesPanel`, расширение `UnitToken`; хелпер `unitCombatStats.ts` как единый источник ⚔/🛡. Character hub — правки в `CardsInventoryView` по паттерну `EquipmentInventoryView`.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-07-17-battle-ui-improvements-design.md`  
**UI patterns:** `AGENTS.md`

## Global Constraints

- Emoji для stat-маркеров — только из `src/game/ui/labels.ts` (`UI_ATTACK`, `UI_DEFENSE`, `UI_HEART`, `UI_DAMAGE`)
- Журнал: `(поглощено N)` только при `N > 0`; классы `battle-log--hero` / `battle-log--enemy` / `battle-log--neutral`
- Очерёдность хода: одна строка, горизонтальный scroll (`GameScrollX` или `.game-scroll-x`)
- Мини-статы: effective in battle (base → gear/passives/level → `effectiveStatWithStatuses`); tooltip — существующий `BattleUnitTooltip`
- «Завершить ход»: без confirm; только `currentActor.side === 'player'`; disabled при auto-battle / анимации
- Пассивы в бою: только текущий актор; секция скрыта если пусто
- Character: «В бой» → «Активные умения»; «Навыки в бою» → «Пассивные навыки»; DnD сохраняется
- Expedition freeze: кнопки equip disabled + tooltip (как gear)
- Сообщения UI — `App.useApp().message`, не static `message`
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Engine: log + end turn** | 1–2 | `absorbedDamage`, формат, `end_turn` |
| **B — Log UI** | 3 | Цветные строки журнала |
| **C — Combat mini-stats** | 4–6 | `unitCombatStats`, `UnitToken`, `TurnOrderStrip` |
| **D — Battle panel** | 7–8 | `BattleScreen` wiring, passives, end-turn button |
| **E — Character hub** | 9 | Rename + «Надеть»/«Снять» |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/types.ts` | `absorbedDamage?` on strike; `{ type: 'end_turn' }` |
| `src/game/battle/reducer.ts` | Capture absorption; `tryEndTurn`; `applyAction` case |
| `src/game/battle/battleLog.ts` | Format + `battleLogEntryTone()` |
| `src/game/battle/battleLog.test.ts` | Format + tone tests |
| `src/game/battle/unitCombatStats.ts` | `unitCombatMiniStats()` |
| `src/game/battle/unitCombatStats.test.ts` | Stat helper tests |
| `src/features/battle/BattleLogLine.tsx` | Colored log row |
| `src/features/battle/battle.css` | Log tone + turn-order scroll + mini-stat font |
| `src/features/battle/UnitToken.tsx` | ⚔🛡❤️ props |
| `src/features/battle/TurnOrderStrip.tsx` | «Очерёдность хода» |
| `src/features/battle/ActorPassivesPanel.tsx` | Passives under cards |
| `src/features/battle/BattleScreen.tsx` | Integrate all battle UI |
| `src/features/inventory/CardsInventoryView.tsx` | Rename + equip buttons |
| `src/features/campaign/sectionTooltips.ts` | Updated help text |

---

### Task 1: Strike absorption in reducer

**Files:**
- Modify: `src/game/types.ts` (strike entry)
- Modify: `src/game/battle/reducer.ts` (`applySingleStrike`, splash/AoE paths if shared)
- Test: `src/game/battle/reducer.test.ts`

**Interfaces:**
- Produces on `BattleLogEntry` strike:
  ```ts
  absorbedDamage?: number  // present only when > 0
  ```

- Consumes: existing `applySingleStrike` pipeline

- [ ] **Step 1: Write failing test**

Add to `src/game/battle/reducer.test.ts`:

```ts
it('strike log includes absorbedDamage when target mitigates', () => {
  const riposte = /* existing passive with defense or use enemy with defense_up status */
  // Prefer: hero attacks enemy with high mitigation; assert last log entry:
  expect(last).toMatchObject({
    type: 'strike',
    damage: expect.any(Number),
    absorbedDamage: expect.any(Number),
  })
  expect((last as { absorbedDamage?: number }).absorbedDamage).toBeGreaterThan(0)
})

it('strike log omits absorbedDamage when zero', () => {
  // Basic melee vs unarmored enemy — existing test at line ~190
  const last = hit.battleLog[hit.battleLog.length - 1]
  expect(last).toMatchObject({ type: 'strike', damage: 2 })
  expect((last as { absorbedDamage?: number }).absorbedDamage).toBeUndefined()
})
```

Use a scenario with `passivesByUnitId` defense passive on target or `defense_up` status — mirror patterns in `reducer.test.ts` lines 475–538.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/battle/reducer.test.ts -t "absorbedDamage"`
Expected: FAIL — `absorbedDamage` undefined

- [ ] **Step 3: Implement in `applySingleStrike`**

After dodge check, before target mitigation:

```ts
const damageBeforeTargetMitigation = damage
// ... existing mitigatePassiveDefense, ward, resist, applyDamageReduction via withDamage
const finalDamage = damage // value passed to withDamage
const absorbedDamage = Math.max(0, damageBeforeTargetMitigation - finalDamage)

const logEntry: BattleLogEntry = {
  type: 'strike',
  attackerId: params.attackerId,
  targetId: params.targetId,
  damage: finalDamage,
  attackKind: params.attackKind,
  targetKilled: wasKill,
  ...(absorbedDamage > 0 ? { absorbedDamage } : {}),
  ...(params.fromCard ? { fromCard: params.fromCard } : {}),
}
```

Apply same pattern anywhere else that pushes `type: 'strike'` with real damage (AoE splash helper, `applyPassivePatches` strike entries) — extract small helper `strikeLogEntry(...)` if duplication exceeds 2 sites.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/game/battle/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/battle/reducer.ts src/game/battle/reducer.test.ts
git commit -m "feat(battle): log absorbed damage on strike entries"
```

---

### Task 2: Format absorption + end_turn action

**Files:**
- Modify: `src/game/battle/battleLog.ts`
- Create: `src/game/battle/battleLog.test.ts`
- Modify: `src/game/types.ts` (`BattleAction`)
- Modify: `src/game/battle/reducer.ts` (`tryEndTurn`, `applyAction`)

**Interfaces:**
- Produces:
  ```ts
  export function battleLogEntryTone(
    entry: BattleLogEntry,
    unitSideLookup: (unitId: string) => 'player' | 'enemy' | undefined,
  ): 'hero' | 'enemy' | 'neutral'
  ```

- [ ] **Step 1: Write failing tests**

Create `src/game/battle/battleLog.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { battleLogEntryTone, formatBattleLogEntry } from './battleLog'

describe('formatBattleLogEntry strike absorption', () => {
  it('appends поглощено when absorbedDamage > 0', () => {
    const text = formatBattleLogEntry({
      type: 'strike',
      attackerId: 'e1',
      targetId: 'hero',
      damage: 3,
      absorbedDamage: 7,
      attackKind: 'ranged',
      targetKilled: false,
    })
    expect(text).toContain('3')
    expect(text).toContain('(поглощено 7)')
    expect(text).toContain('(выстрел)')
  })

  it('omits поглощено when no absorbedDamage', () => {
    const text = formatBattleLogEntry({
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
      attackKind: 'melee',
      targetKilled: false,
    })
    expect(text).not.toContain('поглощено')
  })
})

describe('battleLogEntryTone', () => {
  const side = (id: string) => (id === 'hero' ? 'player' : 'enemy') as const

  it('hero strike is hero tone', () => {
    expect(
      battleLogEntryTone(
        { type: 'strike', attackerId: 'hero', targetId: 'e1', damage: 1, attackKind: 'melee', targetKilled: false },
        side,
      ),
    ).toBe('hero')
  })

  it('card_level_up is neutral', () => {
    expect(
      battleLogEntryTone(
        { type: 'card_level_up', cardId: 'c1', templateId: 'strike', fromLevel: 1, toLevel: 2, roll: 42 },
        side,
      ),
    ).toBe('neutral')
  })

  it('failed passive_proc is neutral', () => {
    expect(
      battleLogEntryTone(
        { type: 'passive_proc', templateId: 'riposte', procSuccess: false, unitId: 'hero' },
        side,
      ),
    ).toBe('neutral')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test -- src/game/battle/battleLog.test.ts`
Expected: FAIL — exports missing / wrong format

- [ ] **Step 3: Implement battleLog.ts**

Update strike case:

```ts
const absorbed =
  entry.absorbedDamage !== undefined && entry.absorbedDamage > 0
    ? ` (поглощено ${entry.absorbedDamage})`
    : ''
return `${formatUnitRef(entry.attackerId, lookup)} → ${formatUnitRef(entry.targetId, lookup)}: ${entry.damage} ${UI_DAMAGE}${absorbed} (${src})${kill}`
```

Add `battleLogEntryTone` per spec §3.2 table (`status_applied` → neutral).

- [ ] **Step 4: Implement end_turn**

In `types.ts`:

```ts
| { type: 'end_turn' }
```

In `reducer.ts`:

```ts
function tryEndTurn(state: BattleState): BattleState {
  const actorId = getCurrentActorId(state)
  if (!actorId) return state
  const actor = getUnit(state, actorId)
  if (!isAliveUnit(actor) || actor.side !== 'player') return state
  return advanceBattleTurn(state)
}

// applyAction switch:
case 'end_turn':
  return tryEndTurn(state)
```

Add test:

```ts
it('end_turn advances to next actor without changing positions', () => {
  const before = battle({ /* hero turn, two units */ })
  const heroX = before.units.find((u) => u.id === HERO_ID)!.x
  const next = applyAction(before, { type: 'end_turn' })
  expect(getCurrentActorId(next)).not.toBe(HERO_ID)
  expect(next.units.find((u) => u.id === HERO_ID)?.x).toBe(heroX)
})
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/game/battle/battleLog.test.ts src/game/battle/reducer.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/battle/battleLog.ts src/game/battle/battleLog.test.ts src/game/types.ts src/game/battle/reducer.ts src/game/battle/reducer.test.ts
git commit -m "feat(battle): log tone helper, absorption format, end_turn action"
```

---

### Task 3: Colored battle log UI

**Files:**
- Create: `src/features/battle/BattleLogLine.tsx`
- Modify: `src/features/battle/battle.css`
- Modify: `src/features/battle/BattleScreen.tsx` (journal section ~1196)

**Interfaces:**
- Consumes: `formatBattleLogEntry`, `battleLogEntryTone`, `unitLogLookup`
- Produces:
  ```tsx
  export function BattleLogLine(props: {
    entry: BattleLogEntry
    unitSideLookup: (unitId: string) => 'player' | 'enemy' | undefined
    unitLogLookup?: BattleLogUnitLookup
  }): JSX.Element
  ```

- [ ] **Step 1: Add CSS classes to battle.css**

```css
.battle-log-line {
  margin-bottom: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.35;
}

.battle-log--hero {
  color: #1677ff;
  background: #e6f4ff;
}

.battle-log--enemy {
  color: #cf1322;
  background: #fff1f0;
}

.battle-log--neutral {
  color: #8c8c8c;
  background: transparent;
}
```

- [ ] **Step 2: Implement BattleLogLine.tsx**

```tsx
import type { BattleLogEntry } from '../../game/types'
import { battleLogEntryTone, formatBattleLogEntry, type BattleLogUnitLookup } from '../../game/battle/battleLog'

const TONE_CLASS = {
  hero: 'battle-log--hero',
  enemy: 'battle-log--enemy',
  neutral: 'battle-log--neutral',
} as const

export function BattleLogLine({ entry, unitSideLookup, unitLogLookup }: {
  entry: BattleLogEntry
  unitSideLookup: (unitId: string) => 'player' | 'enemy' | undefined
  unitLogLookup?: BattleLogUnitLookup
}) {
  const tone = battleLogEntryTone(entry, unitSideLookup)
  return (
    <div className={`battle-log-line ${TONE_CLASS[tone]}`}>
      {formatBattleLogEntry(entry, unitLogLookup)}
    </div>
  )
}
```

- [ ] **Step 3: Wire BattleScreen**

Replace inline `formatBattleLogEntry` map with:

```tsx
const unitSideLookup = useMemo(() => {
  if (!battle) return () => undefined
  return (unitId: string) => battle.units.find((u) => u.id === unitId)?.side
}, [battle])

// in render:
battle.battleLog.map((entry, i) => (
  <BattleLogLine
    key={i}
    entry={entry}
    unitSideLookup={unitSideLookup}
    unitLogLookup={unitLogLookup}
  />
))
```

- [ ] **Step 4: Manual smoke**

Run: `npm run start` — enter battle, verify colored lines for hero/enemy hits.

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/BattleLogLine.tsx src/features/battle/battle.css src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): colored battle log lines"
```

---

### Task 4: unitCombatMiniStats helper

**Files:**
- Create: `src/game/battle/unitCombatStats.ts`
- Create: `src/game/battle/unitCombatStats.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function unitCombatMiniStats(
    unit: Unit,
    campaign: CampaignState,
    worldPower: number,
  ): { attack: number; defense: number } | null
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { unitCombatMiniStats } from './unitCombatStats'
import { appendUnitStatus } from './unitStatus'
// build minimal unit with baseStats attack 5 defense 3
// apply defense_up +2 → expect defense 5

it('includes status flat modifiers on defense', () => {
  // ...
  expect(stats!.defense).toBe(5)
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- src/game/battle/unitCombatStats.test.ts`

- [ ] **Step 3: Implement**

Mirror `BattleUnitCell` effective path:

```ts
import { getItemTemplate } from '../content/itemTemplates'
import { aggregatePassiveSkillStatBonuses } from '../passives/passiveBonus'
import { computeGearStatBonuses } from '../equipment/gearStats'
import { computeEffectiveStats } from '../stats/effectiveStats'
import { effectiveStatWithStatuses } from './unitStatus'
import type { CampaignState, Unit } from '../types'

export function unitCombatMiniStats(
  unit: Unit,
  campaign: CampaignState,
  worldPower: number,
): { attack: number; defense: number } | null {
  if (!unit.baseStats) return null
  const character = campaign.characters.find((c) => c.id === unit.id)
  const gearBonuses = character
    ? computeGearStatBonuses(character.items, character.equipment, getItemTemplate)
    : {}
  const passiveBonuses = character
    ? aggregatePassiveSkillStatBonuses(character.passives, character.passiveEquip, unit.baseStats)
    : {}
  const effective = computeEffectiveStats(
    unit.baseStats,
    unit.unitLevel,
    worldPower,
    gearBonuses,
    passiveBonuses,
  )
  return {
    attack: effectiveStatWithStatuses(effective.attack, 'attack', unit),
    defense: effectiveStatWithStatuses(effective.defense, 'defense', unit),
  }
}
```

For pure enemies (no character): use `unit.baseStats` + level/worldPower only if already applied on `Unit` at spawn — match whatever `BattleUnitTooltip` uses for enemies (check `BattleUnitCell` branch: enemies have `baseStats` on unit).

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/battle/unitCombatStats.ts src/game/battle/unitCombatStats.test.ts
git commit -m "feat(battle): unitCombatMiniStats for grid and turn order"
```

---

### Task 5: UnitToken mini-stats

**Files:**
- Modify: `src/features/battle/UnitToken.tsx`
- Modify: `src/features/battle/battle.css` (optional `.unit-token__mini-stats`)

**Interfaces:**
- Consumes: optional `{ attack, defense }` prop `combatStats?: { attack: number; defense: number }`
- Produces: grid shows `⚔N 🛡N` line; initiative shows `⚔N 🛡N` + `❤️hp/maxHp`

- [ ] **Step 1: Extend UnitToken props**

```tsx
import { UI_ATTACK, UI_DEFENSE, UI_HEART } from '../../game/ui/labels'

export type UnitTokenProps = {
  // ...existing
  combatStats?: { attack: number; defense: number } | null
  maxHp?: number
}
```

Grid inner (after emoji):

```tsx
{combatStats ? (
  <span style={{ fontSize: 9, lineHeight: 1.1 }}>
    {UI_ATTACK}{combatStats.attack} {UI_DEFENSE}{combatStats.defense}
  </span>
) : null}
{hp !== undefined ? (
  <span>{UI_HEART}{hp}</span>
) : null}
```

Initiative inner (after emoji):

```tsx
{combatStats ? (
  <span style={{ fontSize: 9 }}>
    {UI_ATTACK}{combatStats.attack} {UI_DEFENSE}{combatStats.defense}
  </span>
) : null}
{hp !== undefined && maxHp !== undefined ? (
  <span style={{ fontSize: 9 }}>{UI_HEART}{hp}/{maxHp}</span>
) : null}
```

- [ ] **Step 2: Pass stats from BattleUnitCell**

In `BattleScreen.tsx` `BattleUnitCell`, compute `combatStats = unitCombatMiniStats(unit, campaign, worldPower)` and pass to `UnitToken`.

- [ ] **Step 3: Visual check** — grid cells show three lines without overflow on `CELL_PX` (may need `fontSize: 8` or slightly taller cell — adjust minimally).

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/UnitToken.tsx src/features/battle/BattleScreen.tsx src/features/battle/battle.css
git commit -m "feat(battle): attack/defense mini-stats on grid tokens"
```

---

### Task 6: TurnOrderStrip

**Files:**
- Create: `src/features/battle/TurnOrderStrip.tsx`
- Modify: `src/features/battle/BattleScreen.tsx` (replace Initiative + Health blocks)
- Optional deprecate: `InitiativeQueue.tsx` — keep file, re-export from TurnOrderStrip or inline migration

**Interfaces:**
- Produces:
  ```tsx
  export function TurnOrderStrip(props: {
    turnOrder: readonly string[]
    currentTurnIndex: number
    units: readonly Unit[]
    campaign: CampaignState
    worldPower: number
    highlightedUnitId?: string | null
    onHighlight?: (unitId: string | null) => void
  }): JSX.Element
  ```

- [ ] **Step 1: Implement TurnOrderStrip**

Wrap in `<GameScrollX>`; inner flex row `nowrap`:

```tsx
{turnOrder.map((unitId, index) => {
  const unit = units.find((u) => u.id === unitId)
  // ...
  const badge = unit ? turnBadgeLabel(unit.id, turnOrder, currentTurnIndex, isAlive) : null
  const combatStats = unit ? unitCombatMiniStats(unit, campaign, worldPower) : null
  const chip = (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {badge ? <Badge count={badge} color="#1677ff" className="battle-cell__turn-badge" /> : null}
      <UnitToken
        variant="initiative"
        display={display}
        combatStats={combatStats}
        hp={unit?.hp}
        maxHp={unit?.maxHp}
        isCurrentActor={isCurrent}
        isDead={isDead}
        highlighted={highlightedUnitId === unitId}
        onMouseEnter={() => onHighlight?.(unitId)}
        onMouseLeave={() => onHighlight?.(null)}
      />
    </span>
  )
  // Wrap with BattleUnitTooltip when unit.baseStats
  return (
    <span key={`${unitId}-${index}`} role="listitem" style={{ flex: '0 0 auto' }}>
      {tooltipWrappedChip}
      {index < turnOrder.length - 1 ? <span> → </span> : null}
    </span>
  )
})}
```

- [ ] **Step 2: Replace BattleScreen blocks**

Remove «Здоровье» section (~863–877). Change title «Инициатива» → «Очерёдность хода». Use `<TurnOrderStrip ... currentTurnIndex={battle.currentTurnIndex} />`.

- [ ] **Step 3: Remove dead code** — `unitsHealthOrder` useMemo if only used for removed block.

- [ ] **Step 4: Smoke test** — many units → single scrollable row.

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/TurnOrderStrip.tsx src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): merge initiative and HP into turn order strip"
```

---

### Task 7: End turn button + ActorPassivesPanel

**Files:**
- Create: `src/features/battle/ActorPassivesPanel.tsx`
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export function ActorPassivesPanel(props: {
    passives: readonly PassiveInstance[]
    character: Character | undefined
    campaign: CampaignState
  }): JSX.Element | null
  ```

- [ ] **Step 1: End turn button**

After `Radio.Group` in «Перемещение и базовая атака»:

```tsx
{actor && !autoBattleEnabled ? (
  <Button
    style={{ marginTop: 8 }}
    disabled={actionsDisabled || animationPlaying}
    onClick={() => dispatchBattle({ type: 'end_turn' })}
  >
    Завершить ход
  </Button>
) : null}
```

Wire `dispatchBattle` / existing battle dispatch path used for move/attack.

- [ ] **Step 2: ActorPassivesPanel**

```tsx
import { List, Popover, Typography } from 'antd'
import { describePassiveStats, getPassiveDisplayLabel } from '../../game/descriptions/passiveText'
import { resolvePassiveEmoji } from '../inventory/inventoryEmoji'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'

export function ActorPassivesPanel({ passives, character, campaign }) {
  if (!character || passives.length === 0) return null
  return (
    <div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
        Пассивные навыки
      </Typography.Text>
      <List
        size="small"
        dataSource={[...passives]}
        renderItem={(p) => {
          const stats = describePassiveStats(p, character, campaign)
          const tmpl = getPassiveTemplate(p.templateId)
          const summary = stats.lines[0] ?? ''
          const popover = (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {stats.lines.map((line, i) => (
                <li key={i}><Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text></li>
              ))}
            </ul>
          )
          return (
            <List.Item style={{ padding: '4px 0' }}>
              <Popover content={popover} trigger="hover" mouseEnterDelay={0.3}>
                <span style={{ fontSize: 12, cursor: 'default' }}>
                  {resolvePassiveEmoji(tmpl)} {getPassiveDisplayLabel(p.templateId)} — {summary}
                </span>
              </Popover>
            </List.Item>
          )
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Wire in BattleScreen**

After «Умения и карты» block:

```tsx
<ActorPassivesPanel
  passives={battle.passivesByUnitId?.[currentId ?? ''] ?? []}
  character={actorCharacter}
  campaign={campaign}
/>
```

Resolve `PassiveInstance[]` from battle snapshot (already on `passivesByUnitId`).

- [ ] **Step 4: Smoke test** — passives visible on hero turn; hidden when empty.

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/ActorPassivesPanel.tsx src/features/battle/BattleScreen.tsx
git commit -m "feat(battle): end turn button and actor passives panel"
```

---

### Task 8: Character hub rename + equip buttons

**Files:**
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Modify: `src/features/campaign/sectionTooltips.ts`
- Test: `src/features/character/hub/clickEquip.test.ts` (extend) or new `CardsInventoryView` equip test if feasible

**Interfaces:**
- Consumes: `firstEmptyCardSlot`, `firstEmptyPassiveSlot` from `clickEquip.ts`
- Consumes: `ItemPopoverActions` pattern from `EquipmentInventoryView`

- [ ] **Step 1: Rename labels**

```tsx
// «В бой» → «Активные умения»
// «Навыки в бою» → «Пассивные навыки»
// ariaLabel «Слот в бою» → «Слот активного умения»
// ariaLabel «Слот навыка» → «Слот пассивного навыка»
```

Update `SKILLS_SECTION_HELP`:

```ts
export const SKILLS_SECTION_HELP =
  'Вкладки «Умения» и «Навыки» — коллекция; слоты «Активные умения» и «Пассивные навыки» — в центральной колонке. Перетащите или нажмите «Надеть» / «Снять».'
```

- [ ] **Step 2: «Снять» on loadout slots**

Extend `SortableCardCell` with optional `onUnequip?: () => void`. When provided (loadout context only), add to popover:

```tsx
<ItemPopoverActions
  inBattle={inBattle}
  actions={[{ key: 'unequip', label: 'Снять', onClick: onUnequip }]}
/>
```

Pass from `LoadoutSlotCell`:

```tsx
onUnequip={() => onSetBattleLoadout(slotIndex, null)}
```

Same for `DraggablePassiveCell` in equip slot via `PassiveEquipSlotCell`:

```tsx
onUnequip={() => onSetPassiveEquip(slotIndex, null)}
```

- [ ] **Step 3: «Надеть» in collection**

In `SortableCardCell` collection mode, add optional `onEquip?: () => void`:

```tsx
actions={[
  { key: 'equip', label: 'Надеть', type: 'primary', disabled: loadoutBlocked || inBattle, onClick: onEquip },
  // existing sell...
]}
```

In `CardsInventoryView` renderCell for collection:

```tsx
onEquip={() => {
  const slot = firstEmptyCardSlot(campaign, hero.id)
  if (slot === null) {
    message.warning('Нет свободных слотов')
    return
  }
  onSetBattleLoadout(slot, card.id)
}}
```

For passives collection:

```tsx
onEquip={() => {
  const slot = firstEmptyPassiveSlot(campaign, hero.id)
  if (slot === null) {
    message.warning('Нет свободных слотов')
    return
  }
  if (!canEquipPassive(hero, slot, passive.id)) {
    message.warning('Нельзя надеть: такой бонус к стату уже активен')
    return
  }
  onSetPassiveEquip(slot, passive.id)
}}
```

- [ ] **Step 4: Test click equip helpers**

Add to `clickEquip.test.ts` or integration test that `firstEmptyCardSlot` returns expected slot.

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: PASS

Run: `npm run build`
Expected: PASS (tsc + vite)

- [ ] **Step 6: Commit**

```bash
git add src/features/inventory/CardsInventoryView.tsx src/features/campaign/sectionTooltips.ts src/features/character/hub/clickEquip.test.ts
git commit -m "feat(character): rename loadout sections and add equip/unequip buttons"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| 3 Journal absorption | 1, 2 |
| 3.2 Log colors | 2, 3 |
| 4 Turn order merge + stats | 4, 5, 6 |
| 5 End turn | 2, 7 |
| 6 Passives in battle | 7 |
| 7 Character rename + buttons | 8 |
| 8 Testing | each task |
| 9 Out of scope | — |

## Self-Review Notes

- `status_applied` → neutral (no initiator in types)
- Gold highlights excluded per spec §9
- `InitiativeQueue.tsx` may remain unused after Task 6 — delete or re-export to avoid lint unused file
- Verify `dispatchBattle` accepts new action type in store wrapper
- Enemy units: confirm `unitCombatMiniStats` works without `campaign.characters` entry (use `unit.baseStats` directly)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-battle-ui-improvements.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach?
