import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useVideoCatalog } from './useVideoCatalog'
import { EMPTY_FILTERS } from '../lib/catalog'
import type { Video } from '../types/playlist'

const videos: Video[] = [
  { id: 'one', title: 'First', duration: '25:00', thumbnail: '', members: ['soobin'], publishedAt: '2024-01-01' },
  { id: 'two', title: 'Second', duration: '15:00', thumbnail: '', members: ['yeonjun'], publishedAt: '2025-01-01' },
  { id: 'three', title: 'Third', duration: '35:00', thumbnail: '', members: ['soobin'], publishedAt: '2023-01-01' },
]
let root: ReactTestRenderer | undefined
let api: ReturnType<typeof useVideoCatalog>
let values: Map<string, string>
let location: URL
const blocked = vi.fn()
const repeat = vi.fn()
function Harness({ catalog = videos, isChecking = false }: { catalog?: Video[]; isChecking?: boolean }) {
  api = useVideoCatalog(catalog, blocked, repeat, isChecking)
  return null
}
function mount(url = 'https://study.example/?keep=yes#catalog', catalog = videos) {
  location = new URL(url)
  act(() => { root = create(<Harness catalog={catalog} />) })
}
beforeEach(() => {
  vi.clearAllMocks()
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  vi.stubGlobal('window', {
    get location() { return location },
    history: { replaceState: (_state: unknown, _unused: string, url: string | URL) => { location = new URL(url) } },
  })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('catalog selection and persistence', () => {
  it('preserves a pending deep link until the downloaded catalog can resolve it', () => {
    location = new URL('https://study.example/?keep=yes&v=three#catalog')
    act(() => { root = create(<Harness catalog={videos.slice(0, 2)} isChecking />) })
    expect(api.videoId).toBeNull()
    expect(location.search).toContain('v=three')
    act(() => root!.update(<Harness catalog={videos} />))
    expect(api.videoId).toBe('three')
    expect(location.href).toBe('https://study.example/?keep=yes&v=three#catalog')
  })

  it('does not override a user selection when a delayed catalog arrives', () => {
    location = new URL('https://study.example/?v=three')
    act(() => { root = create(<Harness catalog={videos.slice(0, 2)} isChecking />) })
    act(() => api.selectVideo('two'))
    act(() => root!.update(<Harness catalog={videos} />))
    expect(api.videoId).toBe('two')
    expect(location.search).toBe('?v=two')
  })

  it('cleans an unresolved link after checking finishes and respects explicit cancellation', () => {
    location = new URL('https://study.example/?keep=yes&v=unknown')
    act(() => { root = create(<Harness isChecking />) })
    expect(location.search).toContain('v=unknown')
    act(() => root!.update(<Harness />))
    expect(location.search).toBe('?keep=yes')
    act(() => root!.unmount())
    location = new URL('https://study.example/?v=three')
    act(() => { root = create(<Harness catalog={videos.slice(0, 2)} isChecking />) })
    act(() => api.setVideoId(null))
    act(() => root!.update(<Harness catalog={videos} />))
    expect(api.videoId).toBeNull()
    expect(location.search).toBe('')
  })

  it('retains a removed active video and filters/favorites while pruning queued unavailable entries', () => {
    mount('https://study.example/?v=two')
    act(() => {
      api.queueVideo('three'); api.queueVideo('one')
      api.toggleFavorite('one')
      api.setCatalogFilters({ ...EMPTY_FILTERS, member: 'soobin' })
    })
    act(() => root!.update(<Harness catalog={[videos[0]]} />))
    expect(api.videoId).toBe('two')
    expect(api.currentVideo).toEqual(videos[1])
    expect(api.queuedVideos.map(video => video.id)).toEqual(['one'])
    expect(api.favorites).toEqual(['one'])
    expect(api.catalogFilters.member).toBe('soobin')
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('one')
    expect(api.currentVideo).toEqual(videos[0])
  })

  it('validates deep links and preserves other URL state when returning to welcome', () => {
    mount('https://study.example/?keep=yes&v=two#catalog')
    expect(api.videoId).toBe('two')
    expect(values.get('sws.lastVideo')).toBe('two')
    act(() => api.setVideoId(null))
    expect(location.href).toBe('https://study.example/?keep=yes#catalog')
    expect(api.lastVideo?.id).toBe('two')
  })

  it.each(['', '?v=unknown'])('starts at welcome for an absent or invalid deep link %s', search => {
    mount(`https://study.example/${search}`)
    expect(api.videoId).toBeNull()
    expect(location.search).toBe('')
  })

  it('keeps selection stable while filters and favorites change, then uses the filtered order', () => {
    mount('https://study.example/?v=two')
    act(() => api.setCatalogFilters({ ...EMPTY_FILTERS, member: 'soobin', sort: 'oldest' }))
    expect(api.videoId).toBe('two')
    expect(api.filteredVideos.map(video => video.id)).toEqual(['three', 'one'])
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('three')
    act(() => api.handlePreviousVideo())
    expect(api.videoId).toBe('one')
    act(() => api.toggleFavorite('three'))
    act(() => api.setCatalogFilters({ ...EMPTY_FILTERS, favoritesOnly: true }))
    expect(api.videoId).toBe('one')
    expect(JSON.parse(values.get('sws.favorites')!)).toEqual(['three'])
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('three')
    act(() => api.handleEnded())
    expect(repeat).toHaveBeenCalledOnce()
  })

  it('excludes blocked videos and returns to welcome when none can play', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mount('https://study.example/?v=one')
    act(() => api.handleUnplayable())
    expect(api.videoId).toBe('two')
    expect(api.playable.map(video => video.id)).toEqual(['two', 'three'])
    act(() => api.handleUnplayable())
    expect(api.videoId).toBe('three')
    act(() => api.handleUnplayable())
    expect(api.videoId).toBeNull()
    expect(api.playable).toEqual([])
    expect(api.lastVideo).toBeNull()
    act(() => api.handleUnplayable())
    expect(blocked).toHaveBeenCalledTimes(3)
  })

  it('advances at random without repeating the current candidate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mount('https://study.example/?v=one')
    act(() => api.handleEnded())
    expect(api.videoId).toBe('two')
    expect(repeat).not.toHaveBeenCalled()
  })

  it('handles empty catalogs and unreadable saved preferences', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('Unavailable') }, setItem: () => { throw Error('Unavailable') } })
    mount('https://study.example/?v=one', [])
    expect(api.videoId).toBeNull()
    expect(api.favorites).toEqual([])
    act(() => api.handleSurprise())
    act(() => api.handleNextVideo())
    expect(api.videoId).toBeNull()
    act(() => api.queueVideo('one'))
    expect(api.queuedVideos).toEqual([])
  })
})

