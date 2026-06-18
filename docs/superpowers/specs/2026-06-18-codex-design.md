# Дизайн: Кодекс (энциклопедия контента)

**Дата:** 2026-06-18  
**Статус:** согласовано в brainstorming  
**Связь:** `src/features/campaign/CampaignHub.tsx`, `src/game/content/itemTemplates.ts`, `src/game/content/cardTemplates.ts`, `src/game/descriptions/itemText.ts`, `src/game/descriptions/cardText.ts`, `docs/superpowers/specs/2026-03-28-readable-stats-hero-profile-enemy-inspect-design.md`

## 1. Цель

Вкладка **«Кодекс»** в хабе кампании — справочник по игровому контенту (предметы, умения, модификаторы, враги). Данные берутся **только из TS-каталогов контента**; тексты характеристик — из существующего слоя описаний (`itemText`, `cardText` и новых аналогов для врагов/модов).

Игрок видит **только открытые** записи и счётчик **«Открыто N / M»** по категории. Неоткрытые записи в списке **не показываются** (без силуэтов и «???»).

Переключатель **«Показать всё»** в шапке Кодекса — инструмент автора/разработчика: показывает весь каталог независимо от прогресса. **По умолчанию включён** (dev и production). Перед релизом игры дефолт меняется на `false` вручную.

## 2. Принятые решения (brainstorming)

| Вопрос | Решение |
|--------|---------|
| Место в UI | 4-я вкладка хаба: Персонаж · Бой · Магазин · **Кодекс** |
| Доступ | Только хаб; **disabled** при `inBattle` (как магазин) |
| Открытие: предметы | Купил или получил в инвентарь |
| Открытие: умения | Использовал в бою хотя бы раз |
| Открытие: враги | Победил (убил) |
| Открытие: модификаторы | Получил первые очки (`level` > 0) на модификации |
| Неоткрытые записи | Скрыты; виден счётчик N / M |
| Персистентность открытий | В `CampaignState` → тот же `localStorage`, что и прогресс кампании |
| Навигация внутри | Горизонтальное подменю категорий (как вкладки хаба) |
| «Показать всё» | Всегда в UI; default **true**; состояние toggle — локальный `useState`, **не** в save |
| Архитектура данных | Единый реестр Кодекса + слой открытий (рекомендованный подход A) |

## 3. Макет

```
┌─────────────────────────────────────────────┐
│  Gen — кампания                             │
├─────────────────────────────────────────────┤
│  ⭐12   🪙 150   ⚡ worldPower: 3            │  ← HUD
├─────────────────────────────────────────────┤
│  [ Персонаж ] [ Бой ] [ Магазин ] [ Кодекс●]│  ← ● = бейдж новых открытий
├─────────────────────────────────────────────┤
│  ☑ Показать всё              Открыто 2 / 3  │
│  [ Предметы ] [ Умения ] [ Модификаторы ] [ Враги ] │
├─────────────────────────────────────────────┤
│  🗡️ Деревянный меч              [Новое]     │
│     Оружие · +1 к max ❤️ за уровень …       │
│  ▼ подробнее (Collapse)                     │
└─────────────────────────────────────────────┘
```

При **«Показать всё»** — все записи каталога; неоткрытые помечены меткой «не открыто» (для автора контента). Поле **поиска** (`Input.Search`) видно только при включённом «Показать всё».

## 4. Данные и реестр

### 4.1. Идентификаторы записей

Формат: `{category}:{templateId}`

| category | Пример |
|----------|--------|
| `item` | `item:wooden_sword` |
| `card` | `card:strike` |
| `enemy` | `enemy:grunt` |
| `mod` | `mod:kill_reward` |

### 4.2. Реестр (`src/game/codex/registry.ts`)

| Категория | Источник | Статус |
|-----------|----------|--------|
| Предметы | `ITEM_TEMPLATES` | готово |
| Умения | `CARD_ATTACK_TEMPLATES` | готово |
| Враги | новый `src/game/content/enemyTemplates.ts` | **нужен каталог** |
| Модификаторы | новый `src/game/content/modTemplates.ts` | **нужен каталог** |

