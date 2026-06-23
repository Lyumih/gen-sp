# Content, Tags & Classes Codex — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Наполнить каталоги 24 умений и 24 предметов, ввести SemanticEmoji и таксономию тегов, добавить категорию «Классы» в Кодекс с discovery при найме.

**Architecture:** Расширение существующих TS-каталогов (`characterClasses`, `cardTemplates`, `itemTemplates`, `modTemplates`); новые `semanticEmoji.ts` + `tagTaxonomy.ts`; реестр Кодекса + `classText`; UI через `SemanticEmojiIcon` и теги в `CodexEntryCard`. Новые `kind` умений — в каталоге с `enabled: false` до фазы 2 боевого движка.

**Tech Stack:** TypeScript strict (`tsconfig.app.json`), Vitest (`npm run test`), Vite 8, React 19, Ant Design 6, Zustand 5, React Compiler.

**Spec:** `docs/superpowers/specs/2026-06-23-content-tags-classes-design.md`

## Global Constraints

- Умения: **универсальный пул**; `recommendedCardIds` на классе — справочно, не эксклюзив
- Предметы: любой класс может носить любой предмет
- Класс в Кодексе: discovery при **найме** + `class:warrior` при старте + миграция roster при загрузке
- Страница класса: **теги + primary/secondary статы** (без UI рекомендуемых карт/предметов в v1)
- `SemanticEmoji`: `base` + `IconAccentId`; рендер через `accentStyle` из `iconCatalog.ts`
- Carrier tags на шаблонах — явное поле `tags`; `resolveCarrierTags` — fallback на вывод из `kind`/`slot`
- Новые умения с `kind` ∉ {`melee`,`ranged`,`aoe`,`heal`} → `enabled: false`
- SAVE_VERSION **без изменения**; миграция только discover классов из roster
- Не добавлять npm-зависимости; `App.useApp().message`; emoji из `labels.ts` / `semanticEmoji.ts`; AGENTS.md для StatStrip/tooltip
- Бюджетные предметы `wooden_sword`, `leather_armor`, `copper_ring` **сохранить**

## Execution Phases

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| **A — Foundation** | 1–2 | SemanticEmoji + tagTaxonomy + icon component |
| **B — Content catalogs** | 3–5 | Карты, предметы, фаза-2 моды |
| **C — Class data** | 6 | Расширенные `CharacterClassTemplate` (8 классов) |
| **D — Tags pipeline** | 7 | `resolveCarrierTags` + explicit tags |
| **E — Codex backend** | 8–10 | Registry, classText, discovery, migrate |
| **F — Codex UI** | 11–12 | Категория «Классы», теги на записях, SemanticEmoji |
| **G — Polish** | 13–14 | Справка, gearPool, интеграционные тесты |

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/game/ui/semanticEmoji.ts` | Каталог `SEMANTIC_EMOJIS`, `getSemanticEmoji(id)` |
| `src/game/ui/semanticEmoji.test.ts` | id lookup, accent ids valid |
| `src/game/content/tagTaxonomy.ts` | `TAG_DEFINITIONS`, `tagLabelRu(id)`, `tagGroup(id)` |
| `src/game/content/tagTaxonomy.test.ts` | все class tags имеют определения |
| `src/game/content/characterClasses.ts` | tags, recommended*, descriptionRu, semanticEmojiId, gearPool |
| `src/game/content/cardTemplates.ts` | 24 умения + tags + semanticEmojiId + enabled |
| `src/game/content/itemTemplates.ts` | 27 предметов (24+3 бюджетных) + tags + modAffinity |
| `src/game/content/modTemplates.ts` | +5 фаза-2 модов |
| `src/game/mods/carrierTags.ts` | читать `template.tags` если есть |
| `src/game/codex/registry.ts` | категория `class` |
| `src/game/descriptions/classText.ts` | `describeClassCodex(classId)` |
| `src/game/codex/codexText.ts` | ветка `class`, теги в item/card/mod |
| `src/game/codex/discovery.ts` | без изменений API |
| `src/game/campaign/runReducer.ts` | discover class on hire + initial warrior |
| `src/game/persistence/migrate.ts` | `discoverClassesFromRoster` |
| `src/features/codex/SemanticEmojiIcon.tsx` | рендер base+accent |
| `src/features/codex/codexShared.ts` | category order + labels + empty hint |
| `src/features/codex/CodexEntryCard.tsx` | SemanticEmojiIcon, class tags UI |
| `src/game/help/articles.ts` | статья `content-tags` |

---

### Task 1: SemanticEmoji catalog

**Files:**
- Create: `src/game/ui/semanticEmoji.ts`
- Create: `src/game/ui/semanticEmoji.test.ts`

**Interfaces:**
- Produces:
  ```ts
  import type { IconAccentId } from '../types'

  export type SemanticEmoji = {
    id: string
    base: string
    accent: IconAccentId
    labelRu: string
    themeTag?: string
  }

  export const SEMANTIC_EMOJI_IDS: readonly string[]
  export function getSemanticEmoji(id: string): SemanticEmoji | undefined
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/game/ui/semanticEmoji.test.ts
import { describe, expect, it } from 'vitest'
import { getSemanticEmoji, SEMANTIC_EMOJI_IDS } from './semanticEmoji'
import { ICON_ACCENT_IDS } from '../character/iconCatalog'

