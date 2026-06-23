# Справка (Help) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вкладка «Справка» в хабе кампании — компактный справочник правил Gen с точным описанием Memento Mori в игровом языке; доступна всегда, включая бой и inter_battle.

**Architecture:** Статический каталог `src/game/help/articles.ts` (чистые данные) + UI `CampaignHelpTab` (`Collapse`). В хабе — обычная вкладка. В бою / inter_battle (`CampaignBattleNav`) вкладка «Справка» единственная кликабельная и открывает `Drawer` с тем же контентом.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), React 19 + Ant Design 6, Zustand 5, Vite 8.

**Spec:** `docs/superpowers/specs/2026-06-23-help-section-design.md`

## Global Constraints

- 6-я вкладка хаба: Персонаж · Бой · Магазин · Таверна · Кодекс · **Справка** (последняя).
- Вкладка **Справка** **никогда не disabled** (в отличие от Кодекса при `inBattle`).
- Memento Mori — **игровой язык**, без формул и таблиц шансов.
- `Collapse` `size="small"`; `defaultActiveKey={['memento']}`.
- Иконка: `QuestionCircleOutlined`.
- Персистентность и поиск — **не** в MVP.
- Не использовать Ant Design `Tabs` для подменю.
- Сообщения `App.useApp().message` в Справке **не** используются.

---

## Карта файлов

| Путь | Ответственность |
|------|-----------------|
| `src/game/help/articles.ts` | `HelpArticle`, `HELP_ARTICLE_ORDER`, `HELP_ARTICLES` |
| `src/game/help/articles.test.ts` | Уникальность id, порядок, непустые тексты |
| `src/features/help/CampaignHelpTab.tsx` | `Collapse` по статьям |
| `src/features/help/CampaignHelpTab.test.ts` | Smoke: 8 панелей, Memento в разметке |
| `src/features/campaign/campaignHubShared.ts` | `CampaignHubTab` += `'help'` |
| `src/features/campaign/CampaignHubNav.tsx` | Кнопка Справка; help не в `isTabDisabled` |
| `src/features/campaign/CampaignHubNav.test.ts` | Help enabled при `tabsDisabled`; help enabled при `codexDisabled` |
| `src/features/campaign/CampaignHub.tsx` | Рендер `CampaignHelpTab` |
| `src/features/campaign/CampaignBattleNav.tsx` | Drawer + клик по help при `tabsDisabled` |

---

### Task 1: Каталог статей (`articles.ts`)

**Files:**
- Create: `src/game/help/articles.ts`
- Create: `src/game/help/articles.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type HelpArticleId =
    | 'memento'
    | 'battle'
    | 'cards'
    | 'equipment'
    | 'squad'
    | 'economy'
    | 'codex'
    | 'about'

  export type HelpArticle = {
    id: HelpArticleId
    title: string
    paragraphs: readonly string[]
    bullets?: readonly string[]
  }

  export const HELP_ARTICLE_ORDER: readonly HelpArticleId[]
  export const HELP_ARTICLES: readonly HelpArticle[]
  export function helpArticleById(id: HelpArticleId): HelpArticle
  ```

- [ ] **Step 1: Write the failing test**

Create `src/game/help/articles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HELP_ARTICLE_ORDER, HELP_ARTICLES, helpArticleById } from './articles'

describe('help articles', () => {
  it('has unique ids in fixed order starting with memento', () => {
    expect(HELP_ARTICLE_ORDER[0]).toBe('memento')
    expect(HELP_ARTICLE_ORDER).toHaveLength(8)
    const ids = HELP_ARTICLES.map((a) => a.id)
    expect(ids).toEqual([...HELP_ARTICLE_ORDER])
    expect(new Set(ids).size).toBe(8)
  })

  it('every article has non-empty title and paragraphs', () => {
    for (const article of HELP_ARTICLES) {
      expect(article.title.trim().length).toBeGreaterThan(0)
      expect(article.paragraphs.length).toBeGreaterThan(0)
      for (const p of article.paragraphs) {
        expect(p.trim().length).toBeGreaterThan(0)
      }
      if (article.bullets) {
        for (const b of article.bullets) {
          expect(b.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('memento article mentions three progression axes', () => {
    const memento = helpArticleById('memento')
    const text = [
      memento.title,
      ...memento.paragraphs,
      ...(memento.bullets ?? []),
    ].join(' ')
    expect(text).toContain('Memento Mori')
    expect(text).toContain('Смерть')
    expect(text).toContain('Использование')
    expect(text).toContain('Победа')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/help/articles.test.ts`  
