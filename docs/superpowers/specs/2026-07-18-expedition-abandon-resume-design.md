# Дизайн: выход из боя экспедиции и возобновление

**Дата:** 2026-07-18  
**Статус:** утверждено (brainstorming)  
**Связь:** `docs/superpowers/specs/2026-07-18-battle-mode-picker-design.md`, `src/game/campaign/runReducer.ts`, `src/features/campaign/CampaignBattleTab.tsx`, `src/features/campaign/InterBattleScreen.tsx`, `src/App.tsx`

---

## 1. Проблема

При **«Выйти»** из боя во время экспедиции `ABANDON_BATTLE` ставит `phase: 'hub'`, но **не очищает** `expedition`. Игрок попадает в soft lock:

- все плитки режимов disabled;
- магазин/таверна frozen;
- Alert «Недоступно во время экспедиции» **без CTA**;
- состояние **сохраняется** в localStorage.

Подтверждено в браузере (2026-07-18): Дуэль → Выйти → хаб с `small-skirmish, бой 1 / 1`.

---

## 2. Принятое решение

| Тема | Решение |
|------|---------|
| «Выйти» при активной экспедиции | `phase → 'inter_battle'`, `battle → null` — экран **«Между боями»** |
| `expedition.battleIndex` | **Не менять** — «Следующий бой» = повтор текущего боя |
| Solo-бой (без экспедиции) | Поведение `ABANDON_BATTLE` **без изменений** → hub |
| Orphan saves (`expedition + hub`) | Fallback-панель на вкладке «Бой» с **Продолжить / Завершить** |
| Текст Alert / лагерь | **Label** режима из конфига (`Дуэль`), не `chain.id` |
| Modal «Выйти» | Доп. строка при экспедиции: возврат в лагерь, бой не засчитается |

---

## 3. Reducer: `ABANDON_BATTLE`

```ts
case 'ABANDON_BATTLE': {
  const snap = state.battleAttemptSnapshot
  if (!state.battle || !snap) return state

  const base = restorePartyFromSnapshot(
    {
      ...state,
      worldPower: snap.worldPower,
      gold: snap.gold,
      battle: null,
      battleAttemptSnapshot: null,
    },
    snap,
  )

  if (base.expedition !== null) {
    return { ...base, phase: 'inter_battle' }
  }

  return { ...base, phase: 'hub' }
}
```

---

## 4. Fallback: orphan `expedition + hub`

**Условие:** `campaign.expedition !== null && campaign.phase === 'hub' && campaign.battle === null`

**UI:** `GamePanel` или `Alert` с action на вкладке «Бой» (вместо/поверх текущего info-Alert):

| Элемент | Поведение |
|---------|-----------|
| Заголовок | `Экспедиция: {chain.label}` |
| Прогресс | `Бой {battleIndex + 1} / {battleCount}` |
| **Продолжить экспедицию** (primary) | `dispatch({ type: 'RESUME_EXPEDITION_FROM_HUB' })` → `phase: 'inter_battle'` |
| **Завершить экспедицию** (danger) | `FINISH_EXPEDITION` с confirm (как на лагере) |

Новый action `RESUME_EXPEDITION_FROM_HUB`:

```ts
if (!state.expedition || state.battle !== null) return state
return { ...state, phase: 'inter_battle' }
```

Плитки режимов остаются disabled, пока экспедиция активна.

---

## 5. Copy и labels

### 5.1. `CampaignBattleTab` Alert (во время боя экспедиции, не orphan)

Заменить `scenarioChainId` на `getExpeditionChainById(...)?.label ?? id`.

### 5.2. `InterBattleScreen`

Строка «Экспедиция: **{label}**» вместо `chain?.id ?? expedition.scenarioChainId`.

### 5.3. Modal «Выйти» (`BattleScreen.confirmAbandon`)

Если `campaign.expedition !== null`, добавить абзац:

> Экспедиция продолжится. Вы вернётесь в лагерь; текущий бой не засчитается.

---

## 6. Роутинг (`App.tsx`)

Без изменений: `phase === 'inter_battle'` → `InterBattleScreen`. После фикса abandon экспедиции пользователь попадает сюда автоматически.

---

## 7. Тестирование

| Кейс | Ожидание |
|------|----------|
| Дуэль → Выйти | `phase: inter_battle`, expedition сохранена, InterBattleScreen |
| InterBattle → Следующий бой | бой стартует с тем же `battleIndex` |
| Solo tutorial → Выйти | `phase: hub`, expedition null |
| Orphan save (hub + expedition) | Fallback с двумя кнопками; Продолжить → inter_battle |
| Завершить на fallback | hub, expedition null, плитки активны |
| Label в UI | «Дуэль», не `small-skirmish` |

Unit: `runReducer.test.ts` — новые кейсы для `ABANDON_BATTLE` с/без expedition, `RESUME_EXPEDITION_FROM_HUB`.

---

## 8. Вне scope

- Изменение freeze shop/tavern во время экспедиции
- Авто-завершение экспедиции при abandon
- Новые экраны помимо fallback-панели
