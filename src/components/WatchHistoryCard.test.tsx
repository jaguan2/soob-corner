import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { WatchHistoryCard } from './WatchHistoryCard'
import type { Video } from '../types/playlist'
import type { WatchHistory } from '../lib/watchHistory'
import { LANGUAGES, translate, translateText } from '../i18n/translate'
import { LanguageContext } from '../i18n/useLanguage'

let root: ReactTestRenderer | undefined
const video: Video = { id: 'saved-video', title: "Soobin's quiet vlog", originalTitle: '수빈의 브이로그', thumbnail: '', duration: '20:00' }
const history: WatchHistory = { version: 1, entries: [{ id: video.id, title: '수빈의 브이로그', thumbnail: '', duration: '20:00', members: ['soobin'], firstWatchedAt: 1000, lastWatchedAt: 2000, plays: 3 }] }
const noop = () => {}
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined })

describe('localized history labels', () => {
  it('uses current catalog titles and searches both languages without rewriting watch counts or snapshots', () => {
    act(() => { root = create(<WatchHistoryCard history={history} playable={[video]} queuedVideos={[]} onPlay={noop} onQueue={noop} />) })
    expect(root!.root.findByProps({ className: 'history-video-title' }).children).toEqual([video.title])
    for (const value of ['quiet', '수빈의']) {
      act(() => root!.root.findByProps({ 'aria-label': 'Search watch history' }).props.onChange({ target: { value } }))
      expect(root!.root.findByProps({ className: 'history-video-title' }).children).toEqual([video.title])
    }
    expect(history.entries[0]).toMatchObject({ title: '수빈의 브이로그', plays: 3 })
  })
  it('retains saved titles for videos unavailable in the catalog', () => {
    act(() => { root = create(<WatchHistoryCard history={history} playable={[]} queuedVideos={[]} onPlay={noop} onQueue={noop} />) })
    expect(root!.root.findByProps({ className: 'history-video-title' }).children).toEqual(['수빈의 브이로그'])
    expect(root!.root.findByProps({ 'aria-label': 'Play again: 수빈의 브이로그' }).props.disabled).toBe(true)
  })
  it('keeps localized labels for session-blocked videos while disabling playback', () => {
    act(() => { root = create(<WatchHistoryCard history={history} playable={[]} catalogVideos={[video]} queuedVideos={[]} onPlay={noop} onQueue={noop} />) })
    expect(root!.root.findByProps({ className: 'history-video-title' }).children).toEqual([video.title])
    expect(root!.root.findByProps({ 'aria-label': `Play again: ${video.title}` }).props.disabled).toBe(true)
  })
})

