import { Space, Typography } from 'antd'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { itemInstanceDescriptionLinesFromInstance } from '../../game/descriptions/itemText'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import type { Character, EquipmentSlot } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell } from './InventoryCell'
import { SLOT_EMOJI, resolveItemEmoji } from './inventoryEmoji'

type EquipmentSlotRowProps = {
  character: Character
  inBattle: boolean
  onUnequip: (slot: EquipmentSlot) => void
}

export function EquipmentSlotRow({ character, inBattle, onUnequip }: EquipmentSlotRowProps) {
  return (
    <Space wrap size="small">
      {EQUIPMENT_ROLL_ORDER.map((slot) => {
        const itemId = character.equipment[slot]
        const item = itemId ? character.items.find((i) => i.id === itemId) : undefined
        const tmpl = item ? getItemTemplate(item.templateId) : undefined
        if (!item || !tmpl) {
          return (
            <InventoryCell
              key={slot}
              emoji={SLOT_EMOJI[slot]}
              state="empty"
              ariaLabel={`${slot}: пусто`}
            />
          )
        }
        const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
        return (
          <InventoryCell
            key={slot}
            emoji={resolveItemEmoji(tmpl, slot)}
            levelBadge={`${UI_LEVEL}${item.itemLevel}`}
            state={inBattle ? 'disabled' : 'filled'}
            popoverTitle={tmpl.label}
            popoverContent={
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {SLOT_EMOJI[slot]} {slot}
                </Typography.Text>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                  {lines.map((line, i) => (
                    <li key={i}>
                      <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
                    </li>
                  ))}
                </ul>
                <ItemPopoverActions
                  inBattle={inBattle}
                  actions={[
                    {
                      key: 'unequip',
                      label: 'Снять',
                      onClick: () => onUnequip(slot),
                    },
                  ]}
                />
              </div>
            }
            ariaLabel={tmpl.label}
          />
        )
      })}
    </Space>
  )
}
