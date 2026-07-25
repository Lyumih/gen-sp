# Бой: command dock под полем, осмотр врага, actor bar

**Дата:** 2026-07-25  
**Статус:** утверждено после brainstorming  
**Связь:** `AGENTS.md`, `2026-06-22-battle-field-ui-design.md`, `2026-07-17-battle-ui-improvements-design.md`, `2026-07-25-battle-basic-actions-reference-drawer-tower-design.md`, `src/features/battle/BattleScreen.tsx`, `src/features/layout/game-layout.css`

---

## 1. Цель

1. **Осмотр врага в бою** — игрок видит ту же тактическую глубину, что нужна для решений: effective-статы, умения (шаблон, уровень, CD, tooltip урона/эффекта), пассивы, резисты расы, текущие HP/🔮 и статусы. **В бою всегда полная правда** (вариант A brainstorming); кодекс не скрывает данные на экране боя.
2. **Layout** — убрать боковую колонку «Действия»; перенести **актора, действия и осмотр** в **command dock** под полем; поле и очерёдность хода — на всю ширину.
3. **Actor bar** — компактный боевой срез героя под полем; **без** мини-блока экипировки в dock (экип — только в `HeroProfileModal`).

**Вне scope:**

- Изменение AI, reducer, формул урона, баланса.
- Экипировка врагов (в MVP у врагов нет item slots; только умения/пассивы/моды).
- Preview урона базовых действий по наведённой цели (фаза 2, как в spec базовых действий).
- Редизайн содержимого кодекса.

---

## 2. Принятые решения (brainstorming)

| Тема | Решение |
|------|---------|
| Правда о враге в бою | **Всегда полная** (статы, все умения, пассивы, моды) |
| Замена всей панели героя на врага | **Нет** — осмотр врага **дополнительный** блок; действия героя остаются |
| Hover vs click | Hover: tooltip клетки + зона угрозы (как сейчас). **Click** по врагу: **закрепить** осмотр в dock |
| Layout | **Вариант 2:** column — поле сверху, dock снизу |
| Журнал на wide (≥900px) | **Справа** от dock в нижней зоне; на узком — под dock или `Collapse` |
| Экип в dock | **Нет** |
| Ряды действий | **Одна полоса** под заголовком «Действия»: базовые + end turn \| умения \| пассивы; `flex-wrap` без подписей секций; meta/автобой **ниже** (amendment 2026-07-25-b) |

---

## 3. Архитектурный подход

**DECIDED: Вариант B** — game-layer резолверы статов/описаний + выделенные UI-компоненты; локальный state в `BattleScreen`.

| Модуль | Назначение |
|--------|------------|
| `src/game/battle/unitBattleEffectiveStats.ts` (или расширение `unitCombatStats.ts`) | Effective `BaseStats` и mini ⚔/🛡 для **любого** `Unit` в бою: `baseStats`, level, worldPower, **`passivesByUnitId`**, gear только если есть `Character`, статусы |
| `src/features/battle/BattleUnitTooltip.tsx` | Перевести на общий резолвер (герой и враг — один шаблон tooltip) |
| `src/features/battle/BattleActorBar.tsx` | Emoji, имя, ⭐, ❤️/🔮, `StatStrip` управляемого игрока-актёра |
| `src/features/battle/BattleInspectPanel.tsx` | Read-only dossier закреплённого юнита (враг; опционально союзник по click) |
| `src/features/battle/BattleCommandDock.tsx` | Meta-строка, `BattleActorBar`, inspect, ряды базовых/умений/пассивов, автобой |
| `src/features/battle/BattleLogPanel.tsx` | Журнал (вынести из монолита; переиспользовать `BattleLogLine`) |
| `src/features/battle/battleInspectModel.ts` | Сбор данных для inspect: cards, passives, statuses, `describeCardCombatStats` / passive text для врага |
| `src/features/battle/BattleScreen.tsx` | Layout column; `pinnedInspectUnitId`; click enemy toggle pin; делегировать dock |
| `src/features/layout/game-layout.css` | `.game-battle-layout` → column; `.game-battle-bottom` grid dock \| log |

