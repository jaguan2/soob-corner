import { memo, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { handleVideoArrows } from '../lib/keyboardNavigation'
import type { Video } from '../types/playlist'
import { VideoTile } from './VideoTile'
import { CatalogFilters } from './CatalogFilters'
import { filterVideos, type CatalogFilters as Filters } from '../lib/catalog'
import { UIIcon } from './UIIcon'
import { PauseIcon, PlayIcon } from './icons'
import { VideoQueue, type VideoQueueProps } from './VideoQueue'

interface WelcomeScreenProps {
  timerLabel: string
  timerRunning: boolean
  onToggleTimer: () => void
  filters: Filters
  onFiltersChange: (value: Filters) => void
  videos: Video[]
  favorites: string[]
  /** The video from the previous session (if still playable), for one-click resume. */
  lastVideo: Video | null
  settings: ReactNode
  history: ReactNode
  onSelect: (id: string) => void
  onSurprise: () => void
  queue: VideoQueueProps
  onQueue: (id: string) => void
}

function WelcomeScreenInner({
  timerLabel,
  timerRunning,
  onToggleTimer,
  filters,
  onFiltersChange,
  videos,
  favorites,
  lastVideo,
  settings,
  history,
  onSelect,
  onSurprise,
  queue,
  onQueue,
}: WelcomeScreenProps) {
  const sorted = useMemo(() => filterVideos(videos, filters, favorites), [videos, filters, favorites])
  const [openTool, setOpenTool] = useState<'settings' | 'history' | null>(null)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const historyButton = useRef<HTMLButtonElement>(null)
  const videoHelpId = useId()

  return (
    <div className="catalog-welcome min-h-screen w-full" onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !openTool) return
      event.preventDefault()
      const disclosure = event.target instanceof HTMLElement ? event.target.closest<HTMLDetailsElement>('details[open]') : null
      if (disclosure) { disclosure.open = false; disclosure.querySelector('summary')?.focus(); return }
      setOpenTool(null)
      const trigger = openTool === 'settings' ? settingsButton : historyButton
      trigger.current?.focus()
    }}>
      <a href="#video-catalog" className="skip-link">Skip to video choices</a>
      <div className="welcome-settings-row">
        <button ref={historyButton} className="workspace-button" aria-expanded={openTool === 'history'} aria-controls="welcome-history" onClick={() => setOpenTool(value => value === 'history' ? null : 'history')}><UIIcon name="history" size={17} />Watch history</button>
        <button ref={settingsButton} className="workspace-button" aria-expanded={openTool === 'settings'} aria-controls="welcome-settings" onClick={() => setOpenTool(value => value === 'settings' ? null : 'settings')}><UIIcon name="settings" size={17} />Settings</button>
      </div>
      <div className="welcome-tool-content" id="welcome-history" hidden={openTool !== 'history'}>{history}</div>
      <div className="welcome-tool-content welcome-settings-content" id="welcome-settings" hidden={openTool !== 'settings'}>{settings}</div>
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6">
        <header className="welcome-header text-center">
          <span className="welcome-mark"><UIIcon name="leaf" size={25} /></span>
          <h1 tabIndex={-1} className="text-3xl font-semibold text-ink-900 dark:text-cream-100">
            study with soobin
          </h1>
          <p className="mt-2 text-sm text-ink-700 dark:text-cream-300">
            Pick a TXT vlog or live to study with today — all five members are here
          </p>
          <button
            onClick={onSurprise}
            disabled={sorted.length === 0}
            className="welcome-surprise primary-button"
          >
            <UIIcon name="shuffle" size={17} />Surprise me
          </button>
          {lastVideo && (
            <button
              onClick={() => onSelect(lastVideo.id)}
              className="mx-auto mt-3 flex max-w-full items-center gap-1.5 text-sm text-clay-600 underline-offset-2 hover:underline dark:text-clay-400"
            >
              <span className="shrink-0">▶ Continue where you left off:</span>
              <span className="max-w-[18rem] truncate">{lastVideo.title}</span>
            </button>
          )}
        </header>
        <div className="welcome-timer" role="group" aria-label="Focus timer">
          <UIIcon name="timer" size={20} />
          <div className="welcome-timer-summary">
            <span className="welcome-timer-time" role="timer" aria-live="off" aria-label="Time remaining">{timerLabel}</span>
            <span className="welcome-timer-status" role="status">{timerRunning ? 'Timer running' : 'Timer paused'}</span>
          </div>
          <button onClick={onToggleTimer} aria-label={timerRunning ? 'Pause timer' : 'Start timer'} className="primary-button">
            {timerRunning ? <PauseIcon size={16} /> : <PlayIcon size={16} />}{timerRunning ? 'Pause' : 'Start'}
          </button>
        </div>
        <div className="mt-6"><VideoQueue {...queue} /></div>
        <div className="mt-8">
          <CatalogFilters videos={videos} value={filters} onChange={onFiltersChange} />
          <p className="mt-4 text-xs text-ink-700 dark:text-cream-300">{sorted.length} of {videos.length} videos</p>
          {videos.length > 0 && sorted.length === 0 && <p className="mt-4 text-sm text-ink-700 dark:text-cream-300">No videos match these filters. Try changing or clearing your filters.</p>}
        </div>

        {/* every video can end up session-blocked (embeds refused at play
            time) — without this the grid is just silently empty */}
        {videos.length === 0 && (
          <p className="mt-16 text-center text-sm text-ink-700 dark:text-cream-300">
            Nothing playable right now — every video refused to embed this session.
            <br />
            Reload the page to try again.
          </p>
        )}

        <p id={videoHelpId} className="sr-only">Use arrow keys to move between videos. Enter or Space plays the focused video or activates its queue button. Home and End jump to the first and last video.</p>
        <ul id="video-catalog" tabIndex={-1} aria-label="Study videos" aria-describedby={videoHelpId} onKeyDown={handleVideoArrows} className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map(video => <VideoTile key={video.id} video={video} favorite={favorites.includes(video.id)} onSelect={onSelect} queued={queue.videos.some(item => item.id === video.id)} onQueue={onQueue} />)}
        </ul>
      </div>
    </div>
  )
}

// Keep the catalog calculation stable while the welcome countdown updates.
export const WelcomeScreen = memo(WelcomeScreenInner)
