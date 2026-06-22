# Gen-sp — UI/UX паттерны для агентов

Документ задаёт **повторяемые паттерны интерфейса** игры Gen. При задачах на UI сверяйся с этим файлом и с `src/game/ui/labels.ts` / `src/game/config/baseStats.ts`.

---

## 1. Принципы

1. **Компактность по умолчанию** — сначала emoji + числа; текст и описания — в tooltip/popover.
2. **Один источник emoji** — игровые маркеры в `src/game/ui/labels.ts` и `BASE_STAT_META`; не хардкодить ❤️ в компонентах.
3. **Не дублировать HUD** — если ресурс уже в `CampaignHubHud` (золото, worldPower), в профиле передавай `includeResourceStats={false}`.
4. **Контекстные effective-значения** — tooltip показывает цепочку **база → (level/worldPower) → экипировка → итог**, когда применимо.
5. **Freeze expedition** — disabled UI + `Alert`, не только `opacity`; сообщение «недоступно во время expedition».

---

## 2. StatStrip — строка характеристик

**Компонент:** `StatStrip` (канонический паттерн для статов).

**Формат строки:**

```
❤️23 🛡3 ⚔3 ✨1 🔮12 💚0 👟2 ⚡8 🎯6  ·  ★78%
```

**Правила:**

| Элемент | Правило |
|---------|---------|
| Порядок stat | `BASE_STAT_IDS` из конфига — не менять ad hoc |
| Разделитель | пробел между emoji+числом |
| Rating | ` · ★{percent}%` в конце; опционально (`showRating`) |
| Классовые бонусы | **не** подсвечивать в строке; только tooltip класса |

**Tooltip на stat (desktop — `Tooltip`, mobile — см. §7):**

```
Здоровье (❤️)
Максимум HP в бою после level и worldPower.
База: 23  →  с экипировкой: 25
```

**Tooltip на класс / имя кандидата:**

```
Воин
Primary (+50% диапазон): ❤️ HP, 🛡 защита
Secondary (+25%): ⚔ атака
```

---

## 3. Карточки таверны

Структура карточки кандидата (сверху вниз):

1. **Заголовок:** `{classLabel} — {price} золота`
2. **StatStrip** + rating
3. **Стартовая экипировка** (кратко, как сейчас)
4. **CTA:** «Нанять»

Jackpot-статы (value > configMax) — без special color в MVP; игрок узнаёт через tooltip или необычно высокое число в строке.

---

## 4. Roster и профиль

| Место | Паттерн |
|-------|---------|
| Roster row | `class · ⭐level · ★78%` + **одна строка** StatStrip (опционально сокращённая: top-4 stats + «…» только если не хватает места — **не в MVP**) |
| Hero profile | полный StatStrip, блок экипировки, карты — как сейчас |
| Preview equip | при смене шмота показывать delta effective stats, не только HP/card level |

---

## 5. Бой

| Элемент | Паттерн |
|---------|---------|
| Юнит на поле | hover → compact StatStrip + текущее `hp/maxHp` |
| Очередь хода | emoji класса/врага + `⚡{initiative}` |
| Карта | урон/лечение в tooltip карты включает вклад статов (фаза 2) |

Не блокировать тактическое поле модалками; stat details — tooltip/popover.

---

## 6. Согласованные emoji (MVP)

| Смысл | Emoji | Константа |
|-------|-------|-----------|
| HP / здоровье | ❤️ | `UI_HEART` |
| Уровень | ⭐ | `UI_LEVEL` |
| Урон | 💥 | `UI_DAMAGE` |
| Клетка | ⬜ | `UI_CELL` |
| Защита | 🛡 | `UI_DEFENSE` |
| Атака | ⚔ | `UI_ATTACK` |
| Магия | ✨ | `UI_MAGIC` |
| Мана | 🔮 | `UI_MANA` |
| Исцеление | 💚 | `UI_HEAL` |
| Скорость | 👟 | `UI_SPEED` |
| Инициатива | ⚡ | `UI_INITIATIVE` |
| Крит | 🎯 | `UI_CRIT` |
| Rating | ★ | `UI_RATING` |

---

## 7. Touch и accessibility

- **Desktop:** `Tooltip` с `mouseEnterDelay={0.3}`.
- **Touch:** tap по stat открывает `Popover` (controlled); второй tap вне закрывает.
- **Keyboard:** stat pills — `tabIndex={0}`, `aria-label` = полный текст tooltip.
- **Цвет:** не только цвет для stat delta; дублировать `+N` текстом.

---

## 8. Ant Design

- Сообщения — `App.useApp().message`, не static `message`.
- Плотные списки — `size="small"`, `List bordered`.
- Предупреждения expedition/roster cap — `Alert` `showIcon`.

---

## 9. Чего избегать

- Длинные таблицы статов на главных экранах.
- Разные формулы preview vs бой (использовать `effectiveStats` из ядра).
- Новые emoji для тех же stat id в разных экранах.
- Отдельные tooltip-формулировки для героев и монстров (один шаблон, разные numbers).

---

## 10. Связанные документы

- [Базовые характеристики — spec](docs/superpowers/specs/2026-06-22-character-base-stats-design.md)
- [Party / expedition — spec](docs/superpowers/specs/2026-06-22-party-squad-expedition-design.md)
- [Геймдизайн](docs/superpowers/specs/2026-03-28-gen-game-design.md)
