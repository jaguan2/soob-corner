import { afterEach, describe, expect, it } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { WatchHistoryCard } from './WatchHistoryCard'
import type { Video } from '../types/playlist'
import type { WatchHistory } from '../lib/watchHistory'

let root: ReactTestRenderer | undefined
const video: Video = { id: 'saved-video', title: "Soobin's quiet vlog", originalTitle: '수빈의 브이로그', thumbnail: '', duration: '20:00' }
const history: WatchHistory = { version: 1, entries: [{ id: video.id, title: '수빈의 브이로그', thumbnail: '', duration: '20:00', members: ['soobin'], firstWatchedAt: 1000, lastWatchedAt: 2000, plays: 3 }] }
const noop = () => {}
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined })

describe('localized history labels', () => {
  it('uses current catalog titles and searches both languages without rewriting watch counts or snapshots', () => {
    act(() => { root = create(<WatchHistoryCard history={history} playable={[video]} queuedVideos={[]} onPlay={noop} onQueue={noop} />) })
    expect(root!.root.findByType('h3').children).toEqual([video.title])
    for (const value of ['quiet', '수빈의']) {
      act(() => root!.root.findByProps({ 'aria-label': 'Search watch history' }).props.onChange({ target: { value } }))
      expect(root!.root.findByType('h3').children).toEqual([video.title])
    }
    expect(history.entries[0]).toMatchObject({ title: '수빈의 브이로그', plays: 3 })
  })
  it('retains saved titles for videos unavailable in the catalog', () => {
    act(() => { root = create(<WatchHistoryCard history={history} playable={[]} queuedVideos={[]} onPlay={noop} onQueue={noop} />) })
    expect(root!.root.findByType('h3').children).toEqual(['수빈의 브이로그'])
    expect(root!.root.findByProps({ 'aria-label': 'Play again: 수빈의 브이로그' }).props.disabled).toBe(true)
  })
  it('keeps localized labels for session-blocked videos while disabling playback', () => {
    act(() => { root = create(<WatchHistoryCard history={history} playable={[]} catalogVideos={[video]} queuedVideos={[]} onPlay={noop} onQueue={noop} />) })
    expect(root!.root.findByType('h3').children).toEqual([video.title])
    expect(root!.root.findByProps({ 'aria-label': `Play again: ${video.title}` }).props.disabled).toBe(true)
  })
})
