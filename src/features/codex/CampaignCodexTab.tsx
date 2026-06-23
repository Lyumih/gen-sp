import { useMemo, useState } from 'react'
import { Checkbox, Input, Space, Typography } from 'antd'
import { codexProgress, visibleCodexEntries } from '../../game/codex/discovery'
import type { CampaignState } from '../../game/types'
import { CodexCategoryNav } from './CodexCategoryNav'
import { CodexEntryList } from './CodexEntryList'
import type { CodexCategory } from './codexShared'
import {
  CODEX_CATEGORY_ORDER,
  CODEX_SHOW_ALL_DEFAULT,
  filterCodexEntries,
} from './codexShared'

type CampaignCodexTabProps = {
  campaign: CampaignState
  /** Test hook: override default first tab (normally `class`). */
  initialCategory?: CodexCategory
}

export function CampaignCodexTab({ campaign, initialCategory }: CampaignCodexTabProps) {
  const [activeCategory, setActiveCategory] = useState<CodexCategory>(
    initialCategory ?? CODEX_CATEGORY_ORDER[0]!,
  )
  const [showAll, setShowAll] = useState(CODEX_SHOW_ALL_DEFAULT)
  const [searchValue, setSearchValue] = useState('')

  const progress = codexProgress(campaign, activeCategory)

  const entries = useMemo(() => {
    const visible = visibleCodexEntries(campaign, activeCategory, showAll)
    return showAll ? filterCodexEntries(visible, searchValue) : visible
  }, [activeCategory, campaign, searchValue, showAll])

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <Space wrap size="middle" align="center" style={{ width: '100%' }}>
        <Checkbox
          checked={showAll}
          onChange={(event) => {
            setShowAll(event.target.checked)
            if (!event.target.checked) setSearchValue('')
          }}
        >
          Показать всё
        </Checkbox>
        <Typography.Text aria-live="polite">
          Открыто {progress.opened} / {progress.total}
        </Typography.Text>
      </Space>

      {showAll ? (
        <Input.Search
          allowClear
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Поиск по названию"
        />
      ) : null}

      <CodexCategoryNav
        activeCategory={activeCategory}
        onCategoryChange={(category) => {
          setActiveCategory(category)
          setSearchValue('')
        }}
      />

      <CodexEntryList
        campaign={campaign}
        category={activeCategory}
        entries={entries}
        showAll={showAll}
        searchActive={showAll && searchValue.trim().length > 0}
      />
    </Space>
  )
}
