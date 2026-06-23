import { Collapse, Typography } from 'antd'
import type { CollapseProps } from 'antd'
import { HELP_ARTICLES } from '../../game/help/articles'
import { renderHelpInline } from '../../game/help/renderHelpText'

function helpParagraphKey(articleId: string, index: number, text: string): string {
  return `${articleId}-p-${index}-${text.slice(0, 24)}`
}

function helpBulletKey(articleId: string, index: number, text: string): string {
  return `${articleId}-b-${index}-${text.slice(0, 24)}`
}

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

export function CampaignHelpTab() {
  return (
    <div role="tabpanel" aria-label="Справка">
      <Collapse size="small" defaultActiveKey={['about']} items={collapseItems} />
    </div>
  )
}
