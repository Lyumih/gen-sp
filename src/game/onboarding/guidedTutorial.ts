export type GuidedActionMode = 'move' | 'melee' | 'card'

export type GuidedTutorialStep = {
  hint: string
  allowedModes: readonly GuidedActionMode[]
  requiresAck?: boolean
}

export const GUIDED_TUTORIAL_STEPS: readonly GuidedTutorialStep[] = [
  {
    hint: 'Ваш герой слева, враг справа. Цель — довести HP врага до 0.',
    allowedModes: [],
    requiresAck: true,
  },
  {
    hint: 'Выберите подсвеченную зелёную клетку ближе к врагу.',
    allowedModes: ['move'],
  },
  {
    hint: 'Подойдите вплотную, если ещё не рядом (подсвеченные клетки = ход).',
    allowedModes: ['move'],
  },
  {
    hint: '«Удар» — клик по врагу на соседней клетке.',
    allowedModes: ['melee'],
  },
  {
    hint: 'Если ходить и бить больше нечем — нажмите «Завершить ход».',
    allowedModes: ['move', 'melee', 'card'],
  },
  {
    hint: 'Повторяйте удары. Умение качается при применении (необязательно).',
    allowedModes: ['melee', 'card'],
  },
  {
    hint: 'Добейте врага. После победы расскажем о прогрессе.',
    allowedModes: ['move', 'melee', 'card'],
  },
]
