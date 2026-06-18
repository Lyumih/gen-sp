import { Card, Collapse, Space, Tag, Typography } from 'antd'
import { describeCodexEntry } from '../../game/codex/codexText'
import type { CodexEntry } from '../../game/codex/registry'

type CodexEntryCardProps = {
  entry: CodexEntry
  discovered: boolean
  unread: boolean
  showAll: boolean
}

export function CodexEntryCard({
  entry,
  discovered,
  unread,
  showAll,
}: CodexEntryCardProps) {
  const details = describeCodexEntry(entry)

  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space wrap size={[8, 8]} align="start">
          <Typography.Text strong style={{ fontSize: 16 }}>
            <span aria-hidden>{entry.emoji ?? '📘'}</span> {details.label}
          </Typography.Text>
          {unread ? <Tag color="gold">Новое</Tag> : null}
          {showAll && !discovered ? <Tag>не открыто</Tag> : null}
        </Space>

        {details.summaryLines.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {details.summaryLines.map((line) => (
              <li key={line}>
                <Typography.Text>{line}</Typography.Text>
              </li>
            ))}
          </ul>
        ) : null}

        {details.detailLines.length > 0 ? (
          <Collapse
            size="small"
            items={[
              {
                key: 'details',
                label: 'Подробнее',
                children: (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {details.detailLines.map((line) => (
                      <li key={line}>
                        <Typography.Text>{line}</Typography.Text>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        ) : null}
      </Space>
    </Card>
  )
}
