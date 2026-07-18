export type CoachMarkVariant = 'onboarding' | 'hint'

export type CoachMarkDef = {
  id: string
  title: string
  text: string
  variant?: CoachMarkVariant
}

export const COACH_MARKS: readonly CoachMarkDef[] = [
  {
    id: 'hub-battle-btn',
    title: 'Раздел боя',
    text: 'Здесь начинается бой и экспедиция. Начните с первого сценария.',
  },
  {
    id: 'battle-start-solo',
    title: 'Первый бой',
    text: 'Первый бой — одиночный сценарий. После победы вернётесь в хаб.',
  },
  {
    id: 'hub-gold',
    title: 'Золото',
    text: 'Золото за победы. Тратится в магазине и таверне.',
  },
  {
    id: 'hub-shop-tab',
    title: 'Магазин',
    text: 'Покупки попадают в сундук — назначьте герою на вкладке «Персонаж».',
  },
  {
    id: 'expedition-unlock',
    title: 'Экспедиция',
    text: 'Ещё 2 боя подряд (two-front, boss-lite). Магазин и таверна на время экспедиции недоступны.',
  },
  {
    id: 'expedition-start',
    title: 'Старт экспедиции',
    text: 'Нажмите плитку «Компания» в секции «Обучение», чтобы начать экспедицию.',
  },
  {
    id: 'inter-battle-camp',
    title: 'Лагерь',
    text: 'Лагерь между боями: отряд восстанавливается, затем следующий бой.',
  },
  {
    id: 'shop-equip-next',
    title: 'Наденьте предмет',
    text: 'Откройте «Сундук» или слот экипировки на «Персонаж» и наденьте предмет.',
    variant: 'hint',
  },
  {
    id: 'trials-intro',
    title: 'Испытания',
    text: 'Испытания — основной режим после обучения. Выберите любую плитку.',
    variant: 'hint',
  },
]

export function coachMarkById(id: string): CoachMarkDef | undefined {
  return COACH_MARKS.find((m) => m.id === id)
}
