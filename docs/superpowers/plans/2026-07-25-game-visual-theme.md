# Game Visual Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Тёплый фон viewport, off-white панели и шрифты Golos Text + PT Serif по spec A+C без смены боевой семантики цветов.

**Architecture:** CSS variables и фон страницы в `src/styles/game-theme.css`; Ant Design через `ConfigProvider` и `src/theme/antdGameTheme.ts`; layout/inventory ссылаются на `--game-*`; Google Fonts в `index.html`.

**Tech Stack:** React 19, Ant Design 6, Vite 8, TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-25-game-visual-theme-design.md`

## Global Constraints

- UI font: **Golos Text** (400, 500, 600); display: **PT Serif** (600, 700) только на `.game-header__brand`, `.game-panel__title`, `.game-mode-section__title`.
- Viewport gradient: `--game-bg-top` `#e8dcc4`, `--game-bg-bottom` `#d4c4a8`, vignette `rgba(60, 48, 32, 0.22)`; текст на фоне body не размещать.
- Panels: `--game-panel-bg` `#fffdf8`, `--game-panel-border` `#e8dcc8`, muted `#7a6f5c` (fallback `#6b6355` если контраст fail).
- **Не менять** hero/enemy battle colors (`#e6f4ff`, `#fff1f0`, `#1677ff`).
- Noise: переменная `--game-noise-opacity` (default **0**); включение 0.05–0.08 только после ручной проверки.
- `prefers-reduced-motion: reduce` → `--game-noise-opacity: 0`.
- Без новых npm-зависимостей; шрифты через Google Fonts `<link>`.
- `maxWidth: 1280`, `padding: 8` на оболочке приложения — сохранить.

---

## File map

| File | Action |
|------|--------|
| `src/styles/game-theme.css` | Create — `:root` tokens, `body` background, `.game-app-shell`, noise layer, display font vars |
| `src/theme/antdGameTheme.ts` | Create — `ThemeConfig` for Ant Design |
| `src/theme/antdGameTheme.test.ts` | Create — Vitest |
| `index.html` | Modify — preconnect + font links |
| `src/main.tsx` | Modify — import `game-theme.css` |
| `src/App.tsx` | Modify — `ConfigProvider`, `game-app-shell` wrapper |
| `src/features/layout/game-layout.css` | Modify — CSS vars, serif titles, warm borders |
| `src/features/inventory/inventory.css` | Modify — neutral cell backgrounds only |

---

### Task 1: Global CSS theme tokens and viewport background

**Files:**
- Create: `src/styles/game-theme.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: CSS variables `--game-*` on `:root`; class `.game-app-shell` for optional shadow; `body` styled background.

- [ ] **Step 1: Create `src/styles/game-theme.css`**

```css
:root {
  --game-bg-top: #e8dcc4;
  --game-bg-bottom: #d4c4a8;
  --game-vignette: rgba(60, 48, 32, 0.22);
  --game-panel-bg: #fffdf8;
  --game-panel-border: #e8dcc8;
  --game-text-muted: #7a6f5c;
  --game-surface-muted: #f5f0e8;
  --game-surface-muted-2: #faf6ef;
  --game-font-ui: 'Golos Text', system-ui, -apple-system, sans-serif;
  --game-font-display: 'PT Serif', Georgia, 'Times New Roman', serif;
  /* Set to 0.06 after manual browser check if desired */
  --game-noise-opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --game-noise-opacity: 0;
  }
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  min-height: 100vh;
  font-family: var(--game-font-ui);
  background: linear-gradient(160deg, var(--game-bg-top), var(--game-bg-bottom));
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    var(--game-vignette) 100%
  );
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: var(--game-noise-opacity);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

#root {
  position: relative;
  z-index: 1;
}

.game-app-shell {
  box-shadow: 0 4px 24px rgba(60, 48, 32, 0.12);
  border-radius: 8px;
}
```

- [ ] **Step 2: Import CSS in `src/main.tsx`**

Add as first side-effect import (before `App`):

```ts
import "./styles/game-theme.css";
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS (no TS errors)

- [ ] **Step 4: Commit**

```bash
git add src/styles/game-theme.css src/main.tsx
git commit -m "feat(ui): add global game theme CSS tokens and viewport background"
```

---

### Task 2: Ant Design theme config

**Files:**
- Create: `src/theme/antdGameTheme.ts`
- Create: `src/theme/antdGameTheme.test.ts`

**Interfaces:**
- Produces: `export const antdGameTheme: ThemeConfig` with `token.fontFamily` and `token.colorBgContainer`.

- [ ] **Step 1: Write the failing test**

```ts
// src/theme/antdGameTheme.test.ts
import { describe, expect, it } from 'vitest'
import { antdGameTheme } from './antdGameTheme'

describe('antdGameTheme', () => {
  it('uses Golos Text and warm panel background', () => {
    expect(antdGameTheme.token?.fontFamily).toContain('Golos Text')
    expect(antdGameTheme.token?.colorBgContainer).toBe('#fffdf8')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/theme/antdGameTheme.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/theme/antdGameTheme.ts`**

```ts
import type { ThemeConfig } from 'antd'

export const antdGameTheme: ThemeConfig = {
  token: {
    fontFamily: "'Golos Text', system-ui, -apple-system, sans-serif",
    colorBgContainer: '#fffdf8',
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/theme/antdGameTheme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme/antdGameTheme.ts src/theme/antdGameTheme.test.ts
git commit -m "feat(ui): add Ant Design game theme tokens"
```

---

