import { describe, expect, it } from "vitest";
import { initialCampaignState } from "../campaign/runReducer";
import { createCharacter } from "../character/createCharacter";
import { computeBaseStatRating } from "../stats/computeRating";
import { STARTER_HERO_BASE_STATS } from "../config/baseStats";
import {
  isSpecializationActive,
  partyMetaMultiplier,
  rollWithLuckyRetry,
  softRollbackCarrierLevel,
} from "./resolve";

function char(id: string, spec: string | null) {
  return {
    ...createCharacter({
      id,
      name: id,
      classId: "warrior",
      baseStats: STARTER_HERO_BASE_STATS,
      baseStatRating: computeBaseStatRating(STARTER_HERO_BASE_STATS),
    }),
    specializationId: spec,
  };
}

describe("isSpecializationActive", () => {
  it("active when in squad", () => {
    const c = char("a", "meta_drop_skill");
    const campaign = {
      ...initialCampaignState(),
      characters: [c],
      squad: ["a", null, null, null],
    };
    expect(isSpecializationActive(campaign, "a")).toBe(true);
  });

  it("inactive in reserve", () => {
    const c = char("a", "meta_drop_skill");
    const campaign = {
      ...initialCampaignState(),
      characters: [c],
      squad: [null, null, null, null],
    };
    expect(isSpecializationActive(campaign, "a")).toBe(false);
  });
});

describe("partyMetaMultiplier", () => {
  it("best of duplicates not stacked", () => {
    const a = char("a", "meta_drop_skill");
    const b = char("b", "meta_drop_skill");
    const campaign = {
      ...initialCampaignState(),
      characters: [a, b],
      squad: ["a", "b", null, null],
    };
    expect(partyMetaMultiplier(campaign, "meta_drop_skill")).toBe(1.5);
  });
});

describe("rollWithLuckyRetry", () => {
  it("retries once on fail", () => {
    let calls = 0;
    const rng = () => {
      calls++;
      return calls === 1 ? 1 : 100;
    };
    expect(rollWithLuckyRetry(50, rng, true)).toBe(true);
    expect(calls).toBe(2);
  });
});

describe("softRollbackCarrierLevel", () => {
  it("L=90 slot 1 → 87", () => {
    const prodLikeThreshold = (slotIndex: number) => 75 + 100 * slotIndex;
    expect(softRollbackCarrierLevel(90, 1, prodLikeThreshold)).toBe(87);
  });
});
