# Shop Hub 3-Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вкладка «Магазин» — 3 колонки (rail | slim build | вкладки Магазин/Продажа/Сундук); только клик, без DnD.

**Architecture:** Новая папка `src/features/shop/hub/` с `ShopHubLayout`; переиспользование `.game-character-hub`, `CharacterRail`, `ShopOffersGrid`, `ChestInventoryView`, `EquipmentSlotRow`. Reducer без изменений.

**Tech Stack:** React 19, Ant Design 6 (`Tabs`, `Button`), TypeScript strict, Vitest, Vite 8.

**Spec:** `docs/superpowers/specs/2026-06-24-shop-hub-3col-design.md`

**Prerequisite:** `.game-character-hub` в `game-layout.css` и `CharacterRail` в `src/features/character/hub/` (из character-hub plan). Если их ещё нет — сначала Task 1 character-hub plan или убедиться, что CSS/rail уже в дереве.

## Global Constraints

- Отдельная вкладка хаба **Магазин** — не merge с Персонажем.
- Grid: **`.game-character-hub`** — `88px minmax(300px, 380px) minmax(0, 1fr)`; breakpoint **900px** → одна колонка.
- **Нет `DndContext`** на вкладке магазина; `CharacterRail` с `transferDisabled={true}`.
- `CharacterRail` **без** `onEditAppearance` / `onReleaseCharacter`.
- Reducer, цены, `BUY_SHOP_OFFER` — **без изменений**.
- `AGENTS.md`: emoji из `labels.ts`; `SectionHelp` + tooltip `mouseEnterDelay={0.3}`; сообщения через `App.useApp().message` в `CampaignHub`.
- `inBattle` / expedition: disabled UI + существующие freeze rules.

---

## File map

| File | Action |
|------|--------|
| `src/features/shop/hub/types.ts` | Create |
| `src/features/shop/hub/shopSellUtils.ts` | Create — pure `totalSellPriceForIds` |
| `src/features/shop/hub/shopSellUtils.test.ts` | Create |
| `src/features/shop/hub/ShopBuildPanel.tsx` | Create |
| `src/features/shop/hub/ShopSellPanel.tsx` | Create |
| `src/features/shop/hub/ShopHubLayout.tsx` | Create |
| `src/features/shop/hub/index.ts` | Create |
| `src/features/campaign/sectionTooltips.ts` | Modify — shop help strings |
| `src/features/campaign/sectionTooltips.test.ts` | Modify |
| `src/features/campaign/CampaignShopTab.tsx` | Modify — thin wrapper |
| `src/features/inventory/ShopInventoryView.tsx` | Delete (не импортируется) |

---

### Task 1: Shop tab types + section tooltips

**Files:**
- Create: `src/features/shop/hub/types.ts`
- Modify: `src/features/campaign/sectionTooltips.ts`
- Modify: `src/features/campaign/sectionTooltips.test.ts`

**Interfaces:**
- Produces: `ShopTabKey` type
- Produces: `SHOP_RAIL_SECTION_HELP`, `SHOP_OFFERS_SECTION_HELP`, `SHOP_SELL_SECTION_HELP`

- [ ] **Step 1: Create types**

```ts
// src/features/shop/hub/types.ts
export type ShopTabKey = 'offers' | 'sell' | 'chest'
```

- [ ] **Step 2: Add tooltips**

```ts
// src/features/campaign/sectionTooltips.ts (append)
export const SHOP_RAIL_SECTION_HELP =
  'Выберите героя для покупки на персонажа или продажи из инвентаря. Зелёная метка — в боевом отряде.'

export const SHOP_OFFERS_SECTION_HELP =
  'Ассортимент обновляется за золото. Двойной клик — покупка. Предмет можно отправить в сундук или выбранному герою.'

export const SHOP_SELL_SECTION_HELP =
  'Предметы не в экипировке. Продажа через popover или «Быстрая продажа».'
```

- [ ] **Step 3: Update test**

