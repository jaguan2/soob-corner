import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useLocalDay } from './useLocalDay'

let root: ReactTestRenderer | undefined
let day: string
function Harness() { day = useLocalDay(); return null }
async function mount() { await act(async () => { root = create(<Harness />) }) }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 59))
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
})
afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  root = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('local calendar day lifecycle', () => {
  it('changes at midnight while mounted and schedules the following midnight', async () => {
    await mount()
    expect(day).toBe('2026-11-05')
    await act(async () => { vi.advanceTimersByTime(999) })
    expect(day).toBe('2026-11-05')
    await act(async () => { vi.advanceTimersByTime(1) })
    expect(day).toBe('2026-11-06')
    await act(async () => { vi.advanceTimersByTime(86_400_000) })
    expect(day).toBe('2026-11-07')
    expect(vi.getTimerCount()).toBe(1)
  })

  it.each(['focus', 'pageshow', 'visibilitychange'])('catches up after sleep on %s', async event => {
    await mount()
    vi.setSystemTime(new Date(2026, 10, 9, 14))
    await act(async () => { (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event)) })
    expect(day).toBe('2026-11-09')
    expect(vi.getTimerCount()).toBe(1)
  })

  it('leaves hidden-page notifications alone and refreshes when visible again', async () => {
    await mount()
    vi.setSystemTime(new Date(2026, 10, 6, 14))
    Object.assign(document, { hidden: true })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(day).toBe('2026-11-05')
    Object.assign(document, { hidden: false })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(day).toBe('2026-11-06')
  })

  it('removes its timeout and wake listeners on unmount', async () => {
    await mount()
    await act(async () => { root!.unmount() })
    root = undefined
    expect(vi.getTimerCount()).toBe(0)
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('pageshow'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)
  })
})
