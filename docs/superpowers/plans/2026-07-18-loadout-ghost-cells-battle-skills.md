# Loadout Ghost Cells & Battle Skill Cells — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ghost-пустые слоты loadout, блок «Экипировка» над активными умениями, ячейки умений/пассивов в бою, скролл поля по viewport.

**Architecture:** Расширить `InventoryCell` классом `inv-cell--empty-ghost` для типизированных пустых слотов; разделить `characterHub` на `buildHeader` + `loadoutPanel` и вставить `equipSection` между ними; боевые `BattleSkillCell` и обновлённый `ActorPassivesPanel` переиспользуют `InventoryCell` + `inventory.css` без DnD.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, `@dnd-kit`, React Compiler.

**Spec:** `docs/superpowers/specs/2026-07-18-loadout-ghost-cells-battle-skills-design.md`  
**UI patterns:** `AGENTS.md`

## Global Constraints

- Ghost empty: фон `#f0f0f0`, emoji `opacity: 0.28`, пунктир; **без** `contextBadge` и **без** `hintText «перетащи»` на пустых equip/skill/passive слотах
- Generic empty grid cells (коллекция, сундук) — **без** ghost emoji
- «Надето» → «Экипировка» в `EquipmentInventoryView`, `ShopBuildPanel`, `sectionTooltips.ts`
- Порядок центральной колонки: профиль → **Экипировка** → Активные умения → Пассивные навыки
- Бой: заголовок «Умения»; ячейка = emoji + `⭐level` + `💥`/`❤️`; название только в tooltip (`mouseEnterDelay={0.3}`)
- Selected skill: `inv-cell--selected`; CD/disabled: `inv-cell--disabled` + `opacity: 0.5`
- Поле боя: `.game-battle-field-scroll` с `max-height: calc(100vh - 280px)` и `overflow: auto`
- Отступ очередь → поле: `.game-battle-turn-order { margin-bottom: 16px }`
- Emoji stat-маркеры — из `src/game/ui/labels.ts`; emoji умений — `resolveCardEmoji` / `resolvePassiveEmoji`
- Сообщения UI — `App.useApp().message`, не static `message`
- Frequent commits per task

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Ghost foundation** | 1–2 | CSS + `InventoryCell` + slot wiring |
| **B — Character hub** | 3–4 | Порядок секций + переименование |
| **C — Battle skills** | 5–6 | `BattleSkillCell` + `BattleScreen` |
| **D — Battle polish** | 7–8 | Passives cells + field scroll |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/features/inventory/inventory.css` | `.inv-cell--empty-ghost`, `.game-battle-field-scroll` |
| `src/features/inventory/InventoryCell.tsx` | Ghost class when `empty` + `emoji` |
| `src/features/inventory/InventoryCell.test.tsx` | Ghost class tests |
| `src/features/inventory/EquipmentInventoryView.tsx` | Rename, hub order, empty equip ghost |
| `src/features/inventory/CardsInventoryView.tsx` | Empty loadout/passive ghost (no change to filled) |
| `src/features/character/hub/CharacterHubLayout.tsx` | `buildHeader` + `loadoutPanel` |
| `src/features/inventory/EquipmentInventoryView.test.tsx` | Section order + rename smoke |
| `src/features/shop/hub/ShopBuildPanel.tsx` | «Экипировка» |
| `src/features/campaign/sectionTooltips.ts` | Help text |
| `src/features/battle/BattleSkillCell.tsx` | Selectable battle skill cell |
| `src/features/battle/BattleSkillCell.test.tsx` | Render smoke |
| `src/features/battle/ActorPassivesPanel.tsx` | Cell row |
| `src/features/battle/BattleScreen.tsx` | Wire skills, scroll wrapper, turn-order class |
| `src/features/layout/game-layout.css` | `.game-battle-turn-order` |

---

### Task 1: Ghost CSS and InventoryCell

**Files:**
- Modify: `src/features/inventory/inventory.css`
- Modify: `src/features/inventory/InventoryCell.tsx`
- Create: `src/features/inventory/InventoryCell.test.tsx`

**Interfaces:**
- Produces: CSS class `inv-cell--empty-ghost` applied when `state === 'empty'` and `emoji` prop is set
- Produces: `stateClass()` returns combined `'inv-cell--empty inv-cell--empty-ghost'` for typed empty slots

- [ ] **Step 1: Write failing tests**

Create `src/features/inventory/InventoryCell.test.tsx`:

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InventoryCell } from './InventoryCell'

describe('InventoryCell empty ghost', () => {
  it('adds inv-cell--empty-ghost when empty with emoji', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryCell, {
        state: 'empty',
        emoji: '⚔️',
        ariaLabel: 'Пустой слот умения',
      }),
    )
    expect(html).toContain('inv-cell--empty-ghost')
    expect(html).toContain('inv-cell--empty')
  })

  it('does not add ghost for generic empty cell without emoji', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryCell, {
        state: 'empty',
        ariaLabel: 'Пустой слот',
      }),
    )
    expect(html).toContain('inv-cell--empty')
    expect(html).not.toContain('inv-cell--empty-ghost')
  })

  it('does not add ghost when filled', () => {
    const html = renderToStaticMarkup(
      createElement(InventoryCell, {
        state: 'filled',
        emoji: '⚔️',
        ariaLabel: 'Умение',
      }),
    )
    expect(html).not.toContain('inv-cell--empty-ghost')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/inventory/InventoryCell.test.tsx`
