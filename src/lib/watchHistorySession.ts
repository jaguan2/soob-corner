import { emptyWatchHistory, recordVideoStart, type WatchHistory } from './watchHistory'
import type { Video } from '../types/playlist'

interface Dependencies {
  read: () => WatchHistory
  write: (history: WatchHistory) => boolean
  lock: (operation: () => boolean) => Promise<boolean>
}

/** Serialize starts against fresh saved history; failed saves retain pending starts. */
export function createWatchHistorySession({ read, write, lock }: Dependencies) {
  let snapshot: WatchHistory
  try { snapshot = read() } catch { snapshot = emptyWatchHistory() }
  const listeners = new Set<(history: WatchHistory) => void>()
  const pending: { video: Video; at: number }[] = []
  let saving: Promise<boolean> | null = null
  const publish = (next: WatchHistory) => {
    snapshot = next
    listeners.forEach(listener => listener(next))
  }
  const replay = (base: WatchHistory) => pending.reduce((state, item) => recordVideoStart(state, item.video, item.at), base)
  const flush = (): Promise<boolean> => {
    if (saving) return saving
    if (!pending.length) return Promise.resolve(true)
    saving = Promise.resolve().then(() => lock(() => {
      try {
        const next = replay(read())
        if (!write(next)) return false
        pending.length = 0
        publish(next)
        return true
      } catch { return false }
    })).catch(() => false).then(saved => {
      saving = null
      // A new start may arrive after the lock callback but before it resolves.
      return saved && pending.length ? flush() : saved
    })
    return saving
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: (history: WatchHistory) => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    record: (video: Video, at = Date.now()) => {
      pending.push({ video, at })
      publish(recordVideoStart(snapshot, video, at))
      return flush()
    },
    refresh: () => { try { publish(replay(read())) } catch { /* retain the readable snapshot */ } },
    flush,
  }
}
