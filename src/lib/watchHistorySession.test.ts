import { describe, expect, it, vi } from 'vitest'
import { createWatchHistorySession } from './watchHistorySession'
import { emptyWatchHistory, recordVideoStart, watchHistoryStats } from './watchHistory'
import type { Video } from '../types/playlist'

const one: Video = { id: 'one', title: 'One', thumbnail: '', duration: '20:00', members: ['soobin'] }
const two: Video = { id: 'two', title: 'Two', thumbnail: '', duration: '20:00', members: ['hueningkai'] }
const directLock = (operation: () => boolean) => Promise.resolve(operation())

describe('saved watch history sessions', () => {
  it('serializes overlapping tabs against the latest saved history, including rewatches', async () => {
    let saved = emptyWatchHistory()
    let tail: Promise<unknown> = Promise.resolve()
    const lock = (operation: () => boolean) => { const next = tail.then(operation); tail = next; return next }
    const deps = { read: () => saved, write: (next: typeof saved) => { saved = next; return true }, lock }
    const first = createWatchHistorySession(deps)
    const second = createWatchHistorySession(deps)
    await Promise.all([first.record(one, 100), second.record(one, 200), second.record(two, 300)])
    expect(watchHistoryStats(saved)).toMatchObject({ uniqueVideos: 2, totalPlays: 3 })
    first.refresh()
    expect(first.getSnapshot()).toEqual(saved)
  })

  it('retains failed writes and replays pending starts exactly once after recovery', async () => {
    let saved = emptyWatchHistory()
    const write = vi.fn().mockReturnValueOnce(false).mockImplementation(next => { saved = next; return true })
    const session = createWatchHistorySession({ read: () => saved, write, lock: directLock })
    expect(await session.record(one, 100)).toBe(false)
    expect(watchHistoryStats(session.getSnapshot()).totalPlays).toBe(1)
    expect(saved.entries).toEqual([])
    expect(await session.record(one, 200)).toBe(true)
    expect(watchHistoryStats(saved)).toMatchObject({ uniqueVideos: 1, totalPlays: 2 })
    await session.flush()
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('never overwrites unreadable history, then merges pending starts on recovery', async () => {
    let readable = false
    let saved = recordVideoStart(emptyWatchHistory(), two, 50)
    const write = vi.fn(next => { saved = next; return true })
    const session = createWatchHistorySession({ read: () => { if (!readable) throw Error('Blocked'); return saved }, write, lock: directLock })
    expect(await session.record(one, 100)).toBe(false)
    expect(write).not.toHaveBeenCalled()
    readable = true
    session.refresh()
    expect(watchHistoryStats(session.getSnapshot()).uniqueVideos).toBe(2)
    await session.flush()
    expect(watchHistoryStats(saved)).toMatchObject({ uniqueVideos: 2, totalPlays: 2 })
  })

  it('refreshes without writing and does not discard a readable snapshot on failure', async () => {
    let saved = emptyWatchHistory()
    const read = vi.fn(() => saved)
    const write = vi.fn(next => { saved = next; return true })
    const session = createWatchHistorySession({ read, write, lock: directLock })
    const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)
    saved = recordVideoStart(saved, one, 100)
    session.refresh()
    expect(listener).toHaveBeenCalledOnce()
    expect(write).not.toHaveBeenCalled()
    read.mockImplementationOnce(() => { throw Error('Blocked') })
    session.refresh()
    expect(session.getSnapshot()).toEqual(saved)
    unsubscribe()
    await session.record(two, 200)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps starts when a lock fails and accepts another start after the lock callback resolves', async () => {
    let saved = emptyWatchHistory()
    let release!: () => void
    const lock = vi.fn().mockRejectedValueOnce(Error('Lock failed')).mockImplementationOnce(async operation => {
      const result = operation()
      await new Promise<void>(resolve => { release = resolve })
      return result
    }).mockImplementation(directLock)
    const session = createWatchHistorySession({ read: () => saved, write: next => { saved = next; return true }, lock })
    expect(await session.record(one, 100)).toBe(false)
    const pending = session.flush()
    await Promise.resolve(); await Promise.resolve()
    const added = session.record(two, 200)
    release()
    expect(await pending).toBe(true)
    expect(await added).toBe(true)
    expect(watchHistoryStats(saved)).toMatchObject({ uniqueVideos: 2, totalPlays: 2 })
  })
})
