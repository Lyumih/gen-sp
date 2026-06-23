export const NARROW_VIEWPORT_MEDIA_QUERY = '(max-width: 520px)'

export function matchNarrowViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY).matches
}
