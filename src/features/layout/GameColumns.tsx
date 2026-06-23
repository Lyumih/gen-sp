import type { ReactNode } from 'react'
import './game-layout.css'

export function GameColumns({ children }: { children: ReactNode }) {
  return <div className="game-columns">{children}</div>
}
