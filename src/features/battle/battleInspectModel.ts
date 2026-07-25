import { getUnitDisplay } from '../../game/character/display'
import type { BaseStats } from '../../game/config/baseStats'
import { unitBattleEffectiveStats } from '../../game/battle/unitBattleEffectiveStats'
import type {
  BattlePlayerCard,
  BattleState,
  CampaignState,
  Character,
  PassiveInstance,
  Unit,
} from '../../game/types'

export type BattleUnitInspectModel = {
  unit: Unit
  display: ReturnType<typeof getUnitDisplay>
  baseStats: BaseStats
  effectiveStats: BaseStats
  cards: readonly BattlePlayerCard[]
  passives: readonly PassiveInstance[]
  syntheticCarrier: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>
}

function syntheticCarrier(unit: Unit): Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'> {
  return {
    baseStats: unit.baseStats!,
    unitLevel: unit.unitLevel,
    items: [],
    equipment: { weapon: null, armor: null, accessory: null },
  }
}

export function buildBattleUnitInspectModel(
  battle: BattleState,
  campaign: CampaignState,
  unitId: string,
): BattleUnitInspectModel | null {
  const unit = battle.units.find((u) => u.id === unitId)
  if (!unit?.baseStats) return null
  const stats = unitBattleEffectiveStats(battle, unit, campaign)
  if (!stats) return null
  const cards =
    battle.enemyCardsByUnitId?.[unitId] ??
    battle.playerCardsByUnitId[unitId] ??
    []
  const passives = battle.passivesByUnitId?.[unitId] ?? []
  return {
    unit,
    display: getUnitDisplay(unit, campaign),
    baseStats: stats.base,
    effectiveStats: stats.effective,
    cards,
    passives,
    syntheticCarrier: syntheticCarrier(unit),
  }
}
