import { BattleModeTile } from './BattleModeTile'
import { BattleModePlaceholderTile } from './BattleModePlaceholderTile'
import { BattleModeTowerTile } from './BattleModeTowerTile'
import type { CampaignState } from '../../game/types'
import type { BattleModeListEntry } from './buildBattleModeEntries'
import './battle-mode-picker.css'

export type BattleModeListProps = {
  entries: readonly BattleModeListEntry[]
  disabled?: boolean
  onSelectChain: (chainId: string) => void
  campaign: CampaignState
  onTowerStart: () => void
  onResetTower: () => void
}

export function BattleModeList({
  entries,
  disabled = false,
  onSelectChain,
  campaign,
  onTowerStart,
  onResetTower,
}: BattleModeListProps) {
  if (entries.length === 0) return null
  return (
    <div className="game-mode-strip" role="list">
      {entries.map((entry) => {
        if (entry.kind === 'tower') {
          return (
            <div key="tower" role="listitem" className="game-mode-strip__item">
              <BattleModeTowerTile
                campaign={campaign}
                disabled={disabled}
                onStart={onTowerStart}
                onResetTower={onResetTower}
              />
            </div>
          )
        }
        if (entry.kind === 'chain') {
          return (
            <div
              key={entry.chain.id}
              id={entry.scrollTargetId}
              role="listitem"
              className="game-mode-strip__item"
            >
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
          <div key={entry.mode.id} role="listitem" className="game-mode-strip__item">
            <BattleModePlaceholderTile mode={entry.mode} categoryLabel={entry.categoryLabel} />
          </div>
        )
      })}
    </div>
  )
}
