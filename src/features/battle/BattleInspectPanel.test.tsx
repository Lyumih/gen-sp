import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import {
  battleStateFromScenario,
  type BattleScenario,
} from '../../game/campaign/scenarios'
import { LEGACY_HERO_CHARACTER_ID } from '../../game/character/constants'
import { EMPTY_EQUIPMENT } from '../../game/equipment/equipmentOrder'
import { TEST_BASE_STATS } from '../../game/stats/testFixtures'
import type { BattleAttemptSnapshot, PartyMemberBattleSnapshot } from '../../game/types'
import { buildBattleUnitInspectModel } from './battleInspectModel'
import { BattleInspectPanel } from './BattleInspectPanel'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function member(
  over: Partial<PartyMemberBattleSnapshot> & Pick<PartyMemberBattleSnapshot, 'characterId'>,
): PartyMemberBattleSnapshot {
  return {
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    cards: [],
    passives: [],
    passiveEquip: [null, null, null, null, null],
    battleLoadout: [null, null, null, null],
    metaStatus: 'active',
    spawnIndex: 0,
    ...over,
  }
}

const ravagerScenario: BattleScenario = {
  id: 'ravager-test',
  width: 6,
  height: 4,
  walls: [],
  playerSpawns: [{ x: 0, y: 2 }],
  heroBaseHpStat: 20,
  enemySpawns: [
    { kind: 'fixed', archetypeId: 'enemy_orc_ravager', x: 5, y: 2, unitLevel: 1 },
  ],
}

describe('BattleInspectPanel', () => {
  it('renders enemy skill cells from inspect model', () => {
    const snap: BattleAttemptSnapshot = {
      worldPower: 0,
      scenarioSlotIndex: 0,
      gold: 0,
      party: [member({ characterId: HERO_ID })],
    }
    const battle = battleStateFromScenario(ravagerScenario, snap)
    const enemy = battle.units.find((u) => u.side === 'enemy')
    expect(enemy).toBeDefined()
    const campaign = initialCampaignState()
    const model = buildBattleUnitInspectModel(battle, campaign, enemy!.id)
    expect(model?.cards.length).toBe(3)
    const html = renderToStaticMarkup(
      createElement(BattleInspectPanel, {
        model: model!,
        campaign,
        onClose: () => {},
      }),
    )
    expect(html).toContain('Осмотр:')
    expect(html).toContain('inv-cell')
  })
})
