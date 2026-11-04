import { useLanguage } from './i18n/useLanguage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaylist } from './hooks/usePlaylist'
import { useBreakNudge } from './hooks/useBreakNudge'
import { useTimer } from './hooks/useTimer'
import { useProgression } from './hooks/useProgression'
import { VideoBackground, type VideoBackgroundHandle } from './components/VideoBackground'
import { VideoControls } from './components/VideoControls'
import { Sidebar } from './components/Sidebar'
import { TasksCard } from './components/TasksCard'
import { SocialCard } from './components/SocialCard'
import { TimerCard } from './components/TimerCard'
import { WelcomeScreen } from './components/WelcomeScreen'
import { SettingsCard } from './components/SettingsCard'
import { WatchHistoryCard } from './components/WatchHistoryCard'
import { ProfileCard } from './components/ProfileCard'
import { UIIcon } from './components/UIIcon'
import { useAppearance } from './hooks/useAppearance'
import { usePreferences } from './hooks/usePreferences'
import { useVideoScreenFocus } from './hooks/useVideoScreenFocus'
import { handleButtonArrows } from './lib/keyboardNavigation'
import { useWatchHistory } from './hooks/useWatchHistory'
import { useVideoCatalog } from './hooks/useVideoCatalog'
import { useVideoAudio } from './hooks/useVideoAudio'
import { StudyTools } from './components/StudyTools'
import type { StudyToolId } from './lib/workspace'
import { storageGet, storageRemove, storageSet } from './lib/storage'

/** Preferred subtitle language, re-applied to every video that has it. */
function loadCaptionLang(): string | null {
  const stored = storageGet('sws.captionLang')
  return stored && /^[\w-]{2,10}$/.test(stored) ? stored : null
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen()
  }
}

