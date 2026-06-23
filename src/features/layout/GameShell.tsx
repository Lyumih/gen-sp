import type { ReactNode } from 'react'
import './game-layout.css'

export function GameShell({ children }: { children: ReactNode }) {
  return <div className="game-shell">{children}</div>
}
