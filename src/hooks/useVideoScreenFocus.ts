import { useEffect, useRef } from 'react'

/** Restore a useful focus target when navigation replaces the entire screen. */
export function useVideoScreenFocus(videoId: string | null) {
  const backButton = useRef<HTMLButtonElement>(null)
  const previousId = useRef<string | null>(null)
  useEffect(() => {
    const previous = previousId.current
    previousId.current = videoId
    if (videoId !== null && previous === null) backButton.current?.focus()
    if (videoId === null && previous !== null) {
      const card = [...document.querySelectorAll<HTMLButtonElement>('.catalog-welcome button[data-video-action="play"]')]
        .find(button => button.dataset.videoId === previous)
      const fallback = document.querySelector<HTMLElement>('#welcome-videos h1')
      const destination = card ?? fallback
      destination?.focus()
    }
  }, [videoId])
  return backButton
}
