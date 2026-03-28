export type Side = 'player' | 'enemy'

export type Unit = {
  id: string
  side: Side
  x: number
  y: number
  hp: number
  maxHp: number
  unitLevel: number
}

export type ModificationInstance = {
  level: number
}

export type CardInstance = {
  id: string
  templateId: string
  global_level: number
  uses_count: number
  modifications: ModificationInstance[]
}

/** Поля карточки, участвующие в прогрессе за использование. */
export type CardProgressSlice = Pick<CardInstance, 'global_level' | 'uses_count'>
