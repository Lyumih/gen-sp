import { describe, expect, it } from "vitest";
import { applyRaceDamageModifiers } from "./enemyResists";

describe("applyRaceDamageModifiers", () => {
  it("undead takes +50% holy damage", () => {
    const out = applyRaceDamageModifiers(100, ["holy", "attack"], "undead");
    expect(out).toBe(150);
  });

  it("beast resists poison by 30%", () => {
    const out = applyRaceDamageModifiers(100, ["poison"], "beast");
    expect(out).toBe(70);
  });

  it("unknown race leaves damage unchanged", () => {
    expect(applyRaceDamageModifiers(100, ["holy"], undefined)).toBe(100);
  });
});
