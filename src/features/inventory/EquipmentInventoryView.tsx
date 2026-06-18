import { useMemo, useState } from 'react'
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
import { Button, Space, Tooltip, Typography } from 'antd'
import { getItemTemplate } from '../../game/content/itemTemplates'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSelectShortLabel,
} from '../../game/descriptions/itemText'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import {
  sortStashIdsByLevel,
  sortStashIdsBySlot,
  stashItemsFromCampaign,
} from '../../game/equipment/stashOrder'
import type { CampaignState, EquipmentSlot, ItemInstance } from '../../game/types'
import { UI_HEART, UI_DAMAGE, UI_LEVEL } from '../../game/ui/labels'
import { SLOT_LABEL } from '../campaign/campaignHubShared'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell, type InventoryCellState } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import {
  parseDragId,
  slotDragId,
  stashDragId,
  stashEmptyDragId,
} from './inventoryDnD'
import { resolveItemEmoji, SLOT_EMOJI } from './inventoryEmoji'
import { previewEquipDelta } from './previewEquipDelta'
import './inventory.css'

type EquipmentInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  onEquip: (itemId: string, slot: EquipmentSlot) => void
  onUnequip: (slot: EquipmentSlot) => void
  onReorderStash: (itemIds: string[]) => void
  onInvalidSlot: () => void
}

function characterStashPopover(
  item: ItemInstance,
  inBattle: boolean,
  onEquip: () => void,
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
        actions={[{ key: 'equip', label: 'Надеть', type: 'primary', onClick: onEquip }]}
      />
    </Space>
  )
}

function characterSlotPopover(
  item: ItemInstance,
  inBattle: boolean,
  onUnequip: () => void,
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
    </Space>
  )
}

function SortableStashCell({
  item,
  inBattle,
  cellState,
  onDoubleClick,
  onEquip,
}: {
  item: ItemInstance
  inBattle: boolean
  cellState: InventoryCellState
  onDoubleClick: () => void
  onEquip: () => void
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
    <InventoryCell
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
      levelBadge={`${UI_LEVEL}${item.itemLevel}`}
      contextBadge={tmpl ? SLOT_EMOJI[tmpl.slot] : undefined}
      state={cellState}
      popoverTitle={tmpl?.label}
      popoverContent={characterStashPopover(item, inBattle, onEquip)}
      ariaLabel={tmpl ? itemSelectShortLabel(tmpl, item.itemLevel) : item.id}
      onDoubleClick={onDoubleClick}
    />
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
  dragOver,
  compareText,
  onUnequip,
}: {
  slot: EquipmentSlot
  item: ItemInstance | undefined
  inBattle: boolean
  dragOver: boolean
  compareText?: string
  onUnequip: () => void
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
      characterSlotPopover(item, inBattle, onUnequip)
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
        contextBadge={SLOT_EMOJI[slot]}
        state={state}
        popoverTitle={item ? tmpl?.label : SLOT_LABEL[slot]}
        popoverContent={popover}
        ariaLabel={
          item && tmpl ? itemSelectShortLabel(tmpl, item.itemLevel) : `${SLOT_LABEL[slot]} — перетащи`
        }
        hintText={item ? undefined : 'перетащи'}
        style={{ opacity: isDragging ? 0.4 : undefined }}
      />
    </div>
  )
}

export function EquipmentInventoryView({
  campaign,
  inBattle,
  onEquip,
  onUnequip,
  onReorderStash,
  onInvalidSlot,
}: EquipmentInventoryViewProps) {
  const stash = useMemo(
    () => stashItemsFromCampaign(campaign.items, campaign.equipment),
    [campaign.items, campaign.equipment],
  )
  const stashIds = stash.map((i) => i.id)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [flashInvalid, setFlashInvalid] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const activeStashItem =
    activeParsed?.kind === 'stash'
      ? stash.find((i) => i.id === activeParsed.value)
      : undefined
  const activeTmpl = activeStashItem
    ? getItemTemplate(activeStashItem.templateId)
    : undefined

  function compareForSlot(slot: EquipmentSlot): string | undefined {
    if (!activeStashItem || !activeTmpl) return undefined
    if (activeTmpl.slot !== slot) return undefined
    const delta = previewEquipDelta(campaign, activeStashItem.id, slot, getItemTemplate)
    if (!delta) return undefined
    return `Δ${UI_HEART} ${delta.deltaHp >= 0 ? '+' : ''}${delta.deltaHp} · Δ${UI_DAMAGE} ${delta.deltaCardLevel >= 0 ? '+' : ''}${delta.deltaCardLevel}`
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
    }
  }

  const content = (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Экипировка
        </Typography.Text>
        <div className="inv-slot-row">
          {EQUIPMENT_ROLL_ORDER.map((slot) => {
            const equippedId = campaign.equipment[slot]
            const item =
              equippedId !== null
                ? campaign.items.find((x) => x.id === equippedId)
                : undefined
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
                dragOver={Boolean(dragOver)}
                compareText={compareForSlot(slot)}
                onUnequip={() => onUnequip(slot)}
              />
            )
          })}
        </div>
      </div>

      <div>
        <Space wrap style={{ marginBottom: 8 }}>
          <Typography.Text strong>Инвентарь</Typography.Text>
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
              return (
                <SortableStashCell
                  key={item.id}
                  item={item}
                  inBattle={inBattle}
                  cellState={
                    inBattle ? 'disabled' : flashInvalid ? 'invalidDrop' : 'filled'
                  }
                  onEquip={() => {
                    if (inBattle || !tmpl) return
                    onEquip(item.id, tmpl.slot)
                  }}
                  onDoubleClick={() => {
                    if (inBattle || !tmpl) return
                    onEquip(item.id, tmpl.slot)
                  }}
                />
              )
            }}
          />
        </SortableContext>
      </div>
    </Space>
  )

  if (inBattle) {
    return <Tooltip title="Доступно после боя">{content}</Tooltip>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
      <DragOverlay>
        {activeStashItem ? (
          <InventoryCell
            emoji={resolveItemEmoji(activeTmpl, activeTmpl?.slot ?? 'weapon')}
            levelBadge={`${UI_LEVEL}${activeStashItem.itemLevel}`}
            state="filled"
            ariaLabel="Перетаскивание"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
