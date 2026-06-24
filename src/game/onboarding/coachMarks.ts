export type CoachMarkDef = {
  id: string
  title: string
  text: string
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
    text: 'Выберите «Основная кампания» и подтвердите состав отряда.',
  },
  {
    id: 'inter-battle-camp',
    title: 'Лагерь',
    text: 'Лагерь между боями: отряд восстанавливается, затем следующий бой.',
  },
]

export function coachMarkById(id: string): CoachMarkDef | undefined {
  return COACH_MARKS.find((m) => m.id === id)
}