Expected: FAIL — `inv-cell--empty-ghost` not in markup

- [ ] **Step 3: Add CSS**

In `src/features/inventory/inventory.css` after `.inv-cell--empty`:

```css
.inv-cell--empty-ghost {
  background: #f0f0f0;
  border-style: dashed;
  cursor: default;
}

.inv-cell--empty-ghost .inv-cell-emoji {
  opacity: 0.28;
}
```

- [ ] **Step 4: Update `stateClass` in `InventoryCell.tsx`**

```tsx
function stateClass(state: InventoryCellState, emptyGhost: boolean): string {
  switch (state) {
    case 'empty':
      return emptyGhost ? 'inv-cell--empty inv-cell--empty-ghost' : 'inv-cell--empty'
    // ... rest unchanged
  }
}

// inside component:
const emptyGhost = state === 'empty' && Boolean(emoji)
// use stateClass(state, emptyGhost) in className join
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/features/inventory/InventoryCell.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/inventory/inventory.css src/features/inventory/InventoryCell.tsx src/features/inventory/InventoryCell.test.tsx
git commit -m "feat: ghost styling for typed empty inventory cells"
```

---

### Task 2: Wire ghost on equip / skill / passive empty slots

**Files:**
- Modify: `src/features/inventory/EquipmentInventoryView.tsx` (`EquipmentSlotCell`)
- Modify: `src/features/inventory/CardsInventoryView.tsx` (`LoadoutSlotCell`, `PassiveEquipSlotCell`)

**Interfaces:**
- Consumes: `inv-cell--empty-ghost` from Task 1 (automatic via `state="empty"` + `emoji`)

- [ ] **Step 1: Empty equipment slot — remove misleading badges**

In `EquipmentSlotCell`, when `!item`:

```tsx
emoji={SLOT_EMOJI[slot]}
// remove: contextBadge={SLOT_EMOJI[slot]}
// remove: hintText={item ? undefined : 'перетащи'}
levelBadge={item ? `${UI_LEVEL}${item.itemLevel}` : undefined}
contextBadge={item ? undefined : undefined} // only when item — keep slot emoji badge removed for empty
```

Ensure empty equip passes `emoji={SLOT_EMOJI[slot]}` and **no** `contextBadge` or `hintText`.

- [ ] **Step 2: Empty skill/passive slots**

`LoadoutSlotCell` and `PassiveEquipSlotCell` already pass `state="empty"` + emoji — no code change beyond Task 1 ghost class. Verify `emoji="⚔️"` / `emoji="✨"` remain.

- [ ] **Step 3: Manual smoke**

