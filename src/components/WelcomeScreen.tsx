import { useLanguage } from '../i18n/useLanguage'
import { APP_NAME } from '../lib/branding'
import { memo, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { handleVideoArrows, tabDestination } from '../lib/keyboardNavigation'
import type { Video } from '../types/playlist'
import { VideoTile } from './VideoTile'
import { CatalogFilters } from './CatalogFilters'
import { filterVideos, type CatalogFilters as Filters } from '../lib/catalog'
import { UIIcon } from './UIIcon'
import { PauseIcon, PlayIcon } from './icons'
import { VideoQueue, type VideoQueueProps } from './VideoQueue'
import { PpulbatuWelcome } from './PpulbatuWelcome'

const BROWSE_VIEWS = [
  { id: 'videos', label: 'Videos', icon: 'video' },
  { id: 'history', label: 'Watch history', icon: 'history' },
] as const

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
  const { t } = useLanguage()
  const sorted = useMemo(() => filterVideos(videos, filters, favorites), [videos, filters, favorites])
  const [view, setView] = useState<typeof BROWSE_VIEWS[number]['id']>('videos')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const videosButton = useRef<HTMLButtonElement>(null)
  const videoHelpId = useId()
  const selectView = (next: typeof view) => { setView(next); setSettingsOpen(false) }

  return (
    <div className="catalog-welcome min-h-screen w-full" onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing) return
      if (!settingsOpen && view === 'videos') return
      event.preventDefault()
      const disclosure = event.target instanceof HTMLElement ? event.target.closest<HTMLDetailsElement>('details[open]') : null
      if (disclosure) { disclosure.open = false; disclosure.querySelector('summary')?.focus(); return }
      if (settingsOpen) {
        setSettingsOpen(false)
        settingsButton.current?.focus()
      } else {
        selectView('videos')
        videosButton.current?.focus()
      }
    }}>
      {view === 'videos' && <PpulbatuWelcome />}
      <a href={view === 'videos' ? '#video-catalog' : '#welcome-history'} className="skip-link">{view === 'videos' ? t("Skip to video choices") : t("Skip to watch history")}</a>
      <div className="welcome-navigation">
        <div className="welcome-tabs" role="tablist" aria-label={t("Browse")}>
          {BROWSE_VIEWS.map((item, index) => <button key={item.id} ref={item.id === 'videos' ? videosButton : undefined}
            id={`welcome-tab-${item.id}`} role="tab" aria-selected={view === item.id}
            aria-controls={`welcome-${item.id}`} tabIndex={view === item.id ? 0 : -1}
            onClick={() => selectView(item.id)} onKeyDown={event => {
              if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return
              const next = tabDestination(event.key, index, BROWSE_VIEWS.length)
              if (next === null) return
              event.preventDefault()
              selectView(BROWSE_VIEWS[next].id)
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
            }} className={'welcome-tab' + (view === item.id ? ' selected' : '')}>
            <UIIcon name={item.icon} size={17} />{t(item.label)}
          </button>)}
        </div>
        <button ref={settingsButton} className="workspace-button" aria-expanded={settingsOpen} aria-controls="welcome-settings" onClick={() => setSettingsOpen(value => !value)}><UIIcon name="settings" size={17} />{t("Settings")}</button>
      </div>
      <div className="welcome-tool-content welcome-settings-content" id="welcome-settings" hidden={!settingsOpen}>{settings}</div>
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6">
      <div id="welcome-history" role="tabpanel" aria-labelledby="welcome-tab-history" tabIndex={0} hidden={view !== 'history'} className="welcome-history-view">{history}</div>
      <div id="welcome-videos" role="tabpanel" aria-labelledby="welcome-tab-videos" tabIndex={0} hidden={view !== 'videos'}>
        <header className="welcome-header text-center">
          <h1 tabIndex={-1} className="text-3xl font-semibold text-ink-900 dark:text-cream-100">
            <img className="welcome-home-logo" src="/soob-house-logo-transparent.png" width={44} height={44} alt="" />
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-ink-700 dark:text-cream-300">
            {t("Pick a TXT vlog or live to study with today — all five members are here")}
          </p>
          <div className="ppulbatu-credit">
            <a href="https://weverse.io/txt/notice/21278" target="_blank" rel="noopener noreferrer">PPULBATU</a>
            <span>© BIGHIT MUSIC / HYBE</span>
          </div>
          <button
            onClick={onSurprise}
            disabled={sorted.length === 0}
            className="welcome-surprise primary-button"
          >
            <UIIcon name="shuffle" size={17} />{t("Surprise me")}
          </button>
          {lastVideo && (
            <button
              onClick={() => onSelect(lastVideo.id)}
              className="mx-auto mt-3 flex max-w-full items-center gap-1.5 text-sm text-clay-600 underline-offset-2 hover:underline dark:text-clay-400"
            >
              <span className="shrink-0">{t("▶ Continue where you left off:")}</span>
              <span className="max-w-[18rem] truncate">{lastVideo.title}</span>
            </button>
          )}
        </header>
        <div className="welcome-session">
          <section className="welcome-timer" aria-label={t("Focus timer")}>
            <h2 className="section-heading"><UIIcon name="timer" size={16} />{t("Timer")}</h2>
            <div className="welcome-timer-controls">
              <div className="welcome-timer-summary">
                <span className="welcome-timer-time" role="timer" aria-live="off" aria-label={t("Time remaining")}>{timerLabel}</span>
                <span className="welcome-timer-status" role="status">{timerRunning ? t("Timer running") : t("Timer paused")}</span>
              </div>
              <button onClick={onToggleTimer} aria-label={timerRunning ? t("Pause timer") : t("Start timer")} className="primary-button">
                {timerRunning ? <PauseIcon size={16} /> : <PlayIcon size={16} />}{timerRunning ? t("Pause") : t("Start")}
              </button>
            </div>
          </section>
          <VideoQueue {...queue} />
        </div>
        <div className="mt-8">
          <CatalogFilters videos={videos} value={filters} onChange={onFiltersChange} />
          <p className="mt-4 text-xs text-ink-700 dark:text-cream-300">{t('{count} of {total} videos', { count: sorted.length, total: videos.length })}</p>
          {videos.length > 0 && sorted.length === 0 && <p className="mt-4 text-sm text-ink-700 dark:text-cream-300">{t("No videos match these filters. Try changing or clearing your filters.")}</p>}
        </div>

        {/* every video can end up session-blocked (embeds refused at play
            time) — without this the grid is just silently empty */}
        {videos.length === 0 && (
          <p className="mt-16 text-center text-sm text-ink-700 dark:text-cream-300">
            {t("Nothing playable right now — every video refused to embed this session.")}
            <br />
            {t("Reload the page to try again.")}
          </p>
        )}

        <p id={videoHelpId} className="sr-only">{t("Use arrow keys to move between videos. Enter or Space plays the focused video or activates its queue button. Home and End jump to the first and last video.")}</p>
        <ul id="video-catalog" tabIndex={-1} aria-label={t("Study videos")} aria-describedby={videoHelpId} onKeyDown={handleVideoArrows} className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map(video => <VideoTile key={video.id} video={video} favorite={favorites.includes(video.id)} onSelect={onSelect} queued={queue.videos.some(item => item.id === video.id)} onQueue={onQueue} />)}
        </ul>
      </div>
      </main>
    </div>
  )
}

// Keep the catalog calculation stable while the welcome countdown updates.
export const WelcomeScreen = memo(WelcomeScreenInner)
