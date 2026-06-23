import { QuestionCircleOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'

type SectionHelpProps = {
  content: string
}

export function SectionHelp({ content }: SectionHelpProps) {
  return (
    <Tooltip title={content} mouseEnterDelay={0.3}>
      <QuestionCircleOutlined
        aria-label={content}
        style={{
          fontSize: 12,
          color: 'rgba(0,0,0,0.45)',
          marginInlineStart: 4,
          cursor: 'help',
        }}
      />
    </Tooltip>
  )
}
