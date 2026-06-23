import { Fragment, type ReactNode } from 'react'
import { Typography } from 'antd'

const INLINE_MARKUP_RE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g

/** Разметка в строках справки: `**жирный**`, `*курсив*`. */
export function renderHelpInline(text: string): ReactNode {
  if (!INLINE_MARKUP_RE.test(text)) return text
  INLINE_MARKUP_RE.lastIndex = 0
  const parts = text.split(INLINE_MARKUP_RE).filter((part) => part.length > 0)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Typography.Text strong key={index}>
          {part.slice(2, -2)}
        </Typography.Text>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Typography.Text italic key={index}>
          {part.slice(1, -1)}
        </Typography.Text>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}
