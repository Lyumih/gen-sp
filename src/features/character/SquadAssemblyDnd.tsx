import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { parseDragId, resolveSquadDragDrop } from '../inventory/inventoryDnD'
import type { CampaignState } from '../../game/types'
import { SquadAssemblyPanel, type SquadAssemblyPanelProps } from './SquadAssemblyPanel'

type SquadAssemblyDndProps = Omit<SquadAssemblyPanelProps, 'activeDragId'> & {
  campaign: CampaignState
}

export function SquadAssemblyDnd({
  campaign,
  disabled = false,
  onSetSquadSlot,
  onSwapSquadSlots,
  ...rest
}: SquadAssemblyDndProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    if (disabled) return
    setActiveDragId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    if (disabled) return

    const active = parseDragId(String(event.active.id))
    const over = event.over ? parseDragId(String(event.over.id)) : null
    if (!active || active.kind !== 'roster-drag' || !over || over.kind !== 'squad-slot') return

    const slotIndex = Number(over.value)
    if (Number.isNaN(slotIndex)) return

    const resolution = resolveSquadDragDrop(campaign.squad, active.value, slotIndex)
    if (resolution.type === 'swap') {
      onSwapSquadSlots(resolution.from, resolution.to)
    } else {
      onSetSquadSlot(resolution.slotIndex, resolution.characterId)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SquadAssemblyPanel
        campaign={campaign}
        disabled={disabled}
        onSetSquadSlot={onSetSquadSlot}
        onSwapSquadSlots={onSwapSquadSlots}
        activeDragId={activeDragId}
        {...rest}
      />
    </DndContext>
  )
}