export default function App() {
  const { t, text } = useLanguage()
  const { playlist, isChecking } = usePlaylist()
  const { theme, setTheme, customColor, setCustomColor, panelOpacity, setPanelOpacity } = useAppearance()
  const { preferences, setShowMilestones, setSingleKeyShortcuts } = usePreferences()
  const settings = useMemo(() => <SettingsCard theme={theme} onSetTheme={setTheme} customColor={customColor}
    onSetCustomColor={setCustomColor} opacity={panelOpacity} onSetOpacity={setPanelOpacity}
    showMilestones={preferences.showMilestones} onSetShowMilestones={setShowMilestones}
    singleKeyShortcuts={preferences.singleKeyShortcuts} onSetSingleKeyShortcuts={setSingleKeyShortcuts} />,
  [theme, setTheme, customColor, setCustomColor, panelOpacity, setPanelOpacity, preferences.showMilestones, setShowMilestones, preferences.singleKeyShortcuts, setSingleKeyShortcuts])
  const [captionLang, setCaptionLang] = useState<string | null>(loadCaptionLang)
  const [notice, setNotice] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [topPanel, setTopPanel] = useState<StudyToolId>('timer')
  // Zen mode: everything but the video disappears (Z toggles, Esc exits).
  const [zen, setZen] = useState(false)
  const [pauseOnBreak, setPauseOnBreak] = useState(() => storageGet('sws.pauseOnBreak') === '1')
  const videoRef = useRef<VideoBackgroundHandle>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const showNotice = useCallback((message: string, ms = 5000) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
  const { progression, recordStudy, recordTime, completeTask, updateProfile } = useProgression(showNotice)
  const timer = useTimer(25, recordStudy, recordTime)
  const setTaskDuration = timer.setDurationSeconds
  const onBlocked = useCallback(() => {
    showNotice("That video won't play embedded — skipped to another one")
  }, [showNotice])
  const repeatCurrentVideo = useCallback(() => videoRef.current?.restart(), [])
  const {
    videoId, setVideoId, selectVideo, currentVideo, lastVideo, playable, filteredVideos,
    queuedVideos, queueVideo, removeQueuedVideo, moveQueuedVideo, clearQueue,
    favorites, toggleFavorite, catalogFilters, setCatalogFilters,
    handleUnplayable, handleEnded, handleSurprise, handlePreviousVideo, handleNextVideo,
  } = useVideoCatalog(playlist.videos, onBlocked, repeatCurrentVideo, isChecking)
  const historyVideos = useMemo(() => videoId && !playlist.videos.some(video => video.id === videoId)
    ? [...playlist.videos, currentVideo] : playlist.videos, [playlist.videos, currentVideo, videoId])
  const { history, stats: watchStats, onVideoStarted } = useWatchHistory(historyVideos, showNotice)
  const backButton = useVideoScreenFocus(videoId)
  const returnToCatalog = useCallback(() => { setVideoId(null); setZen(false) }, [setVideoId])
  const queue = useMemo(() => ({ videos: queuedVideos, onPlay: selectVideo, onRemove: removeQueuedVideo, onMove: moveQueuedVideo, onClear: clearQueue }), [queuedVideos, selectVideo, removeQueuedVideo, moveQueuedVideo, clearQueue])
  const { volume, muted, changeVolume, toggleMute } = useVideoAudio(videoId)
  const historyHeading = videoId === null ? 'h1' : 'h2'
  const historyView = useMemo(() => <WatchHistoryCard history={history} playable={playable} catalogVideos={historyVideos} queuedVideos={queuedVideos}
    onPlay={selectVideo} onQueue={queueVideo} headingLevel={historyHeading} />, [history, playable, historyVideos, queuedVideos, selectVideo, queueVideo, historyHeading])

  // WebView can retain the document's small-layout scroll offset when the
  // window expands, clipping the toolbar and leaving empty space below.
  useEffect(() => {
    if (!videoId) return
    const wideLayout = window.matchMedia('(min-width: 1000px) and (min-height: 600px)')
    const resetScroll = () => {
      if (wideLayout.matches || dockCollapsed || zen) window.scrollTo(0, 0)
    }
    resetScroll()
    window.addEventListener('resize', resetScroll)
    return () => window.removeEventListener('resize', resetScroll)
  }, [videoId, dockCollapsed, zen])

  // The countdown lives in the tab title too, so it's visible from whatever
  // tab the actual studying happens in.
  useEffect(() => {
    document.title = timer.isRunning ? `⏱ ${timer.label} · study with soobin` : 'study with soobin'
  }, [timer.isRunning, timer.label])


  // Optional pomodoro tie-in: the video pauses for breaks, resumes for focus.
  // Driven by real focus↔break transitions only — the toggle is read from a
  // ref so flipping the checkbox mid-round doesn't restart a video the user
  // paused by hand, and entering/leaving pomodoro mode leaves playback alone.
  const pomodoroPhase = timer.pomodoro && !timer.pomodoro.completed ? timer.pomodoro.phase : null
  const pauseOnBreakRef = useRef(pauseOnBreak)
  pauseOnBreakRef.current = pauseOnBreak
  const prevPhaseRef = useRef<'focus' | 'break' | null>(null)
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = pomodoroPhase
    if (!pauseOnBreakRef.current || !pomodoroPhase || !prev || prev === pomodoroPhase) return
    setVideoPlaying(pomodoroPhase === 'focus')
  }, [pomodoroPhase])

  const chooseCaptionLang = useCallback((code: string | null) => {
    setCaptionLang(code)
    if (code) storageSet('sws.captionLang', code)
    else storageRemove('sws.captionLang')
  }, [])

  const handleApiUnavailable = useCallback((message?: string) => {
    showNotice(message ?? 'Couldn’t reach YouTube — check your internet connection, then pick a video to retry', 8000)
  }, [showNotice])

  const handleTogglePlay = useCallback(() => setVideoPlaying((p) => !p), [])
  const loadTaskDuration = useCallback(
    (seconds: number) => {
      setTaskDuration(seconds)
      setDockCollapsed(false)
      setTopPanel('timer')
      document.getElementById('tab-timer')?.focus()
      showNotice(t('Timer set to {minutes} minutes — press Start when you’re ready', { minutes: Math.round(seconds / 60) }), 4000)
    },
    [setTaskDuration, showNotice, t],
  )
  const handleSetPauseOnBreak = useCallback((v: boolean) => {
    setPauseOnBreak(v)
    storageSet('sws.pauseOnBreak', v ? '1' : '0')
  }, [])

  // Gentle "you've been at it two hours" toast — presence-based, so stepping
  // away for five minutes counts as the break.
  const breakNudge = useCallback(
    (message: string) => showNotice(message, 10000),
    [showNotice],
  )
  useBreakNudge(breakNudge)

  // Keyboard shortcuts — the player has disablekb + no pointer events, so
  // every key is ours. Skipped while typing or when a control has focus
  // (space on a focused button already clicks it).
  const timerToggleRef = useRef(timer.toggle)
  timerToggleRef.current = timer.toggle
  useEffect(() => {
    if (videoId === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (!(target instanceof HTMLElement)) return
      if (e.key === 'Escape') {
        // Local editors can prevent this event. Native disclosures close before
        // navigation, retaining a useful focus target in the current screen.
        const disclosure = target.closest<HTMLDetailsElement>('details[open]')
        e.preventDefault()
        if (disclosure) {
          disclosure.open = false
          disclosure.querySelector('summary')?.focus()
        } else if (document.fullscreenElement) void document.exitFullscreen()
        else returnToCatalog()
        return
      }
      // Typing fields own every key.
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return
      }
      if (!preferences.singleKeyShortcuts && [' ', 'f', 'm', 't', 'z'].includes(e.key.toLowerCase())) return
      // Buttons/links own only their activation keys — a focused Start button
      // (focus lingers after any click) shouldn't swallow F/M/T/Z.
      if (target.closest('button, a, summary, [role="tab"]') &&
          (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) {
        return
      }
      switch (e.key) {
        case ' ':
          e.preventDefault() // page scroll
          setVideoPlaying((p) => !p)
          break
        case 'ArrowLeft':
          videoRef.current?.seekBy(-10)
          break
        case 'ArrowRight':
          videoRef.current?.seekBy(10)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'm':
        case 'M':
          toggleMute()
          break
        case 't':
        case 'T':
          timerToggleRef.current()
          break
        case 'z':
        case 'Z':
          setZen((z) => {
            if (!z) showNotice('Zen mode — press Z to bring everything back', 4000)
            return !z
          })
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoId, showNotice, toggleMute, preferences.singleKeyShortcuts, returnToCatalog])

  if (videoId === null) {
    return (
      <>
        <WelcomeScreen
          filters={catalogFilters}
          onFiltersChange={setCatalogFilters}
          videos={playable}
          favorites={favorites}
          lastVideo={lastVideo}
          settings={settings}
          history={historyView}
          onSelect={selectVideo}
          queue={queue}
          onQueue={queueVideo}
          onSurprise={handleSurprise}
          timerLabel={timer.label} timerRunning={timer.isRunning} onToggleTimer={timer.toggle}
        />

      </>
    )
  }

  return (
    <div className={'study-workspace' + (dockCollapsed ? ' tools-hidden' : '') + (zen ? ' is-zen' : '')}>
      <a href="#playback-controls" className="skip-link">{t("Skip to video controls")}</a>
      <a href="#workspace-tools" className="skip-link" onClick={() => { setDockCollapsed(false); setZen(false) }}>{t("Skip to study tools")}</a>
      <header className="workspace-toolbar" onKeyDown={handleButtonArrows}>
        <button ref={backButton} onClick={returnToCatalog}
          aria-label={t("Back to video selection")} aria-keyshortcuts="Escape" title={t("Back to video selection (Esc)")}
          className="workspace-button workspace-back toolbar-icon"><UIIcon name="arrowLeft" size={20} /></button>
        <div className="workspace-heading">
          <p className="workspace-brand"><span className="brand-mark"><UIIcon name="leaf" size={20} /></span>study with soobin</p>
          <p className="workspace-video-title" title={currentVideo.title}>{currentVideo.title}</p>
        </div>
        <div className="toolbar-actions">
          {zen ? <button onClick={() => setZen(false)} className="workspace-button"><UIIcon name="leaf" />{t("Exit zen")}</button> : <>
            <button onClick={() => setDockCollapsed(v => !v)} aria-expanded={!dockCollapsed} aria-controls="workspace-tools" className="workspace-button"><UIIcon name="panel" />{dockCollapsed ? t("Show tools") : t("Hide tools")}</button>
            <button onClick={() => { setDockCollapsed(false); setTopPanel('tasks') }} aria-controls="tool-tasks" className={'workspace-button' + (!dockCollapsed && topPanel === 'tasks' ? ' selected' : '')}><UIIcon name="tasks" />{t("Tasks")}</button>
            <button onClick={toggleFullscreen} aria-label={t("Toggle fullscreen")} title={t("Fullscreen (F)")} className="workspace-button toolbar-icon"><UIIcon name="fullscreen" /></button>
            <button onClick={() => setZen(true)} aria-label={t("Zen mode — hide all panels")} title={t("Zen mode (Z)")} className="workspace-button toolbar-icon"><UIIcon name="leaf" /></button>
          </>}
        </div>
      </header>
      {notice && <div role="status" className="workspace-notice">{text(notice)}</div>}
      <main className="workspace-main">
        <div className="video-stage" role="group" aria-label={t("Study video")}>
          <VideoBackground ref={videoRef} videoId={videoId} volume={volume} muted={muted} isPlaying={videoPlaying} captionLang={captionLang} onEnded={handleEnded} onPlayingChange={setVideoPlaying} onVideoStarted={onVideoStarted} onUnplayable={handleUnplayable} onApiUnavailable={handleApiUnavailable} />
        </div>
        <div hidden={zen}>
          <VideoControls videoId={videoId} onPreviousVideo={handlePreviousVideo} onNextVideo={handleNextVideo} canPrevious={filteredVideos.some(v => v.id !== videoId)} canNext={queuedVideos.length > 0 || filteredVideos.some(v => v.id !== videoId)} player={videoRef} isPlaying={videoPlaying} onTogglePlay={handleTogglePlay} volume={volume} muted={muted} onToggleMute={toggleMute} onVolumeChange={changeVolume} captionLang={captionLang} onSetCaptionLang={chooseCaptionLang} />
        </div>
      </main>
      <StudyTools active={topPanel} onSelect={setTopPanel} hidden={dockCollapsed || zen}
        timerLabel={timer.label} timerRunning={timer.isRunning} panels={{
          timer: <TimerCard timer={timer} pauseOnBreak={pauseOnBreak} onSetPauseOnBreak={handleSetPauseOnBreak} />,
          sidebar: <Sidebar filters={catalogFilters} onFiltersChange={setCatalogFilters} videos={playable} currentVideo={currentVideo} onSelectVideo={selectVideo} queue={queue} onQueue={queueVideo} playlistUrl={playlist.sourceUrl} favorites={favorites} onToggleFavorite={toggleFavorite} />,
          tasks: <TasksCard onUseDuration={loadTaskDuration} onTaskCompleted={completeTask} />,
          history: historyView,
          profile: <ProfileCard progression={progression} onUpdateProfile={updateProfile} showMilestones={preferences.showMilestones} watchStats={watchStats} />,
          social: <SocialCard />,
          settings,
        }} />
    </div>
  )
}
