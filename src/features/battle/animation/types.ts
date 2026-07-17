export type Cell = { x: number; y: number }

export type AnimationStep =
  | { kind: 'move'; unitId: string; from: Cell; to: Cell }
  | { kind: 'teleport'; unitId: string; from: Cell; to: Cell }
  | { kind: 'strike_melee'; attackerId: string; targetId: string; damage: number }
  | {
      kind: 'projectile'
      attackerId: string
      targetId: string
      damage: number
      attackKind: 'ranged' | 'aoe'
      projectileEmoji?: string
    }
  | { kind: 'cast'; casterId: string; targetId: string }
  | { kind: 'aoe_burst'; center: Cell; cellKeys: readonly string[] }
  | { kind: 'heal'; healerId: string; targetId: string; amount: number }
  | { kind: 'resurrect'; healerId: string; targetId: string; hp: number }
  | { kind: 'buff_aura'; unitId: string; statusKind: string; holy?: boolean }
  | { kind: 'debuff_aura'; unitId: string; statusKind: string }
  | { kind: 'status_tick_dot'; unitId: string; damage: number }
  | { kind: 'status_tick_regen'; unitId: string; amount: number }
  | { kind: 'death'; unitId: string; at: Cell }

export type LogToStepsContext = {
  units: readonly import('../../../game/types').Unit[]
}
