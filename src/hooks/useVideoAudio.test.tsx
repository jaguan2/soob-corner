import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useVideoAudio } from './useVideoAudio'

let root: ReactTestRenderer | undefined
let api: ReturnType<typeof useVideoAudio>
let values: Map<string, string>
function Harness({ videoId = 'one' }: { videoId?: string | null }) {
  api = useVideoAudio(videoId)
  return null
}
beforeEach(() => {
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.unstubAllGlobals()
})
function mount() { act(() => { root = create(<Harness />) }) }

describe('video audio gestures', () => {
  it('starts muted with the saved volume and preserves that level when toggling mute', () => {
    values.set('sws.volume', '65')
    mount()
    expect(api).toMatchObject({ volume: 65, muted: true })
    act(() => api.toggleMute())
    expect(api).toMatchObject({ volume: 65, muted: false })
    act(() => api.toggleMute())
    expect(api).toMatchObject({ volume: 65, muted: true })
    expect(values.get('sws.volume')).toBe('65')
  })

  it('unmutes when adjusting volume and restores the last audible value after zero', () => {
    mount()
    act(() => api.changeVolume(72))
    expect(api).toMatchObject({ volume: 72, muted: false })
    act(() => api.changeVolume(0))
    expect(api).toMatchObject({ volume: 0, muted: true })
    act(() => api.toggleMute())
    expect(api).toMatchObject({ volume: 72, muted: false })
    expect(values.get('sws.volume')).toBe('72')
  })

  it('restores an audible default if the saved volume is zero', () => {
    values.set('sws.volume', '0')
    mount()
    act(() => api.toggleMute())
    expect(api).toMatchObject({ volume: 40, muted: false })
  })

  it('retains sound across video swaps but resets mute when returning to selection', () => {
    mount()
    act(() => api.changeVolume(55))
    act(() => root!.update(<Harness videoId="two" />))
    expect(api.muted).toBe(false)
    act(() => root!.update(<Harness videoId={null} />))
    act(() => root!.update(<Harness videoId="three" />))
    expect(api).toMatchObject({ volume: 55, muted: true })
  })

  it('uses guarded storage defaults and rejects invalid volume gestures', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('Unavailable') }, setItem: () => { throw Error('Unavailable') } })
    mount()
    expect(api.volume).toBe(40)
    act(() => api.changeVolume(NaN))
    expect(api.muted).toBe(true)
    act(() => api.changeVolume(120))
    expect(api).toMatchObject({ volume: 100, muted: false })
  })
})
