import { Empty, Space, Typography } from 'antd'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import type { CodexEntry } from '../../game/codex/registry'
import type { CampaignState } from '../../game/types'
import type { CodexCategory } from './codexShared'
import { CODEX_EMPTY_HINT } from './codexShared'
import { CodexEntryCard } from './CodexEntryCard'

type CodexEntryListProps = {
  campaign: CampaignState
  category: CodexCategory
  entries: readonly CodexEntry[]
  showAll: boolean
  gearCardLevelBonus: number
}

export function CodexEntryList({
  campaign,
  category,
  entries,
  showAll,
  gearCardLevelBonus,
}: CodexEntryListProps) {
  const discoveredSet = new Set(campaign.codexDiscovered)
  const unreadSet = new Set(unreadCodexEntryIds(campaign))

  if (entries.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size={4}>
            <Typography.Text>Пока ничего не открыто</Typography.Text>
            <Typography.Text type="secondary">{CODEX_EMPTY_HINT[category]}</Typography.Text>
          </Space>
        }
      />
    )
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {entries.map((entry) => (
        <CodexEntryCard
          key={entry.id}
          entry={entry}
          discovered={discoveredSet.has(entry.id)}
          unread={unreadSet.has(entry.id)}
          showAll={showAll}
          gearCardLevelBonus={gearCardLevelBonus}
        />
      ))}
    </Space>
  )
}
