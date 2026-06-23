# Mobile tabs & header layout

**Дата:** 2026-06-24  
**Статус:** утверждено (brainstorming)  
**Связь:** `src/features/campaign/GameHeader.tsx`, `src/features/layout/game-layout.css`, `src/features/character/hub/CharacterHubLayout.tsx`, `src/features/shop/hub/ShopHubLayout.tsx`, `docs/superpowers/specs/2026-06-24-mvp-ui-layout-design.md`

---

## 1. Цель

Исправить отображение вкладок и шапки на мобильных экранах **от 390px**, чтобы элементы не наезжали друг на друга и оставались доступны для touch.

**Проблемы (аудит в браузере):**

| Область | Симптом |
|---------|---------|
| `GameHeader` | На ~375–400px icon-nav и блок ресурсов (🪙 / ⚡) перекрываются (~58px) |
| `CharacterHubLayout` / `ShopHubLayout` (`antd Tabs`) | 4 текстовых таба шире viewport; «Сундук» обрезается; скролл неочевиден |
| `CodexCategoryNav` | Ок — `Space wrap`, без правок |

---

## 2. Принятые решения

| Тема | Решение |
|------|---------|
| Целевой минимум | **390px+** (современные телефоны) |
| Шапка на узком экране | **Две строки:** бренд + ресурсы + «Бой» сверху; icon-nav по центру снизу |
| Внутренние `Tabs` | **Короткие подписи** на mobile + **горизонтальный touch-scroll** как запасной вариант |
| Подход | CSS breakpoint + точечные правки (без нового `GameTabs` / mobile-shell) |
| Breakpoint | **`max-width: 520px`** — с запасом для 390px |

---

## 3. Шапка (`GameHeader`)

### 3.1. Макет

**Desktop (>520px)** — без изменений визуально:

```
🧬 Gen    [👤][🛒][☕][📖][?]              🪙 64   ⚡ 10   [ ▶ Бой ]
```

**Mobile (≤520px):**

```
🧬 Gen                          🪙 64   ⚡ 10   [ ▶ Бой ]
           [👤] [🛒] [☕] [📖] [?]
```

### 3.2. Разметка

Минимальный рефакторинг `GameHeader.tsx` — три соседних блока в `.game-header__inner`:

| Элемент | Содержимое |
|---------|------------|
| `.game-header__brand` | `UI_DNA Gen` |
| `.game-header__nav` | `CampaignHubNav` |
| `.game-header__actions` | ресурсы + CTA «Бой» |

Один и тот же DOM для desktop и mobile; переключение только через CSS grid areas.

### 3.3. Стили (`game-layout.css`)

```css
.game-header { width: 100%; }

.game-header__inner {
  width: 100%;
  gap: 12px;
  align-items: center;
}

/* desktop: одна строка */
@media (min-width: 521px) {
  .game-header__inner {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
  }
  .game-header__brand { justify-self: start; }
  .game-header__nav { justify-self: center; }
  .game-header__actions { justify-self: end; }
}

/* mobile: две строки */
@media (max-width: 520px) {
  .game-header__inner {
    display: grid;
    grid-template-areas:
      "brand actions"
      "nav nav";
    grid-template-columns: 1fr auto;
    gap: 4px;
  }
  .game-header__brand { grid-area: brand; min-width: 0; }
  .game-header__nav {
    grid-area: nav;
    display: flex;
    justify-content: center;
  }
  .game-header__actions {
    grid-area: actions;
    justify-self: end;
    min-width: 0;
  }
}
```

### 3.4. Без изменений

- Icon-only `CampaignHubNav`, `Tooltip`, `aria-label`, Badge на Кодексе.
- Тексты tooltips и ресурсов.
- `CodexCategoryNav` — вне scope.

---

## 4. Внутренние вкладки (`Tabs`)

### 4.1. Область

| Файл | Табы |
|------|------|
| `CharacterHubLayout.tsx` | Предметы · Умения · Навыки · Сундук |
| `ShopHubLayout.tsx` | Магазин · Продажа · Сундук |

### 4.2. Короткие подписи (≤520px)

| Полная | Mobile label | `aria-label` |
|--------|--------------|--------------|
| `Предметы (N)` | `Предм. (N)` | `Предметы (N)` |
| `Умения (N)` | `Ум. (N)` | `Умения (N)` |
| `Навыки (N)` | `Нав. (N)` | `Навыки (N)` |
| `Сундук (N)` | `Сунд. (N)` | `Сундук (N)` |
| `Магазин` | `Маг.` | `Магазин` |
| `Продажа` | `Прод.` | `Продажа` |

Счётчик `(N)` сохраняется. Desktop — полные подписи.

### 4.3. Источник labels

`src/features/layout/tabLabels.ts`:

- `STASH_TAB_LABELS`, `SHOP_TAB_LABELS` — полные строки.
- `compactTabLabel(full, narrow: boolean)` или отдельные compact-константы.
- Хук `useNarrowViewport()` — `matchMedia('(max-width: 520px)')`, подписка на `change`.

### 4.4. Touch-scroll

Класс `game-tabs--scroll` на оба `<Tabs>`:

```css
.game-tabs--scroll .ant-tabs-nav-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.game-tabs--scroll .ant-tabs-nav-wrap::-webkit-scrollbar {
  display: none;
}
```

- Скрытый scrollbar, свайп влево/вправо.
- Dropdown «⋯» от Ant Design не используем — предсказуемый touch UX.
- На 390px с compact labels четыре таба должны влезать; скролл — fallback.

### 4.5. Ant Design Tabs

- `size="small"` — без изменений.
- Опционально `tabBarGutter={8}` для плотности на mobile.
- Логика `activeKey`, children, disabled — без изменений.

---

## 5. Тестирование

| Проверка | Viewport | Ожидание |
|----------|----------|----------|
| Шапка: нет overlap nav ↔ ресурсы | 390px, 520px, 1280px | Элементы не пересекаются |
| Шапка: две строки | 390px | Бренд+ресурсы сверху, nav по центру снизу |
| Шапка: одна строка | 1280px | Как сейчас |
| Stash tabs: все 4 видны или скроллятся | 390px | «Сунд.» доступен; свайп работает |
| Shop tabs | 390px | Три таба без обрезания |
| Кодекс категории | 390px | Без регрессий (wrap) |
| A11y | 390px | `aria-label` на табах = полный текст |
| Ручной smoke | DevTools device mode | Персонаж, Магазин, Кодекс |

Автотесты: при наличии тестов на `CampaignHubNav` / layout — не обязательны для MVP; достаточно unit на `compactTabLabel` если вынесена чистая функция.

---

## 6. Порядок реализации (для implementation plan)

1. `useNarrowViewport.ts` + `tabLabels.ts`
2. `game-layout.css` — header grid/stack + `.game-tabs--scroll`
3. `GameHeader.tsx` — разметка `__brand` / `__nav` / `__actions`
4. `CharacterHubLayout.tsx` — compact labels + `game-tabs--scroll`
5. `ShopHubLayout.tsx` — то же
6. Ручной smoke 390 / 520 / 1280px

---

## 7. Альтернативы (отклонены)

| Вариант | Почему |
|---------|--------|
| Одна строка + scroll nav | Пользователь выбрал две строки в шапке |
| Только иконки во внутренних tabs | Менее читаемо; выбраны короткие текстовые labels |
| Обёртка `GameTabs` | YAGNI для 2 call-site |
| Breakpoint 320px | Целевой минимум 390px |
| Редизайн `CodexCategoryNav` | Уже работает с wrap |