Expected: FAIL — module `./articles` not found.

- [ ] **Step 3: Implement `articles.ts`**

Create `src/game/help/articles.ts`:

```ts
export type HelpArticleId =
  | 'memento'
  | 'battle'
  | 'cards'
  | 'equipment'
  | 'squad'
  | 'economy'
  | 'codex'
  | 'about'

export type HelpArticle = {
  id: HelpArticleId
  title: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

export const HELP_ARTICLE_ORDER: readonly HelpArticleId[] = [
  'memento',
  'battle',
  'cards',
  'equipment',
  'squad',
  'economy',
  'codex',
  'about',
]

const ARTICLES: readonly HelpArticle[] = [
  {
    id: 'memento',
    title: 'Memento Mori',
    paragraphs: [
      'Gen построен на системе Memento Mori — прогресс не обнуляется с поражением. Сила накапливается в трёх направлениях:',
      'Смерть. Когда падает союзник — у него есть шанс получить +1 к уровню персонажа (сохраняется между боями). Когда умирает враг — растёт сила мира: следующие противники выходят сильнее, даже если это другой тип врага.',
      'Использование. Каждое применение умения в бою — шанс повысить его уровень. На уровне 1 почти всегда срабатывает; дальше шанс падает, на очень высоких уровнях рост редкий, но возможен. Числа в описании умения (урон, лечение) растут вместе с уровнем.',
      'Победа. После победы в бою каждый установленный модификатор на умении или предмете получает свой шанс +1 к уровню модификатора — независимо от уровня самой карты.',
      'Модификаторы открываются на вехах уровня носителя (умения или предмета): первый слот — с высокого уровня, следующие — ещё выше. При открытии слота выбираете 1 из 3 предложенных модов. Уровень мода и уровень карты растут отдельно: мод не мешает прокачке умения за использование.',
    ],
    bullets: [
      'Смерть — уровень персонажа и сила мира (враги в следующих боях опаснее).',
      'Использование — уровень умений и надетой экипировки.',
      'Победа — уровень модификаторов в слотах карт и предметов.',
      'Оружие качается, когда вы атакуете им.',
      'Броня и аксессуары — когда по вам попадают.',
      'Без оружия («кулаки») предмет не качается.',
    ],
  },
  {
    id: 'battle',
    title: 'Бой',
    bullets: [
      'Пошаговая тактика на квадратной сетке, движение в 4 стороны.',
      'Каждый раунд порядок хода по инициативе (⚡): класс, экипировка и умения влияют на неё.',
      'У вас 2 слота умений в бою (loadout) — остальная коллекция в хабе.',
      'Ближний и дальний бой; у дальних атак есть дальность — смотрите подсветку клеток.',
      'HP = 0 → персонаж падает (downed), но не исчезает — его можно поднять умением, предметом или между боями.',
      'Поражение не стирает кампанию: можно повторить бой с сохранённым прогрессом.',
    ],
  },
  {
    id: 'cards',
    title: 'Карты и умения',
    bullets: [
      'У каждого персонажа своя коллекция карт и свой loadout (2 активных слота).',
      'Умение имеет уровень — растёт при использовании в бою (см. Memento Mori).',
      'Описания с растущими числами отражают текущий уровень.',
      'Карта Удар — базовая атака; качает оружие, а не себя.',
    ],
  },
  {
    id: 'equipment',
    title: 'Экипировка и модификаторы',
    bullets: [
      'Три слота: оружие, броня, аксессуар.',
      'Предметы лежат в инвентаре персонажа; между бойцами отряда не передаются автоматически — только вручную в хабе.',
      'У надетых предметов свой уровень и слоты модификаторов — по тем же правилам, что у умений.',
      'Детали конкретных модов — в Кодексе (категория «Модификаторы»).',
    ],
  },
  {
    id: 'squad',
    title: 'Отряд и expedition',
    bullets: [
      'В отряде до 4 бойцов (состав меняется в хабе).',
      'Expedition — цепочка боёв без возврата в хаб: магазин, таверна, смена состава и экипировки заморожены.',
      'Упавший в expedition боец не участвует в следующем, пока не воскресят между боями — заменить из резерва нельзя.',
      'После завершения expedition — полный доступ к хабу; упавшие снова доступны.',
    ],
  },
  {
    id: 'economy',
    title: 'Таверна и магазин',
    bullets: [
      'Таверна — найм новых персонажей за золото (класс, статы, стартовая экипировка).',
      'Магазин — покупка предметов; ассортимент в хабе.',
      'Оба недоступны во время expedition и боя.',
    ],
  },
  {
    id: 'codex',
    title: 'Кодекс',
    bullets: [
      'Кодекс — энциклопедия конкретных предметов, умений, модов и врагов, которых вы уже встретили.',
      'Открывается по ходу игры: купили предмет, применили умение, убили врага, прокачали мод.',
      'Справка объясняет общие правила; Кодекс — детали по каждой сущности.',
    ],
  },
  {
    id: 'about',
    title: 'О Gen',
    paragraphs: [
      'Gen — тактическая RPG: собираете отряд, ведёте expedition по цепочке сценариев, качаете умения и экипировку через Memento Mori. Прогресс сохраняется автоматически.',
    ],
  },
]

export const HELP_ARTICLES: readonly HelpArticle[] = HELP_ARTICLE_ORDER.map((id) => {
  const article = ARTICLES.find((a) => a.id === id)
  if (!article) throw new Error(`missing help article: ${id}`)
  return article
})

export function helpArticleById(id: HelpArticleId): HelpArticle {
  const article = HELP_ARTICLES.find((a) => a.id === id)
  if (!article) throw new Error(`unknown help article: ${id}`)
  return article
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/help/articles.test.ts`  
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/help/articles.ts src/game/help/articles.test.ts
git commit -m "feat(help): static help articles catalog"
```

---

### Task 2: UI-компонент `CampaignHelpTab`

**Files:**
- Create: `src/features/help/CampaignHelpTab.tsx`
- Create: `src/features/help/CampaignHelpTab.test.ts`

**Interfaces:**
- Consumes: `HELP_ARTICLES` from `src/game/help/articles.ts`
- Produces:
  ```ts
  export function CampaignHelpTab(): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/help/CampaignHelpTab.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HELP_ARTICLES } from '../../game/help/articles'
