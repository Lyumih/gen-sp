import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { App, Button, Divider, Space, Tooltip, Typography } from 'antd'
import { getItemTemplate } from '../../game/content/itemTemplates'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSelectShortLabel,
  itemSellPrice,
} from '../../game/descriptions/itemText'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import {
  sortStashIdsByLevel,
  sortStashIdsBySlot,
  stashItemsFromCampaign,
} from '../../game/equipment/stashOrder'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { getCharacter } from '../../game/character/selectors'
import { canEquipPassive } from '../../game/passives/equippedPassives'
import { maxPassiveEquipSlots, maxSkillLoadoutSlots } from '../../game/specialization/loadoutCaps'
import type { CampaignState, EquipmentSlot, ItemInstance, ModOffer } from '../../game/types'
import type { LoadoutFocus } from '../character/hub/types'
import { UI_HEART, UI_DAMAGE, UI_LEVEL } from '../../game/ui/labels'
import { SLOT_LABEL } from '../campaign/campaignHubShared'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell, type InventoryCellState } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { ModOfferPicker } from './ModOfferPicker'
import {
  parseDragId,
  resolveSquadDragDrop,
  slotDragId,
  stashDragId,
  stashEmptyDragId,
} from './inventoryDnD'
import { resolveItemEmoji, SLOT_EMOJI } from './inventoryEmoji'
import { previewEquipDelta } from './previewEquipDelta'
import {
  CarrierModPopoverSection,
  ModSlotDots,
  hasPendingModOffer,
  removeModConfirmText,
} from './modSlotBadges'
import './inventory.css'
import { GameColumns } from '../layout/GameColumns'
import { GamePanel } from '../layout/GamePanel'

type PickerState = {
  carrierId: string
  slotIndex: number
  offer: ModOffer
} | null

type EquipmentInventoryViewProps = {
  campaign: CampaignState
  characterId: string
  inBattle: boolean
  modsDisabled?: boolean
  modsDisabledTooltip?: string
  onEquip: (itemId: string, slot: EquipmentSlot) => void
  onUnequip: (slot: EquipmentSlot) => void
  onReorderStash: (itemIds: string[]) => void
  onSellItem?: (itemId: string) => void
  onInvalidSlot: () => void
  onTransferItem?: (itemId: string, toCharacterId: string) => void
  onMoveChestItemToCharacter?: (itemId: string, characterId: string) => void
  onMoveCharacterItemToChest?: (itemId: string) => void
  onSetSquadSlot?: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots?: (from: number, to: number) => void
  onPickModOffer: (
    carrierKind: 'item',
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => void
  onRemoveMod: (carrierKind: 'item', carrierId: string, slotIndex: number) => void
  squadLocked?: boolean
  panelTitle?: ReactNode
  hideInnerSectionTitles?: boolean
  sideContent?: ReactNode
  dndBeforeContent?: (activeDragId: string | null) => ReactNode
  dndAfterContent?: (activeDragId: string | null) => ReactNode
  /** 3-column character hub: rail | buildHeader+equip+loadout | stash tabs */
  characterHub?: {
    rail: ReactNode
    buildHeader: ReactNode
    loadoutPanel: ReactNode
    renderStashTabs: (itemsPanel: ReactNode) => ReactNode
  }
  /** Card/passive drag when characterHub merges DnD */
  onSetBattleLoadout?: (slotIndex: 0 | 1 | 2 | 3, cardId: string | null) => void
  onSetPassiveEquip?: (slotIndex: 0 | 1 | 2 | 3 | 4, passiveId: string | null) => void
  onReorderCards?: (cardIds: string[]) => void
  loadoutFocus?: LoadoutFocus
  onToggleEquipFocus?: (slot: EquipmentSlot) => void
  onStashItemClick?: (itemId: string) => void
  onStashItemHover?: (itemId: string | null) => void
}

function itemModPopoverSection(
  item: ItemInstance,
  modsDisabled: boolean,
  modsDisabledTooltip: string | undefined,
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void,
  onConfirmRemove: (slotIndex: number) => void,
) {
  if (item.modSlots.length === 0 && item.itemLevel === 0) return null
  return (
    <>
      <Divider style={{ margin: '4px 0' }} />
      <CarrierModPopoverSection
        modSlots={item.modSlots}
        carrierLevel={item.itemLevel}
        modsDisabled={modsDisabled}
        modsDisabledTooltip={modsDisabledTooltip}
        onOpenPicker={onOpenPicker}
        onConfirmRemove={onConfirmRemove}
      />
    </>
  )
}

function characterStashPopover(
  item: ItemInstance,
  inBattle: boolean,
  modsDisabled: boolean,
  modsDisabledTooltip: string | undefined,
  onEquip: () => void,
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void,
  onConfirmRemove: (slotIndex: number) => void,
  onMoveToChest?: () => void,
  onSell?: () => void,
  sellPrice?: number,
) {
  const tmpl = getItemTemplate(item.templateId)
  const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {tmpl ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {itemPriceLine(sellPrice ?? tmpl.shopPrice)}
        </Typography.Text>
      ) : null}
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[
          { key: 'equip', label: 'Надеть', type: 'primary', onClick: onEquip },
          ...(onMoveToChest
            ? [{ key: 'chest', label: 'В сундук', onClick: onMoveToChest }]
            : []),
          ...(onSell
            ? [
                {
                  key: 'sell',
                  label: 'Продать',
                  danger: true,
                  disabled: (sellPrice ?? 0) <= 0,
                  onClick: onSell,
                },
              ]
            : []),
        ]}
      />
      {itemModPopoverSection(
        item,
        modsDisabled,
        modsDisabledTooltip,
        onOpenPicker,
        onConfirmRemove,
      )}
    </Space>
  )
}

