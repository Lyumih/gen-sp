import type { PlaceholderModeDef } from '../../game/modes/placeholders'
import '../layout/game-layout.css'
import { BattleModePlaceholderTile } from './BattleModePlaceholderTile'

export type BattleModePlaceholderGridProps = {
  title: string
  modes: readonly PlaceholderModeDef[]
}

export function BattleModePlaceholderGrid({ title, modes }: BattleModePlaceholderGridProps) {
  if (modes.length === 0) return null

  return (
    <section className="game-mode-section game-mode-section--inactive">
      <h4 className="game-mode-section__title">{title}</h4>
      <div className="game-mode-grid">
        {modes.map((mode) => (
          <BattleModePlaceholderTile key={mode.id} mode={mode} />
        ))}
      </div>
    </section>
  )
}