Run: `npm run dev` → Персонаж → empty equip/skill/passive slots look muted; filled slots unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/features/inventory/EquipmentInventoryView.tsx
git commit -m "fix: mute empty equip slots without misleading badges"
```

---

### Task 3: Character hub section order

**Files:**
- Modify: `src/features/character/hub/CharacterHubLayout.tsx`
- Modify: `src/features/inventory/EquipmentInventoryView.tsx` (type + render order)
- Create: `src/features/inventory/EquipmentInventoryView.test.tsx`

**Interfaces:**
- Produces on `characterHub` prop:
  ```ts
  characterHub?: {
    rail: ReactNode
    buildHeader: ReactNode
    loadoutPanel: ReactNode
    renderStashTabs: (itemsPanel: ReactNode) => ReactNode
  }
  ```
- Consumes: `buildHeader` → `equipSection` → `loadoutPanel` render order in hub `Space`

- [ ] **Step 1: Write failing test**

Create `src/features/inventory/EquipmentInventoryView.test.tsx`:

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { EquipmentInventoryView } from './EquipmentInventoryView'

const noop = () => {}

describe('EquipmentInventoryView character hub', () => {
  it('renders Экипировка before Активные умения', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    const html = renderToStaticMarkup(
      createElement(EquipmentInventoryView, {
        campaign,
        characterId: heroId,
        inBattle: false,
        onEquip: noop,
        onUnequip: noop,
        onReorderStash: noop,
        onInvalidSlot: noop,
        onPickModOffer: noop,
        onRemoveMod: noop,
        onSetBattleLoadout: noop,
        onSetPassiveEquip: noop,
        onReorderCards: noop,
        characterHub: {
          rail: createElement('span', { 'data-testid': 'rail' }, 'RAIL'),
          buildHeader: createElement('span', { 'data-testid': 'header' }, 'HEADER'),
          loadoutPanel: createElement('span', null, 'Активные умения'),
          renderStashTabs: (panel) =>
            createElement('div', null, panel, createElement('span', null, 'STASH')),
        },
      }),
    )
    expect(html).toContain('Экипировка')
    expect(html).not.toContain('Надето')
    const equipIdx = html.indexOf('Экипировка')
    const skillsIdx = html.indexOf('Активные умения')
    expect(equipIdx).toBeGreaterThan(-1)
    expect(skillsIdx).toBeGreaterThan(equipIdx)
  })
})
```

Note: real `loadoutPanel` from hub includes «Активные умения» via `CardsInventoryView`; test uses stub text.

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/features/inventory/EquipmentInventoryView.test.tsx`
Expected: FAIL — order wrong or «Надето» still present

- [ ] **Step 3: Split `CharacterHubLayout`**

Replace `buildColumn` with:

```tsx
buildHeader: (
  <CharacterBuildPanel
    campaign={campaign}
    characterId={activeCharacterId}
    focus={focus}
    previewItemId={previewItemId}
  />
),
loadoutPanel: (
  <CardsInventoryView
    campaign={campaign}
    characterId={activeCharacterId}
    inBattle={inBattle}
    inventoryLocked={expeditionActive}
    modsDisabled={modsDisabled}
    modsDisabledTooltip={modsDisabledTooltip}
    embedded
    hubSection="loadout"
    onReorderCards={cardHandlers.onReorderCards}
    onSetBattleLoadout={cardHandlers.onSetBattleLoadout}
    onSetPassiveEquip={cardHandlers.onSetPassiveEquip}
    onPickModOffer={...}
    onRemoveMod={...}
  />
),
```

- [ ] **Step 4: Update `EquipmentInventoryView` type and hub layout**

```tsx
// type
buildHeader: ReactNode
loadoutPanel: ReactNode

// content
<Space orientation="vertical" size="small" style={{ width: '100%' }}>
  {characterHub.buildHeader}
  {equipSection}
  {characterHub.loadoutPanel}
</Space>
```

Rename equip section title «Надето» → «Экипировка».

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/features/inventory/EquipmentInventoryView.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/character/hub/CharacterHubLayout.tsx src/features/inventory/EquipmentInventoryView.tsx src/features/inventory/EquipmentInventoryView.test.tsx
git commit -m "feat: move equipment section above active skills in character hub"
```

---

### Task 4: Rename «Экипировка» in shop and tooltips

**Files:**
- Modify: `src/features/shop/hub/ShopBuildPanel.tsx`
- Modify: `src/features/campaign/sectionTooltips.ts`

- [ ] **Step 1: Update copy**

`ShopBuildPanel.tsx` line ~61: `Надето` → `Экипировка`

`sectionTooltips.ts` `EQUIPMENT_SECTION_HELP`:
```ts
'Вкладка «Предметы» — инвентарь героя. Перетащите на слот «Экипировка» или на другого героя в rail. Сортировка — перетаскиванием ячеек.'
```

- [ ] **Step 2: Verify no «Надето» in src**

Run: `rg 'Надето' src/`
Expected: no matches

- [ ] **Step 3: Run full test suite**

