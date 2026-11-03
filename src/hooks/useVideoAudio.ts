import { useCallback, useEffect, useRef, useState } from 'react'
import { storageGet, storageSet } from '../lib/storage'

const DEFAULT_VOLUME = 40

function loadVolume(): number {
  const raw = storageGet('sws.volume')
  if (raw === null) return DEFAULT_VOLUME
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_VOLUME
}

/** Video audio has one owner, shared by the playback bar and M shortcut. */
export function useVideoAudio(videoId: string | null) {
  const [volume, setVolume] = useState(loadVolume)
  // Every fresh player starts muted to satisfy browser autoplay policy.
  const [muted, setMuted] = useState(true)
  const lastAudibleVolume = useRef(volume > 0 ? volume : DEFAULT_VOLUME)

  useEffect(() => { storageSet('sws.volume', String(volume)) }, [volume])
  useEffect(() => { if (videoId === null) setMuted(true) }, [videoId])

  const changeVolume = useCallback((next: number) => {
    if (!Number.isFinite(next)) return
    const value = Math.min(100, Math.max(0, Math.round(next)))
    if (value > 0) lastAudibleVolume.current = value
    setVolume(value)
    setMuted(value === 0)
  }, [])

  const toggleMute = useCallback(() => {
    if (muted || volume === 0) {
      if (volume === 0) setVolume(lastAudibleVolume.current)
      setMuted(false)
    } else {
      setMuted(true)
    }
  }, [muted, volume])

  return { volume, muted, changeVolume, toggleMute }
}