| Альтернатива | Почему отклонена |
|--------------|------------------|
| A — swap правой панели на врага | Теряются действия в момент выбора цели |
| C — только Drawer для осмотра | Работает, но хуже связь «поле ↔ рука»; dock уже снизу |
| D — вкладки Действия/Осмотр/Журнал | Нельзя параллельно видеть руку и осмотр |

---

## 4. Layout

### 4.1. Структура экрана

```
[ Alerts victory/defeat/spawn … ]

.game-battle-layout (column)
├── .game-battle-field
│   ├── Очерёдность хода (TurnOrderStrip)
│   ├── .game-battle-field-scroll (mat + grid)
│   └── легенда overlay (если active)
└── .game-battle-bottom
    ├── .game-battle-command-dock (GamePanel или game-panel)
    └── .game-battle-log (≥900px: фикс. ~280–320px; <900px: full width под dock)
```

### 4.2. CSS

- `.game-battle-layout`: `grid-template-columns: 1fr` (убрать `minmax(320px, 380px)`).
- `.game-battle-bottom`: `display: grid; grid-template-columns: 1fr minmax(260px, 320px); gap: 8px; align-items: start`.
- `@media (max-width: 900px)`: `.game-battle-bottom { grid-template-columns: 1fr; }`.
- Пересчитать `.game-battle-field-scroll max-height`: учесть высоту dock (ориентир `calc(100vh - <header+turn+dock estimate>)`; подобрать при реализации, цель — поле не обрезается на 1366×768).

### 4.3. Command dock — содержимое сверху вниз

1. **Head:** заголовок «Действия: {имя}» только когда есть player-actor; `extra`: Профиль, В лагерь/Выйти (как сейчас).
2. **Meta:** ход / раунд / worldPower; Switch автобоя; guided overlay — без изменений по смыслу.
3. **`BattleActorBar`** — текущий **управляемый** player unit (`actor`), не только primary character. Если ход врага — показывать bar последнего выбранного игрока или primary (DECIDED: **primary party member** с индикацией «ход противника», если нет `actor`).
4. **`BattleInspectPanel`** — если `pinnedInspectUnitId` задан и юнит жив или мёртв на поле: имя, `StatStrip`, умения read-only, пассивы, резисты, статусы; кнопка ✕ и **Esc** снимают pin. Не скрывает ряды действий.
5. **Ряд «Базовые действия»:** `BattleBasicActionCell` ×3 + `BattleEndTurnCell`; **без** горизонтального скролла; wrap допустим только на очень узкой ширине.
6. **Ряд «Умения»:** `.battle-skill-row` внутри `GameScrollX`.
7. **Ряд «Пассивные навыки»:** read-only `InventoryCell` / рефактор `ActorPassivesPanel` → `BattlePassivesRow` с поддержкой **synthetic carrier** для врага в inspect (не в ряду актора). Для **актёра-игрока** — как сейчас. Если пассивов 0 — ряд скрыт. Если 1–2 у актора — допустимо в одной строке с умениями после `Divider`, иначе отдельный 3-й ряд.

---

## 5. Осмотр врага (inspect)

### 5.1. Взаимодействие

| Жест | Поведение |
|------|-----------|
| Hover enemy cell | `hoveredEnemyId` + threat overlay (без изменений) + `BattleUnitTooltip` |
| Click enemy cell | Toggle `pinnedInspectUnitId` (повторный click по тому же — снять pin). Click по пустой клетке **не** снимает pin (явное ✕ / Esc). |
| Click player cell | Существующее `playerUnitPickId`; **не** обязан сбрасывать inspect |
| Enemy turn | Inspect разрешён; ряды действий disabled как сейчас |

### 5.2. Данные inspect