Функции реестра (чистые):

- `allCodexEntries()` — все записи;
- `codexEntriesByCategory(category)` — фильтр по категории;
- `codexEntryById(id)` — одна запись или `undefined`.

Тип записи (минимум): `{ id, category, templateId, label, emoji? }`.

### 4.3. Новый контент: враги

`BattleScenarioEnemy` расширяется полем **`archetypeId: string`** — ссылка на `ENEMY_TEMPLATES`.

```ts
export type EnemyTemplate = {
  id: string
  label: string
  emoji?: string
  /** Базовые статы для отображения в Кодексе (ориентир уровня 1). */
  baseHpStat: number
  // при необходимости — описание поведения текстом
}
```

Сценарии в `scenarios.ts` получают `archetypeId` для каждого врага. Открытие Кодекса — по **`archetypeId`**, не по боевому `id` (`e1`, `boss`).

Начальный набор archetypeId согласовать с текущими сценариями (например `grunt`, `boss`).

### 4.4. Новый контент: модификаторы

`ModificationInstance` расширяется полем **`templateId: string`**.

```ts
export type ModTemplate = {
  id: string
  label: string
  emoji?: string
  descriptionLines: readonly string[]
}
```

Стартовые карты (`STARTER_CARDS`) — `modifications: []`. При появлении слота модификации на карте — запись с `templateId` из каталога. Открытие — когда `level` слота с данным `templateId` впервые становится **> 0**.

MVP-шаблон модификации: одна запись, соответствующая текущему `applyModKillReward` (очки за kill на первую модификацию карты).

### 4.5. Состояние в `CampaignState`

```ts
/** Id записей Кодекса, открытых в этой кампании. */
codexDiscovered: readonly string[]

/** Id записей, которые игрок уже видел на вкладке Кодекс (подмножество discovered). */
codexSeenEntryIds: readonly string[]
```

- Новая игра: `codexDiscovered: []`, `codexSeenEntryIds: []`.
- **Непрочитанные:** `codexDiscovered.filter(id => !codexSeenEntryIds.includes(id))` — бейдж на вкладке и метка «Новое» на записи.
- При открытии вкладки Кодекс: `codexSeenEntryIds` дополняется всеми текущими `codexDiscovered` (идempotent merge).
- Стартовые карты **не** считаются открытыми до первого использования в бою.

### 4.6. Миграция сохранения

- `SAVE_VERSION`: **1 → 2**.
- В `migrate.ts`: если полей нет → `codexDiscovered: []`, `codexSeenEntryIds: []`.
- Тест в `migrate.test.ts`.

## 5. Открытия (discovery)

Модуль `src/game/codex/discovery.ts`:

```ts
discoverCodexEntry(discovered: readonly string[], entryId: string): readonly string[]
visibleCodexEntries(campaign, category, showAll): CodexEntry[]
codexProgress(campaign, category): { opened: number; total: number }
markCodexSeen(campaign): CampaignState // merge codexSeenEntryIds ← codexDiscovered
unreadCodexEntryIds(campaign): readonly string[] // discovered \ seen
```

### 5.1. Хуки в reducers

| Событие | Где | Открывает |
|---------|-----|-----------|
| `BUY_ITEM` | `runReducer` | `item:{templateId}` |
| Награда предметом (если появится) | `runReducer` | `item:{templateId}` |
| Атака картой (`fromCard.templateId`) | `battle/reducer` | `card:{templateId}` |
| Смерть врага | `battle/reducer` или финализация боя | `enemy:{archetypeId}` |
| Рост `mod.level` с 0 → >0 | `applyModKillReward` / run | `mod:{templateId}` |

`discoverCodexEntry` — **идempotent** (без дубликатов в массиве).

### 5.2. Отображение записей