Run: `npm run test`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/features/shop/hub/ShopBuildPanel.tsx src/features/campaign/sectionTooltips.ts
git commit -m "chore: rename Надето to Экипировка in shop and help text"
```

---

### Task 5: BattleSkillCell component

**Files:**
- Create: `src/features/battle/BattleSkillCell.tsx`
- Create: `src/features/battle/BattleSkillCell.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export type BattleSkillCellProps = {
    card: BattlePlayerCard
    character: Character
    campaign: CampaignState
    actor?: Unit
    selected: boolean
    disabled: boolean
    onSelect: () => void
  }
  export function BattleSkillCell(props: BattleSkillCellProps): JSX.Element
  ```

- [ ] **Step 1: Write failing test**

Create `src/features/battle/BattleSkillCell.test.tsx`:

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { BattleSkillCell } from './BattleSkillCell'

describe('BattleSkillCell', () => {
  it('renders inv-cell with level badge and hides card name in markup', () => {
    const campaign = initialCampaignState()
    const character = campaign.characters[0]!
    const card = character.cards[0]
    if (!card) throw new Error('fixture needs a card')

    const html = renderToStaticMarkup(
      createElement(BattleSkillCell, {
        card: { ...card, cooldownRemaining: 0 },
        character,
        campaign,
        selected: false,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('inv-badge-level')
    expect(html).not.toContain('CreditCardOutlined')
  })

  it('adds selected class when selected', () => {
    const campaign = initialCampaignState()
    const character = campaign.characters[0]!
    const card = character.cards[0]
    if (!card) throw new Error('fixture needs a card')

    const html = renderToStaticMarkup(
      createElement(BattleSkillCell, {
        card: { ...card, cooldownRemaining: 0 },
        character,
        campaign,
        selected: true,
        disabled: false,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('inv-cell--selected')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/features/battle/BattleSkillCell.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `BattleSkillCell.tsx`**

Wrap `InventoryCell` (no `popoverContent`) with existing `BattleCardPopover` for hover details. Append CD line inside popover when `card.cooldownRemaining > 0` (extend local popover content or add optional prop to `BattleCardPopover`).

```tsx
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import type { BattlePlayerCard, CampaignState, Character, Unit } from '../../game/types'
import { UI_DAMAGE, UI_HEART, UI_LEVEL } from '../../game/ui/labels'
import { InventoryCell } from '../inventory/InventoryCell'
import { resolveCardEmoji } from '../inventory/inventoryEmoji'
import { BattleCardPopover } from './BattleCardPopover'

