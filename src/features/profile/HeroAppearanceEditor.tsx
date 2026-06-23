import { useState } from 'react'
import { Alert, Button, Divider, Input, Space, Typography } from 'antd'
import {
  CHARACTER_ICON_CATALOG,
  ICON_ACCENT_IDS,
  ICON_SKIN_TONE_IDS,
  SKIN_TONE_ELIGIBLE,
  accentStyle,
  renderEmojiWithSkinTone,
} from '../../game/character/iconCatalog'
import { getCharacterDisplay } from '../../game/character/display'
import type { Character, IconSkinToneId } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { UnitToken } from '../battle/UnitToken'

type HeroAppearanceEditorProps = {
  hero: Character
  expeditionLocked: boolean
}

export function HeroAppearanceEditor({ hero, expeditionLocked }: HeroAppearanceEditorProps) {
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const [nameDraft, setNameDraft] = useState(hero.name)

  const preview = getCharacterDisplay({
    ...hero,
    name: nameDraft.trim() || hero.name,
  })

  if (expeditionLocked) {
    return (
      <>
        <Divider plain>Облик</Divider>
        <Alert type="info" showIcon message="Недоступно во время экспедиции" />
      </>
    )
  }

  return (
    <>
      <Divider plain>Облик</Divider>
      <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Имя
        </Typography.Text>
        <Input
          value={nameDraft}
          maxLength={20}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            dispatchRun({
              type: 'RENAME_CHARACTER',
              characterId: hero.id,
              name: nameDraft,
            })
          }}
          onPressEnter={() => {
            dispatchRun({
              type: 'RENAME_CHARACTER',
              characterId: hero.id,
              name: nameDraft,
            })
          }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Иконка
        </Typography.Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {CHARACTER_ICON_CATALOG.map((emoji) => (
            <Button
              key={emoji}
              size="small"
              type={hero.iconEmoji === emoji ? 'primary' : 'default'}
              onClick={() =>
                dispatchRun({
                  type: 'SET_CHARACTER_APPEARANCE',
                  characterId: hero.id,
                  iconEmoji: emoji,
                })
              }
            >
              {emoji}
            </Button>
          ))}
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Оттенок
        </Typography.Text>
        <Space wrap>
          {ICON_ACCENT_IDS.map((accent) => {
            const style = accentStyle(accent)
            return (
              <Button
                key={accent}
                size="small"
                type={hero.iconAccent === accent ? 'primary' : 'default'}
                onClick={() =>
                  dispatchRun({
                    type: 'SET_CHARACTER_APPEARANCE',
                    characterId: hero.id,
                    iconEmoji: hero.iconEmoji,
                    iconAccent: accent,
                  })
                }
                style={{
                  borderColor: style.borderColor,
                  background: style.background,
                }}
              >
                {accent}
              </Button>
            )
          })}
        </Space>
        {SKIN_TONE_ELIGIBLE.has(hero.iconEmoji) ? (
          <>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Тон кожи
            </Typography.Text>
            <Space wrap>
              {ICON_SKIN_TONE_IDS.map((tone) => (
                <Button
                  key={tone}
                  size="small"
                  type={hero.iconSkinTone === tone ? 'primary' : 'default'}
                  onClick={() =>
                    dispatchRun({
                      type: 'SET_CHARACTER_APPEARANCE',
                      characterId: hero.id,
                      iconEmoji: hero.iconEmoji,
                      iconSkinTone: tone as IconSkinToneId,
                    })
                  }
                >
                  {tone === 'default'
                    ? renderEmojiWithSkinTone(hero.iconEmoji, 'default')
                    : renderEmojiWithSkinTone(hero.iconEmoji, tone as Exclude<IconSkinToneId, 'default'>)}
                </Button>
              ))}
            </Space>
          </>
        ) : null}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Превью
        </Typography.Text>
        <UnitToken display={preview} variant="initiative" />
      </Space>
    </>
  )
}