function characterSlotPopover(
  item: ItemInstance,
  inBattle: boolean,
  modsDisabled: boolean,
  modsDisabledTooltip: string | undefined,
  onUnequip: () => void,
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void,
  onConfirmRemove: (slotIndex: number) => void,
) {
  const tmpl = getItemTemplate(item.templateId)
  const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {tmpl ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {itemPriceLine(tmpl.shopPrice)}
        </Typography.Text>
      ) : null}
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[{ key: 'unequip', label: 'Снять', onClick: onUnequip }]}
      />
      {itemModPopoverSection(
        item,
        modsDisabled,
        modsDisabledTooltip,
        onOpenPicker,
        onConfirmRemove,
      )}
    </Space>
  )
}

function SortableStashCell({
  item,
  inBattle,
  modsDisabled,
  cellState,
  onDoubleClick,
  onEquip,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
  onMoveToChest,
  onSell,
  sellPrice,
  onCellClick,
  onCellHover,
}: {
  item: ItemInstance
  inBattle: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  cellState: InventoryCellState
  onDoubleClick: () => void
  onEquip: () => void
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (slotIndex: number) => void
  onMoveToChest?: () => void
  onSell?: () => void
  sellPrice?: number
  onCellClick?: () => void
  onCellHover?: () => void
}) {
  const tmpl = getItemTemplate(item.templateId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stashDragId(item.id),
    disabled: inBattle,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  return (
    <div onMouseEnter={onCellHover} style={{ display: 'inline-block' }}>
      <InventoryCell
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
        levelBadge={`${UI_LEVEL}${item.itemLevel}`}
        contextBadge={
          sellPrice !== undefined && sellPrice > 0
            ? `${sellPrice} 💰`
            : tmpl
              ? SLOT_EMOJI[tmpl.slot]
              : undefined
        }
        showModPendingBadge={!modsDisabled && hasPendingModOffer(item.modSlots)}
        slotDots={item.modSlots.length > 0 ? <ModSlotDots modSlots={item.modSlots} /> : undefined}
        state={cellState}
        popoverTitle={tmpl?.label}
        popoverContent={characterStashPopover(
          item,
          inBattle,
          modsDisabled,
          modsDisabledTooltip,
          onEquip,
          onOpenPicker,
          onConfirmRemove,
          onMoveToChest,
          onSell,
          sellPrice,
        )}
        ariaLabel={tmpl ? itemSelectShortLabel(tmpl, item.itemLevel) : item.id}
        onDoubleClick={onDoubleClick}
        onClick={onCellClick}
      />
    </div>
  )
}

function StashEmptyCell({ index, inBattle }: { index: number; inBattle: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stashEmptyDragId(index),
    disabled: inBattle,
  })
  return (
    <div ref={setNodeRef} style={{ display: 'inline-block' }}>
      <InventoryCell
        state={isOver ? 'dragOver' : 'empty'}
        ariaLabel="Пустой слот инвентаря"
      />
    </div>
  )
}

