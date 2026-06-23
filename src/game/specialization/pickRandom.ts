import { SPECIALIZATION_IDS } from "./specializationTemplates";

export function pickRandomSpecializationId(rng: () => number): string {
  const idx = Math.floor(rng() * SPECIALIZATION_IDS.length);
  return SPECIALIZATION_IDS[Math.min(idx, SPECIALIZATION_IDS.length - 1)]!;
}
