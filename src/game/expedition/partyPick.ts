export function shouldOpenPartyPickModal(occupiedCount: number, maxParty: number): boolean {
  return occupiedCount > maxParty
}
