import {
  IdcardOutlined,
  LogoutOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { Button, Space, Switch, Tooltip, Typography } from 'antd'
import type { BattlePlayerCard, BattleState, CampaignState, Character, Unit } from '../../game/types'
import { UI_MANA, UI_WORLD_POWER } from '../../game/ui/labels'
import { GamePanel } from '../layout/GamePanel'
import { worldPowerTooltip } from '../campaign/resourceTooltips'
import { getCharacter } from '../../game/campaign/selectors'
import { GuidedBattleOverlay } from '../onboarding/GuidedBattleOverlay'
import { BattleActorBar } from './BattleActorBar'
import { BattleBasicActionCell } from './BattleBasicActionCell'
import { BattleEndTurnCell } from './BattleEndTurnCell'
import { BattleInspectPanel } from './BattleInspectPanel'
import { BattlePassivesRow } from './BattlePassivesRow'
import { BattleSkillCell } from './BattleSkillCell'
import type { BattleUnitInspectModel } from './battleInspectModel'

type BasicKind = 'move' | 'melee' | 'ranged'

function CommandStripSeparator() {
  return <span className="battle-command-strip__sep" aria-hidden />
}

export function BattleCommandDock(props: {
  campaign: CampaignState
  battle: BattleState
  actor: Unit | undefined
  actorCharacter: Character | undefined
  actorCards: readonly BattlePlayerCard[]
  currentId: string | undefined
  currentDisplay: { emoji: string; name: string } | null
  mode: BasicKind | 'card'
  selectedCardId: string | null
  actionsDisabled: boolean
  animationPlaying: boolean
  autoBattleEnabled: boolean
  guidedActive: boolean
  guidedBattleStep: number
  effectiveRangedRange: number
  heroRangedCooldown: number
  heroRangedOnCd: boolean
  inExpedition: boolean
  inspectModel: BattleUnitInspectModel | null
  onCloseInspect: () => void
  onSetMode: (mode: BasicKind | 'card') => void
  onSelectCard: (cardId: string) => void
  onEndTurn: () => void
  onProfileOpen: () => void
  onConfirmAbandon: () => void
  onAutoBattleChange: (v: boolean) => void
  onGuidedAck: () => void
  guidedModeBlocked: (kind: BasicKind | 'card') => boolean
  onCardManaWarning: () => void
  effectiveManaCostForCard: (templateId: string, card: BattlePlayerCard) => number | null
}) {
  const {
    campaign,
    battle,
    actor,
    actorCharacter,
    actorCards,
    currentId,
    currentDisplay,
    mode,
    selectedCardId,
    actionsDisabled,
    animationPlaying,
    autoBattleEnabled,
    guidedActive,
    guidedBattleStep,
    effectiveRangedRange,
    heroRangedCooldown,
    heroRangedOnCd,
    inExpedition,
    inspectModel,
    onCloseInspect,
    onSetMode,
    onSelectCard,
    onEndTurn,
    onProfileOpen,
    onConfirmAbandon,
    onAutoBattleChange,
    onGuidedAck,
    guidedModeBlocked,
    onCardManaWarning,
    effectiveManaCostForCard,
  } = props

  const actorPassives = battle.passivesByUnitId?.[currentId ?? ''] ?? []
  const showSkillGroup = actorCards.length > 0
  const showPassiveGroup = actorPassives.length > 0 && actorCharacter !== undefined

  return (
    <GamePanel
      title={
        actor
          ? `Действия: ${getCharacter(campaign, actor.id)?.name ?? actor.id}`
          : 'Действия'
      }
      extra={
        <Space wrap size="small">
          <Button
            size="small"
            icon={<IdcardOutlined aria-hidden />}
            aria-label="Профиль героя"
            onClick={onProfileOpen}
          >
            Профиль
          </Button>
          {battle.phase === 'ongoing' || battle.phase === 'defeat' ? (
            <Tooltip
              title={
                inExpedition
                  ? 'Текущий бой не засчитается. Можно попробовать снова или завершить экспедицию в лагере.'
                  : 'Прогресс боя будет потерян. Награды за незавершённый бой не начислятся.'
              }
              mouseEnterDelay={0.3}
            >
              <Button
                size="small"
                danger
                icon={<LogoutOutlined aria-hidden />}
                aria-label={inExpedition ? 'Отступить в лагерь' : 'Выйти из боя'}
                onClick={onConfirmAbandon}
              >
                {inExpedition ? 'В лагерь' : 'Выйти из боя'}
              </Button>
            </Tooltip>
          ) : null}
        </Space>
      }
    >
      {guidedActive ? (
        <GuidedBattleOverlay stepIndex={guidedBattleStep} onAck={onGuidedAck} />
      ) : null}

      <div className="battle-command-strip battle-action-row battle-skill-row">
        {(['move', 'melee', 'ranged'] as const).map((kind) => (
          <BattleBasicActionCell
            key={kind}
            kind={kind}
            battle={battle}
            actor={actor}
            effectiveRangedRange={effectiveRangedRange}
            rangedCooldownRemaining={heroRangedCooldown}
            selected={mode === kind}
            disabled={
              actionsDisabled ||
              guidedModeBlocked(kind) ||
              (kind === 'ranged' && heroRangedOnCd)
            }
            onSelect={() => onSetMode(kind)}
          />
        ))}
        {actor && !autoBattleEnabled ? (
          <BattleEndTurnCell
            disabled={actionsDisabled || animationPlaying}
            onEndTurn={onEndTurn}
          />
        ) : null}
        {showSkillGroup && actorCharacter ? <CommandStripSeparator /> : null}
        {showSkillGroup && actorCharacter
          ? actorCards.map((c) => (
          <BattleSkillCell
            key={c.id}
            card={c}
            character={actorCharacter!}
            campaign={campaign}
            actor={actor}
            selected={mode === 'card' && selectedCardId === c.id}
            disabled={actionsDisabled || guidedModeBlocked('card')}
            onSelect={() => {
              const manaCost = effectiveManaCostForCard(c.templateId, c)
              if (manaCost !== null && (actor?.mana ?? 0) < manaCost) {
                onCardManaWarning()
                return
              }
              onSetMode('card')
              onSelectCard(c.id)
            }}
          />
        ))
          : null}
        {showPassiveGroup ? <CommandStripSeparator /> : null}
        {showPassiveGroup ? (
          <BattlePassivesRow
            passives={actorPassives}
            carrier={actorCharacter}
            campaign={campaign}
            inline
          />
        ) : null}
      </div>

      <Typography.Text style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        {battle.phase === 'victory' ? (
          <>Победа — пролистайте журнал.</>
        ) : (
          <>
            Ход:{' '}
            <strong>
              {currentDisplay ? `${currentDisplay.emoji} ${currentDisplay.name}` : '—'}
            </strong>
            {actor ? ` · ${UI_MANA}${actor.mana ?? 0}/${actor.maxMana ?? 0}` : ''}
            {' · '}Раунд {battle.roundNumber}
          </>
        )}
        {' · '}
        <Tooltip title={worldPowerTooltip(battle.worldPower)} mouseEnterDelay={0.3}>
          <span>
            <span className="game-header__resource-emoji" aria-hidden>
              {UI_WORLD_POWER}
            </span>{' '}
            {battle.worldPower}
          </span>
        </Tooltip>
      </Typography.Text>
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <div style={{ marginBottom: 4 }}>
          <Space align="center">
            <Switch
              checked={autoBattleEnabled}
              onChange={onAutoBattleChange}
              disabled={battle.phase !== 'ongoing' || guidedActive}
            />
            <Typography.Text>
              <RobotOutlined aria-hidden /> Автобой
            </Typography.Text>
          </Space>
        </div>
        <BattleActorBar
          campaign={campaign}
          battle={battle}
          actorUnit={actor}
          showEnemyTurnHint={battle.phase === 'ongoing' && actor === undefined}
        />
        {inspectModel ? (
          <BattleInspectPanel
            model={inspectModel}
            campaign={campaign}
            onClose={onCloseInspect}
          />
        ) : null}
      </Space>
    </GamePanel>
  )
}