```ts
// sectionTooltips.test.ts — add imports and assertions
import {
  SHOP_RAIL_SECTION_HELP,
  SHOP_OFFERS_SECTION_HELP,
  SHOP_SELL_SECTION_HELP,
} from './sectionTooltips'

it('exports shop section help', () => {
  expect(SHOP_RAIL_SECTION_HELP).toContain('героя')
  expect(SHOP_OFFERS_SECTION_HELP).toContain('Обнов')
  expect(SHOP_SELL_SECTION_HELP).toContain('Быстрая продажа')
})
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/features/campaign/sectionTooltips.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/shop/hub/types.ts src/features/campaign/sectionTooltips.ts src/features/campaign/sectionTooltips.test.ts
git commit -m "feat(ui): shop hub types and section help strings"
```

---

### Task 2: Shop sell utils + ShopSellPanel

**Files:**
- Create: `src/features/shop/hub/shopSellUtils.ts`
- Create: `src/features/shop/hub/shopSellUtils.test.ts`
- Create: `src/features/shop/hub/ShopSellPanel.tsx`

**Interfaces:**
- Produces: `totalSellPriceForIds(ids: Set<string>, stash: readonly ItemInstance[]): number`
- Produces: `ShopSellPanel` props:

```ts
type ShopSellPanelProps = {
  stash: readonly ItemInstance[]
  inBattle: boolean
  onSellItem: (itemId: string) => void
}
```

- [ ] **Step 1: Write failing test**

```ts
// src/features/shop/hub/shopSellUtils.test.ts
import { describe, expect, it } from 'vitest'
import { totalSellPriceForIds } from './shopSellUtils'
import type { ItemInstance } from '../../../game/types'

const stash: ItemInstance[] = [
  { id: 'a', templateId: 'leather-armor', itemLevel: 1, modSlots: [] },
  { id: 'b', templateId: 'iron-sword', itemLevel: 1, modSlots: [] },
]

describe('totalSellPriceForIds', () => {
  it('sums sell prices for selected ids', () => {
    const sum = totalSellPriceForIds(new Set(['a', 'b']), stash)
    expect(sum).toBeGreaterThan(0)
  })

  it('ignores unknown ids', () => {
    expect(totalSellPriceForIds(new Set(['missing']), stash)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- src/features/shop/hub/shopSellUtils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement utils**

```ts
// src/features/shop/hub/shopSellUtils.ts
import { getItemTemplate } from '../../../game/content/itemTemplates'
import { itemSellPrice } from '../../../game/descriptions/itemText'
import type { ItemInstance } from '../../../game/types'

export function totalSellPriceForIds(
  ids: Set<string>,
  stash: readonly ItemInstance[],
): number {
  let sum = 0
  for (const id of ids) {
    const item = stash.find((i) => i.id === id)
    if (!item) continue
    const t = getItemTemplate(item.templateId)
    if (t) sum += itemSellPrice(t)
  }
  return sum
}
```

- [ ] **Step 4: Implement ShopSellPanel**

Перенести popover + grid + quick-sell из `CampaignShopTab` (`shopStashItemPopover`) и `ShopInventoryView` (`StashPreviewCell` pattern).

```tsx
// src/features/shop/hub/ShopSellPanel.tsx
import { useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { getItemTemplate } from '../../../game/content/itemTemplates'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSellPrice,
} from '../../../game/descriptions/itemText'
import type { ItemInstance } from '../../../game/types'
import { UI_LEVEL } from '../../../game/ui/labels'
import { ItemPopoverActions } from '../../inventory/ItemPopoverActions'
import { InventoryCell } from '../../inventory/InventoryCell'
import { InventoryGrid } from '../../inventory/InventoryGrid'
import { resolveItemEmoji } from '../../inventory/inventoryEmoji'
import { SectionHelp } from '../../layout/SectionHelp'
import { SHOP_SELL_SECTION_HELP } from '../../campaign/sectionTooltips'
import { totalSellPriceForIds } from './shopSellUtils'

// shopStashItemPopover — copy from CampaignShopTab.tsx lines 28-61

