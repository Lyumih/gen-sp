# Campaign hub top menu — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Хаб кампании с HUD и вкладками Персонаж · Бой · Магазин по спеке `docs/superpowers/specs/2026-06-18-campaign-hub-top-menu-design.md`.

**Architecture:** `CampaignHub` — оркестратор с `activeTab`; подкомпоненты вкладок и HUD/Nav; `HeroProfileContent` переиспользуется в `HeroProfileModal` (бой) и `CampaignCharacterTab` (хаб).

**Tech Stack:** React 19, Ant Design 6, TypeScript, Zustand.

**Spec:** `docs/superpowers/specs/2026-06-18-campaign-hub-top-menu-design.md`

---

### Task 1: HeroProfileContent

- Create `src/features/profile/HeroProfileContent.tsx`
- Refactor `HeroProfileModal.tsx` to Modal + content
- Flags: `includeResourceStats`, `includeEquipmentReadout`, `includeCardsCollapse`

### Task 2: Hub shell

- Create `CampaignHubHud`, `CampaignHubNav`, `campaignHubShared.ts`
- Rewrite `CampaignHub.tsx` with tab state default `'battle'`

### Task 3: Tab panels

- `CampaignBattleTab`, `CampaignCharacterTab`, `CampaignShopTab`
- Move logic from old monolithic hub without reducer changes

### Task 4: Verify

- `npm run build`, `npm run lint`
- Manual: HUD on all tabs; equip/buy; battle modal unchanged

**Status:** implemented in session 2026-06-18.
