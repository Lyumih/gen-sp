# Tasks 13–17 Report — Passive UI & Codex

**Date:** 2026-06-23  
**Status:** Complete  
**Verification:** `npm run test` — 464 passed; `npm run build` — OK  
**Push:** Not performed (per request)

## Commits

| Commit | Task | Message |
|--------|------|---------|
| `3ebb1f8` | 13 | feat(passives): add passiveText tooltip descriptions |
| `4a262e1` | 14 | feat(codex): add passive category «Навыки» with 32 entries |
| `59de9ec` | 15 | feat(ui): chest unbound passives bind and sell |
| `e87b6e1` | 16 | feat(ui): passive equip slots with mod picker and stack reject |
| `a36a1f7` | 17 | feat(shop): passive offer slot and BUY_SHOP_OFFER branch |

---

## Task 13 — passiveText descriptions

**Files:** `src/game/descriptions/passiveText.ts`, `passiveText.test.ts`

- `getPassiveDisplayLabel(templateId)` — label from passive template
- `describePassiveStats(passive, character, campaign)` — tooltip lines:
  - Russian trigger label (`on_damaged` → «При получении урона», etc.)
  - `descriptionRu` from template
  - Current level
  - Stat bonus at current L using `computePassiveFlatBonus` / `computePassivePctBonus` + `BASE_STAT_META` emoji
  - Preview at L=100 for stat passives
  - Proc chance line for proc passives

---

## Task 14 — Codex «Навыки»

**Files:** `registry.ts`, `codexShared.ts`, `codexText.ts`, `registry.test.ts`

- New `CodexCategory`: `'passive'`
- 32 entries from `PASSIVE_TEMPLATES`, ordered after `card` in `allCodexEntries()`
- `CODEX_CATEGORY_ORDER`: `… card → passive → mod → enemy`
- Label «Навыки»; empty hint for bind/tavern discovery
- `describeCodexEntry` uses `describePassiveStats` for detail
- Discovery on bind/tavern/drop already wired in `runReducer` via `passive:{templateId}`

---

## Task 15 — Chest UI unbound passives

**Files:** `ChestInventoryView.tsx`, `inventoryDnD.ts`, `CampaignCharacterTab.tsx`, `CampaignHub.tsx`, `CampaignShopTab.tsx`

- Grid renders `chest.unboundPassives` after items and unbound cards
- Popover: `describePassiveStats`, bind (max 4 per hero), sell at `sellPriceForPassive()`
- `BIND_PASSIVE_TO_CHARACTER` / `SELL_UNBOUND_PASSIVE` dispatched from hub
- `inventoryLocked` during expedition (disabled + no bind)
- DnD IDs: `chest-passive:` prefix in `inventoryDnD.ts`
- `resolvePassiveEmoji()` from semantic emoji id

---

## Task 16 — 4 passive equip slots

**Files:** `CardsInventoryView.tsx`, `ModOfferPicker.tsx`, `CampaignCharacterTab.tsx`

- Section «Навыки» below cards: 4 droppable `passive-equip:` slots
- Collection of owned passives (not currently equipped); drag → `SET_PASSIVE_EQUIP`
- Unequip by dragging out of slot
- `canEquipPassive` check on drop; `message.warning` + red slot flash on `stat_stack_conflict`
- Mod picker supports `carrierKind: 'passive'` (`getPassiveModTemplate` fallback)
- Expedition freeze via `inventoryLocked`

---

## Task 17 — Shop passive offer

**Files:** `ShopOffersGrid.tsx`, `CampaignShopTab.tsx`, `runReducer.ts`, `runReducer.test.ts`

- Renders `kind: 'passive'` at `SKILL_ACQUISITION.shopPassivePrice` → `chest.unboundPassives`
- `BUY_SHOP_OFFER` passive branch: gold deduct, instance create, codex discover
- Test: `BUY_SHOP_OFFER passive adds passive to chest`

---

## Manual smoke checklist

- [ ] Victory drop → passive in chest → bind to hero with &lt;4 passives
- [ ] Bind disabled at 4 passives; sell unbound passive for 50% price (dev)
- [ ] Drag passive to equip slot; reject duplicate stat_flat/pct on same stat
- [ ] Shop passive offer → buy → chest → bind
- [ ] Codex «Навыки» shows 32 entries; discovery after bind/tavern/buy

---

## Notes

- Task 18 (help + full verification) not in scope; test + build run here.
- No push to remote.