describe('persistent video queue', () => {
  const queueIds = () => api.queuedVideos.map(video => video.id)

  it('enqueues once without starting or interrupting playback, and saves the order', () => {
    mount()
    act(() => { api.queueVideo('two'); api.queueVideo('one'); api.queueVideo('two'); api.queueVideo('unknown') })
    expect(queueIds()).toEqual(['two', 'one'])
    expect(api.videoId).toBeNull()
    expect(JSON.parse(values.get('sws.videoQueue')!)).toEqual(['two', 'one'])
    act(() => api.selectVideo('three'))
    act(() => api.queueVideo('three'))
    expect(api.videoId).toBe('three')
    expect(repeat).not.toHaveBeenCalled()
    expect(queueIds()).toEqual(['two', 'one', 'three'])
  })

  it('reorders, removes and clears without affecting playback', () => {
    mount('https://study.example/?v=one')
    act(() => { api.queueVideo('two'); api.queueVideo('three'); api.queueVideo('one') })
    act(() => api.moveQueuedVideo('three', -1))
    expect(queueIds()).toEqual(['three', 'two', 'one'])
    act(() => { api.moveQueuedVideo('three', -1); api.moveQueuedVideo('one', 1); api.moveQueuedVideo('unknown', 1) })
    expect(queueIds()).toEqual(['three', 'two', 'one'])
    act(() => api.moveQueuedVideo('three', 1))
    expect(queueIds()).toEqual(['two', 'three', 'one'])
    act(() => api.removeQueuedVideo('three'))
    expect(queueIds()).toEqual(['two', 'one'])
    act(() => api.clearQueue())
    expect(queueIds()).toEqual([])
    expect(api.videoId).toBe('one')
    expect(values.get('sws.videoQueue')).toBe('[]')
  })

  it('plays queued videos before filtered choices on both Next and end, then falls back', () => {
    mount('https://study.example/?v=one')
    act(() => {
      api.setCatalogFilters({ ...EMPTY_FILTERS, member: 'soobin' })
      api.queueVideo('two'); api.queueVideo('three')
    })
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('two')
    expect(queueIds()).toEqual(['three'])
    act(() => api.handleEnded())
    expect(api.videoId).toBe('three')
    expect(queueIds()).toEqual([])
    act(() => api.handleEnded())
    expect(api.videoId).toBe('one')
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('three')
  })

  it('honors the queue even with no matching catalog results', () => {
    mount('https://study.example/?v=one')
    act(() => { api.setCatalogFilters({ ...EMPTY_FILTERS, query: 'no matches' }); api.queueVideo('two') })
    expect(api.filteredVideos).toEqual([])
    act(() => api.handleEnded())
    expect(api.videoId).toBe('two')
    expect(queueIds()).toEqual([])
  })

  it('starts a chosen queued entry without losing earlier entries', () => {
    mount()
    act(() => { api.queueVideo('one'); api.queueVideo('two'); api.queueVideo('three') })
    act(() => api.selectVideo('two'))
    expect(api.videoId).toBe('two')
    expect(queueIds()).toEqual(['one', 'three'])
    act(() => api.handleNextVideo())
    expect(api.videoId).toBe('one')
    expect(queueIds()).toEqual(['three'])
  })

  it.each(['ended', 'next'] as const)('restarts a deliberately queued current video on %s', action => {
    mount('https://study.example/?v=one')
    act(() => { api.queueVideo('one'); api.queueVideo('two') })
    act(() => action === 'ended' ? api.handleEnded() : api.handleNextVideo())
    expect(api.videoId).toBe('one')
    expect(repeat).toHaveBeenCalledOnce()
    expect(queueIds()).toEqual(['two'])
  })

  it('skips failed queued videos and cannot enqueue them again in this session', () => {
    mount('https://study.example/?v=one')
    act(() => { api.queueVideo('one'); api.queueVideo('two'); api.queueVideo('three') })
    act(() => api.handleUnplayable())
    expect(api.videoId).toBe('two')
    expect(queueIds()).toEqual(['three'])
    act(() => api.queueVideo('one'))
    expect(queueIds()).toEqual(['three'])
    act(() => api.handleUnplayable())
    expect(api.videoId).toBe('three')
    expect(queueIds()).toEqual([])
    expect(blocked).toHaveBeenCalledTimes(2)
  })

  it('restores remaining entries on remount and prunes removed catalog entries', () => {
    values.set('sws.videoQueue', JSON.stringify(['unknown', 'three', 'three', 12, null, 'two', 'one']))
    mount()
    expect(queueIds()).toEqual(['three', 'two', 'one'])
    act(() => api.selectVideo('three'))
    act(() => root!.unmount())
    mount()
    expect(queueIds()).toEqual(['two', 'one'])
    act(() => root!.update(<Harness catalog={[videos[0]]} />))
    expect(queueIds()).toEqual(['one'])
    expect(JSON.parse(values.get('sws.videoQueue')!)).toEqual(['one'])
  })

  it.each(['not json', '{"one":true}', 'null'])('ignores malformed saved queue: %s', saved => {
    values.set('sws.videoQueue', saved)
    mount()
    expect(queueIds()).toEqual([])
    act(() => api.queueVideo('two'))
    expect(queueIds()).toEqual(['two'])
  })
})
