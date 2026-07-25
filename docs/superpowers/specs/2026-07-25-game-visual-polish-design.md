# Gen — полировка визуальной темы: сцена, warm primary, поле боя

**Дата:** 2026-07-25  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-07-25-game-visual-theme-design.md`, `AGENTS.md`, `src/styles/game-theme.css`, `src/theme/antdGameTheme.ts`, `src/features/battle/battleOverlayColors.ts`, `src/features/battle/BattleScreen.tsx`

---

## 1. Цель

Усилить **игровое** восприятие после первой волны темы (шрифты + пергамент viewport):

1. **A — единая сцена:** непрозрачная подложка колонки 1280px, тёплый **primary** в Ant Design вместо синего по умолчанию.
2. **Поле боя:** тактический «коврик», тёплые нейтральные клетки; оверлеи хода/угрозы **не** перекрашивать.
3. **Семантика боя:** журнал — hero **синий**, enemy **красный** (как сейчас); primary — только UI (кнопки, табы, рамка активного актёра, бейджи очереди на поле).

**Вне scope v1:** обёртка Справки в `GamePanel`, реструктура вкладки Бой (секции режимов), текстуры тайлов, тёмная тема, pixel-арт.

---

## 2. Решения brainstorming

| Вопрос | Решение |
|--------|---------|
| Приоритет | A (сцена + Ant recolor) + поле боя |
| Подход | «Токены + сцена» (п.1) |
| Лог союзника | **Синий** `#1677ff` / фон `#e6f4ff` — без перевода на primary |
| Лог врага | Без изменений (`#cf1322` / `#fff1f0`) |
| Noise viewport | Опционально `0.05` после ручной проверки; default `0` |

---

## 3. Палитра (расширение `:root`)

| Token | Значение | Назначение |
|-------|----------|------------|
| `--game-primary` | `#8b6914` | UI accent, рамка текущего актёра, бейджи turn order |
| `--game-primary-hover` | `#735610` | hover primary-кнопок (Ant `colorPrimaryHover`) |
| `--game-stage-bg` | `#f0e6d4` | фон `.game-app-shell` |
| `--game-battle-mat` | `#e4d9c8` | фон `.game-battle-field-scroll` |
| `--game-battle-cell-bg` | `#f7f2e8` | пустая клетка |
| `--game-battle-cell-border` | `#c9baa8` | border клетки |
| `--game-battle-wall-bg` | `#3d3630` | стены (optional замена `#333`) |

Существующие `--game-panel-*`, `--game-text-muted`, шрифты — без изменений.

---

## 4. Ant Design (`antdGameTheme.ts`)

Расширить `token`:

```ts
colorPrimary: '#8b6914',
colorPrimaryHover: '#735610',
colorBorder: '#e8dcc8',
colorBorderSecondary: '#ddd0bc',
colorTextSecondary: '#7a6f5c',
```

`fontFamily` и `colorBgContainer: '#fffdf8'` — сохранить.

**Не менять:** `colorError`, `colorWarning` defaults для danger-кнопок и Alert.

Компоненты, которые автоматически подтянутся: `Button` primary, `Tabs`, `Switch`, links, focus rings на inputs, `Collapse` header accent при expand.

---

## 5. Shell (`game-theme.css`)

```css
.game-app-shell {
  background: var(--game-stage-bg);
  border: 1px solid var(--game-panel-border);
  /* существующие box-shadow, border-radius */
}
```

Опционально: `--game-noise-opacity: 0.05` в `:root` после просмотра.

---

## 6. Поле боя

### 6.1. Константы overlay

Файл `battleOverlayColors.ts` — **без изменений** в v1 (move, threat, aoe, valid target).

### 6.2. Базовые клетки

- `OVERLAY_CELL_BG` → `#f7f2e8` или ссылка на CSS variable через refactor: предпочтительно **константа в TS** = `--game-battle-cell-bg` hex для паритета с spec.
- `OVERLAY_WALL_BG` → `#3d3630` (optional).

### 6.3. Inline стили `BattleScreen.tsx`

| Было | Стало |
|------|-------|
| `border` текущего актёра `#1677ff` | `var(--game-primary)` или `2px solid` + token |
| `boxShadow` актёра `#1677ff` | primary |
| default cell border `#ccc` | `var(--game-battle-cell-border)` |
| selected player `#52c41a` | **без изменений** |

### 6.4. CSS layout

`.game-battle-field-scroll`:

```css
background: var(--game-battle-mat);
border: 1px solid var(--game-panel-border);
```

### 6.5. Прочие battle UI

- `TurnOrderStrip` / `BattleScreen` Badge `color="#1677ff"` → `var(--game-primary)` или Ant primary.
- `battle.css`: `.unit-token--highlighted`, `.battle-cell-unit-highlight` — заменить `#1677ff` на `var(--game-primary)`.
- `.battle-log--hero` / `.battle-log--enemy` — **не менять**.

### 6.6. Заголовки боя

«Очерёдность хода» — класс с `font-family: var(--game-font-display)` (как `.game-panel__title`), без нового компонента.

---

## 7. Хардкод primary (inventory / hub)

Заменить **только** neutral UI chrome, где `#1677ff` = «акцент приложения», не семантика героя:

- `game-layout.css`: `.game-mode-tile:hover` border → `var(--game-primary)`.
- `inventory.css`: focus/selected **синие** состояния экипировки — оставить или перевести на primary: **перевести на primary** для единства (compare highlight `#e6f4ff` можно оставить как светлый tint primary: `#f5ecd4` optional — **YAGNI:** только border `#1677ff` → primary, фоны selection без изменений в v1).

Минимальный scope: `grep #1677ff` — заменить в layout/battle/header paths; **не** трогать `.battle-log--hero`.

---

## 8. Доступность

- Primary `#8b6914` on `#fffdf8`: проверить контраст текста на `Button type="primary"` (белый текст Ant).
- Primary border on cells: достаточная толщина 2px (уже есть).

---

## 9. Тестирование

### Авто

- Обновить/добавить test `antdGameTheme.test.ts`: assert `colorPrimary === '#8b6914'`.

### Ручное

1. Хаб: табы, CTA «Бой», hover плиток режимов — warm primary.
2. Между `GamePanel` — stage bg, не viewport gradient.
3. Бой: коврик, тёплые клетки, overlays при move/attack читаемы.
4. Журнал: строки героя синие, врага красные.
5. Справка: Collapse headers визуально теплее (collateral от tokens); функционально без регрессий.

---

## 10. Архитектура файлов

| Файл | Изменение |
|------|-----------|
| `src/styles/game-theme.css` | новые tokens, shell bg/border |
| `src/theme/antdGameTheme.ts` | расширенные tokens |
| `src/theme/antdGameTheme.test.ts` | primary assertion |
| `src/features/layout/game-layout.css` | hover tile, field scroll mat |
| `src/features/battle/battleOverlayColors.ts` | cell bg, optional wall |
| `src/features/battle/battle.css` | highlight colors → CSS var |
| `src/features/battle/BattleScreen.tsx` | cell borders, badge color |
| `src/features/battle/TurnOrderStrip.tsx` | badge color |

Единый источник accent: `--game-primary` в `:root`; Ant `colorPrimary` дублирует hex (допустимо; альтернатива — только Ant token без CSS var для battle — **отклонено:** battle inline нужен CSS var).
