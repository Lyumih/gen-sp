import type { ReactNode } from 'react'
import './game-layout.css'

type GamePanelProps = {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
}

export function GamePanel({ title, extra, children }: GamePanelProps) {
  const hasHead = title !== undefined || extra !== undefined
  return (
    <section className="game-panel">
      {hasHead ? (
        <div className="game-panel__head">
          {title !== undefined ? <h3 className="game-panel__title">{title}</h3> : <span />}
          {extra ?? null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
