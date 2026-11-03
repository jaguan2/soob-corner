import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
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
export function useVideoCatalog(videos: Video[], onBlocked: () => void, onRepeat: () => void, isChecking = false) {
  const pendingDeepLink = useRef(new URLSearchParams(window.location.search).get('v'))
  const [videoId, setSelectedVideoId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get('v')
    return id && videos.some(video => video.id === id) ? id : null
  })
  const setVideoId = useCallback((value: SetStateAction<string | null>) => {
    pendingDeepLink.current = null
    setSelectedVideoId(value)
  }, [])
  const [lastVideoId, setLastVideoId] = useState<string | null>(() => storageGet('sws.lastVideo'))
  const [favorites, setFavorites] = useState(loadFavorites)
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(EMPTY_FILTERS)
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const playable = useMemo(() => videos.filter(video => !blockedIds.includes(video.id)), [videos, blockedIds])
  const { takeNext, ...queue } = useVideoQueue(playable)
  const { removeQueuedVideo } = queue
  // Keep the active video's metadata if a downloaded catalog removes it.
  const selectedVideo = videos.find(video => video.id === videoId)
  const currentVideoRef = useRef(selectedVideo ?? videos[0])
  if (selectedVideo) currentVideoRef.current = selectedVideo
  const currentVideo = currentVideoRef.current
  const filteredVideos = useMemo(() => filterVideos(playable, catalogFilters, favorites), [playable, catalogFilters, favorites])
  const lastVideo = useMemo(() => playable.find(video => video.id === lastVideoId) ?? null, [playable, lastVideoId])

  // Keep writes outside state updaters, which React may replay in StrictMode.
  useEffect(() => {
    if (videoId !== null) pendingDeepLink.current = null
    if (isChecking) return
    const id = pendingDeepLink.current
    pendingDeepLink.current = null
    if (id && videos.some(video => video.id === id)) setSelectedVideoId(id)
  }, [isChecking, videoId, videos])
  useEffect(() => { storageSetJson('sws.favorites', favorites) }, [favorites])
  useEffect(() => {
    if (!videoId) return
    storageSet('sws.lastVideo', videoId)
    setLastVideoId(videoId)
  }, [videoId])
  useEffect(() => {
    if (isChecking && videoId === null && pendingDeepLink.current) return
    const url = new URL(window.location.href)
    if (videoId) url.searchParams.set('v', videoId)
    else url.searchParams.delete('v')
    window.history.replaceState(null, '', url)
  }, [videoId, isChecking])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])
  }, [])
  const selectVideo = useCallback((id: string) => {
    if (!playable.some(video => video.id === id)) return
    removeQueuedVideo(id)
    if (id === videoId) onRepeat()
    else setVideoId(id)
  }, [playable, removeQueuedVideo, videoId, onRepeat, setVideoId])
  const handleUnplayable = useCallback(() => {
    if (!videoId || blockedIds.includes(videoId)) return
    setBlockedIds(previous => [...previous, videoId])
    onBlocked()
    setVideoId(takeNext(videoId) ?? pickRandom(filteredVideos.filter(video => video.id !== videoId)))
  }, [videoId, blockedIds, filteredVideos, onBlocked, takeNext, setVideoId])
  const handleEnded = useCallback(() => {
    const next = takeNext() ?? pickRandom(filteredVideos, videoId ?? undefined)
    if (next && next === videoId) onRepeat()
    else setVideoId(next)
  }, [filteredVideos, videoId, onRepeat, takeNext, setVideoId])
  const handleSurprise = useCallback(() => {
    const next = pickRandom(filteredVideos)
    if (next) selectVideo(next)
  }, [filteredVideos, selectVideo])
  const handlePreviousVideo = useCallback(() => {
    setVideoId(previous => adjacentVideo(filteredVideos, previous, -1) ?? previous)
  }, [filteredVideos, setVideoId])
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
