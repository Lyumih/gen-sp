import { describe, expect, it } from "vitest";
import { LEGACY_HERO_CHARACTER_ID } from "../character/constants";
import type { BattleState } from "../types";
import { applyAction } from "./reducer";
import { applyRaceDamageModifiers, applyElementalResistModifiers } from "./enemyResists";

const HERO_ID = LEGACY_HERO_CHARACTER_ID;

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

describe("applyElementalResistModifiers", () => {
  it("reduces fireball damage when fire ward is active", () => {
    const shaman = {
      id: "shaman",
      side: "enemy" as const,
      x: 0,
      y: 0,
      hp: 20,
      maxHp: 20,
      unitLevel: 1,
      statusEffects: [
        {
          id: "ward",
          kind: "elemental_resist" as const,
          remainingTurns: 3,
          magnitude: 30,
          sourceTemplateId: "fire",
        },
      ],
    };
    expect(applyElementalResistModifiers(100, "fireball", shaman)).toBe(70);
    expect(applyElementalResistModifiers(100, "frost_nova", shaman)).toBe(100);
  });
});

describe("race resists in battle reducer", () => {
  it("undead enemy takes 150 from holy strike", () => {
    const s: BattleState = {
      width: 4,
      height: 4,
      walls: [],
      units: [
        {
          id: HERO_ID,
          side: "player",
          x: 0,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
        },
        {
          id: "e1",
          side: "enemy",
          x: 1,
          y: 0,
          hp: 200,
          maxHp: 200,
          unitLevel: 1,
          raceId: "undead",
        },
      ],
      turnOrder: [HERO_ID, "e1"],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: "ongoing",
      worldPower: 0,
      playerCardsByUnitId: {},
      battleLog: [],
    };
    const next = applyAction(s, {
      type: "attack",
      attackerId: HERO_ID,
      targetId: "e1",
      damage: 100,
      kind: "melee",
      fromCard: { cardId: "c1", templateId: "holy_strike" },
    });
    expect(next.units.find((u) => u.id === "e1")!.hp).toBe(50);
  });
});
