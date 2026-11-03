import type { KeyboardEvent } from 'react'

export function tabDestination(key: string, index: number, count: number): number | null {
  if (count < 1 || index < 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'ArrowRight') return (index + 1) % count
  if (key === 'ArrowLeft') return (index - 1 + count) % count
  return null
}

interface CardRect { left: number; top: number; width: number }
export function cardDestination(key: string, index: number, rects: CardRect[]): number | null {
  if (!rects[index]) return null
  if (key === 'Home') return 0
  if (key === 'End') return rects.length - 1
  if (key === 'ArrowLeft') return Math.max(0, index - 1)
  if (key === 'ArrowRight') return Math.min(rects.length - 1, index + 1)
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return null
  const current = rects[index]
  const candidates = rects.map((rect, position) => ({ left: rect.left, top: rect.top, width: rect.width, position }))
    .filter(rect => key === 'ArrowDown' ? rect.top > current.top + 2 : rect.top < current.top - 2)
    .sort((a, b) => Math.abs(a.top - current.top) - Math.abs(b.top - current.top) ||
      Math.abs(a.left + a.width / 2 - current.left - current.width / 2) - Math.abs(b.left + b.width / 2 - current.left - current.width / 2))
  return candidates[0]?.position ?? index
}

function modified(event: KeyboardEvent) {
  return event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.nativeEvent.isComposing
}

/** Extra arrow navigation for native button groups; normal Tab stops remain. */
export function handleButtonArrows(event: KeyboardEvent<HTMLElement>) {
  if (modified(event) || !(event.target instanceof HTMLElement)) return
  const target = event.target.closest('button')
  if (!target || !event.currentTarget.contains(target)) return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    .filter(button => button.getClientRects().length > 0)
  const next = tabDestination(event.key, buttons.indexOf(target), buttons.length)
  if (next === null) return
  event.preventDefault()
  buttons[next]?.focus()
}

/** A normal list with optional spatial navigation; no ARIA grid mode is required. */
export function handleVideoArrows(event: KeyboardEvent<HTMLUListElement>) {
  if (modified(event) || !(event.target instanceof HTMLElement)) return
  const button = event.target.closest<HTMLButtonElement>('button[data-video-action]')
  const card = button?.closest<HTMLElement>('[data-video-card]')
  if (!button || !card) return
  const cards = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-video-card]')]
  const next = cardDestination(event.key, cards.indexOf(card), cards.map(item => item.getBoundingClientRect()))
  if (next === null) return
  event.preventDefault()
  const destination = cards[next]
  const action = button.dataset.videoAction
  const sameAction = destination.querySelector<HTMLButtonElement>(`button[data-video-action="${action}"]`)
  const primary = destination.querySelector<HTMLButtonElement>('button[data-video-action="play"]')
  const control = sameAction && !sameAction.disabled ? sameAction : primary
  control?.focus()
}