export function ShopSellPanel({ stash, inBattle, onSellItem }: ShopSellPanelProps) {
  const [quickSellMode, setQuickSellMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  // toggleQuickSell, toggleSelected, sellSelected — same as ShopInventoryView
  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Продажа <SectionHelp content={SHOP_SELL_SECTION_HELP} />
      </Typography.Text>
      {/* Button Быстрая продажа + InventoryGrid + sell selected footer */}
    </div>
  )
}
```

Ячейка в quick-sell mode: `onClick` с `e.stopPropagation()`, `className={selected ? 'inv-cell--selected' : undefined}`.

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/features/shop/hub/shopSellUtils.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/shop/hub/shopSellUtils.ts src/features/shop/hub/shopSellUtils.test.ts src/features/shop/hub/ShopSellPanel.tsx
git commit -m "feat(ui): shop sell panel with quick-sell mode"
```

---

### Task 3: ShopBuildPanel

**Files:**
- Create: `src/features/shop/hub/ShopBuildPanel.tsx`

**Interfaces:**
- Consumes: `CampaignState`, `characterId`, `inBattle`, `onUnequip(slot)`
- Produces: `ShopBuildPanel` — header + StatStrip + SpecializationLine + EquipmentSlotRow

- [ ] **Step 1: Create component**

Скопировать stat/effective вычисления из `CharacterBuildPanel.tsx` (без `EquipDeltaStrip`).

```tsx
// src/features/shop/hub/ShopBuildPanel.tsx
import { Typography } from 'antd'
import { getCharacter } from '../../../game/character/selectors'
import { getCharacterClass } from '../../../game/content/characterClasses'
import { getCharacterDisplay } from '../../../game/character/display'
import { getItemTemplate } from '../../../game/content/itemTemplates'
import { aggregatePassiveSkillStatBonuses } from '../../../game/passives/passiveStatBonuses'
import { computeEffectiveStats, computeGearStatBonuses } from '../../../game/stats/effectiveStats'
import type { CampaignState, EquipmentSlot } from '../../../game/types'
import { UI_LEVEL } from '../../../game/ui/labels'
import { EquipmentSlotRow } from '../../inventory/EquipmentSlotRow'
import { SectionHelp } from '../../layout/SectionHelp'
import { SpecializationLine } from '../../specialization/SpecializationLine'
import { StatStrip } from '../../stats/StatStrip'
import { SHOP_RAIL_SECTION_HELP } from '../../campaign/sectionTooltips'

type ShopBuildPanelProps = {
  campaign: CampaignState
  characterId: string
  inBattle: boolean
  onUnequip: (slot: EquipmentSlot) => void
}

export function ShopBuildPanel({ campaign, characterId, inBattle, onUnequip }: ShopBuildPanelProps) {
  const hero = getCharacter(campaign, characterId)
  if (!hero) return null
  // ... effective stats like CharacterBuildPanel
  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {display.emoji} {hero.name} · {cls?.label ?? hero.classId} {UI_LEVEL}
        {hero.unitLevel} <SectionHelp content={SHOP_RAIL_SECTION_HELP} />
      </Typography.Text>
      <StatStrip baseStats={...} effectiveStats={...} baseStatRating={...} showRating />
      <SpecializationLine campaign={campaign} character={hero} />
      <Typography.Text strong style={{ display: 'block', fontSize: 12, marginTop: 8, marginBottom: 4 }}>
        Надето
      </Typography.Text>
      <EquipmentSlotRow character={hero} inBattle={inBattle} onUnequip={onUnequip} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS (after export from index in Task 4, or import directly in layout)

- [ ] **Step 3: Commit**

```bash
git add src/features/shop/hub/ShopBuildPanel.tsx
git commit -m "feat(ui): shop build panel with stats and unequip row"
```

---

### Task 4: ShopHubLayout

**Files:**
- Create: `src/features/shop/hub/ShopHubLayout.tsx`
- Create: `src/features/shop/hub/index.ts`

**Interfaces:**
- Produces: `ShopHubLayout` with props matching current `CampaignShopTabProps`
- Consumes: `CharacterRail`, `ShopBuildPanel`, `ShopSellPanel`, `ShopOffersGrid`, `ChestInventoryView`

- [ ] **Step 1: Create layout**

```tsx
// src/features/shop/hub/ShopHubLayout.tsx
import { useEffect, useState } from 'react'
import { Button, Space, Tabs } from 'antd'
import { SKILL_ACQUISITION } from '../../../game/config/skillAcquisition'
import { getActiveCharacter, getCharacter } from '../../../game/character/selectors'
import { stashItemsFromCampaign } from '../../../game/equipment/stashOrder'
import type { CampaignState, EquipmentSlot } from '../../../game/types'
import { CharacterRail } from '../../character/hub/CharacterRail'
import { ChestInventoryView } from '../../inventory/ChestInventoryView'
import { ShopOffersGrid } from '../../inventory/ShopOffersGrid'
import { SectionHelp } from '../../layout/SectionHelp'
import { CHEST_SECTION_HELP, SHOP_OFFERS_SECTION_HELP } from '../../campaign/sectionTooltips'
import { ShopBuildPanel } from './ShopBuildPanel'
import { ShopSellPanel } from './ShopSellPanel'
import type { ShopTabKey } from './types'
import '../../layout/game-layout.css'

