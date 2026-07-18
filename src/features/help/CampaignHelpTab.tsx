import { useEffect, useState } from 'react'
import { App, Button, Collapse, Space, Typography } from 'antd'
import type { CollapseProps } from 'antd'
import { HELP_ARTICLES } from '../../game/help/articles'
import { renderHelpInline } from '../../game/help/renderHelpText'
import { useGameStore } from '../../store/gameStore'

function helpParagraphKey(articleId: string, index: number, text: string): string {
  return `${articleId}-p-${index}-${text.slice(0, 24)}`
}

function helpBulletKey(articleId: string, index: number, text: string): string {
  return `${articleId}-b-${index}-${text.slice(0, 24)}`
}

export type CampaignHelpTabProps = {
  focusArticleId?: string | null
  onFocusConsumed?: () => void
}

export function CampaignHelpTab({ focusArticleId, onFocusConsumed }: CampaignHelpTabProps) {
  const { modal } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const resetCampaign = useGameStore((s) => s.resetCampaign)
  const [activeKeys, setActiveKeys] = useState<string[]>(['about'])

  useEffect(() => {
    if (!focusArticleId) return
    setActiveKeys([focusArticleId])
    onFocusConsumed?.()
  }, [focusArticleId, onFocusConsumed])

  const collapseItems: CollapseProps['items'] = HELP_ARTICLES.map((article) => ({
    key: article.id,
    label: article.title,
    children: (
      <>
        {article.paragraphs.map((paragraph, index) => (
          <Typography.Paragraph key={helpParagraphKey(article.id, index, paragraph)}>
            {renderHelpInline(paragraph)}
          </Typography.Paragraph>
        ))}
        {article.bullets ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {article.bullets.map((bullet, index) => (
              <li key={helpBulletKey(article.id, index, bullet)}>
                <Typography.Text>{renderHelpInline(bullet)}</Typography.Text>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    ),
  }))

  const confirmReset = () => {
    const inBattle = campaign.battle !== null
    const expeditionActive = campaign.expedition !== null
    modal.confirm({
      title: 'Начать заново?',
      content: inBattle
        ? 'Текущий бой и весь прогресс кампании будут удалены. Это нельзя отменить.'
        : expeditionActive
          ? 'Экспедиция и весь прогресс кампании будут удалены. Это нельзя отменить.'
          : 'Весь прогресс кампании будет удалён. Это нельзя отменить.',
      okText: 'Начать заново',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: () => resetCampaign(),
    })
  }

  return (
    <div role="tabpanel" aria-label="Справка">
      <Collapse
        size="small"
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(Array.isArray(keys) ? keys : [keys])}
        items={collapseItems}
      />
      <Space orientation="vertical" size="small" style={{ marginTop: 16, width: '100%' }}>
        <Typography.Text strong>Данные игры</Typography.Text>
        <Button danger onClick={confirmReset}>
          Начать заново
        </Button>
      </Space>
    </div>
  )
}
