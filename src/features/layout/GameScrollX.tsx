import type { ReactNode } from 'react'
import './game-layout.css'

export function GameScrollX({ children }: { children: ReactNode }) {
  return <div className="game-scroll-x">{children}</div>
}