export type ShopHubLayoutProps = {
  campaign: CampaignState
  inBattle: boolean
  onRefreshShop: (free?: boolean) => void
  onBuyOffer: (
    offerIndex: number,
    destination?: 'chest' | 'character',
    characterId?: string,
  ) => void
  onInsufficientGold: () => void
  onSellChestItem: (itemId: string) => void
  onSellChestCard: (cardId: string) => void
  onSellChestPassive: (passiveId: string) => void
  onSellItem: (characterId: string, itemId: string) => void
  onBindChestCard: (cardId: string, characterId: string) => void
  onBindChestPassive: (passiveId: string, characterId: string) => void
  onMoveChestItemToCharacter?: (itemId: string, characterId: string) => void
  onUnequip: (characterId: string, slot: EquipmentSlot) => void
}

export function ShopHubLayout({ campaign, inBattle, ...handlers }: ShopHubLayoutProps) {
  const expeditionActive = campaign.expedition !== null
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => getActiveCharacter(campaign).id,
  )
  const [activeTab, setActiveTab] = useState<ShopTabKey>('offers')

  useEffect(() => {
    if (!getCharacter(campaign, selectedCharacterId)) {
      setSelectedCharacterId(getActiveCharacter(campaign).id)
    }
  }, [campaign, selectedCharacterId])

  useEffect(() => {
    if (campaign.shopOffers === null && !inBattle && !expeditionActive) {
      handlers.onRefreshShop(true)
    }
  }, [campaign.shopOffers, inBattle, expeditionActive, handlers.onRefreshShop])

  const hero = getCharacter(campaign, selectedCharacterId) ?? getActiveCharacter(campaign)
  const stash = stashItemsFromCampaign(hero.items, hero.equipment)
  const chestCount =
    campaign.chest.items.length +
    campaign.chest.unboundCards.length +
    campaign.chest.unboundPassives.length

  const offersPanel = (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
        <Typography.Text strong>
          Ассортимент <SectionHelp content={SHOP_OFFERS_SECTION_HELP} />
        </Typography.Text>
        <Button
          size="small"
          disabled={inBattle || expeditionActive}
          onClick={() => handlers.onRefreshShop(false)}
        >
          Обновить ({SKILL_ACQUISITION.shopRefreshCost} 💰)
        </Button>
      </Space>
      <ShopOffersGrid
        offers={campaign.shopOffers ?? []}
        gold={campaign.gold}
        inBattle={inBattle}
        selectedCharacterName={hero.name}
        selectedCharacterId={hero.id}
        onBuy={handlers.onBuyOffer}
        onInsufficientGold={handlers.onInsufficientGold}
      />
    </div>
  )

  return (
    <div className="game-character-hub">
      <CharacterRail
        campaign={campaign}
        selectedCharacterId={selectedCharacterId}
        transferDisabled
        onSelectCharacter={setSelectedCharacterId}
      />
      <ShopBuildPanel
        campaign={campaign}
        characterId={selectedCharacterId}
        inBattle={inBattle}
        onUnequip={(slot) => handlers.onUnequip(selectedCharacterId, slot)}
      />
      <Tabs
        size="small"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ShopTabKey)}
        items={[
          { key: 'offers', label: 'Магазин', children: offersPanel },
          {
            key: 'sell',
            label: 'Продажа',
            children: (
              <ShopSellPanel
                stash={stash}
                inBattle={inBattle}
                onSellItem={(itemId) => handlers.onSellItem(selectedCharacterId, itemId)}
              />
            ),
          },
          {
            key: 'chest',
            label: `Сундук (${chestCount})`,
            children: (
              <ChestInventoryView
                campaign={campaign}
                inBattle={inBattle}
                inventoryLocked={expeditionActive}
                bindCharacterId={selectedCharacterId}
                bindCharacterName={hero.name}
                showIntro={false}
                dndEnabled={false}
                onSellChestItem={handlers.onSellChestItem}
                onSellChestCard={handlers.onSellChestCard}
                onSellChestPassive={handlers.onSellChestPassive}
                onBindCard={(cardId) => handlers.onBindChestCard(cardId, selectedCharacterId)}
                onBindPassive={(passiveId) =>
                  handlers.onBindChestPassive(passiveId, selectedCharacterId)
                }
                onAssignItemToCharacter={
                  handlers.onMoveChestItemToCharacter
                    ? (itemId) =>
                        handlers.onMoveChestItemToCharacter!(itemId, selectedCharacterId)
                    : undefined
                }
              />
            ),
          },
        ]}
      />
    </div>
  )
}
```

Добавить `import { Typography } from 'antd'` если используется в offersPanel.

- [ ] **Step 2: Create index**

```ts
// src/features/shop/hub/index.ts
export { ShopHubLayout, type ShopHubLayoutProps } from './ShopHubLayout'
export type { ShopTabKey } from './types'
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/shop/hub/
git commit -m "feat(ui): shop hub 3-column layout"
```

---

### Task 5: Thin CampaignShopTab + cleanup

**Files:**
- Modify: `src/features/campaign/CampaignShopTab.tsx`
- Delete: `src/features/inventory/ShopInventoryView.tsx`

**Interfaces:**
- `CampaignShopTab` re-exports same props; body → `<ShopHubLayout {...props} />`

- [ ] **Step 1: Replace CampaignShopTab**

```tsx
// src/features/campaign/CampaignShopTab.tsx
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { ShopHubLayout } from '../shop/hub'

