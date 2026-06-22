import { MedicineBoxOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Space, Tag, Typography } from 'antd'
import { getExpeditionBattleCharacterId } from '../../game/campaign/battleSnapshot'
import { getCharacter } from '../../game/campaign/selectors'
import { getExpeditionChainById } from '../../game/expedition/config'
import { UI_LEVEL } from '../../game/ui/labels'
import type { CharacterBattleSnapshot, CharacterMetaStatus } from '../../game/types'
import { useGameStore } from '../../store/gameStore'

const META_STATUS_LABEL: Record<CharacterMetaStatus, string> = {
  active: 'В строю',
  downed: 'Выведен',
}

const META_STATUS_COLOR: Record<CharacterMetaStatus, string> = {
  active: 'success',
  downed: 'error',
}

function SquadMemberRow({
  slot,
  slotIndex,
  name,
}: {
  slot: CharacterBattleSnapshot
  slotIndex: number
  name: string
}) {
  return (
    <Space wrap>
      <Typography.Text>
        Слот {slotIndex + 1}: <strong>{name}</strong>
      </Typography.Text>
      <Tag color={META_STATUS_COLOR[slot.metaStatus]}>{META_STATUS_LABEL[slot.metaStatus]}</Tag>
    </Space>
  )
}

export function InterBattleScreen() {
  const { message } = App.useApp()
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const expedition = campaign.expedition

  if (!expedition) return null

  const chain = getExpeditionChainById(expedition.scenarioChainId)
  const battleLabel = `${expedition.battleIndex + 1} / ${expedition.battleCount}`
  const squadSlots = expedition.squadSnapshot.filter(
    (slot): slot is CharacterBattleSnapshot => slot !== null,
  )
  const downedCount = squadSlots.filter((slot) => slot.metaStatus === 'downed').length
  const canAdvance = getExpeditionBattleCharacterId(expedition) !== null
  const campReviveEnabled = expedition.interBattleReviveAllDowned === true
  const showReviveButton = campReviveEnabled && downedCount > 0

  const handleRevive = () => {
    dispatchRun({ type: 'INTER_BATTLE_REVIVE_ALL' })
    message.success('Отряд восстановлен в лагере')
  }

  const handleNextBattle = () => {
    if (!canAdvance) {
      message.error('Весь отряд выведен из строя — восстановите бойцов')
      return
    }
    dispatchRun({ type: 'ADVANCE_EXPEDITION_BATTLE' })
  }

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <TeamOutlined aria-hidden />
          Между боями
        </span>
      }
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text>
          Экспедиция: <strong>{chain?.id ?? expedition.scenarioChainId}</strong>
          {' · '}
          Бой {battleLabel}
        </Typography.Text>

        {campReviveEnabled ? (
          <Alert
            type="info"
            showIcon
            icon={<MedicineBoxOutlined aria-hidden />}
            title="Лагерь"
            description="Между боями все выведенные из строя бойцы восстанавливаются."
          />
        ) : null}

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Состав отряда
          </Typography.Text>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            {expedition.squadSnapshot.map((slot, index) => {
              if (!slot) {
                return (
                  <Typography.Text key={index} type="secondary">
                    Слот {index + 1}: пусто
                  </Typography.Text>
                )
              }
              const character = getCharacter(campaign, slot.characterId)
              const name = character?.name ?? slot.characterId
              const level = character ? `${UI_LEVEL}${character.unitLevel}` : null
              return (
                <div key={slot.characterId}>
                  <SquadMemberRow slot={slot} slotIndex={index} name={name} />
                  {level ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {level}
                    </Typography.Text>
                  ) : null}
                </div>
              )
            })}
          </Space>
        </div>

        {!canAdvance ? (
          <Alert
            type="warning"
            title="Отряд не готов"
            description={
              campReviveEnabled
                ? 'Все бойцы выведены из строя. Используйте восстановление в лагере.'
                : 'Все бойцы выведены из строя. Следующий бой недоступен.'
            }
          />
        ) : null}

        <Space wrap>
          {showReviveButton ? (
            <Button icon={<MedicineBoxOutlined aria-hidden />} onClick={handleRevive}>
              Восстановить отряд
            </Button>
          ) : null}
          <Button
            type="primary"
            icon={<ThunderboltOutlined aria-hidden />}
            disabled={!canAdvance}
            onClick={handleNextBattle}
          >
            Следующий бой
          </Button>
        </Space>
      </Space>
    </Card>
  )
}
