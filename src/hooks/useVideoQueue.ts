import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { storageGetJson, storageSetJson } from '../lib/storage'
import type { Video } from '../types/playlist'

function normalizeQueue(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && allowed.has(id)))]
}

/** Explicit selections are independent of catalog filters; unavailable videos are pruned. */
export function useVideoQueue(playable: Video[]) {
  const allowed = useMemo(() => new Set(playable.map(video => video.id)), [playable])
  const [ids, setIds] = useState(() => normalizeQueue(storageGetJson<unknown>('sws.videoQueue', []), allowed))
  // Event actions update the model synchronously so two dequeues before a render
  // cannot play the same entry. React state updaters remain free of side effects.
  const pending = useRef(ids)
  const replace = useCallback((next: string[]) => {
    if (next.length === pending.current.length && next.every((id, index) => id === pending.current[index])) return
    pending.current = next
    setIds(next)
  }, [])

  useEffect(() => { replace(normalizeQueue(pending.current, allowed)) }, [allowed, replace])
  useEffect(() => { storageSetJson('sws.videoQueue', ids) }, [ids])

  const queueVideo = useCallback((id: string) => {
    if (allowed.has(id) && !pending.current.includes(id)) replace([...pending.current, id])
  }, [allowed, replace])
  const removeQueuedVideo = useCallback((id: string) => {
    replace(pending.current.filter(value => value !== id))
  }, [replace])
  const moveQueuedVideo = useCallback((id: string, direction: -1 | 1) => {
    const next = [...pending.current]
    const index = next.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    replace(next)
  }, [replace])
  const clearQueue = useCallback(() => replace([]), [replace])
  const takeNext = useCallback((excludeId?: string): string | null => {
    const next = normalizeQueue(pending.current, allowed).filter(id => id !== excludeId)
    const first = next.shift() ?? null
    replace(next)
    return first
  }, [allowed, replace])
  const queuedVideos = useMemo(() => {
    const byId = new Map(playable.map(video => [video.id, video]))
    return ids.flatMap(id => { const video = byId.get(id); return video ? [video] : [] })
  }, [ids, playable])

  return { queuedVideos, queueVideo, removeQueuedVideo, moveQueuedVideo, clearQueue, takeNext }
}