function EquipmentSlotCell({
  slot,
  item,
  inBattle,
  modsDisabled,
  dragOver,
  compareText,
  onUnequip,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
  focused,
  onSlotClick,
}: {
  slot: EquipmentSlot
  item: ItemInstance | undefined
  inBattle: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  dragOver: boolean
  compareText?: string
  onUnequip: () => void
  onOpenPicker: (slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (slotIndex: number) => void
  focused?: boolean
  onSlotClick?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotDragId(slot), disabled: inBattle })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: slotDragId(slot),
    disabled: inBattle || item === undefined,
    data: { slot },
  })

  const tmpl = item ? getItemTemplate(item.templateId) : undefined
  const state: InventoryCellState = inBattle
    ? 'disabled'
    : dragOver || isOver
      ? 'dragOver'
      : item
        ? 'equipped'
        : 'empty'

  const popover =
    compareText !== undefined ? (
      <Typography.Text style={{ fontSize: 12 }}>{compareText}</Typography.Text>
    ) : item ? (
      characterSlotPopover(
        item,
        inBattle,
        modsDisabled,
        modsDisabledTooltip,
        onUnequip,
        onOpenPicker,
        onConfirmRemove,
      )
    ) : undefined

  return (
    <div className="inv-slot-wrap">
      <Typography.Text className="inv-slot-label">{SLOT_LABEL[slot]}</Typography.Text>
      <InventoryCell
        ref={(node) => {
          setNodeRef(node)
          setDragRef(node)
        }}
        {...(item && !inBattle ? { ...attributes, ...listeners } : {})}
        emoji={item ? resolveItemEmoji(tmpl, slot) : SLOT_EMOJI[slot]}
        levelBadge={item ? `${UI_LEVEL}${item.itemLevel}` : undefined}
        contextBadge={item ? SLOT_EMOJI[slot] : undefined}
        showModPendingBadge={Boolean(item && !modsDisabled && hasPendingModOffer(item.modSlots))}
        slotDots={
          item && item.modSlots.length > 0 ? (
            <ModSlotDots modSlots={item.modSlots} />
          ) : undefined
        }
        state={state}
        className={focused ? 'inv-cell--selected' : undefined}
        popoverTitle={item ? tmpl?.label : SLOT_LABEL[slot]}
        popoverContent={popover}
        ariaLabel={
          item && tmpl ? itemSelectShortLabel(tmpl, item.itemLevel) : `${SLOT_LABEL[slot]} — пусто`
        }
        style={{ opacity: isDragging ? 0.4 : undefined }}
        onClick={onSlotClick}
      />
    </div>
  )
}

