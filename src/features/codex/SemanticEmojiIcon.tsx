import { accentStyle } from '../../game/character/iconCatalog'
import { getSemanticEmoji } from '../../game/ui/semanticEmoji'

type SemanticEmojiIconProps = {
  id?: string
  fallback?: string
}

export function SemanticEmojiIcon({ id, fallback = '📘' }: SemanticEmojiIconProps) {
  const sem = id ? getSemanticEmoji(id) : undefined
  const emoji = sem?.base ?? fallback
  const style = sem ? accentStyle(sem.accent) : undefined
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        padding: '0 4px',
        borderRadius: 4,
        border: style ? `1px solid ${style.borderColor}` : undefined,
        background: style?.background,
      }}
    >
      {emoji}
    </span>
  )
}
