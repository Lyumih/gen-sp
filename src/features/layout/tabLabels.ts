export type StashTabId = 'items' | 'cards' | 'passives' | 'chest'
export type ShopTabId = 'offers' | 'sell' | 'chest'

const STASH_FULL: Record<StashTabId, string> = {
  items: 'Предметы',
  cards: 'Умения',
  passives: 'Навыки',
  chest: 'Сундук',
}

const STASH_COMPACT: Record<StashTabId, string> = {
  items: 'Предм.',
  cards: 'Ум.',
  passives: 'Нав.',
  chest: 'Сунд.',
}

const SHOP_FULL: Record<ShopTabId, string> = {
  offers: 'Магазин',
  sell: 'Продажа',
  chest: 'Сундук',
}

const SHOP_COMPACT: Record<ShopTabId, string> = {
  offers: 'Маг.',
  sell: 'Прод.',
  chest: 'Сунд.',
}

function withCount(prefix: string, count: number | null): string {
  return count === null ? prefix : `${prefix} (${count})`
}

export function stashTabLabel(tab: StashTabId, count: number, narrow: boolean): string {
  const prefix = narrow ? STASH_COMPACT[tab] : STASH_FULL[tab]
  return withCount(prefix, count)
}

export function stashTabAriaLabel(tab: StashTabId, count: number): string {
  return stashTabLabel(tab, count, false)
}

export function shopTabLabel(tab: ShopTabId, count: number | null, narrow: boolean): string {
  const prefix = narrow ? SHOP_COMPACT[tab] : SHOP_FULL[tab]
  return withCount(prefix, tab === 'chest' ? count : null)
}

export function shopTabAriaLabel(tab: ShopTabId, count: number | null): string {
  return shopTabLabel(tab, count, false)
}