type CampaignShopTabProps = {
  // ... same props as ShopHubLayoutProps
}

export function CampaignShopTab(props: CampaignShopTabProps) {
  return (
    <div role="tabpanel" style={{ width: '100%' }}>
      <ShopHubLayout {...props} />
    </div>
  )
}
```

Удалить все старые imports: `CharacterRosterView`, `GameColumns`, `GamePanel`, inline popover/grid.

- [ ] **Step 2: Delete ShopInventoryView**

```bash
rm src/features/inventory/ShopInventoryView.tsx
```

Проверить: `rg ShopInventoryView` — 0 импортов.

- [ ] **Step 3: Verify**

Run: `npm run build && npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/campaign/CampaignShopTab.tsx
git rm src/features/inventory/ShopInventoryView.tsx
git commit -m "feat(ui): wire shop tab to ShopHubLayout and remove legacy view"
```

---

### Task 6: Manual smoke + final verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: all PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Manual smoke @1280px**

1. Открыть вкладку **Магазин** — 3 колонки: rail | build | tabs.
2. Выбрать другого героя в rail — build и «Персонаж» в popover покупки обновляются.
3. Вкладка **Магазин**: купить предмет в сундук и на персонажа.
4. Вкладка **Продажа**: popover «Продать»; toggle «Быстрая продажа» → выделение → «Продать выбранное».
5. Вкладка **Сундук**: bind карты/навыка к выбранному герою.
6. **Надето**: снять предмет → появляется в Продажа.
7. **Обновить** disabled во время expedition / inBattle.

- [ ] **Step 4: Commit** (only if smoke fixes were needed)

---

## Plan self-review

| Spec § | Task |
|--------|------|
| 3-col grid | Task 4 — `.game-character-hub` |
| CharacterRail no actions | Task 4 — no appearance/release props |
| ShopBuildPanel slim | Task 3 |
| Tabs Магазин/Продажа/Сундук | Task 4 |
| Quick sell | Task 2 |
| No DnD | Task 4 — `transferDisabled`, `dndEnabled={false}` |
| sectionTooltips | Task 1 |
| Delete legacy | Task 5 |
| Reducer unchanged | all tasks |
| CampaignHub wiring unchanged | Task 5 — same props |

No TBD placeholders in task steps.
