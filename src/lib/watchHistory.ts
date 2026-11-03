import { MEMBERS } from './catalog'
import type { Member, Video } from '../types/playlist'

export const WATCH_HISTORY_KEY = 'sws.watchHistory'
export interface WatchEntry {
  id: string
  title: string
  thumbnail: string
  duration: string
  members: Member[]
  firstWatchedAt: number
  lastWatchedAt: number
  plays: number
}
export interface WatchHistory { version: 1; entries: WatchEntry[] }
export interface WatchStats {
  uniqueVideos: number
  totalPlays: number
  byMember: { member: Member; label: string; videos: number }[]
}
export const emptyWatchHistory = (): WatchHistory => ({ version: 1, entries: [] })
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8.64e15

export function normalizeWatchHistory(raw: unknown): WatchHistory {
  if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 1 || !('entries' in raw) || !Array.isArray(raw.entries)) return emptyWatchHistory()
  const entries = new Map<string, WatchEntry>()
  for (const value of raw.entries) {
    if (!value || typeof value !== 'object') continue
    const entry = value as Partial<WatchEntry>
    if (typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.title !== 'string' ||
        typeof entry.thumbnail !== 'string' || typeof entry.duration !== 'string' ||
        !validTime(entry.firstWatchedAt) || !validTime(entry.lastWatchedAt) || entry.firstWatchedAt > entry.lastWatchedAt ||
        !Number.isSafeInteger(entry.plays) || entry.plays! < 1) continue
    const members = MEMBERS.flatMap(({ value }) => Array.isArray(entry.members) && entry.members.includes(value) ? [value] : [])
    const next: WatchEntry = { id: entry.id, title: entry.title, thumbnail: entry.thumbnail, duration: entry.duration,
      members, firstWatchedAt: entry.firstWatchedAt, lastWatchedAt: entry.lastWatchedAt, plays: entry.plays! }
    const previous = entries.get(next.id)
    if (previous) {
      const latest = next.lastWatchedAt >= previous.lastWatchedAt ? next : previous
      entries.set(next.id, { ...latest, firstWatchedAt: Math.min(next.firstWatchedAt, previous.firstWatchedAt),
        plays: Math.max(next.plays, previous.plays) })
    } else entries.set(next.id, next)
  }
  return { version: 1, entries: [...entries.values()] }
}

/** One entry per distinct video; repeat starts update recency and play count. */
export function recordVideoStart(history: WatchHistory, video: Video, at: number): WatchHistory {
  if (!validTime(at)) return history
  const previous = history.entries.find(entry => entry.id === video.id)
  const entry: WatchEntry = {
    id: video.id, title: video.title, thumbnail: video.thumbnail, duration: video.duration,
    members: MEMBERS.flatMap(({ value }) => video.members?.includes(value) ? [value] : []),
    firstWatchedAt: Math.min(previous?.firstWatchedAt ?? at, at),
    lastWatchedAt: Math.max(previous?.lastWatchedAt ?? at, at),
    plays: Math.min(Number.MAX_SAFE_INTEGER, (previous?.plays ?? 0) + 1),
  }
  return { version: 1, entries: [entry, ...history.entries.filter(item => item.id !== video.id)] }
}

export function watchHistoryStats(history: WatchHistory): WatchStats {
  return {
    uniqueVideos: history.entries.length,
    totalPlays: history.entries.reduce((total, entry) => Math.min(Number.MAX_SAFE_INTEGER, total + entry.plays), 0),
    byMember: MEMBERS.map(({ value, label }) => ({ member: value, label,
      videos: history.entries.filter(entry => entry.members.includes(value)).length })),
  }
}
