import type { BattleLogEntry } from '../../game/types'
import { battleLogEntryTone, formatBattleLogEntry, type BattleLogUnitLookup } from '../../game/battle/battleLog'

const TONE_CLASS = {
  hero: 'battle-log--hero',
  enemy: 'battle-log--enemy',
  neutral: 'battle-log--neutral',
} as const

export function BattleLogLine({
  entry,
  unitSideLookup,
  unitLogLookup,
}: {
  entry: BattleLogEntry
  unitSideLookup: (unitId: string) => 'player' | 'enemy' | undefined
  unitLogLookup?: BattleLogUnitLookup
}) {
  const tone = battleLogEntryTone(entry, unitSideLookup)
  return (
    <div className={`battle-log-line ${TONE_CLASS[tone]}`}>
      {formatBattleLogEntry(entry, unitLogLookup)}
    </div>
  )
}
