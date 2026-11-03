import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useTimerWheel } from './useTimerWheel'

let root: ReactTestRenderer | undefined
let target: { current: HTMLElement }
const adjust = vi.fn()
function Harness({ enabled = true, callback = adjust, duration = 1500 }) {
  useTimerWheel(target, callback, enabled, duration)
  return null
}
function wheel(deltaY: number, extra: Record<string, unknown> = {}, cancelable = true) {
  const event = new Event('wheel', { cancelable })
  Object.defineProperties(event, Object.fromEntries(Object.entries({ deltaY, deltaX: 0, deltaMode: 0, timeStamp: 1000, ...extra })
    .map(([key, value]) => [key, { value }])))
  act(() => { target.current.dispatchEvent(event) })
  return event
}
beforeEach(() => {
  vi.clearAllMocks()
  target = { current: new EventTarget() as HTMLElement }
  act(() => { root = create(<Harness />) })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
})

describe('countdown wheel gestures', () => {
  it.each([[0, -100], [1, -3], [2, -1]])('normalizes wheel mode %s into one-minute steps', (deltaMode, delta) => {
    expect(wheel(delta, { deltaMode }).defaultPrevented).toBe(true)
    expect(adjust).toHaveBeenCalledExactlyOnceWith(60)
    wheel(-delta, { deltaMode })
    expect(adjust).toHaveBeenLastCalledWith(-60)
  })

  it('accumulates trackpad pixels and changes direction without carrying the previous gesture', () => {
    wheel(40); wheel(40, { timeStamp: 1050 })
    expect(adjust).not.toHaveBeenCalled()
    wheel(40, { timeStamp: 1100 })
    expect(adjust).toHaveBeenCalledExactlyOnceWith(-60)
    wheel(-40, { timeStamp: 1120 }); wheel(-60, { timeStamp: 1140 })
    expect(adjust).toHaveBeenLastCalledWith(60)
  })

  it('expires leftover movement between gestures and supports multiple notches in one event', () => {
    wheel(40); wheel(40, { timeStamp: 1400 })
    expect(adjust).not.toHaveBeenCalled()
    wheel(60, { timeStamp: 1450 })
    expect(adjust).toHaveBeenCalledExactlyOnceWith(-60)
    wheel(-300, { timeStamp: 1500 })
    expect(adjust).toHaveBeenLastCalledWith(180)
  })

  it('discards scaled-wheel overshoot and resets partial movement when a preset changes', () => {
    wheel(-125); wheel(-125); wheel(-125); wheel(-125)
    expect(adjust.mock.calls).toEqual([[60], [60], [60], [60]])
    adjust.mockClear()
    wheel(-60)
    act(() => root!.update(<Harness duration={1800} />))
    wheel(-40)
    expect(adjust).not.toHaveBeenCalled()
    wheel(-60)
    expect(adjust).toHaveBeenCalledExactlyOnceWith(60)
  })

  it('leaves modified, horizontal, zero, invalid, and non-cancelable scrolling alone', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) expect(wheel(100, { [modifier]: true }).defaultPrevented).toBe(false)
    expect(wheel(100, { deltaX: 200 }).defaultPrevented).toBe(false)
    expect(wheel(0).defaultPrevented).toBe(false)
    expect(wheel(NaN).defaultPrevented).toBe(false)
    wheel(100, {}, false)
    expect(adjust).not.toHaveBeenCalled()
  })

  it('uses the current action and removes the listener while editing and on unmount', () => {
    const latest = vi.fn()
    act(() => root!.update(<Harness callback={latest} />))
    wheel(100)
    expect(latest).toHaveBeenCalledExactlyOnceWith(-60)
    expect(adjust).not.toHaveBeenCalled()
    act(() => root!.update(<Harness enabled={false} />))
    expect(wheel(100).defaultPrevented).toBe(false)
    act(() => root!.update(<Harness />))
    act(() => root!.unmount())
    root = undefined
    expect(wheel(100).defaultPrevented).toBe(false)
    expect(adjust).not.toHaveBeenCalled()
  })
})