| Поле | Источник |
|------|----------|
| Display | `getUnitDisplay(unit, campaign)` |
| Effective stats | `unitBattleEffectiveStats(battle, unit, campaign)` |
| HP / mana | `unit.hp`, `unit.maxHp`, `unit.mana`, `unit.maxMana` |
| Race resists | `describeRaceResistLines(unit.raceId)` |
| Cards | `enemyCardsByUnitId[unit.id]` или `playerCardsByUnitId` для союзника |
| Card tooltips | Герой: существующий `describeCardCombatStats`. Враг: synthetic character `{ baseStats, unitLevel, items: [], equipment empty }` + `resolveEnemySkillAmount` / те же describe-хелперы, **единый текст tooltip** (AGENTS.md §9) |
| Passives | `passivesByUnitId[unit.id]`; describe через расширение passive text для carrier без `Character` (stats lines из template + mod slots) |
| Statuses | Список compact emoji/label из `unit.statusEffects` |

Экипировка: секция **не показывается** (у врагов нет; у героя в inspect союзника — опционально **не** в MVP, только modal «Профиль»).

### 5.3. UI inspect

- Заголовок: `Осмотр: {emoji} {name}`; визуально `border-left` или лёгкий фон `#fff1f0` для enemy, `#e6f4ff` для player (read-only, не путать с кнопками).
- Умения: `BattleSkillCell` с `disabled` + `readOnly`; показывать `cooldownRemaining`.
- Пассивы: как `ActorPassivesPanel`, но без требования `Character` для врага.

---

## 6. Effective stats (исправление расхождения)

**Проблема:** `BattleUnitCell` и `unitCombatMiniStats` считают passive/gear через `campaign.characters`; у врагов пассивы только в `battle.passivesByUnitId`.

**Решение:** единая функция, например:

```ts
export function unitBattleEffectiveStats(
  battle: BattleState,
  unit: Unit,
  campaign: CampaignState,
): { base: BaseStats; effective: BaseStats } | null
```

- Gear/passive bonuses from **character** if `getCharacter(campaign, unit.id)` exists.
- Else passive bonuses from **`battle.passivesByUnitId[unit.id]`** aggregated like campaign passives (reuse `aggregatePassiveSkillStatBonuses` on battle passives list).
- `effective.health = unit.maxHp`; initiative from `unit.initiativeBase` when set.
- Apply `effectiveStatWithStatuses` for display strip where needed.

Использовать в: `BattleUnitTooltip`, grid mini stats, `BattleActorBar`, `BattleInspectPanel`.

---

## 7. Поведение на touch

- Нет hover inspect: tap enemy → pin inspect (как click).
- Tooltip stats на клетке: tap открывает **Popover** (controlled), второй tap вне закрывает — паттерн AGENTS.md §7; не конфликтует с pin (tap для pin на кнопке-клетке: **DECIDED:** first tap pin inspect; stat details в inspect panel / long-press popover — **MVP:** tap = pin, StatStrip в inspect достаточно).

---

## 8. Тестирование

- Unit: `unitBattleEffectiveStats` — враг с passives in battle, без Character.
- Component/smoke: `BattleInspectPanel` рендер cards CD; pin toggle on cell click (testing-library в существующем стиле проекта, если есть battle tests).
- Manual: wide — журнал справа; narrow — stack; enemy turn + pinned inspect; 4 skills + 5 passives — скролл только рядов 2–3.

---

## 9. Миграция / совместимость

- `HeroProfileModal` без изменений контракта.
- Guided tutorial steps — проверить, что селекторы `.battle-action-row` / `.battle-skill-row` остаются или обновить coach marks.
- Autobattle — dock disabled state unchanged.

---

## 10. Связанные follow-ups (не блокируют MVP)

- Обогащение hover-tooltip 1–2 top enemy skills.
- Inspect preview урона по hovered friendly target для базовых действий.
- Click ally pin для symmetric inspect (если понадобится).
