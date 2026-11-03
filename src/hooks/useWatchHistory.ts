import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeWatchHistory, WATCH_HISTORY_KEY, watchHistoryStats } from '../lib/watchHistory'
import { createWatchHistorySession } from '../lib/watchHistorySession'
import { storageSetJson } from '../lib/storage'
import type { Video } from '../types/playlist'

function createSession() {
  return createWatchHistorySession({
    read: () => {
      const raw = localStorage.getItem(WATCH_HISTORY_KEY) // Failed reads must prevent overwrites.
      try { return normalizeWatchHistory(raw === null ? null : JSON.parse(raw)) }
      catch { return normalizeWatchHistory(null) }
    },
    write: history => storageSetJson(WATCH_HISTORY_KEY, history),
    lock: operation => typeof navigator !== 'undefined' && navigator.locks?.request
      ? navigator.locks.request(WATCH_HISTORY_KEY, operation) : Promise.resolve(operation()),
  })
}

export function useWatchHistory(videos: Video[], onNotice: (message: string) => void) {
  const [session] = useState(createSession)
  const [history, setHistory] = useState(session.getSnapshot)
  const warningShown = useRef(false)
  const byId = useMemo(() => new Map(videos.map(video => [video.id, video])), [videos])
  const report = useCallback((saved: boolean) => {
    if (!saved && !warningShown.current) onNotice('Watch history could not be saved. It is kept for this session; check that browser storage is available.')
    warningShown.current = !saved
  }, [onNotice])
  const onVideoStarted = useCallback((id: string) => {
    const video = byId.get(id)
    if (video) void session.record(video).then(report)
  }, [byId, session, report])
  useEffect(() => {
    const unsubscribe = session.subscribe(setHistory)
    const stored = (event: StorageEvent) => {
      if (event.key === WATCH_HISTORY_KEY || event.key === null) session.refresh()
    }
    const returned = () => { session.refresh(); void session.flush().then(report) }
    window.addEventListener('storage', stored)
    window.addEventListener('focus', returned)
    return () => { unsubscribe(); window.removeEventListener('storage', stored); window.removeEventListener('focus', returned) }
  }, [session, report])
  const stats = useMemo(() => watchHistoryStats(history), [history])
  return { history, stats, onVideoStarted }
}