### Task 3: Fonts and App shell wiring

**Files:**
- Modify: `index.html`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `antdGameTheme` from `./theme/antdGameTheme`
- Produces: `ConfigProvider` wrapping app; inner div with classes `game-app-shell` + existing inline styles.

- [ ] **Step 1: Add font links to `index.html` inside `<head>`**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=PT+Serif:wght@600;700&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: Update `src/App.tsx`**

```tsx
import { Analytics } from '@vercel/analytics/react'
import { App as AntdApp, ConfigProvider, Space } from 'antd'
import { BattleScreen } from './features/battle/BattleScreen'
import { CampaignBattleNav } from './features/campaign/CampaignBattleNav'
import { CampaignHub } from './features/campaign/CampaignHub'
import { InterBattleScreen } from './features/campaign/InterBattleScreen'
import { useGameStore } from './store/gameStore'
import { antdGameTheme } from './theme/antdGameTheme'

// AppContent unchanged ...

function App() {
  return (
    <ConfigProvider theme={antdGameTheme}>
      <AntdApp>
        <div
          className="game-app-shell"
          style={{ maxWidth: 1280, margin: '0 auto', padding: 8 }}
        >
          <AppContent />
        </div>
        <Analytics />
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
```

Note: keep `AppContent` function body exactly as before this task.

- [ ] **Step 3: Run build and lint**

Run: `npm run build && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add index.html src/App.tsx
git commit -m "feat(ui): wire Google Fonts and ConfigProvider game theme"
```

---

### Task 4: Layout CSS — panels, tiles, display typography

**Files:**
- Modify: `src/features/layout/game-layout.css`

**Interfaces:**
- Consumes: `--game-panel-bg`, `--game-panel-border`, `--game-text-muted`, `--game-font-display` from `:root`.

- [ ] **Step 1: Replace neutral hardcoded colors in layout primitives**

In `.game-panel`:

```css
  background: var(--game-panel-bg);
  border: 1px solid var(--game-panel-border);
```

In `.game-panel__title`:

```css
  font-family: var(--game-font-display);
```

In `.game-battle-field-scroll` border:

```css
  border: 1px solid var(--game-panel-border);
```

In `.game-mode-section__title`:

```css
  color: var(--game-text-muted);
  font-family: var(--game-font-display);
```

In `.game-mode-tile`:

```css
  border: 1px solid var(--game-panel-border);
  background: var(--game-panel-bg);
```

In `.game-mode-section--soon .game-mode-tile`:

```css
  background: var(--game-surface-muted-2);
```

In `.game-header__brand`:

```css
  font-family: var(--game-font-display);
  font-weight: 700;
```

- [ ] **Step 2: Visual smoke check**

Run: `npm run start` (if not running), open hub in browser.
Expected: warm page background outside shell; brand and panel titles in serif; panels off-white.

- [ ] **Step 3: Commit**

```bash
git add src/features/layout/game-layout.css
git commit -m "feat(ui): apply game theme tokens to layout CSS"
```

---

### Task 5: Inventory neutral surfaces (warm grays only)

**Files:**
- Modify: `src/features/inventory/inventory.css`

**Interfaces:**
- Consumes: `--game-surface-muted`, `--game-surface-muted-2`, `--game-panel-border` where applicable.

- [ ] **Step 1: Update neutral backgrounds only**

Replace (do **not** change `.inv-cell--selected`, compare, sell highlight blues/reds):

| Selector | Old | New |
|----------|-----|-----|
| `.inv-cell` `background` | `#f5f5f5` | `var(--game-surface-muted)` |
| `.inv-cell--empty` `background` | `#fafafa` | `var(--game-surface-muted-2)` |
| `.inv-cell--empty:hover` or similar neutral `#f0f0f0` if present for empty state | `#f0f0f0` | `var(--game-panel-border)` |

Leave `#e6f4ff`, `#fff1f0`, `#1677ff` semantic rules untouched.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/inventory/inventory.css
git commit -m "feat(ui): warm neutral inventory cell backgrounds"
```

---

### Task 6: Verification and optional noise toggle

**Files:**
- None (manual + full test suite)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: all PASS

- [ ] **Step 2: Manual checklist (spec §6)**

1. Campaign hub — фон за колонкой, serif в brand/заголовках панелей.
2. Battle — StatStrip 9px и лог 12px читаемы.
3. Viewport width &lt;520px — нет лишнего horizontal scroll.
4. Optionally set `--game-noise-opacity: 0.06` in `:root` locally, compare; revert to `0` unless user prefers on.

- [ ] **Step 3: Contrast check**

In DevTools, verify `#7a6f5c` on `#fffdf8`; if ratio &lt; 4.5:1 for small text, set `--game-text-muted: #6b6355` in `game-theme.css` and commit fix.

- [ ] **Step 4: Final commit (only if contrast fix or noise default changed)**

```bash
git add src/styles/game-theme.css
git commit -m "fix(ui): adjust muted text contrast for game panels"
```

(Skip commit if no file changes.)

---

## Plan self-review (spec coverage)

| Spec section | Task |
|--------------|------|
| §2.1 viewport gradient + vignette | Task 1 |
| §2.2 optional noise | Task 1 (default 0), Task 6 |
| §2.3 app shell shadow | Task 1 + Task 3 |
| §2.4 panel colors | Tasks 1, 2, 4 |
| §3 fonts | Tasks 2, 3, 4 |
| §4 architecture files | Tasks 1–5 |
| §5 a11y reduced motion | Task 1 |
| §6 manual QA | Task 6 |
