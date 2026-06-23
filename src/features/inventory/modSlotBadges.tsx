import type { ReactNode } from 'react'
import { Space, Typography } from 'antd'
import { getModTemplate, type ModGroup } from '../../game/content/modTemplates'
import { getPassiveModTemplate } from '../../game/content/passiveModTemplates'
import { milestoneThreshold, rollbackCarrierLevel, unlockedSlotCount } from '../../game/memento/modSlots'
import type { ModOffer, ModSlotState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { ItemPopoverActions, type PopoverAction } from './ItemPopoverActions'

const GROUP_DOT_COLOR: Record<ModGroup, string> = {
  damage: '#cf1322',
  survival: '#389e0d',
  utility: '#1677ff',
  defense: '#722ed1',
}

export function hasPendingModOffer(modSlots: ModSlotState[]): boolean {
  return modSlots.some((slot) => slot.status === 'empty' && slot.offer !== null)
}

export function findFirstPendingOffer(
  modSlots: ModSlotState[],
): { slotIndex: number; offer: ModOffer } | null {
  for (let i = 0; i < modSlots.length; i++) {
    const slot = modSlots[i]
    if (slot?.status === 'empty' && slot.offer) {
      return { slotIndex: i, offer: slot.offer }
    }
  }
  return null
}

export function removeModConfirmText(currentLevel: number, slotIndex: number): string {
  const rollbackLevel = rollbackCarrierLevel(slotIndex)
  return `Уровень носителя будет снижен с ${UI_LEVEL}${currentLevel} до ${UI_LEVEL}${rollbackLevel}. Модификатор и его Lm будут потеряны безвозвратно.`
}

function resolveModTemplate(modId: string, carrierKind?: 'card' | 'passive') {
  if (carrierKind === 'passive') {
    return getPassiveModTemplate(modId) ?? getModTemplate(modId)
  }
  return getModTemplate(modId) ?? getPassiveModTemplate(modId)
}

function NextSlotPreviewList({
  offer,
  carrierKind,
}: {
  offer: ModOffer
  carrierKind: 'card' | 'passive'
}) {
  return (
    <Space orientation="vertical" size={2} style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Следующий слот (превью)
      </Typography.Text>
      <ul className="inv-mod-slot-list" style={{ margin: 0 }}>
        {offer.modIds.map((modId) => {
          const tmpl = resolveModTemplate(modId, carrierKind)
          return (
            <li key={modId}>
              <Typography.Text style={{ fontSize: 12 }}>
                <span style={{ color: modGroupColor(modId) }} aria-hidden>
                  ●
                </span>{' '}
                {tmpl?.emoji ? `${tmpl.emoji} ` : ''}
                {tmpl?.label ?? modId}
              </Typography.Text>
            </li>
          )
        })}
      </ul>
    </Space>
  )
}

function modGroupColor(templateId: string): string {
  const tmpl = getModTemplate(templateId)
  return tmpl ? GROUP_DOT_COLOR[tmpl.group] : '#8c8c8c'
}

export function ModSlotDots({ modSlots }: { modSlots: ModSlotState[] }) {
  if (modSlots.length === 0) return null

  return (
    <div className="inv-slot-dots" aria-hidden>
      {modSlots.map((slot, index) => {
        if (slot.status === 'filled') {
          return (
            <span
              key={index}
              className="inv-slot-dot inv-slot-dot--filled"
              style={{ color: modGroupColor(slot.templateId) }}
            >
              ●
            </span>
          )
        }
        if (slot.status === 'empty' && slot.offer) {
          return (
            <span key={index} className="inv-slot-dot inv-slot-dot--pending">
              ○
            </span>
          )
        }
        return (
          <span key={index} className="inv-slot-dot inv-slot-dot--empty">
            ○
          </span>
        )
      })}
    </div>
  )
}

function nextLockedSlotLine(carrierLevel: number, modSlotCount: number): string | null {
  if (modSlotCount > 0) {
    return `Следующий слот: ${UI_LEVEL}${milestoneThreshold(modSlotCount)}`
  }
  if (unlockedSlotCount(carrierLevel) === 0) {
    return `Следующий слот: ${UI_LEVEL}${milestoneThreshold(0)}`
  }
  return null
}

type CarrierModPopoverSectionProps = {
  modSlots: ModSlotState[]
  carrierLevel: number
  carrierKind?: 'card' | 'passive'
  nextSlotPreview?: ModOffer | null
  modsDisabled: boolean
  modsDisabledTooltip?: string
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (slotIndex: number) => void
}

export function CarrierModPopoverSection({
  modSlots,
  carrierLevel,
  carrierKind = 'card',
  nextSlotPreview,
  modsDisabled,
  modsDisabledTooltip,
  onOpenPicker,
  onConfirmRemove,
}: CarrierModPopoverSectionProps): ReactNode {
  const pending = findFirstPendingOffer(modSlots)
  const lockedLine = nextLockedSlotLine(carrierLevel, modSlots.length)

  if (modSlots.length === 0 && !lockedLine) return null

  const actions: PopoverAction[] = []
  if (pending && !modsDisabled) {
    actions.push({
      key: 'add-mod',
      label: 'Добавить модификатор',
      type: 'primary',
      onClick: () => onOpenPicker(pending.slotIndex, pending.offer),
    })
  }

  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text strong style={{ fontSize: 12 }}>
        Модификаторы
      </Typography.Text>
      {modSlots.length > 0 ? (
        <ul className="inv-mod-slot-list">
          {modSlots.map((slot, index) => (
            <li key={index}>
              <ModSlotListRow
                slot={slot}
                slotIndex={index}
                modsDisabled={modsDisabled}
                modsDisabledTooltip={modsDisabledTooltip}
                onOpenPicker={onOpenPicker}
                onConfirmRemove={onConfirmRemove}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {lockedLine ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          ◌ {lockedLine}
        </Typography.Text>
      ) : null}
      {nextSlotPreview ? (
        <NextSlotPreviewList offer={nextSlotPreview} carrierKind={carrierKind} />
      ) : null}
      {actions.length > 0 ? (
        <ItemPopoverActions
          inBattle={modsDisabled}
          disabledTooltip={modsDisabledTooltip}
          actions={actions}
        />
      ) : null}
    </Space>
  )
}

function ModSlotListRow({
  slot,
  slotIndex,
  modsDisabled,
  modsDisabledTooltip,
  onOpenPicker,
  onConfirmRemove,
}: {
  slot: ModSlotState
  slotIndex: number
  modsDisabled: boolean
  modsDisabledTooltip?: string
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (slotIndex: number) => void
}) {
  if (slot.status === 'filled') {
    const tmpl = getModTemplate(slot.templateId)
    const actions: PopoverAction[] = [
      {
        key: 'remove',
        label: 'Удалить',
        danger: true,
        onClick: () => onConfirmRemove(slotIndex),
      },
    ]
    return (
      <Space orientation="vertical" size={2} style={{ width: '100%' }}>
        <Typography.Text style={{ fontSize: 12 }}>
          <span style={{ color: modGroupColor(slot.templateId) }} aria-hidden>
            ●
          </span>{' '}
          {tmpl?.emoji ? `${tmpl.emoji} ` : ''}
          {tmpl?.label ?? slot.templateId} · Lm {slot.lm}
        </Typography.Text>
        <ItemPopoverActions
          inBattle={modsDisabled}
          disabledTooltip={modsDisabledTooltip}
          actions={actions}
        />
      </Space>
    )
  }

  if (slot.offer) {
    const rowActions: PopoverAction[] = [
      {
        key: 'pick',
        label: 'Добавить',
        type: 'primary',
        onClick: () => onOpenPicker(slotIndex, slot.offer!),
      },
    ]
    return (
      <Space orientation="vertical" size={2} style={{ width: '100%' }}>
        <Typography.Text style={{ fontSize: 12 }}>○ M+ — выберите модификатор</Typography.Text>
        <ItemPopoverActions
          inBattle={modsDisabled}
          disabledTooltip={modsDisabledTooltip}
          actions={rowActions}
        />
      </Space>
    )
  }

  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      ○ пусто
    </Typography.Text>
  )
}
