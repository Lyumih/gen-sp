export type RaceId =
  | "beast"
  | "undead"
  | "human"
  | "orc"
  | "elf"
  | "specter"
  | "construct"
  | "demon";

export type DamageTag =
  | "holy"
  | "dark"
  | "poison"
  | "melee"
  | "ranged"
  | "magic"
  | "fire"
  | "crit";

export type RaceDefinition = {
  id: RaceId;
  labelRu: string;
  resists: Partial<Record<DamageTag, number>>;
  vulnerables: Partial<Record<DamageTag, number>>;
  traitDescriptionRu: string;
};

const ENEMY_RACES: Readonly<Record<RaceId, RaceDefinition>> = {
  beast: {
    id: "beast",
    labelRu: "Зверь",
    resists: { poison: 0.3 },
    vulnerables: { holy: 0.25 },
    traitDescriptionRu: "+1 скорость",
  },
  undead: {
    id: "undead",
    labelRu: "Нежить",
    resists: { dark: 0.2 },
    vulnerables: { holy: 0.5 },
    traitDescriptionRu: "получаемое исцеление −25%",
  },
  human: {
    id: "human",
    labelRu: "Человек",
    resists: {},
    vulnerables: {},
    traitDescriptionRu: "+1 защита",
  },
  orc: {
    id: "orc",
    labelRu: "Орк",
    resists: { melee: 0.15 },
    vulnerables: { magic: 0.15 },
    traitDescriptionRu: "+2 атака при HP < 50%",
  },
  elf: {
    id: "elf",
    labelRu: "Эльф",
    resists: { magic: 0.15 },
    vulnerables: { poison: 0.25 },
    traitDescriptionRu: "+1 инициатива",
  },
  specter: {
    id: "specter",
    labelRu: "Призрак",
    resists: { melee: 0.3, poison: 1 },
    vulnerables: { holy: 0.4 },
    traitDescriptionRu: "проход 1 стены/ход (фаза 2)",
  },
  construct: {
    id: "construct",
    labelRu: "Конструкт",
    resists: { crit: 0.5 },
    vulnerables: { magic: 0.2 },
    traitDescriptionRu: "не лечится; +защита",
  },
  demon: {
    id: "demon",
    labelRu: "Демон",
    resists: { fire: 0.25, dark: 0.25 },
    vulnerables: { holy: 0.35 },
    traitDescriptionRu: "вампиризм 10% на ударах",
  },
};

export function getRaceDefinition(id: RaceId): RaceDefinition {
  return ENEMY_RACES[id];
}
