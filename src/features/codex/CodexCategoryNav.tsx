import { Button, Space } from 'antd'
import type { CodexCategory } from './codexShared'
import { CODEX_CATEGORY_LABEL, CODEX_CATEGORY_ORDER } from './codexShared'

type CodexCategoryNavProps = {
  activeCategory: CodexCategory
  onCategoryChange: (category: CodexCategory) => void
}

export function CodexCategoryNav({
  activeCategory,
  onCategoryChange,
}: CodexCategoryNavProps) {
  return (
    <Space
      role="tablist"
      aria-label="Категории кодекса"
      wrap
      size="middle"
      style={{ width: '100%' }}
    >
      {CODEX_CATEGORY_ORDER.map((category) => (
        <Button
          key={category}
          role="tab"
          aria-selected={activeCategory === category}
          type={activeCategory === category ? 'primary' : 'default'}
          onClick={() => onCategoryChange(category)}
        >
          {CODEX_CATEGORY_LABEL[category]}
        </Button>
      ))}
    </Space>
  )
}
