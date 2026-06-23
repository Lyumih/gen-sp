import { Card, Collapse, Space, Tag, Typography } from 'antd'
import { getCharacterClass } from '../../game/content/characterClasses'
import { getEnemyArchetype } from '../../game/content/enemyArchetypes'
import { tagGroup, tagLabelRu } from '../../game/content/tagTaxonomy'
import { describeCodexEntry } from '../../game/codex/codexText'
import type { CodexEntry } from '../../game/codex/registry'
import { SemanticEmojiIcon } from './SemanticEmojiIcon'

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
  const isBossEnemy =
    entry.category === 'enemy' && getEnemyArchetype(entry.templateId)?.isBoss === true
  const classTags =
    entry.category === 'class'
      ? (getCharacterClass(entry.templateId)?.tags ?? [])
      : []
  const summaryLines =
    entry.category === 'class'
      ? details.summaryLines.filter((line) => !line.startsWith('Теги:'))
      : details.summaryLines

  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space wrap size={[8, 8]} align="start">
          <Typography.Text strong style={{ fontSize: 16 }}>
            <SemanticEmojiIcon id={entry.semanticEmojiId} fallback={entry.emoji ?? '📘'} />{' '}
            {details.label}
          </Typography.Text>
          {unread ? <Tag color="gold">Новое</Tag> : null}
          {isBossEnemy ? <Tag color="purple">★ Босс</Tag> : null}
          {showAll && !discovered ? <Tag>не открыто</Tag> : null}
        </Space>

        {classTags.length > 0 ? (
          <Space wrap size={[4, 4]}>
            {classTags.map((tagId) => (
              <Tag
                key={tagId}
                color={tagGroup(tagId) === 'carrier' ? 'blue' : 'purple'}
              >
                {tagLabelRu(tagId)}
              </Tag>
            ))}
          </Space>
        ) : null}

        {summaryLines.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {summaryLines.map((line) => (
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