export type BattleSkillCellProps = {
  card: BattlePlayerCard
  character: Character
  campaign: CampaignState
  actor?: Unit
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

export function BattleSkillCell({
  card,
  character,
  campaign,
  actor,
  selected,
  disabled,
  onSelect,
}: BattleSkillCellProps) {
  const tmpl = getCardAttackTemplate(card.templateId)
  const stats = describeCardCombatStats(card, character, campaign, actor)
  const effectUi = tmpl?.kind === 'heal' ? UI_HEART : UI_DAMAGE
  const onCd = card.cooldownRemaining > 0
  const label = getCardDisplayLabel(card.templateId)
  const effectPart =
    stats.expectedDamage !== null ? `${effectUi}${stats.expectedDamage}` : ''
  const ariaLabel = `${label}, ${UI_LEVEL}${card.global_level}${effectPart ? `, ${effectPart}` : ''}`

  return (
    <BattleCardPopover card={card} character={character} campaign={campaign} actor={actor}>
      <InventoryCell
        emoji={resolveCardEmoji(tmpl)}
        levelBadge={`${UI_LEVEL}${card.global_level}`}
        contextBadge={
          stats.expectedDamage !== null ? `${effectUi}${stats.expectedDamage}` : undefined
        }
        state={disabled || onCd ? 'disabled' : 'filled'}
        className={selected ? 'inv-cell--selected' : undefined}
        ariaLabel={ariaLabel}
        onClick={() => {
          if (disabled || onCd) return
          onSelect()
        }}
      />
    </BattleCardPopover>
  )
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm run test -- src/features/battle/BattleSkillCell.test.tsx && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/battle/BattleSkillCell.tsx src/features/battle/BattleSkillCell.test.tsx
git commit -m "feat: add BattleSkillCell for compact battle skill selection"
```

---

### Task 6: BattleScreen skills section

**Files:**
- Modify: `src/features/battle/BattleScreen.tsx`

**Interfaces:**
- Consumes: `BattleSkillCell` from Task 5
- Removes: `Radio.Group` for cards, `CreditCardOutlined`, duplicate `Typography.Text` under skills

- [ ] **Step 1: Replace «Умения и карты» block**

```tsx
<Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
  Умения
</Typography.Text>
{actorCards.length > 0 ? (
  <div className="battle-skill-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
    {actorCards.map((c) => (
      <BattleSkillCell
        key={c.id}
        card={c}
        character={actorCharacter!}
        campaign={campaign}
        actor={actor}
        selected={mode === 'card' && selectedCardId === c.id}
        disabled={actionsDisabled || guidedModeBlocked('card')}
        onSelect={() => {
          setMode('card')
          setSelectedCardPickId(c.id)
        }}
      />
    ))}
  </div>
) : null}
```

Remove unused imports: `CreditCardOutlined` if no longer used.

- [ ] **Step 2: Manual smoke**

Run: `npm run dev` → enter battle → skills show as cells; click selects; tooltip shows name on hover.

- [ ] **Step 3: Run tests**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/BattleScreen.tsx
git commit -m "feat: replace battle skill radio buttons with skill cells"
```

---

### Task 7: ActorPassivesPanel as cell row

**Files:**
- Modify: `src/features/battle/ActorPassivesPanel.tsx`
- Modify: `src/features/battle/ActorPassivesPanel.test.tsx` (create if missing)

- [ ] **Step 1: Write failing test**

Create `src/features/battle/ActorPassivesPanel.test.tsx`:

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { ActorPassivesPanel } from './ActorPassivesPanel'

describe('ActorPassivesPanel', () => {
  it('renders passive cells with inv-cell class', () => {
    const campaign = initialCampaignState()
    const character = campaign.characters[0]!
    const passive = character.passives[0]
    if (!passive) return // skip if no passives in fixture

    const html = renderToStaticMarkup(
      createElement(ActorPassivesPanel, {
        passives: [passive],
        character,
        campaign,
      }),
    )
    expect(html).toContain('inv-cell')
    expect(html).toContain('inv-badge-level')
    expect(html).not.toContain('ant-list')
  })
})
```

- [ ] **Step 2: Implement cell row**

Replace `List` with:

```tsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
  {passives.map((p) => {
    const stats = describePassiveStats(p, character, campaign)
    const tmpl = getPassiveTemplate(p.templateId)
    const popover = (
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {stats.lines.map((line, i) => (
          <li key={i}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
    )
    return (
      <InventoryCell
        key={p.id}
        emoji={resolvePassiveEmoji(tmpl)}
        levelBadge={`${UI_LEVEL}${p.global_level}`}
        state="filled"
        popoverTitle={stats.displayLabel}
        popoverContent={popover}
        popoverTrigger={['hover', 'click']}
        ariaLabel={`${stats.displayLabel}, ${UI_LEVEL}${p.global_level}`}
      />
    )
  })}
</div>
```

Import `InventoryCell`, `resolvePassiveEmoji`, `UI_LEVEL`.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/features/battle/ActorPassivesPanel.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/battle/ActorPassivesPanel.tsx src/features/battle/ActorPassivesPanel.test.tsx
git commit -m "feat: show battle passives as inventory-style cells"
```

---

### Task 8: Battle field scroll and turn-order spacing

**Files:**
- Modify: `src/features/layout/game-layout.css`
- Modify: `src/features/inventory/inventory.css` (or game-layout — pick one; spec lists both)
- Modify: `src/features/battle/BattleScreen.tsx`

- [ ] **Step 1: Add CSS**

In `src/features/layout/game-layout.css`:

```css
.game-battle-turn-order {
  margin-bottom: 16px;
}

.game-battle-field-scroll {
  /* header + turn order + action panel estimate */
  max-height: calc(100vh - 280px);
  overflow: auto;
  max-width: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}
```

- [ ] **Step 2: Wrap battle field in BattleScreen**

Replace `<GameScrollX>` around field with:

```tsx
<div className="game-battle-turn-order">
  <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>
    Очерёдность хода
  </Typography.Text>
  <TurnOrderStrip ... />
</div>

<div className="game-battle-field-scroll">
  <div className="battle-field-root" style={{ position: 'relative', width: 'max-content' }}>
    {/* grid + BattleAnimationLayer */}
  </div>
</div>
```

Remove inner `GameScrollX` import usage for field if unused.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Final test run**

Run: `npm run test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/features/layout/game-layout.css src/features/battle/BattleScreen.tsx
git commit -m "feat: battle field viewport scroll and turn-order spacing"
```

---

## Spec Coverage (self-review)

| Spec § | Task |
|--------|------|
| Ghost empty slots §4 | 1–2 |
| Hub order §5.1 | 3 |
| Rename §5.2 | 3–4 |
| Shop/hub emoji audit §5.3 | unchanged (OK) |
| Battle skills §6 | 5–6 |
| Battle passives §7 | 7 |
| Field scroll §8 | 8 |

No TBD placeholders. Types consistent: `characterHub.buildHeader` / `loadoutPanel` used in Task 3 throughout.