describe('semanticEmoji', () => {
  it('includes heart-heal and heart-blue regen', () => {
    expect(getSemanticEmoji('heart-heal')?.accent).toBe('red')
    expect(getSemanticEmoji('heart-blue')?.accent).toBe('blue')
    expect(getSemanticEmoji('heart-heal')?.base).toBe(getSemanticEmoji('heart-blue')?.base)
  })

  it('every entry uses a valid IconAccentId', () => {
    for (const id of SEMANTIC_EMOJI_IDS) {
      const entry = getSemanticEmoji(id)
      expect(entry).toBeDefined()
      expect(ICON_ACCENT_IDS).toContain(entry!.accent)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/ui/semanticEmoji.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement catalog**

Добавить все id из spec §4.2 и §5.4/§6.2 (минимум):  
`heart-heal`, `heart-blue`, `heart-gold`, `drop-green`, `skull-green`, `skull-purple`, `shield-gray`, `shield-gold`, `sword-red`, `sword-gold`, `spark-gold`, `spark-purple`, `fire-red`, `frost-blue`, `bow-default`, `bow-teal`, `trap-gray`, `smoke-gray`, `horn-gold`, `dagger-purple`, `orb-purple`, `orb-blue`, `heal-red`, `heal-blue`, `ring-gold`, `target-teal`, `target-purple`, `robe-purple`, `gi-teal`, `mask-gray`, `moon-purple`, `axe-red`, `blood-red`, `vampire-purple`.

```ts
// src/game/ui/semanticEmoji.ts
import type { IconAccentId } from '../types'
import { UI_HEART, UI_HEAL, UI_MAGIC, UI_ATTACK } from './labels'

export type SemanticEmoji = {
  id: string
  base: string
  accent: IconAccentId
  labelRu: string
  themeTag?: string
}

const ENTRIES: SemanticEmoji[] = [
  { id: 'heart-heal', base: UI_HEART, accent: 'red', labelRu: 'Исцеление', themeTag: 'heal' },
  { id: 'heart-blue', base: UI_HEART, accent: 'blue', labelRu: 'Регенерация', themeTag: 'regen' },
  { id: 'heart-gold', base: UI_HEART, accent: 'gold', labelRu: 'Святое исцеление', themeTag: 'holy' },
  { id: 'drop-green', base: '💧', accent: 'green', labelRu: 'Яд', themeTag: 'poison' },
  // ...остальные из списка выше
]

const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]))

export const SEMANTIC_EMOJI_IDS: readonly string[] = ENTRIES.map((e) => e.id)

export function getSemanticEmoji(id: string): SemanticEmoji | undefined {
  return BY_ID.get(id)
}
```

- [ ] **Step 4: Run test — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/ui/semanticEmoji.ts src/game/ui/semanticEmoji.test.ts
git commit -m "feat(ui): add SemanticEmoji catalog for content icons"
```

---

### Task 2: Tag taxonomy

**Files:**
- Create: `src/game/content/tagTaxonomy.ts`
- Create: `src/game/content/tagTaxonomy.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TagGroup = 'carrier' | 'theme'

  export function tagLabelRu(tagId: string): string
  export function tagGroup(tagId: string): TagGroup
  export function allTagIds(): readonly string[]
  ```

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest'
import { tagGroup, tagLabelRu } from './tagTaxonomy'

const CLASS_TAGS = [
  'melee', 'attack', 'armor', 'tank', 'defense', 'ranged', 'aoe', 'skill',
  'magic', 'mobility', 'crit', 'heal', 'support', 'regen', 'resurrect',
  'holy', 'poison', 'dark', 'dot', 'lifesteal',
] as const

describe('tagTaxonomy', () => {
  it('labels carrier tags in Russian', () => {
    expect(tagLabelRu('melee')).toBe('Ближний бой')
    expect(tagGroup('melee')).toBe('carrier')
  })

  it('every class tag from spec has a definition', () => {
    for (const tag of CLASS_TAGS) {
      expect(tagLabelRu(tag)).not.toBe(tag)
    }
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement** — все carrier + theme теги из spec §3.1–3.2

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** — `feat(content): add tag taxonomy for codex and classes`

---

### Task 3: Card catalog (24 templates)

**Files:**
- Modify: `src/game/content/cardTemplates.ts`
- Create: `src/game/content/cardTemplates.test.ts`

**Interfaces:**
- Produces: `CardAttackTemplate` with `tags`, `semanticEmojiId`, `enabled?`, extended `kind` union

- [ ] **Step 1: Extend type**

```ts
export type CardKind =
  | 'melee' | 'ranged' | 'aoe' | 'heal'
  | 'regen' | 'resurrect' | 'buff' | 'debuff' | 'dot' | 'lifesteal_spell' | 'utility'

export type CardAttackTemplate = {
  label: string
  kind: CardKind
  maxRange: number
  aoeSize?: number
  damageToken?: string
  fallbackDamage?: number
  healToken?: string
  fallbackHeal?: number
  cooldownTurns?: number
  tags: readonly string[]
  semanticEmojiId: string
  enabled?: boolean
  /** @deprecated use semanticEmojiId */
  emoji?: string
}
```

- [ ] **Step 2: Migrate existing 3 cards** — add `tags`, `semanticEmojiId`; `fireball` → `fire-red`, `heal` → `heart-heal`

- [ ] **Step 3: Add 21 new templates** from spec §5.4 — full rows with `enabled: false` для non-MVP kinds

- [ ] **Step 4: Test unique ids and enabled flags**

```ts
it('phase-2 kinds are disabled', () => {
  expect(CARD_ATTACK_TEMPLATES.regeneration.enabled).toBe(false)
  expect(CARD_ATTACK_TEMPLATES.fireball.enabled).not.toBe(false)
})
```

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit** — `feat(content): add 24-skill card catalog with tags`

---

### Task 4: Item catalog (27 templates)

**Files:**
- Modify: `src/game/content/itemTemplates.ts`
- Modify: `src/game/content/itemTemplates.test.ts` (create if missing)

- [ ] **Step 1: Extend `ItemTemplate`** with `tags`, `semanticEmojiId`, `modAffinity?`

- [ ] **Step 2: Add tags to budget items**

```ts
wooden_sword: {
  // ...
  tags: ['weapon', 'attack', 'melee'],
  semanticEmojiId: 'sword-red',
},
```

- [ ] **Step 3: Add 24 archetype items** from spec §6.2

- [ ] **Step 4: Test** — 27 keys, each has `semanticEmojiId` resolving via `getSemanticEmoji`

- [ ] **Step 5: Commit** — `feat(content): add class archetype item catalog`

---

### Task 5: Phase-2 mod templates

**Files:**
- Modify: `src/game/content/modTemplates.ts`
- Modify: `src/game/content/modTemplates.test.ts`

- [ ] **Step 1: Add to `SPEC_MOD_IDS`:** `mod-poison-up`, `mod-regen-up`, `mod-buff-duration`, `mod-resurrect-hp`, `mod-debuff-range`

- [ ] **Step 2: Add templates** per spec §5.6 with `enabled: false` and placeholder ops matching future kinds

- [ ] **Step 3: Test** — `filterModsForCarrier` still excludes disabled mods from `MOD_OFFER_POOL`

- [ ] **Step 4: Commit** — `feat(mods): add phase-2 mod templates for new skill tags`

---

### Task 6: Extend character classes

**Files:**
- Modify: `src/game/content/characterClasses.ts`
- Modify: `src/game/content/characterClasses.test.ts`

**Interfaces:**
- Produces: `CharacterClassTemplate` with `tags`, `recommendedCardIds`, `recommendedItemIds`, `descriptionRu`, `semanticEmojiId`
- Consumes: card/item ids from Tasks 3–4

- [ ] **Step 1: Extend type and add warrior (reference implementation)**

```ts
export type CharacterClassTemplate = {
  id: string
  label: string
  hirePrice: number
  gearPool: { slot: EquipmentSlot; templateId: string; weight: number }[]
  tags: readonly string[]
  recommendedCardIds: readonly string[]
  recommendedItemIds: readonly string[]
  descriptionRu: string
  semanticEmojiId: string
}

// warrior example:
warrior: {
  id: 'warrior',
  label: 'Воин',
  hirePrice: 25,
  gearPool: [
    { slot: 'weapon', templateId: 'warrior_blade', weight: 3 },
    { slot: 'armor', templateId: 'warrior_plate', weight: 2 },
    { slot: 'accessory', templateId: 'warrior_signet', weight: 1 },
  ],
  tags: ['melee', 'attack', 'armor', 'tank', 'defense'],
  recommendedCardIds: ['shield_bash', 'cleave', 'battle_cry'],
  recommendedItemIds: ['warrior_blade', 'warrior_plate', 'warrior_signet'],
  descriptionRu: 'Передовой боец. Высокая живучесть и защита.',
  semanticEmojiId: 'sword-red',
},
```

- [ ] **Step 2: Add remaining 7 classes** per spec §7 table

- [ ] **Step 3: Test — recommended ids resolve**

```ts
import { CARD_ATTACK_TEMPLATES } from './cardTemplates'
import { ITEM_TEMPLATES } from './itemTemplates'

for (const cls of Object.values(CHARACTER_CLASSES)) {
  for (const cardId of cls.recommendedCardIds) {
    expect(CARD_ATTACK_TEMPLATES[cardId], `${cls.id} card ${cardId}`).toBeDefined()
  }
  for (const itemId of cls.recommendedItemIds) {
    expect(ITEM_TEMPLATES[itemId], `${cls.id} item ${itemId}`).toBeDefined()
  }
}
```

- [ ] **Step 4: Run** `npm run test -- src/game/content/characterClasses.test.ts`

- [ ] **Step 5: Commit** — `feat(content): extend character classes with tags and recommendations`

---

### Task 7: Explicit carrier tags

**Files:**
- Modify: `src/game/mods/carrierTags.ts`
- Modify: `src/game/mods/carrierTags.test.ts`

- [ ] **Step 1: Failing test for ranger_bow**

```ts
it('ranger_bow uses explicit ranged tag from template', () => {
  expect(resolveCarrierTags('item', 'ranger_bow')).toContain('ranged')
  expect(resolveCarrierTags('item', 'ranger_bow')).not.toContain('melee')
})
```

- [ ] **Step 2: Implement**

```ts
if (item.tags && item.tags.length > 0) {
  const carrier = item.tags.filter((t) => CARRIER_TAG_IDS.has(t))
  if (carrier.length > 0) return [...new Set(carrier)]
}
// existing fallback...
```

Аналогично для `card`: если `tmpl.tags.length > 0`, вернуть union carrier tags + always `skill` if not strike.

- [ ] **Step 3: Run** `npm run test -- src/game/mods/carrierTags.test.ts`

- [ ] **Step 4: Commit** — `feat(mods): resolve carrier tags from template fields`

---

### Task 8: Codex registry — class category

**Files:**
- Modify: `src/game/codex/registry.ts`
- Modify: `src/game/codex/registry.test.ts`

- [ ] **Step 1: Failing test**

```ts
it('includes 8 class entries', () => {
  const classes = codexEntriesByCategory('class')
  expect(classes).toHaveLength(8)
  expect(classes.map((e) => e.id).sort()).toEqual(
    ['berserker','healer','mage','paladin','ranger','rogue','warlock','warrior']
      .map((id) => codexEntryId('class', id))
      .sort(),
  )
})
```

- [ ] **Step 2: Extend `CodexCategory`**, map `CHARACTER_CLASSES` to entries using `semanticEmojiId` → `getSemanticEmoji` for display emoji fallback

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit** — `feat(codex): register character classes`

---

### Task 9: classText + codexText

**Files:**
- Create: `src/game/descriptions/classText.ts`
- Create: `src/game/descriptions/classText.test.ts`
- Modify: `src/game/codex/codexText.ts`

**Interfaces:**
- Produces:
  ```ts
  export function describeClassCodex(classId: string): {
    label: string
    summaryLines: string[]
    detailLines: string[]
    tagIds: readonly string[]
  }
  ```

- [ ] **Step 1: Test warrior output**

```ts
import { describeClassCodex } from './classText'

it('warrior codex shows tags and primary stats', () => {
  const d = describeClassCodex('warrior')
  expect(d.summaryLines.join(' ')).toMatch(/melee|Ближний/)
  expect(d.summaryLines.join(' ')).toMatch(/Primary/)
  expect(d.summaryLines.join(' ')).toMatch(/❤️|Здоровье/)
})
```

- [ ] **Step 2: Implement** — tags via `tagLabelRu`, primary/secondary via `CLASS_STAT_AFFINITY` + `BASE_STAT_META`

- [ ] **Step 3: Extend `describeCodexEntry`** — case `'class'`; for item/card/mod append tag line to `summaryLines`

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** — `feat(codex): class descriptions and content tags in entries`

---

### Task 10: Discovery + migration

**Files:**
- Modify: `src/game/campaign/runReducer.ts`
- Modify: `src/game/persistence/migrate.ts`
- Modify: `src/game/codex/discovery.test.ts`
- Modify: `src/game/campaign/runReducer.test.ts`

- [ ] **Step 1: Test hire discovers class**

```ts
it('HIRE_TAVERN_CANDIDATE discovers class in codex', () => {
  // setup candidate mage, enough gold, dispatch HIRE_TAVERN_CANDIDATE
  expect(state.codexDiscovered).toContain(codexEntryId('class', 'mage'))
})
```

- [ ] **Step 2: `initialCampaignState`** — `codexDiscovered: [codexEntryId('class', 'warrior')]`

- [ ] **Step 3: `HIRE_TAVERN_CANDIDATE`** — `withCodexDiscoveries(state, [codexEntryId('class', candidate.classId)])`

- [ ] **Step 4: `migrate.ts`** — `discoverClassesFromRoster(campaign): CampaignState` идемпотентно по `characters[].classId`

- [ ] **Step 5: Run** `npm run test -- src/game/codex/discovery.test.ts src/game/campaign/runReducer.test.ts src/game/persistence/migrate.test.ts`

- [ ] **Step 6: Commit** — `feat(codex): discover classes on hire and roster migrate`

---

### Task 11: SemanticEmojiIcon + Codex UI

**Files:**
- Create: `src/features/codex/SemanticEmojiIcon.tsx`
- Modify: `src/features/codex/codexShared.ts`
- Modify: `src/features/codex/CodexEntryCard.tsx`
- Modify: `src/features/codex/CampaignCodexTab.tsx` (default category → `'class'`)

- [ ] **Step 1: SemanticEmojiIcon**

```tsx
import { accentStyle } from '../../game/character/iconCatalog'
import { getSemanticEmoji } from '../../game/ui/semanticEmoji'

export function SemanticEmojiIcon({ id, fallback = '📘' }: { id?: string; fallback?: string }) {
  const sem = id ? getSemanticEmoji(id) : undefined
  const emoji = sem?.base ?? fallback
  const style = sem ? accentStyle(sem.accent) : undefined
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        padding: '0 4px',
        borderRadius: 4,
        border: style ? `1px solid ${style.borderColor}` : undefined,
        background: style?.background,
      }}
    >
      {emoji}
    </span>
  )
}
```

- [ ] **Step 2: codexShared** — add `class` first in `CODEX_CATEGORY_ORDER`, label `Классы`, hint `Нанимите героя этого класса в таверне.`

- [ ] **Step 3: CodexEntryCard** — use `SemanticEmojiIcon` when entry has semantic id (extend `CodexEntry` with optional `semanticEmojiId` from registry); for `class` category render tag chips: carrier=blue, theme=purple via `tagGroup`

- [ ] **Step 4: Manual** — dev server → Кодекс → Классы → warrior visible on new game

- [ ] **Step 5: Commit** — `feat(codex): class tab and SemanticEmojiIcon`

---

### Task 12: Help article

**Files:**
- Modify: `src/game/help/articles.ts`
- Modify: `src/game/help/articles.test.ts` (if exists)

- [ ] **Step 1: Add `content-tags` to `HelpArticleId` and `HELP_ARTICLE_ORDER`** (after `codex`)

- [ ] **Step 2: Article body** — carrier vs theme tags; SemanticEmoji accent legend from spec §4.2

- [ ] **Step 3: Run** `npm run test -- src/game/help`

- [ ] **Step 4: Commit** — `docs(help): content tags and semantic emoji article`

---

### Task 13: Integration verification

**Files:**
- Modify: `src/game/codex/registry.test.ts`
- Modify: `src/features/campaign/CampaignHubNav.test.ts` (if codex categories affect nav — optional)

- [ ] **Step 1: Registry totals**

```ts
it('catalog sizes match spec', () => {
  expect(codexEntriesByCategory('class')).toHaveLength(8)
  expect(codexEntriesByCategory('card').length).toBeGreaterThanOrEqual(24)
  expect(codexEntriesByCategory('item').length).toBeGreaterThanOrEqual(27)
})
```

- [ ] **Step 2: Full test suite**

Run: `npm run test`  
Expected: all PASS

- [ ] **Step 3: Build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Commit** — `test: content catalog and codex class integration`

---

## Self-Review (plan vs spec)

| Spec section | Task |
|--------------|------|
| §3 Tags | 2, 7, 9, 11 |
| §4 SemanticEmoji | 1, 11 |
| §5 Cards + phase-2 kinds | 3, 5 |
| §6 Items | 4 |
| §7 Class recommendations | 6 |
| §8 Codex | 8–11 |
| §9 Migration | 10 |
| §10 Tests | all tasks |
| §11 Out of scope | not in plan (PNG, combat ops, recommended UI on class card) |

No TBD placeholders in plan steps.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-content-tags-classes.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
