# Gen — визуальная тема: фон и типографика (A + C)

**Дата:** 2026-07-25  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-06-24-mvp-ui-layout-design.md`, `AGENTS.md`, `src/App.tsx`, `src/features/layout/game-layout.css`

---

## 1. Цель

Сделать интерфейс **ближе к browser-RPG**, не ломая компактную тактическую вёрстку MVP:

- **A (светлое фэнтези):** тёплый «стол / пергамент» вокруг игровой области, serif в акцентах «кодекс / кампания».
- **C (чистая тактика):** светлые панели, sans для плотного UI (статы, лог, инвентарь, Ant Design).

**Вне scope:** тёмная тема, pixel-шрифты, отдельные темы для боя vs хаба, редизайн компонентов Ant Design beyond tokens + CSS variables.

---

## 2. Цвета и фон

### 2.1. Viewport (`body`)

| Token | Значение | Назначение |
|-------|----------|------------|
| `--game-bg-top` | `#e8dcc4` | верх градиента |
| `--game-bg-bottom` | `#d4c4a8` | низ градиента |
| `--game-vignette` | `rgba(60, 48, 32, 0.22)` | затемнение по краям (radial) |

**Реализация:** `min-height: 100vh` на `body`, линейный градиент 160deg + псевдоэлемент или второй слой с `radial-gradient(ellipse at center, transparent 40%, var(--game-vignette) 100%)`. Текст на этом фоне **не размещается** — только фон страницы.

### 2.2. Опциональный noise (включить после просмотра в браузере)

- Seamless tile или CSS `filter` / SVG noise, **opacity 5–8%**, только на слое фона viewport.
- Если зернистость утомляет или режет производительность на слабых GPU — отключить одним флагом (класс `body` или переменная `--game-noise-opacity: 0`).

### 2.3. Игровая колонка (1280px)

- Без полноэкранной текстуры пергамента под контентом.
- Опционально: `box-shadow: 0 4px 24px rgba(60, 48, 32, 0.12)` на обёртке приложения — «лист на столе» (лёгкий, не Card Ant).

### 2.4. Панели и рамки

| Token | Было | Стало |
|-------|------|-------|
| Panel fill | `#fff` | `#fffdf8` (`--game-panel-bg`) |
| Panel border | `#f0f0f0` | `#e8dcc8` (`--game-panel-border`) |
| Muted section title | `#8c8c8c` | `#7a6f5c` (`--game-text-muted`) — чуть теплее, контраст ≥ 4.5:1 на `#fffdf8` |

**Не менять** семантические цвета боя (hero blue `#e6f4ff`, enemy red `#fff1f0`, accent `#1677ff`) — только нейтральные поверхности и бордеры layout-примитивов.

---

## 3. Типографика

### 3.1. Шрифты (Google Fonts, кириллица)

| Роль | Семейство | Weights | Где |
|------|-----------|---------|-----|
| UI / Ant Design | **Golos Text** | 400, 500, 600 | `body`, `ConfigProvider` `token.fontFamily`, весь интерактивный текст |
| Display / codex | **PT Serif** | 600, 700 | `.game-header__brand`, `.game-panel__title`, `.game-mode-section__title` |

**Подключение:** `@font-face` через `<link>` в `index.html` (display=swap) или `@import` в глобальном CSS — предпочтительно `link` для параллельной загрузки.

**Ant Design:**

```ts
ConfigProvider theme={{
  token: {
    fontFamily: "'Golos Text', system-ui, -apple-system, sans-serif",
  },
}}
```

Serif **не** задавать глобально на `Typography` — только классы layout.

### 3.2. Размеры

Без изменения текущей шкалы MVP (12–16px, StatStrip 9–12px). Меняется только семейство sans; line-height Ant оставить по умолчанию.

### 3.3. Emoji и цифры

StatStrip и ресурсы в шапке остаются emoji + числа; sans сохраняет выравнание лучше, чем глобальный serif.

---

## 4. Архитектура в коде

### 4.1. Новые файлы

| Файл | Назначение |
|------|------------|
| `src/styles/game-theme.css` | CSS variables, `body` background, noise hook |
| `src/theme/antdGameTheme.ts` | объект `theme` для `ConfigProvider` (font + при желании `colorBgContainer` → `--game-panel-bg`) |

### 4.2. Точки интеграции

1. `index.html` — preconnect + link Google Fonts (Golos Text, PT Serif).
2. `main.tsx` — `import './styles/game-theme.css'`.
3. `App.tsx` — обернуть дерево в `ConfigProvider` с `antdGameTheme`.
4. `game-layout.css` — заменить хардкод `#fff`, `#f0f0f0`, `#8c8c8c` на variables где уже есть `.game-panel`, `.game-mode-tile`, `.game-mode-section__title`.
5. `inventory.css` / `battle.css` — **только** нейтральные серые фоны ячеек при необходимости (`#f5f5f5` → чуть теплее `#f5f0e8`); не трогать боевую семантику.

### 4.3. Единый источник tokens

Все `--game-*` объявлены в `:root` в `game-theme.css`; layout CSS ссылается на них, не дублирует hex в TS.

---

## 5. Доступность и UX

- Конtrast: muted text `#7a6f5c` on `#fffdf8` — проверить в DevTools; при fail ослабить до `#6b6355` или вернуть `#8c8c8c` только для muted.
- `prefers-reduced-motion`: не анимировать фон; noise можно отключать в `@media (prefers-reduced-motion: reduce)` (opacity 0).
- Шрифты: `font-display: swap`; fallback `system-ui, sans-serif` / `Georgia, serif`.

---

## 6. Проверка (ручная)

1. Campaign hub: шапка, панели, таверна — тёплый фон за колонкой, serif только в заголовках.
2. Бой: поле, лог, StatStrip — читаемость 12px/9px без «плывущих» цифр.
3. Мобильная ширина &lt;520px: фон не обрезает контент, нет горизонтального scroll от vignette.
4. Слабый noise: включён/выключен — визуальное сравнение, без мерцания при scroll.

---

## 7. Решения brainstorming

| Вопрос | Решение |
|--------|---------|
| Направление | A + C |
| Подход | «Рамка кампании» (п.1), noise опционально после просмотра |
| UI font | Golos Text |
| Display font | PT Serif |
| Тёмная тема | не в этом изменении |
