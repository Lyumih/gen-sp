import { GameScrollX } from '../layout/GameScrollX'
import { BattleModeTile } from './BattleModeTile'
import { BattleModePlaceholderTile } from './BattleModePlaceholderTile'
import type { BattleModeListEntry } from './buildBattleModeEntries'
import './battle-mode-picker.css'

export type BattleModeListProps = {
  entries: readonly BattleModeListEntry[]
  disabled?: boolean
  onSelectChain: (chainId: string) => void
}

export function BattleModeList({ entries, disabled = false, onSelectChain }: BattleModeListProps) {
  if (entries.length === 0) return null
  return (
    <GameScrollX>
      <div className="game-mode-strip" role="list">
        {entries.map((entry) => {
          if (entry.kind === 'chain') {
            return (
              <div key={entry.chain.id} id={entry.scrollTargetId} role="listitem">
                <BattleModeTile
                  chain={entry.chain}
                  categoryLabel={entry.categoryLabel}
                  badge={entry.badge}
                  disabled={disabled}
                  onClick={() => onSelectChain(entry.chain.id)}
                />
              </div>
            )
          }
          return (
            <div key={entry.mode.id} role="listitem">
              <BattleModePlaceholderTile mode={entry.mode} categoryLabel={entry.categoryLabel} />
            </div>
          )
        })}
      </div>
    </GameScrollX>
  )
}
