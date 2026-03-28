# Gen-sp

MVP тактической RPG **Gen**: пошаговые бои на сетке (4 направления), прогресс «Memento Mori», цепочка сценариев, автосохранение. UI — React 19, Ant Design 6, Zustand; игровое ядро — чистые функции в `src/game/**`.

## Команды

| Команда | Назначение |
|--------|------------|
| `npm run dev` / `npm run start` | Dev-сервер (Vite) |
| `npm run test` | Vitest, unit-тесты ядра |
| `npm run build` | `tsc -b` и production-сборка |
| `npm run lint` | ESLint |

## Документы

- Спека геймдизайна: [docs/superpowers/specs/2026-03-28-gen-game-design.md](docs/superpowers/specs/2026-03-28-gen-game-design.md)
- План реализации MVP: [docs/superpowers/plans/2026-03-28-gen-game-implementation.md](docs/superpowers/plans/2026-03-28-gen-game-implementation.md)

## Сохранения

Снимок кампании пишется в `localStorage` с версией схемы (`SAVE_VERSION` в `src/game/persistence/schema.ts`), ключ по умолчанию: `gen-sp-save-v1`. Подписка Zustand дебаунсит запись (300 ms).