export function EquipmentInventoryView({
  campaign,
  characterId,
  inBattle,
  modsDisabled = false,
  modsDisabledTooltip,
  onEquip,
  onUnequip,
  onReorderStash,
  onSellItem,
  onInvalidSlot,
  onTransferItem,
  onMoveChestItemToCharacter,
  onMoveCharacterItemToChest,
  onSetSquadSlot,
  onSwapSquadSlots,
  onPickModOffer,
  onRemoveMod,
  squadLocked = false,
  panelTitle,
  hideInnerSectionTitles = false,
  sideContent,
  dndBeforeContent,
  dndAfterContent,
  characterHub,
  onSetBattleLoadout,
  onSetPassiveEquip,
  onReorderCards,
  loadoutFocus,
  onToggleEquipFocus,
  onStashItemClick,
  onStashItemHover,
}: EquipmentInventoryViewProps) {
  const { modal } = App.useApp()
  const hero = getCharacter(campaign, characterId)
  const stash = useMemo(
    () => (hero ? stashItemsFromCampaign(hero.items, hero.equipment) : []),
    [hero],
  )
  const stashIds = stash.map((i) => i.id)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [flashInvalid, setFlashInvalid] = useState(false)
  const [picker, setPicker] = useState<PickerState>(null)

  function openPicker(carrierId: string, slotIndex: number, offer: ModOffer) {
    setPicker({ carrierId, slotIndex, offer })
  }

  function confirmRemoveMod(item: ItemInstance, slotIndex: number) {
    modal.confirm({
      title: 'Удалить модификатор?',
      content: removeModConfirmText(item.itemLevel, slotIndex),
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => onRemoveMod('item', item.id, slotIndex),
    })
  }

  const bindItemModHandlers = (item: ItemInstance) => ({
    onOpenPicker: (slotIndex: number, offer: ModOffer) =>
      openPicker(item.id, slotIndex, offer),
    onConfirmRemove: (slotIndex: number) => confirmRemoveMod(item, slotIndex),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const activeStashItem =
    activeParsed?.kind === 'stash'
      ? stash.find((i) => i.id === activeParsed.value)
      : undefined
  const activeChestItem =
    activeParsed?.kind === 'chest-item'
      ? campaign.chest.items.find((i) => i.id === activeParsed.value)
      : undefined
  const activeTmpl = activeStashItem
    ? getItemTemplate(activeStashItem.templateId)
    : activeChestItem
      ? getItemTemplate(activeChestItem.templateId)
      : undefined

  function compareForSlot(slot: EquipmentSlot): string | undefined {
    if (!activeStashItem || !activeTmpl) return undefined
    if (activeTmpl.slot !== slot) return undefined
    const delta = previewEquipDelta(campaign, characterId, activeStashItem.id, slot, getItemTemplate)
    if (!delta) return undefined
    const multSign = delta.deltaDamageMult >= 0 ? '+' : ''
    return `Δ${UI_HEART} ${delta.deltaMaxHp >= 0 ? '+' : ''}${delta.deltaMaxHp} · Δ${UI_DAMAGE} ×${multSign}${delta.deltaDamageMult.toFixed(2)}`
  }

  function handleDragStart(event: DragStartEvent) {
    if (inBattle) return
    setActiveDragId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    if (inBattle) return

    const active = parseDragId(String(event.active.id))
    const over = event.over ? parseDragId(String(event.over.id)) : null
    if (!active || !over) return

    if (active.kind === 'stash' && over.kind === 'slot') {
      const slot = over.value as EquipmentSlot
      const tmpl = getItemTemplate(
        stash.find((i) => i.id === active.value)?.templateId ?? '',
      )
      if (!tmpl || tmpl.slot !== slot) {
        setFlashInvalid(true)
        window.setTimeout(() => setFlashInvalid(false), 400)
        onInvalidSlot()
        return
      }
      onEquip(active.value, slot)
      return
    }

    if (
      active.kind === 'slot' &&
      (over.kind === 'stash' || over.kind === 'stash-empty')
    ) {
      onUnequip(active.value as EquipmentSlot)
      return
    }

    if (active.kind === 'stash' && over.kind === 'stash') {
      const oldIndex = stashIds.indexOf(active.value)
      const newIndex = stashIds.indexOf(over.value)
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        onReorderStash(arrayMove(stashIds, oldIndex, newIndex))
      }
      return
    }

    if (active.kind === 'stash' && over.kind === 'roster-drop') {
      if (onTransferItem && !squadLocked) {
        onTransferItem(active.value, over.value)
      }
      return
    }

    if (active.kind === 'chest-item' && over.kind === 'roster-drop') {
      if (onMoveChestItemToCharacter && !squadLocked) {
        onMoveChestItemToCharacter(active.value, over.value)
      }
      return
    }

    if (active.kind === 'stash' && over.kind === 'chest-drop') {
      if (onMoveCharacterItemToChest && !squadLocked) {
        onMoveCharacterItemToChest(active.value)
      }
      return
    }

    if (
      active.kind === 'roster-drag' &&
      over.kind === 'squad-slot' &&
      onSetSquadSlot &&
      !squadLocked &&
      !characterHub
    ) {
      const slotIndex = Number(over.value)
      if (Number.isNaN(slotIndex)) return
      const resolution = resolveSquadDragDrop(campaign.squad, active.value, slotIndex)
      if (resolution.type === 'swap') {
        onSwapSquadSlots?.(resolution.from, resolution.to)
      } else {
        onSetSquadSlot(resolution.slotIndex, resolution.characterId)
      }
      return
    }

    if (!characterHub || !hero) return

    if (active.kind === 'passive' && onSetPassiveEquip) {
      if (over?.kind === 'passive-equip') {
        const slotIndex = Number(over.value) as 0 | 1 | 2 | 3 | 4
        if (slotIndex >= 0 && slotIndex < maxPassiveEquipSlots(hero)) {
          const check = canEquipPassive(hero.passives, hero.passiveEquip, active.value, slotIndex)
          if (!check.ok) return
          onSetPassiveEquip(slotIndex, active.value)
        }
      }
      return
    }

    if (active.kind === 'card' && onSetBattleLoadout) {
      if (over?.kind === 'loadout') {
        const card = hero.cards.find((c) => c.id === active.value)
        const tmpl = card ? getCardAttackTemplate(card.templateId) : undefined
        if (tmpl?.enabled === false) return
        const slotIndex = Number(over.value)
        if (slotIndex >= 0 && slotIndex < maxSkillLoadoutSlots(hero)) {
          onSetBattleLoadout(slotIndex as 0 | 1 | 2 | 3, active.value)
        }
      }
      return
    }

    if (active.kind === 'card' && onReorderCards && over?.kind === 'card') {
      const loadout = hero.battleLoadout
      const loadoutIds = new Set(loadout.filter((id): id is string => id !== null))
      const collectionCards = hero.cards.filter((c) => !loadoutIds.has(c.id))
      const cardIds = collectionCards.map((c) => c.id)
      const oldIndex = cardIds.indexOf(active.value)
      const newIndex = cardIds.indexOf(over.value)
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        onReorderCards(arrayMove(cardIds, oldIndex, newIndex))
      }
    }
  }

  if (!hero) return null

  const equipSection = (
    <div>
      {!hideInnerSectionTitles ? (
        <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
          Экипировка
        </Typography.Text>
      ) : null}
      <div className="inv-slot-row">
        {EQUIPMENT_ROLL_ORDER.map((slot) => {
          const equippedId = hero.equipment[slot]
          const item =
            equippedId !== null ? hero.items.find((x) => x.id === equippedId) : undefined
          const dragOver =
            activeTmpl?.slot === slot ||
            (activeParsed?.kind === 'stash' &&
              getItemTemplate(
                stash.find((i) => i.id === activeParsed.value)?.templateId ?? '',
              )?.slot === slot)
          return (
            <EquipmentSlotCell
              key={slot}
              slot={slot}
              item={item}
              inBattle={inBattle}
              modsDisabled={modsDisabled}
              modsDisabledTooltip={modsDisabledTooltip}
              dragOver={Boolean(dragOver)}
              compareText={compareForSlot(slot)}
              onUnequip={() => onUnequip(slot)}
              onOpenPicker={
                item ? (slotIndex, offer) => openPicker(item.id, slotIndex, offer) : () => {}
              }
              onConfirmRemove={
                item ? (slotIndex) => confirmRemoveMod(item, slotIndex) : () => {}
              }
              focused={loadoutFocus?.kind === 'equip' && loadoutFocus.slot === slot}
              onSlotClick={
                characterHub && onToggleEquipFocus && !inBattle
                  ? () => onToggleEquipFocus(slot)
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )

  const stashSection = (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        {!characterHub ? <Typography.Text strong>Инвентарь</Typography.Text> : null}
        <Button
          size="small"
          disabled={inBattle || stash.length === 0}
          onClick={() => onReorderStash(sortStashIdsBySlot(stash, getItemTemplate))}
        >
          По слоту
        </Button>
        <Button
          size="small"
          disabled={inBattle || stash.length === 0}
          onClick={() => onReorderStash(sortStashIdsByLevel(stash))}
        >
          По уровню
        </Button>
      </Space>
      <SortableContext items={stashIds.map(stashDragId)} strategy={rectSortingStrategy}>
        <InventoryGrid
          itemCount={stash.length}
          renderCell={(index, isEmpty) => {
            if (isEmpty) {
              return <StashEmptyCell key={`empty-${index}`} index={index} inBattle={inBattle} />
            }
            const item = stash[index]!
            const tmpl = getItemTemplate(item.templateId)
            const sellPrice = tmpl ? itemSellPrice(tmpl) : 0
            const modHandlers = bindItemModHandlers(item)
            return (
              <SortableStashCell
                key={item.id}
                item={item}
                inBattle={inBattle}
                modsDisabled={modsDisabled}
                modsDisabledTooltip={modsDisabledTooltip}
                cellState={inBattle ? 'disabled' : flashInvalid ? 'invalidDrop' : 'filled'}
                sellPrice={onSellItem ? sellPrice : undefined}
                onEquip={() => {
                  if (inBattle || !tmpl) return
                  if (characterHub && onStashItemClick) {
                    onStashItemClick(item.id)
                    return
                  }
                  onEquip(item.id, tmpl.slot)
                }}
                onDoubleClick={() => {
                  if (inBattle || !tmpl) return
                  if (characterHub && onStashItemClick) {
                    onStashItemClick(item.id)
                    return
                  }
                  onEquip(item.id, tmpl.slot)
                }}
                {...modHandlers}
                onMoveToChest={
                  onMoveCharacterItemToChest && !squadLocked
                    ? () => onMoveCharacterItemToChest(item.id)
                    : undefined
                }
                onSell={onSellItem ? () => onSellItem(item.id) : undefined}
                onCellClick={
                  characterHub && onStashItemClick && !inBattle
                    ? () => onStashItemClick(item.id)
                    : undefined
                }
                onCellHover={
                  characterHub && onStashItemHover ? () => onStashItemHover(item.id) : undefined
                }
              />
            )
          }}
        />
      </SortableContext>
    </div>
  )

  const modPicker = (
    <ModOfferPicker
      open={picker !== null}
      offer={picker?.offer ?? null}
      onCancel={() => setPicker(null)}
      onPick={(modTemplateId) => {
        if (!picker) return
        onPickModOffer('item', picker.carrierId, picker.slotIndex, modTemplateId)
        setPicker(null)
      }}
    />
  )

  const content = characterHub ? (
    <div className="game-character-hub">
      {characterHub.rail}
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {characterHub.buildHeader}
        {equipSection}
        {characterHub.loadoutPanel}
        {modPicker}
      </Space>
      <div style={{ minWidth: 0 }}>
        {characterHub.renderStashTabs(stashSection)}
      </div>
    </div>
  ) : (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {equipSection}
      {stashSection}
      {modPicker}
    </Space>
  )

  const panel = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {!characterHub ? dndBeforeContent?.(activeDragId) : null}
      {!characterHub && sideContent !== undefined ? (
        <GameColumns>
          <div>
            {panelTitle !== undefined ? (
              <GamePanel title={panelTitle}>
                {inBattle ? <Tooltip title="Доступно после боя">{content}</Tooltip> : content}
              </GamePanel>
            ) : inBattle ? (
              <Tooltip title="Доступно после боя">{content}</Tooltip>
            ) : (
              content
            )}
          </div>
          <div>{sideContent}</div>
        </GameColumns>
      ) : characterHub ? (
        inBattle ? <Tooltip title="Доступно после боя">{content}</Tooltip> : content
      ) : panelTitle !== undefined ? (
        <GamePanel title={panelTitle}>
          {inBattle ? <Tooltip title="Доступно после боя">{content}</Tooltip> : content}
        </GamePanel>
      ) : inBattle ? (
        <Tooltip title="Доступно после боя">{content}</Tooltip>
      ) : (
        content
      )}
      {characterHub ? null : dndAfterContent?.(activeDragId)}
      <DragOverlay>
        {activeStashItem || activeChestItem ? (
          <InventoryCell
            emoji={resolveItemEmoji(activeTmpl, activeTmpl?.slot ?? 'weapon')}
            levelBadge={`${UI_LEVEL}${(activeStashItem ?? activeChestItem)!.itemLevel}`}
            state="filled"
            ariaLabel="Перетаскивание"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )

  return panel
}
