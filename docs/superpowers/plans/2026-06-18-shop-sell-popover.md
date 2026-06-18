# Shop stash sell via popover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Продажа stash через popover + Popconfirm в магазине и на «Персонаже»; buy/sell в описании; бейдж 💰sell в магазине; убрать drag-зону продажи.

**Architecture:** `itemBuyPriceLine` в `itemText.ts`; новый `StashItemPopoverContent`; интеграция в `ShopInventoryView` и `EquipmentInventoryView`; `onSell` в `CampaignShopTab`.

**Tech Stack:** React 19, Ant Design 6, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-18-shop-sell-popover-design.md`

## Global Constraints

- Reducer без изменений (`SELL_ITEM` уже есть)
- Popconfirm: «Продать за X зол.?», ok «Продать», cancel «Отмена»
- `inBattle` → кнопка disabled
- Убрать `DROP_SELL` drop zone с «Персонажа»

---

### Task 1: itemBuyPriceLine + tests

**Files:** `src/game/descriptions/itemText.ts`, `itemText.test.ts`

- Add `itemBuyPriceLine(t)` → `Покупка: ${t.shopPrice} зол.`
- Append buy line before sell in `itemInstanceDescriptionLines`
- Tests for buy line and both prices in description

### Task 2: StashItemPopoverContent

**Files:** Create `src/features/inventory/StashItemPopoverContent.tsx`

- ul from `itemInstanceDescriptionLinesFromInstance`
- Popconfirm + Button danger «Продать»
- Tooltip when inBattle

### Task 3: ShopInventoryView + CampaignShopTab + Hub

- `onSell` prop chain
- StashPreviewCell: popover + sell badge `💰{itemSellPrice}`

### Task 4: EquipmentInventoryView cleanup

- Replace inline itemPopover with StashItemPopoverContent
- Remove DROP_SELL zone and handler

### Task 5: Verify

- `npm run test`, `npm run build`, `npm run lint`
