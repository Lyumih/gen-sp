import { describe, expect, it } from "vitest";
import {
  SPECIALIZATION_IDS,
  SPECIALIZATION_TEMPLATES,
  getSpecializationTemplate,
} from "./specializationTemplates";
import { pickRandomSpecializationId } from "./pickRandom";

describe("specializationTemplates", () => {
  it("has 15 entries with unique ids", () => {
    expect(SPECIALIZATION_IDS).toHaveLength(15);
    expect(new Set(SPECIALIZATION_IDS).size).toBe(15);
    for (const id of SPECIALIZATION_IDS) {
      expect(getSpecializationTemplate(id)?.id).toBe(id);
    }
  });

  it("pickRandomSpecializationId returns pool members", () => {
    let i = 0;
    const rng = () => (i++ % SPECIALIZATION_IDS.length) / SPECIALIZATION_IDS.length;
    const id = pickRandomSpecializationId(rng);
    expect(SPECIALIZATION_IDS).toContain(id);
  });

  it("meta_drop_skill has multiplier 1.5", () => {
    expect(SPECIALIZATION_TEMPLATES.meta_drop_skill?.params.multiplier).toBe(1.5);
  });
});
