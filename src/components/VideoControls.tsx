import { memo, useEffect, useId, useRef, useState } from 'react'
import { handleButtonArrows } from '../lib/keyboardNavigation'
import { Scrubber } from './Scrubber'
import { VolumeControl } from './VolumeControl'
import { PauseIcon, PlayIcon, SeekIcon, SkipIcon } from './icons'
import type { CaptionTrack, VideoBackgroundHandle } from './VideoBackground'

interface VideoControlsProps {
  videoId: string
  onPreviousVideo: () => void
  onNextVideo: () => void
  canPrevious: boolean
  canNext: boolean
  player: React.RefObject<VideoBackgroundHandle | null>
  isPlaying: boolean
  onTogglePlay: () => void
  volume: number
  muted: boolean
  onToggleMute: () => void
  onVolumeChange: (volume: number) => void
  captionLang: string | null
  onSetCaptionLang: (code: string | null) => void
}

function VideoControlsInner({ videoId, onPreviousVideo, onNextVideo, canPrevious, canNext, player, isPlaying, onTogglePlay, volume, muted, onToggleMute, onVolumeChange, captionLang, onSetCaptionLang }: VideoControlsProps) {
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [tracks, setTracks] = useState<CaptionTrack[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const captionButton = useRef<HTMLButtonElement>(null)
  const captionOptionsId = useId()

  useEffect(() => { setCurrent(0); setDuration(0); setTracks([]); setMenuOpen(false) }, [videoId])
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return
      const progress = player.current?.getProgress()
      if (progress) { setCurrent(progress.current); setDuration(progress.duration) }
      const next = player.current?.getCaptionTracks() ?? []
      setTracks(prev => prev.length === next.length && prev.every((t, i) => t.code === next[i].code) ? prev : next)
    }, 500)
    return () => window.clearInterval(id)
  }, [player])
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    window.addEventListener('pointerdown', onDown)
    menuRef.current?.querySelector<HTMLButtonElement>('.caption-options button[aria-pressed="true"]')?.focus()
    return () => { window.removeEventListener('pointerdown', onDown) }
  }, [menuOpen])

  const activeTrack = tracks.find(t => t.code === captionLang)
  const buttonStyle = 'grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-800 transition hover:bg-cream-200 disabled:opacity-40 dark:text-cream-200 dark:hover:bg-ink-700'
  return (
    <div ref={menuRef} id="playback-controls" tabIndex={-1} role="group" className="workspace-controls" aria-label="Video controls" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) {
        event.preventDefault(); event.stopPropagation(); setMenuOpen(false); captionButton.current?.focus()
        return
      }
      handleButtonArrows(event)
    }}>
      <div className="player-controls">
        <div className="player-transport">
        <button onClick={onPreviousVideo} disabled={!canPrevious} aria-label="Previous video" title="Previous video in filtered order" className={buttonStyle}><SkipIcon direction="back" /></button>
        <button onClick={() => player.current?.seekBy(-10)} aria-label="Back 10 seconds" title="Back 10 seconds" className={buttonStyle}><SeekIcon direction="back" /></button>
        <button onClick={onTogglePlay} aria-label={isPlaying ? 'Pause video' : 'Play video'} title={isPlaying ? 'Pause video' : 'Play video'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-500 text-white transition hover:bg-clay-600">{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
        <button onClick={() => player.current?.seekBy(10)} aria-label="Forward 10 seconds" title="Forward 10 seconds" className={buttonStyle}><SeekIcon direction="forward" /></button>
        <button onClick={onNextVideo} disabled={!canNext} aria-label="Next video" title="Next queued video, or next video in filtered order" className={buttonStyle}><SkipIcon direction="forward" /></button>
        </div>
        <VolumeControl volume={volume} muted={muted} onToggleMute={onToggleMute} onChange={onVolumeChange} />
        <div className="player-progress"><Scrubber key={videoId} current={current} duration={duration} onSeek={seconds => { player.current?.seekTo(seconds); setCurrent(seconds) }} /></div>
        {tracks.length > 0 && <button ref={captionButton} onClick={() => setMenuOpen(o => !o)} aria-label="CC subtitles" aria-expanded={menuOpen} aria-controls={captionOptionsId} title={activeTrack ? `Subtitles: ${activeTrack.name}` : 'Subtitles'} className={buttonStyle + (activeTrack ? ' captions-active' : '')}>CC</button>}
      </div>
      {menuOpen && <div id={captionOptionsId} className="caption-options" role="group" aria-label="Subtitle languages">
        {[{ code: '', name: 'Off' }, ...tracks].map(track => <button key={track.code} onClick={() => { onSetCaptionLang(track.code || null); setMenuOpen(false); captionButton.current?.focus() }} aria-pressed={(captionLang ?? '') === track.code} className={'rounded-lg px-3 py-2 text-xs ' + ((captionLang ?? '') === track.code ? 'bg-clay-500 text-white' : 'bg-cream-100 text-ink-800 hover:bg-cream-200 dark:bg-ink-700 dark:text-cream-200')}>{track.name}</button>)}
      </div>}
    </div>
  )
}

export const VideoControls = memo(VideoControlsInner)
