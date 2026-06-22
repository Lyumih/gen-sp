import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { forwardRef } from 'react'
import { Popover } from 'antd'
import './inventory.css'

export type InventoryCellState =
  | 'empty'
  | 'filled'
  | 'equipped'
  | 'disabled'
  | 'dragOver'
  | 'invalidDrop'

export type InventoryCellProps = {
  emoji?: string
  levelBadge?: string
  contextBadge?: string
  state: InventoryCellState
  popoverContent?: ReactNode
  popoverTitle?: string
  popoverTrigger?: 'hover' | 'click' | ('hover' | 'click')[]
  ariaLabel: string
  hintText?: string
  onDoubleClick?: () => void
  onClick?: MouseEventHandler<HTMLButtonElement>
  style?: CSSProperties
  className?: string
}

function stateClass(state: InventoryCellState): string {
  switch (state) {
    case 'empty':
      return 'inv-cell--empty'
    case 'equipped':
      return 'inv-cell--equipped'
    case 'disabled':
      return 'inv-cell--disabled'
    case 'dragOver':
      return 'inv-cell--drag-over'
    case 'invalidDrop':
      return 'inv-cell--invalid'
    default:
      return ''
  }
}

export const InventoryCell = forwardRef<HTMLButtonElement, InventoryCellProps>(
  function InventoryCell(
    {
      emoji,
      levelBadge,
      contextBadge,
      state,
      popoverContent,
      popoverTitle,
      popoverTrigger = ['hover', 'click'],
      ariaLabel,
      hintText,
      onDoubleClick,
      onClick,
      style,
      className,
      ...rest
    },
    ref,
  ) {
    const isEmpty = state === 'empty'
    const button = (
      <button
        ref={ref}
        type="button"
        className={['inv-cell', stateClass(state), className].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        disabled={state === 'disabled'}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        style={style}
        {...rest}
      >
        {isEmpty ? (
          hintText ? (
            <span className="inv-cell-hint">{hintText}</span>
          ) : emoji ? (
            <span className="inv-cell-emoji" aria-hidden>
              {emoji}
            </span>
          ) : null
        ) : (
          <span className="inv-cell-emoji" aria-hidden>
            {emoji}
          </span>
        )}
        {levelBadge ? <span className="inv-badge-level">{levelBadge}</span> : null}
        {contextBadge ? <span className="inv-badge-context">{contextBadge}</span> : null}
      </button>
    )

    if (popoverContent) {
      return (
        <Popover title={popoverTitle} content={popoverContent} trigger={popoverTrigger}>
          {button}
        </Popover>
      )
    }

    return button
  },
)
