import { useEffect, useState } from 'react'
import { matchNarrowViewport, NARROW_VIEWPORT_MEDIA_QUERY } from './narrowViewport'

export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(matchNarrowViewport)

  useEffect(() => {
    const media = window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY)
    const onChange = () => setNarrow(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return narrow
}
