import type { ExpeditionChainConfig } from '../../game/expedition/config'
import '../layout/game-layout.css'
import { BattleModeTile } from './BattleModeTile'

export type BattleModeGridProps = {
  title?: string
  soon?: boolean
  chains: readonly ExpeditionChainConfig[]
  disabled?: boolean
  getBadge?: (chain: ExpeditionChainConfig) => string | undefined
  onSelect: (chainId: string) => void
}

export function BattleModeGrid({
  title,
  soon = false,
  chains,
  disabled = false,
  getBadge,
  onSelect,
}: BattleModeGridProps) {
  if (chains.length === 0) return null

  return (
    <section className={soon ? 'game-mode-section game-mode-section--soon' : 'game-mode-section'}>
      {title ? <h4 className="game-mode-section__title">{title}</h4> : null}
      <div className="game-mode-grid">
        {chains.map((chain) => (
          <BattleModeTile
            key={chain.id}
            chain={chain}
            disabled={disabled}
            badge={getBadge?.(chain)}
            onClick={() => onSelect(chain.id)}
          />
        ))}
      </div>
    </section>
  )
}
