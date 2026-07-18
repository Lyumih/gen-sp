export type PlaceholderModeId = 'roguelike-run' | 'pvp-online' | 'pvp-async'

export type PlaceholderModeDef = {
  id: PlaceholderModeId
  section: 'roguelike' | 'pvp'
  label: string
  iconEmoji: string
  description: string
  paramEmojiLine: string
}

export const PLACEHOLDER_MODES: readonly PlaceholderModeDef[] = [
  {
    id: 'roguelike-run',
    section: 'roguelike',
    label: 'Run',
    iconEmoji: '🗺',
    description: 'Полный run: карта, выбор пути, мета между попытками',
    paramEmojiLine: '🗺 · ♻ мета',
  },
  {
    id: 'pvp-online',
    section: 'pvp',
    label: 'Онлайн',
    iconEmoji: '⚔',
    description: 'Бой против игрока в реальном времени',
    paramEmojiLine: '⚔ · 🌐 live',
  },
  {
    id: 'pvp-async',
    section: 'pvp',
    label: 'Арена билдов',
    iconEmoji: '👤',
    description: 'Бой против сохранённого отряда другого игрока',
    paramEmojiLine: '👤 · 🏆 arena',
  },
] as const

export function getPlaceholderModesBySection(
  section: 'roguelike' | 'pvp',
): readonly PlaceholderModeDef[] {
  return PLACEHOLDER_MODES.filter((mode) => mode.section === section)
}
