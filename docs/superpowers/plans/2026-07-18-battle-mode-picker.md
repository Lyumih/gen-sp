# Battle Mode Picker UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-column «Кампания / Экспедиция» battle tab with a single squad strip and square mode tiles (featured + «Скоро»), click-to-start with party-pick and replay modals.

**Architecture:** Extend `ExpeditionChainConfig` with UI tier/emoji metadata; pure helpers decide party-pick vs direct start; new presentational tile components + modals; `CampaignBattleTab` orchestrates clicks and onboarding visibility via renamed selectors.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5.

**Spec:** `docs/superpowers/specs/2026-07-18-battle-mode-picker-design.md`

## Global Constraints

- One `SquadAssemblyDnd` on battle tab; **no** `onToggleMark` / `markedIds` on this tab
- Tile click = start; **no** tooltips on tiles; emoji params on card (`paramEmojiLine`)
- Lower section label: **«Скоро»** (`tier: 'soon'`); tiles remain clickable
- Featured tier hidden until `hasCompletedStep(onboarding, 'first_battle_won')`
- `test-single-battle` visible only when `onboarding.graduated || onboarding.skipMode`
- Disabled tiles when `inBattle` or `campaign.expedition !== null`; show `Alert` during expedition
- `App.useApp().message` for errors/warnings (not static `message`)
- Rename UI labels only: Хаос, Дуэль, Компания (ids unchanged)
- Do not add npm dependencies
- `paramPreview` field stays in config for help/back-compat; tiles use `paramEmojiLine`

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/expedition/config.ts` | `ModeTier`, `iconEmoji`, `paramEmojiLine`, `tier`, label renames, `getExpeditionChainsByTier` |
| `src/game/expedition/config.test.ts` | tier/emoji/label assertions |
| `src/game/expedition/resolveExpeditionParty.ts` | `getOccupiedSquadCharacterIds` |
| `src/game/expedition/partyPick.ts` | `shouldOpenPartyPickModal` (new) |
| `src/game/expedition/partyPick.test.ts` | party-pick helper tests |
| `src/game/onboarding/selectors.ts` | rename `isFeaturedBattleModesVisible`, add `isDevTestModeVisible` |
| `src/game/onboarding/selectors.test.ts` | updated selector tests |
| `src/features/layout/game-layout.css` | `.game-mode-*` styles |
| `src/features/campaign/battle-mode-picker.css` | tile line-clamp + icon size (optional colocation) |
| `src/features/campaign/BattleModeTile.tsx` | single square tile button |
| `src/features/campaign/BattleModeGrid.tsx` | section title + grid of tiles |
| `src/features/campaign/BattleModeGrid.test.ts` | SSR markup tests |
| `src/features/campaign/ExpeditionPartyPickModal.tsx` | pick ≤ maxParty fighters |
| `src/features/campaign/CampaignReplayModal.tsx` | scenario replay after campaign done |
| `src/features/campaign/CampaignBattleTab.tsx` | new single-column layout + click handlers |
| `src/features/campaign/ExpeditionModeList.tsx` | **delete** |
| `src/game/onboarding/copy.ts` | welcome copy → плитка «Компания» |
| `src/game/help/articles.ts` | battle modes help text |

---

### Task 1: Expedition config UI metadata

**Files:**
- Modify: `src/game/expedition/config.ts`
- Modify: `src/game/expedition/config.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ModeTier = 'featured' | 'soon'

  // ExpeditionChainConfig gains:
  tier: ModeTier
  iconEmoji: string
  paramEmojiLine: string

  export function getExpeditionChainsByTier(tier: ModeTier): readonly ExpeditionChainConfig[]
  ```

- [ ] **Step 1: Add failing config tests**

Append to `src/game/expedition/config.test.ts`:

```ts
import { getExpeditionChainsByTier } from './config'

