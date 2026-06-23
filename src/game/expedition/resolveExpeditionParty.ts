export type ResolveExpeditionPartyInput = {
  squad: readonly (string | null)[]
  markedIds: readonly string[]
  maxParty: number
}

export function countOccupiedSquadSlots(squad: readonly (string | null)[]): number {
  return squad.filter((id): id is string => id !== null).length
}

export function resolveExpeditionParty(input: ResolveExpeditionPartyInput): string[] {
  const markedSet = new Set(input.markedIds)
  const candidates: string[] = []

  for (const id of input.squad) {
    if (id === null) continue
    if (input.markedIds.length === 0 || markedSet.has(id)) {
      candidates.push(id)
    }
  }

  return candidates.slice(0, input.maxParty)
}
