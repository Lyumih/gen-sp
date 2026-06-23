# Character Tab Compact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сжать вкладку «Персонаж»: одна панель «Персонажи», compact roster, `?` tooltips вместо inline-подсказок, без дублирующих заголовков.

**Architecture:** Переиспользуемые `SectionHelp` + `sectionTooltips.ts`; существующие view получают opt-in props (`variant`, `hubCharacterSummary`, `hideInnerSectionTitles`, `showIntro`); `CampaignCharacterTab` собирает layout. Reducer/DnD-логика не меняется.

**Tech Stack:** React 19, Ant Design 6, TypeScript strict, Vitest (`renderToStaticMarkup` для smoke-тестов UI), Vite 8.

**Spec:** `docs/superpowers/specs/2026-06-24-character-tab-compact-design.md`

## Global Constraints

- `AGENTS.md`: StatStrip emoji из `labels.ts`; desktop tooltip `mouseEnterDelay={0.3}`; `App.useApp().message` (не static).
- `variant="full"` / `showHeading={true}` / `showIntro={true}` по умолчанию — shop tab без регрессии.
- `inv-cell-hint` «перетащи» на пустых слотах — **не** убирать.
- Expedition freeze: `Alert` + disabled UI — без изменений.
- `panelTitle` передаётся как `ReactNode` (title + `SectionHelp`); `GamePanel` не расширять отдельным `helpTooltip` prop.
- Панель умений: заголовок **«Умения»**, не «Умения и навыки».

---

## File map

| File | Action |
|------|--------|
| `src/features/campaign/sectionTooltips.ts` | Create |
| `src/features/campaign/sectionTooltips.test.ts` | Create |
| `src/features/layout/SectionHelp.tsx` | Create |
| `src/features/layout/index.ts` | Modify — export `SectionHelp` |
| `src/features/character/CharacterRosterView.tsx` | Modify — `variant`, `showHeading`, compact row |
| `src/features/character/CharacterRosterView.test.tsx` | Create |
| `src/features/profile/HeroProfileContent.tsx` | Modify — `hubCharacterSummary` |
| `src/features/profile/HeroProfileContent.test.tsx` | Create |
| `src/features/inventory/EquipmentInventoryView.tsx` | Modify — `panelTitle?: ReactNode`, `hideInnerSectionTitles` |
| `src/features/inventory/CardsInventoryView.tsx` | Modify — remove drag hints, strong subheadings |
| `src/features/inventory/CardsInventoryView.test.tsx` | Create |
| `src/features/inventory/ChestInventoryView.tsx` | Modify — `showIntro` |
| `src/features/inventory/ChestInventoryView.test.tsx` | Create |
| `src/features/campaign/CampaignCharacterTab.tsx` | Modify — unified layout + help titles |

---

### Task 1: Section tooltips constants

**Files:**
- Create: `src/features/campaign/sectionTooltips.ts`
- Create: `src/features/campaign/sectionTooltips.test.ts`

**Interfaces:**
- Produces: `CHARACTERS_SECTION_HELP`, `EQUIPMENT_SECTION_HELP`, `SKILLS_SECTION_HELP`, `CHEST_SECTION_HELP` — non-empty Russian strings.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/campaign/sectionTooltips.test.ts
import { describe, expect, it } from 'vitest'
import {
  CHARACTERS_SECTION_HELP,
  CHEST_SECTION_HELP,
  EQUIPMENT_SECTION_HELP,
  SKILLS_SECTION_HELP,
} from './sectionTooltips'

