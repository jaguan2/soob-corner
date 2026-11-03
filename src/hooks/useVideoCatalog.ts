import { useCallback, useEffect, useMemo, useState } from 'react'
import { adjacentVideo, EMPTY_FILTERS, filterVideos, type CatalogFilters } from '../lib/catalog'
import { storageGet, storageGetJson, storageSet, storageSetJson } from '../lib/storage'
import type { Video } from '../types/playlist'
import { useVideoQueue } from './useVideoQueue'

function pickRandom(pool: Video[], excludeId?: string): string | null {
  const candidates = excludeId ? pool.filter(video => video.id !== excludeId) : pool
  if (!candidates.length) return pool[0]?.id ?? null
  return candidates[Math.floor(Math.random() * candidates.length)].id
}

function loadFavorites(): string[] {
  const raw = storageGetJson<unknown>('sws.favorites', [])
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
}

/** Selection, filtering, favorites and URL history, independent of player creation. */
export function useVideoCatalog(videos: Video[], onBlocked: () => void, onRepeat: () => void) {
  const [videoId, setVideoId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get('v')
    return id && videos.some(video => video.id === id) ? id : null
  })
  const [lastVideoId, setLastVideoId] = useState<string | null>(() => storageGet('sws.lastVideo'))
  const [favorites, setFavorites] = useState(loadFavorites)
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(EMPTY_FILTERS)
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const playable = useMemo(() => videos.filter(video => !blockedIds.includes(video.id)), [videos, blockedIds])
  const { takeNext, ...queue } = useVideoQueue(playable)
  const { removeQueuedVideo } = queue
  const currentVideo = useMemo(() => videos.find(video => video.id === videoId) ?? videos[0], [videos, videoId])
  const filteredVideos = useMemo(() => filterVideos(playable, catalogFilters, favorites), [playable, catalogFilters, favorites])
  const lastVideo = useMemo(() => playable.find(video => video.id === lastVideoId) ?? null, [playable, lastVideoId])

  // Keep writes outside state updaters, which React may replay in StrictMode.
  useEffect(() => { storageSetJson('sws.favorites', favorites) }, [favorites])
  useEffect(() => {
    if (!videoId) return
    storageSet('sws.lastVideo', videoId)
    setLastVideoId(videoId)
  }, [videoId])
  useEffect(() => {
    const url = new URL(window.location.href)
    if (videoId) url.searchParams.set('v', videoId)
    else url.searchParams.delete('v')
    window.history.replaceState(null, '', url)
  }, [videoId])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])
  }, [])
  const selectVideo = useCallback((id: string) => {
    if (!playable.some(video => video.id === id)) return
    removeQueuedVideo(id)
    if (id === videoId) onRepeat()
    else setVideoId(id)
  }, [playable, removeQueuedVideo, videoId, onRepeat])
  const handleUnplayable = useCallback(() => {
    if (!videoId || blockedIds.includes(videoId)) return
    setBlockedIds(previous => [...previous, videoId])
    onBlocked()
    setVideoId(takeNext(videoId) ?? pickRandom(filteredVideos.filter(video => video.id !== videoId)))
  }, [videoId, blockedIds, filteredVideos, onBlocked, takeNext])
  const handleEnded = useCallback(() => {
    const next = takeNext() ?? pickRandom(filteredVideos, videoId ?? undefined)
    if (next && next === videoId) onRepeat()
    else setVideoId(next)
  }, [filteredVideos, videoId, onRepeat, takeNext])
  const handleSurprise = useCallback(() => {
    const next = pickRandom(filteredVideos)
    if (next) selectVideo(next)
  }, [filteredVideos, selectVideo])
  const handlePreviousVideo = useCallback(() => {
    setVideoId(previous => adjacentVideo(filteredVideos, previous, -1) ?? previous)
  }, [filteredVideos])
  const handleNextVideo = useCallback(() => {
    const next = takeNext() ?? adjacentVideo(filteredVideos, videoId, 1)
    if (next) selectVideo(next)
  }, [filteredVideos, videoId, takeNext, selectVideo])

  return {
    videoId, setVideoId, selectVideo, currentVideo, lastVideo, playable, filteredVideos, ...queue,
    favorites, toggleFavorite, catalogFilters, setCatalogFilters,
    handleUnplayable, handleEnded, handleSurprise, handlePreviousVideo, handleNextVideo,
  }
}