describe('watch history by day', () => {
  const at = (year: number, month: number, day: number, hour = 12, minute = 0) => new Date(year, month - 1, day, hour, minute).getTime()
  const entry = (id: string, lastWatchedAt: number, members: WatchHistory['entries'][number]['members'] = ['soobin']) => ({
    ...history.entries[0], id, title: id, members, firstWatchedAt: at(2025, 1, 1), lastWatchedAt,
  })
  const headings = () => root!.root.findAllByProps({ className: 'history-day-heading' })
  const titles = () => root!.root.findAllByProps({ className: 'history-video-title' }).map(node => node.children[0])
  const mount = (value: WatchHistory, headingLevel: 'h1' | 'h2' = 'h2') => {
    act(() => { root = create(<WatchHistoryCard history={value} playable={[]} queuedVideos={[]} onPlay={noop} onQueue={noop} headingLevel={headingLevel} />) })
  }

  it('groups by local last-played day, newest first, without the distinct-video summary', () => {
    const value: WatchHistory = { version: 1, entries: [
      entry('Yesterday', at(2026, 11, 2, 23, 55)),
      entry('After midnight', at(2026, 11, 3, 0, 5)),
      entry('Evening', at(2026, 11, 3, 23, 55)),
    ] }
    const snapshot = JSON.stringify(value)
    mount(value)
    expect(headings().map(node => node.findByType('time').props.dateTime)).toEqual(['2026-11-03', '2026-11-02'])
    expect(titles()).toEqual(['Evening', 'After midnight', 'Yesterday'])
    expect(root!.root.findAllByProps({ className: 'watch-history-list' }).map(node => node.findAllByType('li').length)).toEqual([2, 1])
    expect(headings().every(node => node.type === 'h3')).toBe(true)
    expect(root!.root.findAllByProps({ className: 'history-video-title' }).every(node => node.type === 'h4')).toBe(true)
    expect(JSON.stringify(root!.toJSON())).not.toContain('distinct videos')
    const lastPlayed = root!.root.findAllByProps({ className: 'history-last-played' })[0].findByType('time')
    expect(lastPlayed.props.dateTime).toBe(new Date(at(2026, 11, 3, 23, 55)).toISOString())
    expect(lastPlayed.children).toEqual([new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(at(2026, 11, 3, 23, 55))])
    expect(JSON.stringify(value)).toBe(snapshot)
  })

  it('filters before grouping and removes empty day sections', () => {
    mount({ version: 1, entries: [entry('Soobin vlog', at(2026, 11, 3)), entry('Kai live', at(2026, 11, 2), ['hueningkai'])] })
    act(() => root!.root.findByProps({ 'aria-label': 'Filter watch history by member' }).props.onChange({ target: { value: 'hueningkai' } }))
    expect(headings().map(node => node.findByType('time').props.dateTime)).toEqual(['2026-11-02'])
    expect(titles()).toEqual(['Kai live'])
    act(() => root!.root.findByProps({ 'aria-label': 'Search watch history' }).props.onChange({ target: { value: 'no-match' } }))
    expect(headings()).toHaveLength(0)
    expect(root!.root.findAllByProps({ className: 'watch-history-list' })).toHaveLength(0)
    expect(root!.root.findByProps({ className: 'history-empty' }).children).toEqual(['No watched videos match. Try another search or member.'])
  })

  it('extends a partially visible day once when loading more and keeps different years separate', () => {
    const value: WatchHistory = { version: 1, entries: [
      ...Array.from({ length: 21 }, (_, index) => entry(`Recent ${index}`, at(2026, 11, 3, 12, index))),
      entry('Previous day', at(2026, 11, 2)), entry('Previous year', at(2025, 11, 3)),
    ] }
    mount(value, 'h1')
    expect(titles()).toHaveLength(20)
    expect(headings()).toHaveLength(1)
    act(() => root!.root.findByProps({ className: 'workspace-button history-more' }).props.onClick())
    expect(titles()).toHaveLength(23)
    expect(headings().map(node => node.findByType('time').props.dateTime)).toEqual(['2026-11-03', '2026-11-02', '2025-11-03'])
    expect(headings().every(node => node.type === 'h2')).toBe(true)
    expect(root!.root.findAllByProps({ className: 'history-video-title' }).every(node => node.type === 'h3')).toBe(true)
    expect(root!.root.findAllByProps({ className: 'workspace-button history-more' })).toHaveLength(0)
  })

  it('localizes day headings in all five languages while keeping replay and queue IDs intact', () => {
    const date = at(2026, 11, 3, 23, 55)
    const value: WatchHistory = { version: 1, entries: [entry(video.id, date)] }
    const onPlay = vi.fn(), onQueue = vi.fn()
    for (const { code } of LANGUAGES) {
      act(() => { root = create(<LanguageContext.Provider value={{ language: code, setLanguage: noop,
        t: (key, values) => translate(code, key, values), text: message => translateText(code, message) }}>
        <WatchHistoryCard history={value} playable={[video]} queuedVideos={[]} onPlay={onPlay} onQueue={onQueue} />
      </LanguageContext.Provider>) })
      expect(headings()[0].findByType('time').children).toEqual([new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)])
      act(() => root!.root.findByProps({ 'aria-label': translate(code, 'Play again: {title}', { title: video.title }) }).props.onClick())
      act(() => root!.root.findByProps({ 'aria-label': translate(code, 'Add to queue: {title}', { title: video.title }) }).props.onClick())
      act(() => root!.unmount())
      root = undefined
    }
    expect(onPlay.mock.calls).toEqual(LANGUAGES.map(() => [video.id]))
    expect(onQueue.mock.calls).toEqual(LANGUAGES.map(() => [video.id]))
  })
})
