import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { WelcomeScreen } from './WelcomeScreen'
import { WatchHistoryCard } from './WatchHistoryCard'
import { EMPTY_FILTERS } from '../lib/catalog'
import type { WatchHistory } from '../lib/watchHistory'

let root: ReactTestRenderer | undefined
const noop = () => {}
const history: WatchHistory = { version: 1, entries: [{
  id: 'watched-video', title: 'A quiet study vlog', thumbnail: '', duration: '20:00', members: ['soobin'],
  firstWatchedAt: 1000, lastWatchedAt: 2000, plays: 1,
}] }

function mount() {
  act(() => { root = create(<WelcomeScreen timerLabel="25:00" timerRunning={false} onToggleTimer={noop}
    filters={EMPTY_FILTERS} onFiltersChange={noop} videos={[]} favorites={[]} lastVideo={null}
    settings={<p>Settings content</p>}
    history={<WatchHistoryCard history={history} playable={[]} queuedVideos={[]} onPlay={noop} onQueue={noop} headingLevel="h1" />}
    onSelect={noop} onSurprise={noop} onQueue={noop}
    queue={{ videos: [], onPlay: noop, onMove: noop, onRemove: noop, onClear: noop }} />) })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('welcome browsing tabs', () => {
  it('gives history its own panel and retains history filters when switching back to videos', () => {
    mount()
    expect(root!.root.findByProps({ id: 'welcome-history' }).props.hidden).toBe(true)
    act(() => root!.root.findByProps({ id: 'welcome-tab-history' }).props.onClick())
    expect(root!.root.findByProps({ id: 'welcome-videos' }).props.hidden).toBe(true)
    const panel = root!.root.findByProps({ id: 'welcome-history' })
    expect(panel.props.hidden).toBe(false)
    expect(panel.props.role).toBe('tabpanel')
    expect(panel.props['aria-labelledby']).toBe('welcome-tab-history')
    act(() => root!.root.findByProps({ 'aria-label': 'Search watch history' }).props.onChange({ target: { value: 'quiet' } }))
    act(() => root!.root.findByProps({ 'aria-label': 'Filter watch history by member' }).props.onChange({ target: { value: 'soobin' } }))
    act(() => root!.root.findByProps({ id: 'welcome-tab-videos' }).props.onClick())
    act(() => root!.root.findByProps({ id: 'welcome-tab-history' }).props.onClick())
    expect(root!.root.findByProps({ 'aria-label': 'Search watch history' }).props.value).toBe('quiet')
    expect(root!.root.findByProps({ 'aria-label': 'Filter watch history by member' }).props.value).toBe('soobin')
  })

  it('activates and focuses browsing tabs with arrows, Home and End using one tab stop', () => {
    mount()
    const buttons = [{ focus: vi.fn() }, { focus: vi.fn() }]
    const press = (id: string, key: string) => {
      const preventDefault = vi.fn()
      act(() => root!.root.findByProps({ id }).props.onKeyDown({ key, nativeEvent: {}, preventDefault,
        currentTarget: { parentElement: { querySelectorAll: () => buttons } } }))
      return preventDefault
    }
    press('welcome-tab-videos', 'ArrowLeft')
    expect(root!.root.findByProps({ id: 'welcome-tab-history' }).props['aria-selected']).toBe(true)
    expect(buttons[1].focus).toHaveBeenCalledOnce()
    press('welcome-tab-history', 'ArrowRight')
    expect(root!.root.findByProps({ id: 'welcome-tab-videos' }).props.tabIndex).toBe(0)
    press('welcome-tab-videos', 'End')
    press('welcome-tab-history', 'Home')
    expect(root!.root.findAllByProps({ role: 'tab' }).filter(tab => tab.props.tabIndex === 0)).toHaveLength(1)
    expect(press('welcome-tab-videos', 'ArrowDown')).not.toHaveBeenCalled()
  })
})
