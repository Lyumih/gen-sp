import { allBattlePlayerCards } from '../battle/playerCards'
import type { BattleState, CampaignState } from '../types'
import {
  codexEntriesByCategory,
  codexEntryById,
  codexEntryId,
  type CodexCategory,
  type CodexEntry,
} from './registry'

export { codexEntryId }

export function discoverCodexEntry(
  discovered: readonly string[],
  entryId: string,
): readonly string[] {
  if (discovered.includes(entryId)) return discovered
  return [...discovered, entryId]
}

export function codexProgress(
  campaign: CampaignState,
  category: CodexCategory,
): { opened: number; total: number } {
  const entries = codexEntriesByCategory(category)
  const discoveredSet = new Set(campaign.codexDiscovered)
  const opened = entries.filter((entry) => discoveredSet.has(entry.id)).length
  return { opened, total: entries.length }
}

export function visibleCodexEntries(
  campaign: CampaignState,
  category: CodexCategory,
  showAll: boolean,
): readonly CodexEntry[] {
  const entries = codexEntriesByCategory(category)
  if (showAll) return entries
  const discoveredSet = new Set(campaign.codexDiscovered)
  return entries.filter((entry) => discoveredSet.has(entry.id))
}

export function unreadCodexEntryIds(campaign: CampaignState): readonly string[] {
  const seenSet = new Set(campaign.codexSeenEntryIds)
  return campaign.codexDiscovered.filter((id) => {
    if (seenSet.has(id)) return false
    const entry = codexEntryById(id)
    if (!entry) {
      if (import.meta.env.DEV) {
        console.warn(`[gen-sp] codex: stale discovered id ${id}`)
      }
      return false
    }
    return true
  })
}

export function markCodexSeen(campaign: CampaignState): CampaignState {
  const seenSet = new Set(campaign.codexSeenEntryIds)
  const merged = [...campaign.codexSeenEntryIds]
  for (const id of campaign.codexDiscovered) {
    if (!seenSet.has(id)) {
      seenSet.add(id)
      merged.push(id)
    }
  }
  if (merged.length === campaign.codexSeenEntryIds.length) return campaign
  return { ...campaign, codexSeenEntryIds: merged }
}

export function mergeBattleCodexDiscoveries(
  prev: BattleState,
  next: BattleState,
  discovered: readonly string[],
): readonly string[] {
  let result = discovered

  const nextUnitsById = new Map(next.units.map((unit) => [unit.id, unit]))
  for (const prevUnit of prev.units) {
    if (prevUnit.side !== 'enemy' || prevUnit.hp <= 0) continue
    const nextUnit = nextUnitsById.get(prevUnit.id)
    if (nextUnit && nextUnit.hp <= 0 && nextUnit.archetypeId) {
      result = discoverCodexEntry(result, codexEntryId('enemy', nextUnit.archetypeId))
    }
  }

  const prevCardsById = new Map(allBattlePlayerCards(prev).map((card) => [card.id, card]))
  for (const nextCard of allBattlePlayerCards(next)) {
    const prevCard = prevCardsById.get(nextCard.id)
    if (!prevCard) continue
    for (let i = 0; i < nextCard.modifications.length; i++) {
      const prevMod = prevCard.modifications[i]
      const nextMod = nextCard.modifications[i]
      if (prevMod && nextMod && prevMod.level === 0 && nextMod.level > 0) {
        result = discoverCodexEntry(result, codexEntryId('mod', nextMod.templateId))
      }
    }
  }

  const newLogEntries = next.battleLog.slice(prev.battleLog.length)
  for (const entry of newLogEntries) {
    if (entry.type === 'strike' && entry.fromCard) {
      result = discoverCodexEntry(result, codexEntryId('card', entry.fromCard.templateId))
    }
  }

  return result
}