describe('expedition chain UI metadata', () => {
  it('renames key mode labels', () => {
    const byId = Object.fromEntries(EXPEDITION_CHAINS.map((c) => [c.id, c]))
    expect(byId['chaotic-map']?.label).toBe('Хаос')
    expect(byId['small-skirmish']?.label).toBe('Дуэль')
    expect(byId['campaign-main']?.label).toBe('Компания')
  })

  it('assigns featured vs soon tiers', () => {
    const featured = getExpeditionChainsByTier('featured')
    const soon = getExpeditionChainsByTier('soon')
    expect(featured.map((c) => c.id)).toEqual([
      'chaotic-map',
      'tunnel',
      'big-arena',
      'small-skirmish',
      'ambush',
    ])
    expect(soon.map((c) => c.id)).toEqual(['campaign-main', 'test-single-battle'])
  })

  it('every chain has icon and param emoji line', () => {
    for (const chain of EXPEDITION_CHAINS) {
      expect(chain.iconEmoji.length).toBeGreaterThan(0)
      expect(chain.paramEmojiLine.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/expedition/config.test.ts`
Expected: FAIL — `getExpeditionChainsByTier` not defined / missing fields

- [ ] **Step 3: Extend config**

In `src/game/expedition/config.ts`:

1. Add `export type ModeTier = 'featured' | 'soon'`
2. Add `tier`, `iconEmoji`, `paramEmojiLine` to each entry in `EXPEDITION_CHAINS` per spec §4.1–4.3
3. Update labels: `Хаос`, `Дуэль`, `Компания`
4. Add:

```ts
export function getExpeditionChainsByTier(tier: ModeTier): readonly ExpeditionChainConfig[] {
  return EXPEDITION_CHAINS.filter((chain) => chain.tier === tier)
}
```

Emoji lines (exact strings from spec):

| id | paramEmojiLine |
|----|----------------|
| `chaotic-map` | `👥1–4  👹1–20  ⬜1×2–20×20  ×1–3` |
| `tunnel` | `👥≤2  ⬜1×10  ×2` |
| `big-arena` | `👥≤4  👹8–12+👑1–3  ⬜10×20  ×1` |
| `small-skirmish` | `👥1  👹1  ⬜1×2  ×1` |
| `ambush` | `👥≤4  👹≤8  ⬜10×10  ×1` |
| `campaign-main` | `👥1  ×3  ♻ между боями` |
| `test-single-battle` | `👥1  ×1  🧪 dev` |

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/expedition/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/config.ts src/game/expedition/config.test.ts
git commit -m "feat: add battle mode tier and emoji metadata to expedition config"
```

---

### Task 2: Party pick helpers

**Files:**
- Modify: `src/game/expedition/resolveExpeditionParty.ts`
- Create: `src/game/expedition/partyPick.ts`
- Create: `src/game/expedition/partyPick.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function getOccupiedSquadCharacterIds(squad: readonly (string | null)[]): string[]

  export function shouldOpenPartyPickModal(occupiedCount: number, maxParty: number): boolean
  ```

- [ ] **Step 1: Write failing tests**

Create `src/game/expedition/partyPick.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getOccupiedSquadCharacterIds } from './resolveExpeditionParty'
import { shouldOpenPartyPickModal } from './partyPick'

describe('getOccupiedSquadCharacterIds', () => {
  it('returns ids in squad slot order, skipping nulls', () => {
    expect(getOccupiedSquadCharacterIds(['a', null, 'b', null])).toEqual(['a', 'b'])
  })
})

describe('shouldOpenPartyPickModal', () => {
  it('opens when occupied exceeds maxParty', () => {
    expect(shouldOpenPartyPickModal(4, 2)).toBe(true)
    expect(shouldOpenPartyPickModal(2, 2)).toBe(false)
    expect(shouldOpenPartyPickModal(1, 4)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/expedition/partyPick.test.ts`
Expected: FAIL — exports missing

- [ ] **Step 3: Implement helpers**

In `resolveExpeditionParty.ts` add:

```ts
export function getOccupiedSquadCharacterIds(squad: readonly (string | null)[]): string[] {
  const ids: string[] = []
  for (const id of squad) {
    if (id !== null) ids.push(id)
  }
  return ids
}
```

Create `src/game/expedition/partyPick.ts`:

```ts
export function shouldOpenPartyPickModal(occupiedCount: number, maxParty: number): boolean {
  return occupiedCount > maxParty
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/expedition/partyPick.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/expedition/resolveExpeditionParty.ts src/game/expedition/partyPick.ts src/game/expedition/partyPick.test.ts
git commit -m "feat: add squad party-pick helpers for battle mode tiles"
```

---

### Task 3: Onboarding selectors rename

**Files:**
- Modify: `src/game/onboarding/selectors.ts`
- Modify: `src/game/onboarding/selectors.test.ts`
- Modify: `src/features/campaign/CampaignBattleTab.tsx` (import only — full refactor in Task 9)

**Interfaces:**
- Produces:
  ```ts
  export function isFeaturedBattleModesVisible(campaign: CampaignState): boolean
  export function isDevTestModeVisible(campaign: CampaignState): boolean
  ```
- Removes export: `isExpeditionPanelVisible` (replace all usages)

- [ ] **Step 1: Update failing selector tests**

In `selectors.test.ts`, replace `isExpeditionPanelVisible` tests with:

```ts
import {
  isDevTestModeVisible,
  isFeaturedBattleModesVisible,
  // ...
} from './selectors'

it('hides featured battle modes until first_battle_won', () => {
  const s = initialCampaignState()
  expect(isFeaturedBattleModesVisible(s)).toBe(false)
  const won = { ...s, onboarding: completeStep(s.onboarding, 'first_battle_won') }
  expect(isFeaturedBattleModesVisible(won)).toBe(true)
})

it('shows dev test mode only when graduated or skipMode', () => {
  const s = initialCampaignState()
  expect(isDevTestModeVisible(s)).toBe(false)
  const skip = { ...s, onboarding: { ...s.onboarding, skipMode: true } }
  expect(isDevTestModeVisible(skip)).toBe(true)
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/game/onboarding/selectors.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement selectors**

In `selectors.ts`:

```ts
export function isFeaturedBattleModesVisible(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  if (o.graduated || o.skipMode) return true
  return hasCompletedStep(o, 'first_battle_won')
}

export function isDevTestModeVisible(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  return o.graduated || o.skipMode
}
```

Delete `isExpeditionPanelVisible`. In `CampaignBattleTab.tsx` temporarily:

```ts
import { isFeaturedBattleModesVisible } from '../../game/onboarding/selectors'
// replace isExpeditionPanelVisible usage with isFeaturedBattleModesVisible
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- src/game/onboarding/selectors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/onboarding/selectors.ts src/game/onboarding/selectors.test.ts src/features/campaign/CampaignBattleTab.tsx
git commit -m "refactor: rename expedition panel selector to featured battle modes"
```

---

### Task 4: Mode tile CSS

**Files:**
- Modify: `src/features/layout/game-layout.css`
- Create: `src/features/campaign/battle-mode-picker.css`

**Interfaces:**
- Produces CSS classes: `.game-mode-section`, `.game-mode-section__title`, `.game-mode-section--soon`, `.game-mode-grid`, `.game-mode-tile`, `.game-mode-tile__icon`, `.game-mode-tile__params`, `.game-mode-tile__desc`

- [ ] **Step 1: Add CSS (no unit test — visual)**

Append to `game-layout.css`:

```css
.game-mode-section {
  margin-top: 8px;
}

.game-mode-section__title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
}

.game-mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  width: 100%;
}

.game-mode-tile {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  padding: 10px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  width: 100%;
}

.game-mode-tile:hover:not(:disabled) {
  border-color: #1677ff;
}

.game-mode-tile:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.game-mode-section--soon .game-mode-tile {
  background: #fafafa;
}
```

Create `battle-mode-picker.css`:

```css
.game-mode-tile__icon {
  font-size: 28px;
  line-height: 1;
}

.game-mode-tile__desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
}

.game-mode-tile__params {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: auto;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/layout/game-layout.css src/features/campaign/battle-mode-picker.css
git commit -m "style: add battle mode tile grid CSS"
```

---

### Task 5: BattleModeTile component

**Files:**
- Create: `src/features/campaign/BattleModeTile.tsx`
- Create: `src/features/campaign/BattleModeTile.test.ts`

**Interfaces:**
- Produces:
  ```tsx
  export type BattleModeTileProps = {
    chain: ExpeditionChainConfig
    disabled?: boolean
    badge?: string
    onClick: () => void
  }
  export function BattleModeTile(props: BattleModeTileProps): JSX.Element
  ```

- [ ] **Step 1: Write failing SSR test**

Create `BattleModeTile.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getExpeditionChainById } from '../../game/expedition/config'
import { BattleModeTile } from './BattleModeTile'

describe('BattleModeTile', () => {
  it('renders label, description, and param emoji line', () => {
    const chain = getExpeditionChainById('chaotic-map')!
    const html = renderToStaticMarkup(
      createElement(BattleModeTile, {
        chain,
        onClick: () => {},
      }),
    )
    expect(html).toContain('Хаос')
    expect(html).toContain('👥1–4')
    expect(html).toContain('button')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/features/campaign/BattleModeTile.test.ts`

- [ ] **Step 3: Implement component**

Create `BattleModeTile.tsx`:

```tsx
import { Typography } from 'antd'
import type { ExpeditionChainConfig } from '../../game/expedition/config'
import './battle-mode-picker.css'

export type BattleModeTileProps = {
  chain: ExpeditionChainConfig
  disabled?: boolean
  badge?: string
  onClick: () => void
}

export function BattleModeTile({ chain, disabled = false, badge, onClick }: BattleModeTileProps) {
  const ariaLabel = `${chain.label}. ${chain.description}. ${chain.paramEmojiLine}`

  return (
    <button
      type="button"
      className="game-mode-tile"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="game-mode-tile__icon" aria-hidden>
        {chain.iconEmoji}
      </span>
      <Typography.Text strong>{chain.label}</Typography.Text>
      {badge ? (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {badge}
        </Typography.Text>
      ) : null}
      <Typography.Text type="secondary" className="game-mode-tile__desc">
        {chain.description}
      </Typography.Text>
      <Typography.Text type="secondary" className="game-mode-tile__params">
        {chain.paramEmojiLine}
      </Typography.Text>
    </button>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/BattleModeTile.tsx src/features/campaign/BattleModeTile.test.ts
git commit -m "feat: add BattleModeTile component"
```

---

### Task 6: BattleModeGrid component

**Files:**
- Create: `src/features/campaign/BattleModeGrid.tsx`
- Create: `src/features/campaign/BattleModeGrid.test.ts`

**Interfaces:**
- Produces:
  ```tsx
  export type BattleModeGridProps = {
    title?: string
    soon?: boolean
    chains: readonly ExpeditionChainConfig[]
    disabled?: boolean
    getBadge?: (chain: ExpeditionChainConfig) => string | undefined
    onSelect: (chainId: string) => void
  }
  export function BattleModeGrid(props: BattleModeGridProps): JSX.Element | null
  ```

- [ ] **Step 1: Write failing test**

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getExpeditionChainsByTier } from '../../game/expedition/config'
import { BattleModeGrid } from './BattleModeGrid'

describe('BattleModeGrid', () => {
  it('renders section title and tile labels', () => {
    const html = renderToStaticMarkup(
      createElement(BattleModeGrid, {
        title: 'Скоро',
        soon: true,
        chains: getExpeditionChainsByTier('soon').filter((c) => c.id === 'campaign-main'),
        onSelect: () => {},
      }),
    )
    expect(html).toContain('Скоро')
    expect(html).toContain('Компания')
    expect(html).toContain('game-mode-section--soon')
  })

  it('returns null when chains empty', () => {
    const html = renderToStaticMarkup(
      createElement(BattleModeGrid, { chains: [], onSelect: () => {} }),
    )
    expect(html).toBe('')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
import type { ExpeditionChainConfig } from '../../game/expedition/config'
import '../layout/game-layout.css'
import { BattleModeTile } from './BattleModeTile'

export type BattleModeGridProps = {
  title?: string
  soon?: boolean
  chains: readonly ExpeditionChainConfig[]
  disabled?: boolean
  getBadge?: (chain: ExpeditionChainConfig) => string | undefined
  onSelect: (chainId: string) => void
}

export function BattleModeGrid({
  title,
  soon = false,
  chains,
  disabled = false,
  getBadge,
  onSelect,
}: BattleModeGridProps) {
  if (chains.length === 0) return null

  return (
    <section className={soon ? 'game-mode-section game-mode-section--soon' : 'game-mode-section'}>
      {title ? <h4 className="game-mode-section__title">{title}</h4> : null}
      <div className="game-mode-grid">
        {chains.map((chain) => (
          <BattleModeTile
            key={chain.id}
            chain={chain}
            disabled={disabled}
            badge={getBadge?.(chain)}
            onClick={() => onSelect(chain.id)}
          />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/BattleModeGrid.tsx src/features/campaign/BattleModeGrid.test.ts
git commit -m "feat: add BattleModeGrid section component"
```

---

### Task 7: ExpeditionPartyPickModal

**Files:**
- Create: `src/features/campaign/ExpeditionPartyPickModal.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export type ExpeditionPartyPickModalProps = {
    open: boolean
    chain: ExpeditionChainConfig
    campaign: CampaignState
    maxParty: number
    onCancel: () => void
    onConfirm: (selectedCharacterIds: string[]) => void
  }
  export function ExpeditionPartyPickModal(props: ExpeditionPartyPickModalProps): JSX.Element
  ```

- [ ] **Step 1: Implement modal (Ant Design Modal + Checkbox list)**

Use `App.useApp()` for `message.warning` when user tries to check more than `maxParty`.

Default selected: first `maxParty` from `getOccupiedSquadCharacterIds(campaign.squad)`.

List row: `{classEmoji} {name} {UI_LEVEL}{level}` via `getCharacter`, `getCharacterDisplay`, `getCharacterClass`.

Primary button «Начать» disabled when `selected.length < 1`.

```tsx
import { App, Button, Checkbox, Modal, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { getCharacter } from '../../game/character/selectors'
import { getCharacterDisplay } from '../../game/character/display'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { ExpeditionChainConfig } from '../../game/expedition/config'
import { getOccupiedSquadCharacterIds } from '../../game/expedition/resolveExpeditionParty'
import type { CampaignState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'

// ... component with controlled checkbox state, slot-order sort on confirm
```

On confirm: pass selected ids sorted by squad slot index (iterate `campaign.squad`, collect selected in order).

- [ ] **Step 2: Manual smoke — wired in Task 9**

- [ ] **Step 3: Commit**

```bash
git add src/features/campaign/ExpeditionPartyPickModal.tsx
git commit -m "feat: add expedition party pick modal"
```

---

### Task 8: CampaignReplayModal

**Files:**
- Create: `src/features/campaign/CampaignReplayModal.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export type CampaignReplayModalProps = {
    open: boolean
    replaySlot: number
    onReplaySlotChange: (slot: number) => void
    onCancel: () => void
    onConfirm: () => void
  }
  export function CampaignReplayModal(props: CampaignReplayModalProps): JSX.Element
  ```

- [ ] **Step 1: Implement**

Reuse `SCENARIOS` options pattern from old `CampaignBattleTab`:

```tsx
import { Button, Modal, Select, Space } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'

export function CampaignReplayModal({ open, replaySlot, onReplaySlotChange, onCancel, onConfirm }: CampaignReplayModalProps) {
  return (
    <Modal
      title="Повтор сценария"
      open={open}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" onClick={onConfirm}>
            Играть
          </Button>
        </Space>
      }
    >
      <Select
        aria-label="Сценарий для повтора"
        style={{ width: '100%' }}
        value={replaySlot}
        onChange={onReplaySlotChange}
        options={SCENARIOS.map((s, i) => ({ value: i, label: s.id }))}
      />
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/campaign/CampaignReplayModal.tsx
git commit -m "feat: add campaign replay modal for completed campaign"
```

---

### Task 9: CampaignBattleTab integration

**Files:**
- Modify: `src/features/campaign/CampaignBattleTab.tsx`
- Delete: `src/features/campaign/ExpeditionModeList.tsx`

**Interfaces:**
- Consumes: all components/helpers from Tasks 1–8
- Produces: refactored tab with `handleModeSelect(chainId: string)` orchestration per spec §6

- [ ] **Step 1: Replace layout**

Remove `GameColumns`, dual panels, `ExpeditionModeList`, `markedIds` state, `selectedChainId`, expedition start button, inline campaign buttons.

New structure:

```tsx
return (
  <div role="tabpanel">
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <GamePanel title="Отряд">
        <SquadAssemblyDnd
          campaign={campaign}
          disabled={inBattle || expeditionActive}
          onSetSquadSlot={onSetSquadSlot}
          onSwapSquadSlots={onSwapSquadSlots}
        />
      </GamePanel>

      {expeditionActive ? (
        <Alert type="info" showIcon title="Недоступно во время экспедиции" description={...} />
      ) : null}

      {showFeaturedModes ? (
        <BattleModeGrid
          chains={getExpeditionChainsByTier('featured')}
          disabled={modeDisabled}
          onSelect={handleModeSelect}
        />
      ) : null}

      <BattleModeGrid
        title="Скоро"
        soon
        chains={soonChains}
        disabled={modeDisabled}
        getBadge={campaignBadge}
        onSelect={handleModeSelect}
      />

      <ExpeditionPartyPickModal ... />
      <CampaignReplayModal ... />
    </Space>
  </div>
)
```

`soonChains` = filter `getExpeditionChainsByTier('soon')` with `isDevTestModeVisible` for test chain.

`campaignBadge` for `campaign-main` when `!done`:
- `hasCompletedStep(onboarding, 'first_battle_won') ? 'Начать / продолжить бой' : 'Начать первый бой'`

- [ ] **Step 2: Implement handleModeSelect**

```ts
const handleModeSelect = (chainId: string) => {
  if (modeDisabled) return
  const chain = getExpeditionChainById(chainId)
  if (!chain) return

  const occupied = countOccupiedSquadSlots(campaign.squad)
  if (occupied < chain.partyMin) {
    message.error('Добавьте хотя бы одного бойца в отряд')
    return
  }

  if (chain.id === 'campaign-main') {
    if (done) {
      setReplayOpen(true)
      return
    }
    onStartOrContinue()
    return
  }

  const maxParty = getChainMaxParty(chain)
  if (shouldOpenPartyPickModal(occupied, maxParty)) {
    setPartyPickChain(chain)
    setPartyPickOpen(true)
    return
  }

  const party = resolveExpeditionParty({ squad: campaign.squad, markedIds: [], maxParty })
  if (party.length < 1) {
    message.error('Добавьте хотя бы одного бойца в отряд')
    return
  }
  onStartExpedition(chainId, party)
}
```

- [ ] **Step 3: Delete ExpeditionModeList.tsx**

Remove file; grep repo to ensure no remaining imports.

- [ ] **Step 4: Run build + tests**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/CampaignBattleTab.tsx
git rm src/features/campaign/ExpeditionModeList.tsx
git commit -m "feat: replace battle tab with mode tile picker"
```

---

### Task 10: Copy and help updates

**Files:**
- Modify: `src/game/onboarding/copy.ts`
- Modify: `src/game/help/articles.ts`

- [ ] **Step 1: Update welcome copy**

In `copy.ts` paragraph 3:

```ts
'Первый шаг: вкладка «Бой» → плитка «Компания».',
```

- [ ] **Step 2: Update help battle modes paragraph**

Replace old mode list with tile-based copy mentioning Хаос, Дуэль, Компания, секцию «Скоро».

Example replacement line:

```ts
'На вкладке «Бой» — плитки режимов: **Хаос**, **Туннель**, **Большая арена**, **Дуэль**, **Засада**; в секции **Скоро** — **Компания** (3 сценария кампании) и dev-режим «Тест».',
```

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/onboarding/copy.ts src/game/help/articles.ts
git commit -m "docs: update onboarding and help for battle mode tiles"
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|------------------|------|
| Single squad strip, no marks | Task 9 |
| Featured hidden until first win | Tasks 3, 9 |
| «Скорo» section label | Task 6, 9 |
| Click to start | Task 9 |
| Party pick modal | Tasks 2, 7, 9 |
| Campaign replay modal | Tasks 8, 9 |
| Label renames + emoji lines | Task 1 |
| Test hidden until graduated/skip | Tasks 3, 9 |
| Alert during expedition | Task 9 |
| Delete ExpeditionModeList / dual panels | Task 9 |
| a11y aria-label on tiles | Task 5 |
| Help + onboarding copy | Task 10 |
| CSS square tiles | Task 4 |

No TBD placeholders remain.

---

## Verification Checklist (manual)

- [ ] Onboarding fresh save: only «Скорo» + Компания tile; badge «Начать первый бой»
- [ ] After first win: 5 featured tiles appear
- [ ] 4 fighters + Хаос (max 4): starts without modal
- [ ] 3 fighters + Туннель (max 2): modal; pick 2; starts
- [ ] Campaign done: Компания opens replay modal
- [ ] Active expedition: Alert + disabled tiles
- [ ] Skip mode: test tile visible in «Скорo»

Run: `npm run test && npm run build`
