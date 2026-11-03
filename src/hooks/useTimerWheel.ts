import { useEffect, useRef, type RefObject } from 'react'

/** Keep wheel capture local to the countdown, using a non-passive listener. */
export function useTimerWheel(target: RefObject<HTMLElement | null>, adjustTime: (seconds: number) => void, enabled: boolean, durationSeconds: number) {
  const adjustRef = useRef(adjustTime)
  adjustRef.current = adjustTime
  useEffect(() => {
    const element = target.current
    if (!element || !enabled) return
    let accumulated = 0
    let lastAt = 0
    const onWheel = (event: WheelEvent) => {
      if (!event.cancelable || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          !Number.isFinite(event.deltaY) || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      // Normalize pixel, line, and page deltas. Accumulate small trackpad
      // movements instead of treating every pixel event as a whole minute.
      const delta = event.deltaY * (event.deltaMode === 1 ? 100 / 3 : event.deltaMode === 2 ? 100 : 1)
      if (event.timeStamp - lastAt > 250 || Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0
      lastAt = event.timeStamp
      accumulated += delta
      const steps = Math.trunc(accumulated / 100)
      if (steps) {
        // Discard fractional overshoot after a step: mouse-wheel pixel deltas
        // vary with display scaling and should not build up extra minutes.
        accumulated = 0
        adjustRef.current(-steps * 60)
      }
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [target, enabled, durationSeconds])
}
