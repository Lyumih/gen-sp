import type { CSSProperties, ReactNode } from 'react'
import { Typography } from 'antd'
import type { UnitDisplay } from '../../game/character/display'
import { accentStyle } from '../../game/character/iconCatalog'
import { UI_ATTACK, UI_DEFENSE, UI_HEART } from '../../game/ui/labels'

export type UnitTokenProps = {
  display: UnitDisplay
  variant: 'grid' | 'initiative'
  unitLevel?: number
  combatStats?: { attack: number; defense: number } | null
  hp?: number
  maxHp?: number
  highlighted?: boolean
  isCurrentActor?: boolean
  isDead?: boolean
  hiddenByAnimation?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const nameStyle: CSSProperties = {
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 9,
  lineHeight: 1.1,
  width: '100%',
  textAlign: 'center',
}

export function UnitToken({
  display,
  variant,
  combatStats,
  hp,
  maxHp,
  highlighted,
  isCurrentActor,
  isDead,
  hiddenByAnimation,
  onMouseEnter,
  onMouseLeave,
}: UnitTokenProps) {
  if (hiddenByAnimation) {
    return (
      <span
        className="unit-token unit-token--anim-hidden"
        style={{ width: '100%', height: '100%' }}
        aria-hidden
      />
    )
  }

  const ring = accentStyle(display.accent)
  const emojiSize = variant === 'grid' ? 28 : 22

  const emojiNode = (
    <span
      className="unit-token__accent-ring"
      style={{
        borderColor: ring.borderColor,
        background: ring.background,
        filter: ring.filter,
        fontSize: emojiSize,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderStyle: 'solid',
        borderRadius: 8,
        padding: '1px 4px',
      }}
      aria-hidden
    >
      {display.emoji}
    </span>
  )

  const nameNode = (
    <Typography.Text
      style={{
        ...nameStyle,
        fontSize: variant === 'initiative' ? 10 : 9,
        opacity: isDead ? 0.45 : 1,
      }}
    >
      {display.name}
    </Typography.Text>
  )

  const className = [
    'unit-token',
    variant === 'grid' ? 'unit-token--grid' : 'unit-token--initiative',
    highlighted ? 'unit-token--highlighted' : '',
    isCurrentActor ? 'unit-token--current' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const wrapStyle: CSSProperties =
    variant === 'grid'
      ? {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
          height: '100%',
          fontSize: 10,
          lineHeight: 1.12,
          opacity: isDead ? 0.45 : 1,
        }
      : {
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '2px 8px',
          borderRadius: 4,
          border: isCurrentActor ? '2px solid var(--game-primary)' : '1px solid #d9d9d9',
          background: isCurrentActor ? '#e6f4ff' : isDead ? '#f5f5f5' : '#fff',
          opacity: isDead ? 0.45 : 1,
          fontWeight: isCurrentActor ? 600 : 400,
          minWidth: 44,
        }

  let inner: ReactNode
  if (variant === 'initiative') {
    inner = (
      <>
        {nameNode}
        {emojiNode}
        {combatStats ? (
          <span style={{ fontSize: 9 }}>
            {UI_ATTACK}
            {combatStats.attack} {UI_DEFENSE}
            {combatStats.defense}
          </span>
        ) : null}
        {hp !== undefined && maxHp !== undefined ? (
          <span style={{ fontSize: 9 }}>
            {UI_HEART}
            {hp}/{maxHp}
          </span>
        ) : null}
      </>
    )
  } else {
    inner = (
      <>
        {emojiNode}
        {combatStats ? (
          <span className="unit-token__mini-stats">
            {UI_ATTACK}
            {combatStats.attack} {UI_DEFENSE}
            {combatStats.defense}
          </span>
        ) : null}
        {hp !== undefined ? (
          <span>
            {UI_HEART}
            {hp}
          </span>
        ) : null}
      </>
    )
  }

  return (
    <span
      className={className}
      style={wrapStyle}
      aria-label={variant === 'grid' ? display.name : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {inner}
    </span>
  )
}
