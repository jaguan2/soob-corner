import { describe, expect, it } from 'vitest'
import { emptyWatchHistory, normalizeWatchHistory, recordVideoStart, watchHistoryStats } from './watchHistory'
import type { Video } from '../types/playlist'

const solo: Video = { id: 'solo', title: 'Soobin vlog', thumbnail: 'solo.jpg', duration: '25:00', members: ['soobin'] }
const shared: Video = { id: 'shared', title: 'Two members', thumbnail: 'shared.jpg', duration: '40:00', members: ['soobin', 'hueningkai', 'soobin'] }

describe('watch history and member totals', () => {
  it('counts distinct videos separately from repeat plays and attributes every featured member once', () => {
    let history = recordVideoStart(emptyWatchHistory(), solo, 100)
    history = recordVideoStart(history, shared, 200)
    history = recordVideoStart(history, solo, 300)
    const stats = watchHistoryStats(history)
    expect(stats).toMatchObject({ uniqueVideos: 2, totalPlays: 3 })
    expect(stats.byMember.map(item => [item.member, item.videos])).toEqual([
      ['soobin', 2], ['yeonjun', 0], ['beomgyu', 0], ['taehyun', 0], ['hueningkai', 1],
    ])
    expect(history.entries.find(entry => entry.id === 'solo')).toMatchObject({ firstWatchedAt: 100, lastWatchedAt: 300, plays: 2 })
  })

  it('retains snapshots across catalog changes and updates metadata on another watch', () => {
    const history = recordVideoStart(emptyWatchHistory(), shared, 100)
    const restored = normalizeWatchHistory(JSON.parse(JSON.stringify(history)))
    expect(restored).toEqual(history)
    const updated = recordVideoStart(restored, { ...shared, title: 'Corrected title' }, 200)
    expect(updated.entries[0]).toMatchObject({ title: 'Corrected title', plays: 2 })
    expect(watchHistoryStats(updated).uniqueVideos).toBe(1)
  })

  it.each([null, [], {}, { version: 2, entries: [] }, { version: 1, entries: 'bad' }])('defaults invalid saved schemas safely: %j', raw => {
    expect(normalizeWatchHistory(raw)).toEqual(emptyWatchHistory())
  })

  it('prunes invalid entries and normalizes duplicates without inflating totals', () => {
    const entry = recordVideoStart(emptyWatchHistory(), solo, 100).entries[0]
    const history = normalizeWatchHistory({ version: 1, entries: [entry,
      { ...entry, title: 'New title', plays: 5, lastWatchedAt: 200, members: ['soobin', 'soobin', 'unknown'] },
      null, { ...entry, id: '' }, { ...entry, id: 'bad', plays: -1 },
      { ...entry, id: 'nan', lastWatchedAt: NaN }, { ...entry, id: 'huge', lastWatchedAt: 9e15 },
      { ...entry, id: 'backwards', lastWatchedAt: 50 },
    ] })
    expect(history.entries).toHaveLength(1)
    expect(history.entries[0]).toMatchObject({ title: 'New title', plays: 5, firstWatchedAt: 100, lastWatchedAt: 200, members: ['soobin'] })
    expect(watchHistoryStats(history)).toMatchObject({ uniqueVideos: 1, totalPlays: 5 })
  })

  it('handles backward clocks and invalid times without corrupting timestamps', () => {
    const history = recordVideoStart(emptyWatchHistory(), solo, 200)
    expect(recordVideoStart(history, solo, NaN)).toBe(history)
    expect(recordVideoStart(history, solo, 100).entries[0]).toMatchObject({ firstWatchedAt: 100, lastWatchedAt: 200, plays: 2 })
  })
})