import { CampaignHelpTab } from './CampaignHelpTab'

describe('CampaignHelpTab', () => {
  it('renders all help sections including Memento Mori', () => {
    const html = renderToStaticMarkup(createElement(CampaignHelpTab))

    for (const article of HELP_ARTICLES) {
      expect(html).toContain(article.title)
    }
    expect(html).toContain('Memento Mori')
    expect(html).toContain('ant-collapse')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/help/CampaignHelpTab.test.ts`  
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CampaignHelpTab.tsx`**

Create `src/features/help/CampaignHelpTab.tsx`:

```tsx
import { Collapse, Typography } from 'antd'
import type { CollapseProps } from 'antd'
import { HELP_ARTICLES } from '../../game/help/articles'

const collapseItems: CollapseProps['items'] = HELP_ARTICLES.map((article) => ({
  key: article.id,
  label: article.title,
  children: (
    <>
      {article.paragraphs.map((paragraph) => (
        <Typography.Paragraph key={paragraph}>{paragraph}</Typography.Paragraph>
      ))}
      {article.bullets ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {article.bullets.map((bullet) => (
            <li key={bullet}>
              <Typography.Text>{bullet}</Typography.Text>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  ),
}))

export function CampaignHelpTab() {
  return (
    <Collapse
      size="small"
      defaultActiveKey={['memento']}
      items={collapseItems}
      role="tabpanel"
      aria-label="Справка"
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/help/CampaignHelpTab.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/help/CampaignHelpTab.tsx src/features/help/CampaignHelpTab.test.ts
git commit -m "feat(help): CampaignHelpTab collapse UI"
```

---

### Task 3: Вкладка в хабе (`CampaignHub` + `CampaignHubNav`)

**Files:**
- Modify: `src/features/campaign/campaignHubShared.ts`
- Modify: `src/features/campaign/CampaignHubNav.tsx`
- Modify: `src/features/campaign/CampaignHub.tsx`
- Modify: `src/features/campaign/CampaignHubNav.test.ts`

**Interfaces:**
- Consumes: `CampaignHelpTab` from `src/features/help/CampaignHelpTab.tsx`
- Produces: `CampaignHubTab` includes `'help'`; nav renders «Справка» last; hub shows help panel.

- [ ] **Step 1: Extend `CampaignHubTab`**

In `src/features/campaign/campaignHubShared.ts`, change:

```ts
export type CampaignHubTab = 'character' | 'battle' | 'shop' | 'codex' | 'tavern' | 'help'
```

- [ ] **Step 2: Update `CampaignHubNav.tsx`**

Add import:

```ts
import { QuestionCircleOutlined } from '@ant-design/icons'
```

Update constants:

```ts
const TAB_ORDER: CampaignHubTab[] = [
  'character',
  'battle',
  'shop',
  'tavern',
  'codex',
  'help',
]

const TAB_LABEL: Record<CampaignHubTab, string> = {
  character: 'Персонаж',
  battle: 'Бой',
  shop: 'Магазин',
  codex: 'Кодекс',
  tavern: 'Таверна',
  help: 'Справка',
}

const TAB_ICON: Record<CampaignHubTab, ReactNode> = {
  character: <UserOutlined aria-hidden />,
  battle: <PlayCircleOutlined aria-hidden />,
  shop: <ShoppingOutlined aria-hidden />,
  codex: <BookOutlined aria-hidden />,
  tavern: <CoffeeOutlined aria-hidden />,
  help: <QuestionCircleOutlined aria-hidden />,
}
```

Update `isTabDisabled` — help **никогда** не блокируется; при `tabsDisabled` блокируются все **кроме** help:

```ts
function isTabDisabled(
  tab: CampaignHubTab,
  codexDisabled: boolean,
  shopDisabled: boolean,
  tavernDisabled: boolean,
  tabsDisabled: boolean,
): boolean {
  if (tab === 'help') return false
  if (tabsDisabled) return true
  if (tab === 'codex') return codexDisabled
  if (tab === 'shop') return shopDisabled
  if (tab === 'tavern') return tavernDisabled
  return false
}
```

Pass `tabsDisabled` into `isTabDisabled` at the call site inside `CampaignHubNav` (prop already exists).

- [ ] **Step 3: Wire tab in `CampaignHub.tsx`**

Add import:

```ts
import { CampaignHelpTab } from '../help/CampaignHelpTab'
```

After codex block, add:

```tsx
{activeTab === 'help' ? <CampaignHelpTab /> : null}
```

- [ ] **Step 4: Extend nav tests**

Append to `src/features/campaign/CampaignHubNav.test.ts`:

```ts
  it('renders help tab label and icon', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'help',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: false,
        shopDisabled: false,
        tavernDisabled: false,
      }),
    )

    expect(html).toContain('Справка')
  })

  it('keeps help tab enabled when tabsDisabled is true', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignHubNav, {
        activeTab: 'battle',
        onTabChange: () => {},
        unreadCodexCount: 0,
        codexDisabled: true,
        shopDisabled: true,
        tavernDisabled: true,
        tabsDisabled: true,
      }),
    )

    const helpPos = html.indexOf('Справка')
    const helpSlice = html.slice(helpPos, helpPos + 200)
    expect(helpSlice).not.toContain('disabled')
  })
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/features/campaign/CampaignHubNav.test.ts src/features/help/`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/campaign/campaignHubShared.ts \
  src/features/campaign/CampaignHubNav.tsx \
  src/features/campaign/CampaignHub.tsx \
  src/features/campaign/CampaignHubNav.test.ts
git commit -m "feat(help): add Справка tab to campaign hub"
```

---

### Task 4: Доступ в бою и inter_battle (`CampaignBattleNav` + Drawer)

**Files:**
- Modify: `src/features/campaign/CampaignBattleNav.tsx`
- Create: `src/features/campaign/CampaignBattleNav.test.ts`

**Interfaces:**
- Consumes: `CampaignHelpTab`, `CampaignHubNav` with `tabsDisabled` + `onTabChange`
- Produces: клик «Справка» в battle context открывает `Drawer` с `CampaignHelpTab`.

- [ ] **Step 1: Write the failing test**

Create `src/features/campaign/CampaignBattleNav.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { CampaignBattleNav } from './CampaignBattleNav'

describe('CampaignBattleNav', () => {
  it('renders help section trigger in battle context nav', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignBattleNav, {
        campaign: {
          ...initialCampaignState(),
          // Достаточно non-null battle для inBattle; полный объект — через makeBattle из runReducer.test.ts
          battle: { units: [] } as import('../../game/types').BattleState,
        },
      }),
    )

    expect(html).toContain('Справка')
  })
})
```

Adjust `battle` stub fields if `initialCampaignState` battle shape differs — grep `BattleState` in `src/game/types.ts` and match required fields.

- [ ] **Step 2: Run test to verify it fails or passes partially**

Run: `npm run test -- src/features/campaign/CampaignBattleNav.test.ts`  
Fix battle stub until test runs (may already render «Справка» after Task 3).

- [ ] **Step 3: Implement Drawer in `CampaignBattleNav.tsx`**

```tsx
import { useState } from 'react'
import { Divider, Drawer, Space } from 'antd'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import type { CampaignState } from '../../game/types'
import { CampaignHelpTab } from '../help/CampaignHelpTab'
import { CampaignHubHud } from './CampaignHubHud'
import { CampaignHubNav } from './CampaignHubNav'

type CampaignBattleNavProps = {
  campaign: CampaignState
}

export function CampaignBattleNav({ campaign }: CampaignBattleNavProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const expeditionActive = campaign.expedition !== null
  const inBattle = campaign.battle !== null

  return (
    <>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <CampaignHubHud campaign={campaign} />
        <Divider style={{ margin: '4px 0 8px' }} />
        <CampaignHubNav
          activeTab="battle"
          onTabChange={(tab) => {
            if (tab === 'help') setHelpOpen(true)
          }}
          unreadCodexCount={unreadCodexEntryIds(campaign).length}
          codexDisabled={inBattle}
          shopDisabled={expeditionActive}
          tavernDisabled={expeditionActive}
          battleTabHighlighted
          tabsDisabled
        />
      </Space>

      <Drawer
        title="Справка"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        size="large"
        destroyOnHidden
      >
        <CampaignHelpTab />
      </Drawer>
    </>
  )
}
```

- [ ] **Step 4: Run full test suite**

Run: `npm run test`  
Expected: PASS.

- [ ] **Step 5: Manual smoke**

Run: `npm run start`  
Checklist:
- Хаб → вкладка «Справка» → Memento Mori раскрыта, 8 секций.
- Начать бой → «Справка» кликабельна (остальные вкладки disabled) → Drawer с тем же текстом.
- Inter_battle (после победы в цепочке) — то же поведение Drawer.

- [ ] **Step 6: Commit**

```bash
git add src/features/campaign/CampaignBattleNav.tsx \
  src/features/campaign/CampaignBattleNav.test.ts
git commit -m "feat(help): open help drawer during battle and inter_battle"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| 6-я вкладка «Справка» | Task 3 |
| Всегда доступна (бой / expedition) | Task 3 (`isTabDisabled`), Task 4 (Drawer) |
| Memento Mori первой, default open | Task 1 content order, Task 2 `defaultActiveKey` |
| Игровой язык, без формул | Task 1 texts |
| `Collapse` small | Task 2 |
| `QuestionCircleOutlined` | Task 3 |
| Отличие от Кодекса в тексте | Task 1 `codex` article |
| Нет поиска / персистентности | — (не реализуем) |
| Unit tests articles | Task 1 |
| Component smoke | Task 2 |
| Manual battle access | Task 4 step 5 |

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-help-section.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