- **Предметы / умения:** те же функции, что магазин и профиль (`itemText`, `cardText`); для шаблона без экземпляра — ориентир **уровня 1**.
- **Враги:** новый `src/game/descriptions/enemyText.ts` — label, базовый HP-стат, уровень-ориентир.
- **Модификаторы:** новый `src/game/descriptions/modText.ts` — label + `descriptionLines` из шаблона.

## 6. UI и компоненты

| Файл | Ответственность |
|------|-----------------|
| `CampaignHubNav.tsx` | +кнопка «Кодекс», иконка `BookOutlined`, бейдж непрочитанного |
| `CampaignCodexTab.tsx` | шапка, подменю категорий, список |
| `CodexEntryList.tsx` | список записей категории |
| `CodexEntryCard.tsx` | emoji, label, краткие строки, Collapse «Подробнее» |
| `campaignHubShared.ts` | `CampaignHubTab` += `'codex'` |
| `CampaignHub.tsx` | рендер `CampaignCodexTab` |

Колокация: `src/features/campaign/` + `src/features/codex/` (или codex-компоненты рядом с campaign — на этапе плана зафиксировать одну папку).

### 6.1. Поведение

- **Пустая категория:** текст «Пока ничего не открыто» + подсказка по категории.
- **Бейдж на вкладке «Кодекс»:** число записей в `unreadCodexEntryIds(campaign)`; сброс при открытии вкладки (`markCodexSeen`).
- **Метка «Новое»** на записи — если id ∈ `unreadCodexEntryIds(campaign)`.
- **Collapse** для полного описания — без отдельной Modal (экономия места при `maxWidth: 720`).
- **`inBattle`:** вкладка disabled (как магазин).

### 6.2. «Показать всё»

```ts
// TODO(release): сменить default на false перед релизом игры
const CODEX_SHOW_ALL_DEFAULT = true
```

- Локальный `useState(CODEX_SHOW_ALL_DEFAULT)` в `CampaignCodexTab`.
- Не сохраняется в `CampaignState` / localStorage.

### 6.3. Доступность

- Подменю категорий: `role="tablist"` / `role="tab"` / `aria-selected`.
- Переключатель «Показать всё»: связанный `<label>`.
- Счётчик «Открыто N / M»: `aria-live="polite"` при изменении.

## 7. Ошибки и краевые случаи

| Ситуация | Поведение |
|----------|-----------|
| Id в `codexDiscovered`, шаблон удалён | Не показывать; в dev — `console.warn` |
| Шаблон без `label` | Fallback: `templateId` |
| Враг в старом сценарии без `archetypeId` | Не открывает Кодекс; миграция сценариев обязательна |
| Дублирующий `discoverCodexEntry` | Идempotent |
| Поиск при «Показать всё» | Фильтр по `label` (case-insensitive) |

## 8. Тестирование

| Уровень | Проверка |
|---------|----------|
| `discovery.test.ts` | идempotent discover; `visibleCodexEntries` showAll on/off; progress N/M |
| `registry.test.ts` | все шаблоны контента → запись в реестре; уникальные id |
| `migrate.test.ts` | v1 → v2: пустые поля codex |
| `runReducer.test.ts` | `BUY_ITEM` → item открыт |
| `reducer.test.ts` | атака с `fromCard` → card открыта; kill → enemy; mod reward → mod |
| `enemyText.test.ts` / `modText.test.ts` | снимки строк |
| Ручной | пустой Кодекс → бой → открытия; бейдж «Новое»; «Показать всё» + поиск |

## 9. Вне объёма v1

- Lore-тексты, иллюстрации, связи «упоминается в» между записями.
- Кодекс в бою (Modal / вкладка).
- Meta-save открытий вне кампании.
- JSON/БД как источник контента (остаёмся на TS-каталогах).
- Силуэты и «???» для неоткрытых записей в игровом режиме.

## 10. Следующий шаг

План реализации (`writing-plans`) после ревью этого файла пользователем.