describe('sectionTooltips', () => {
  it('exports help text for all character tab sections', () => {
    expect(CHARACTERS_SECTION_HELP).toContain('Отряд')
    expect(EQUIPMENT_SECTION_HELP).toContain('Инвентарь')
    expect(SKILLS_SECTION_HELP).toContain('Коллекция')
    expect(CHEST_SECTION_HELP).toContain('сундук')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/campaign/sectionTooltips.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Add constants**

```ts
// src/features/campaign/sectionTooltips.ts
export const CHARACTERS_SECTION_HELP =
  'Отряд — кто идёт в бой. Список ниже: выберите героя для экипировки. Перетащите героя в слот отряда или предмет на строку героя.'

export const EQUIPMENT_SECTION_HELP =
  'Слоты оружия, брони и аксессуара. Инвентарь — предметы героя; перетащите на слот или на другого героя в списке. Пустые слоты принимают предметы перетаскиванием. Сортировка инвентаря — перетаскиванием ячеек.'

export const SKILLS_SECTION_HELP =
  'Карты и пассивные навыки для боя. «В бой» и «Навыки в бою» — активные слоты (лимит зависит от героя). «Коллекция» — запас; перетащите в слот боя. Модификаторы на картах и навыках — по клику на ячейку.'

export const CHEST_SECTION_HELP =
  'Общий склад кампании: предметы, непривязанные карты и навыки. Перетащите предмет на героя в списке или из инвентаря в сундук. Привязка карт и навыков — к выбранному герою.'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/campaign/sectionTooltips.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/campaign/sectionTooltips.ts src/features/campaign/sectionTooltips.test.ts
git commit -m "feat(ui): add character tab section tooltip strings"
```

---

### Task 2: SectionHelp component

**Files:**
- Create: `src/features/layout/SectionHelp.tsx`
- Modify: `src/features/layout/index.ts`

**Interfaces:**
- Consumes: `content: string` prop
- Produces: `SectionHelp` component — `QuestionCircleOutlined` in `Tooltip`, `mouseEnterDelay={0.3}`, `aria-label={content}`

- [ ] **Step 1: Create component**

```tsx
// src/features/layout/SectionHelp.tsx
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'

type SectionHelpProps = {
  content: string
}

export function SectionHelp({ content }: SectionHelpProps) {
  return (
    <Tooltip title={content} mouseEnterDelay={0.3}>
      <QuestionCircleOutlined
        aria-label={content}
        style={{
          fontSize: 12,
          color: 'rgba(0,0,0,0.45)',
          marginInlineStart: 4,
          cursor: 'help',
        }}
      />
    </Tooltip>
  )
}
```

- [ ] **Step 2: Export from layout index**

```ts
// src/features/layout/index.ts — append
export { SectionHelp } from './SectionHelp'
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS (no type errors)

- [ ] **Step 4: Commit**

```bash
git add src/features/layout/SectionHelp.tsx src/features/layout/index.ts
git commit -m "feat(ui): add SectionHelp icon for panel tooltips"
```

---

### Task 3: CharacterRosterView compact variant

**Files:**
- Modify: `src/features/character/CharacterRosterView.tsx`
- Create: `src/features/character/CharacterRosterView.test.tsx`

**Interfaces:**
- Produces: props `variant?: 'full' | 'compact'` (default `'full'`), `showHeading?: boolean` (default `true`)
- Compact row title: `{emoji} {name} · {classLabel} {UI_LEVEL}{unitLevel}` + tags; no StatStrip, no SpecializationLine, no «← перетащи предмет»

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/character/CharacterRosterView.test.tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { CharacterRosterView } from './CharacterRosterView'

const noop = () => {}

describe('CharacterRosterView', () => {
  it('compact variant omits drag hint and roster heading', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(CharacterRosterView, {
        campaign,
        selectedCharacterId: campaign.characters[0]!.id,
        inventoryCharacterId: campaign.characters[0]!.id,
        transferDisabled: false,
        squadLocked: false,
        activeDragId: null,
        onSelectCharacter: noop,
        onAssignToSquad: noop,
        onRemoveFromSquad: noop,
        variant: 'compact',
        showHeading: false,
      }),
    )
    expect(html).not.toContain('перетащи предмет')
    expect(html).not.toContain('Состав (')
  })

  it('full variant keeps StatStrip rating marker', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(CharacterRosterView, {
        campaign,
        selectedCharacterId: campaign.characters[0]!.id,
        inventoryCharacterId: campaign.characters[0]!.id,
        transferDisabled: true,
        squadLocked: true,
        activeDragId: null,
        onSelectCharacter: noop,
        onAssignToSquad: noop,
        onRemoveFromSquad: noop,
        variant: 'full',
      }),
    )
    expect(html).toContain('★')
    expect(html).toContain('Состав (')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/character/CharacterRosterView.test.tsx`
Expected: FAIL — `variant` prop not recognized or compact still renders hints

- [ ] **Step 3: Implement compact variant**

In `CharacterRosterView.tsx`:

1. Extend `CharacterRosterViewProps`:

```ts
variant?: 'full' | 'compact'
showHeading?: boolean
```

Defaults in destructuring: `variant = 'full'`, `showHeading = true`.

2. Pass `variant` into `RosterRow`.

3. In `RosterRow`, when `variant === 'compact'`:
   - `padding: '4px 8px'` on `List.Item`
   - Title: `{display.emoji} {character.name} · {cls?.label ?? character.classId} {UI_LEVEL}{character.unitLevel}` + tags only
   - Remove `canReceiveItem` Typography hint
   - `description={undefined}` or omit `List.Item.Meta` description entirely

4. When `variant === 'full'` — keep current description (StatStrip, SpecializationLine, stash count).

5. Wrap internal heading:

```tsx
{showHeading ? (
  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
    Состав ({roster.length})
  </Typography.Text>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/character/CharacterRosterView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/character/CharacterRosterView.tsx src/features/character/CharacterRosterView.test.tsx
git commit -m "feat(ui): compact character roster rows for hub tab"
```

---

### Task 4: HeroProfileContent hubCharacterSummary

**Files:**
- Modify: `src/features/profile/HeroProfileContent.tsx`
- Create: `src/features/profile/HeroProfileContent.test.tsx`

**Interfaces:**
- Produces: `hubCharacterSummary?: boolean` — when `true` and `mode === 'hub'`, render only `StatStrip` + `SpecializationLine`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/profile/HeroProfileContent.test.tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { HeroProfileContent } from './HeroProfileContent'

describe('HeroProfileContent', () => {
  it('hubCharacterSummary hides gear multipliers and expected HP', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(HeroProfileContent, {
        mode: 'hub',
        campaign,
        battle: null,
        characterId: campaign.characters[0]!.id,
        hubCharacterSummary: true,
      }),
    )
    expect(html).toContain('★')
    expect(html).not.toContain('Ожидаемый max')
    expect(html).not.toMatch(/Экипировка:.*×/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/profile/HeroProfileContent.test.tsx`
Expected: FAIL — still contains «Ожидаемый max» or gear paragraph

- [ ] **Step 3: Gate hub-only blocks**

Add to `HeroProfileContentProps`:

```ts
hubCharacterSummary?: boolean
```

Default `hubCharacterSummary = false` in destructuring.

Wrap blocks that must hide when `hubCharacterSummary`:

```tsx
{!hubCharacterSummary ? (
  <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
    Экипировка: {UI_HEART} ×{gearHpMultHub.toFixed(2)}, ...
  </Typography.Paragraph>
) : null}

{!hubCharacterSummary && mode === 'hub' && expectedMaxHpHub !== null ? (
  <Typography.Paragraph>...</Typography.Paragraph>
) : null}

{!hubCharacterSummary && mode === 'hub' && hubScenario === undefined ? (
  <Typography.Paragraph type="secondary">...</Typography.Paragraph>
) : null}
```

Also gate `includeResourceStats`, `includeEquipmentReadout`, `includeCardsCollapse`, `includeAppearance` when `hubCharacterSummary` — early return path not needed; use `!hubCharacterSummary &&` on each optional block.

`StatStrip` and `SpecializationLine` always render.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/profile/HeroProfileContent.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/HeroProfileContent.tsx src/features/profile/HeroProfileContent.test.tsx
git commit -m "feat(ui): hubCharacterSummary trims profile on character tab"
```

---

### Task 5: EquipmentInventoryView — hide inner title, ReactNode panelTitle

**Files:**
- Modify: `src/features/inventory/EquipmentInventoryView.tsx`

**Interfaces:**
- Consumes: `SectionHelp` not needed here — title passed from parent
- Produces: `panelTitle?: ReactNode`, `hideInnerSectionTitles?: boolean` (default `false`)

- [ ] **Step 1: Update prop types**

```ts
import type { ReactNode } from 'react'
// ...
panelTitle?: ReactNode
hideInnerSectionTitles?: boolean
```

- [ ] **Step 2: Conditionally hide inner «Экипировка» heading**

Around line 568, replace unconditional block:

```tsx
{!hideInnerSectionTitles ? (
  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
    Экипировка
  </Typography.Text>
) : null}
```

`GamePanel title={panelTitle}` usages stay unchanged (already accepts ReactNode via `GamePanel` `title?: ReactNode`).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/inventory/EquipmentInventoryView.tsx
git commit -m "feat(ui): optional hide inner equipment section title"
```

---

### Task 6: CardsInventoryView — remove drag hints

**Files:**
- Modify: `src/features/inventory/CardsInventoryView.tsx`
- Create: `src/features/inventory/CardsInventoryView.test.tsx`

**Interfaces:**
- Produces: strong subheadings «В бой», «Коллекция», «Навыки в бою», «Коллекция навыков»; no «перетащите» strings

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/inventory/CardsInventoryView.test.tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { CardsInventoryView } from './CardsInventoryView'

const noop = () => {}

describe('CardsInventoryView', () => {
  it('does not render inline drag hint lines', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    const html = renderToStaticMarkup(
      createElement(CardsInventoryView, {
        campaign,
        characterId: heroId,
        inBattle: false,
        onReorderCards: noop,
        onSetBattleLoadout: noop,
        onSetPassiveEquip: noop,
        onSellCard: noop,
      }),
    )
    expect(html).not.toContain('перетащите')
    expect(html).toContain('В бой')
    expect(html).toContain('Коллекция навыков')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/inventory/CardsInventoryView.test.tsx`
Expected: FAIL — contains «перетащите»

- [ ] **Step 3: Replace hint Typography blocks**

Remove lines ~589–591 and ~624–628 (secondary drag hints).

Change subheadings to:

```tsx
<Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
  В бой
</Typography.Text>
// ... slots ...
<Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
  Коллекция
</Typography.Text>
// ... after Divider ...
<Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
  Навыки в бою
</Typography.Text>
// ... slots ...
<Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
  Коллекция навыков
</Typography.Text>
```

Remove unused `skillSlotCount` / `passiveEquipSlotCount` from hint strings only if no longer referenced elsewhere in component (counts may still be used for slot arrays).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/inventory/CardsInventoryView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/CardsInventoryView.tsx src/features/inventory/CardsInventoryView.test.tsx
git commit -m "feat(ui): remove inline drag hints from cards inventory"
```

---

### Task 7: ChestInventoryView showIntro prop

**Files:**
- Modify: `src/features/inventory/ChestInventoryView.tsx`
- Create: `src/features/inventory/ChestInventoryView.test.tsx`

**Interfaces:**
- Produces: `showIntro?: boolean` (default `true`)

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/inventory/ChestInventoryView.test.tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { ChestInventoryView } from './ChestInventoryView'

describe('ChestInventoryView', () => {
  it('hides intro text when showIntro is false', () => {
    const campaign = initialCampaignState()
    const html = renderToStaticMarkup(
      createElement(ChestInventoryView, {
        campaign,
        inBattle: false,
        onSellChestItem: () => {},
        showIntro: false,
      }),
    )
    expect(html).not.toContain('Общий сундук')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/inventory/ChestInventoryView.test.tsx`
Expected: FAIL

- [ ] **Step 3: Add prop and conditional render**

```ts
showIntro?: boolean  // default true in destructuring
```

```tsx
{showIntro ? (
  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
    Общий сундук — предметы, непривязанные умения и навыки
    {dndEnabled ? ' · перетащите предмет на персонажа или из инвентаря в сундук' : null}
  </Typography.Text>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/inventory/ChestInventoryView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/ChestInventoryView.tsx src/features/inventory/ChestInventoryView.test.tsx
git commit -m "feat(ui): optional chest intro text via showIntro prop"
```

---

### Task 8: Wire CampaignCharacterTab layout

**Files:**
- Modify: `src/features/campaign/CampaignCharacterTab.tsx`

**Interfaces:**
- Consumes: `SectionHelp`, all section tooltip constants, updated child props from Tasks 3–7

- [ ] **Step 1: Add imports**

```tsx
import { Divider } from 'antd'
import { SectionHelp } from '../layout/SectionHelp'
import {
  CHARACTERS_SECTION_HELP,
  CHEST_SECTION_HELP,
  EQUIPMENT_SECTION_HELP,
  SKILLS_SECTION_HELP,
} from './sectionTooltips'
```

- [ ] **Step 2: Replace dndBeforeContent panels with single «Персонажи» panel**

Replace nested `GamePanel title="Отряд"` + `GamePanel title="Состав"` + bare `HeroProfileContent` with:

```tsx
<GamePanel
  title={
    <>
      Персонажи ({campaign.characters.length}){' '}
      <SectionHelp content={CHARACTERS_SECTION_HELP} />
    </>
  }
>
  <SquadSlotRow ... />
  <Divider style={{ margin: '8px 0' }} />
  <CharacterRosterView
    variant="compact"
    showHeading={false}
    ...existing props...
  />
  <Divider plain style={{ margin: '8px 0 4px' }}>
    выбранный
  </Divider>
  <HeroProfileContent
    mode="hub"
    campaign={campaign}
    battle={null}
    characterId={selectedCharacterId}
    hubCharacterSummary
    includeResourceStats={false}
    includeEquipmentReadout={false}
    includeCardsCollapse={false}
  />
</GamePanel>
```

- [ ] **Step 3: Update equipment panel title and props**

```tsx
panelTitle={
  <>
    Экипировка <SectionHelp content={EQUIPMENT_SECTION_HELP} />
  </>
}
hideInnerSectionTitles
```

- [ ] **Step 4: Update skills panel**

```tsx
<GamePanel
  title={
    <>
      Умения <SectionHelp content={SKILLS_SECTION_HELP} />
    </>
  }
>
  <CardsInventoryView ... />
</GamePanel>
```

- [ ] **Step 5: Update chest panel**

```tsx
<GamePanel
  title={
    <>
      Сундук <SectionHelp content={CHEST_SECTION_HELP} />
    </>
  }
>
  <ChestInventoryView showIntro={false} ...existing props... />
</GamePanel>
```

- [ ] **Step 6: Verify full suite and build**

Run: `npm run test`
Expected: all tests PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/campaign/CampaignCharacterTab.tsx
git commit -m "feat(ui): compact character tab layout with section help"
```

---

### Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: PASS (602+ tests)

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Manual smoke @1280px** (dev server `npm run start`)

Checklist:
- [ ] Одна панель «Персонажи (N)» с `?` — нет «Отряд» / «Состав» дублей
- [ ] Roster rows compact — нет StatStrip в списке
- [ ] Выбранный: StatStrip + склонность; нет «Экипировка: ❤️ ×»
- [ ] Экипировка: один заголовок с `?`; внутренний «Экипировка» strong отсутствует
- [ ] Умения: заголовок «Умения»; нет «перетащите из коллекции»
- [ ] Сундук: нет intro-текста; есть `?`
- [ ] Shop tab: roster still full (`variant` default) — StatStrip in rows if shop uses default

- [ ] **Step 4: Commit** (only if manual fixes were needed)

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| §5 Персонажи unified panel | Task 8 |
| §5.2 Compact roster | Task 3 |
| §5.3 hubCharacterSummary | Task 4 |
| §6 Экипировка hide inner title + tooltip | Tasks 1–2, 5, 8 |
| §7 Умения title + no hints | Tasks 1–2, 6, 8 |
| §8 Сундук showIntro + tooltip | Tasks 1–2, 7, 8 |
| §9 SectionHelp | Task 2 |
| §12 Acceptance criteria | Task 9 |
