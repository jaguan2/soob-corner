import { useLanguage } from '../i18n/useLanguage'
import { useEffect, useId, useRef, useState } from 'react'
import { handleButtonArrows } from '../lib/keyboardNavigation'
import { parseTimeInput, type TimerApi } from '../hooks/useTimer'
import { getFocusGoal, getStreakDays, getTodayMinutes, saveFocusGoal } from '../lib/stats'
import { storageGetJson, storageSetJson } from '../lib/storage'
import { PauseIcon, PlayIcon } from './icons'
import { UIIcon } from './UIIcon'
import { useTimerWheel } from '../hooks/useTimerWheel'

const PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
] as const

function loadPomodoroConfig(): { focus: number; break: number; rounds: number } {
  const raw = storageGetJson<unknown>('sws.pomodoro', {})
  const stored = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as { focus?: unknown; break?: unknown; rounds?: unknown } : {}
  const num = (value: unknown, fallback: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= max ? Math.round(value) : fallback
  return { focus: num(stored.focus, 25, 180), break: num(stored.break, 5, 60), rounds: num(stored.rounds, 4, 12) }
}

interface TimerPanelProps {
  timer: TimerApi
  pauseOnBreak: boolean
  onSetPauseOnBreak: (value: boolean) => void
}

export function TimerPanel({ timer, pauseOnBreak, onSetPauseOnBreak }: TimerPanelProps) {
  const { t } = useLanguage()
  const focusMinutesLabel = (minutes: number) => minutes >= 60
    ? t('{hours}h {minutes}m', { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
    : t('{minutes}m', { minutes })
  const [editing, setEditing] = useState(false)
  const countdownRef = useRef<HTMLButtonElement>(null)
  const cancelledEdit = useRef(false)
  const restoreCountdownFocus = useRef(false)
  useEffect(() => {
    if (!editing && restoreCountdownFocus.current) {
      restoreCountdownFocus.current = false
      countdownRef.current?.focus()
    }
  }, [editing])
  const wheelHintId = useId()
  useTimerWheel(countdownRef, timer.adjustTime, !editing, timer.durationSeconds)
  const [draft, setDraft] = useState('')
  const [showPomodoroForm, setShowPomodoroForm] = useState(false)
  const [initialConfig] = useState(loadPomodoroConfig)
  const [focusMin, setFocusMin] = useState(initialConfig.focus)
  const [breakMin, setBreakMin] = useState(initialConfig.break)
  const [rounds, setRounds] = useState(initialConfig.rounds)
  const [focusGoal, setFocusGoal] = useState(getFocusGoal)
  const pomo = timer.pomodoro
  const todayMinutes = getTodayMinutes()
  const streak = getStreakDays()
  const goalProgress = Math.min(100, (todayMinutes / focusGoal) * 100)

  const startEdit = () => {
    cancelledEdit.current = false
    timer.pause()
    setDraft(timer.label)
    setEditing(true)
  }
  const commit = () => {
    if (cancelledEdit.current) { setEditing(false); return }
    const seconds = parseTimeInput(draft)
    if (seconds !== null) timer.setDurationSeconds(seconds)
    setEditing(false)
  }

  return (
    <div className="focus-panel">
      <div className="focus-session">
        <p className="focus-eyebrow">{pomo?.completed ? t("Session complete") : pomo?.phase === 'break' ? t("Take a breath") : t("Time to focus")}</p>
        {editing ? <input autoFocus value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault(); restoreCountdownFocus.current = true; commit()
            }
            if (event.key === 'Escape') {
              event.preventDefault(); event.stopPropagation(); cancelledEdit.current = true
              restoreCountdownFocus.current = true; setEditing(false)
            }
          }} placeholder={t("25 or 25:00")} aria-label={t("Custom timer duration")} className="focus-time focus-time-input" />
          : <button ref={countdownRef} onClick={startEdit} onKeyDown={event => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
            event.preventDefault()
            timer.adjustTime(event.key === 'ArrowUp' ? 60 : -60)
          }} title={t("Click to type; scroll or use Up/Down to adjust minutes")} aria-keyshortcuts="ArrowUp ArrowDown" aria-describedby={wheelHintId} aria-label={t('Timer {time}. Click to change duration', { time: timer.label })} className="focus-time">{timer.label}</button>}
        <p id={wheelHintId} className="focus-wheel-hint" style={{ visibility: editing ? 'hidden' : undefined }} aria-hidden={editing || undefined}>{t("Click to type · Scroll or ↑/↓ to adjust by 1 min")}</p>
        {pomo && !pomo.completed && <p className="focus-caption">{t('{phase} · round {round} of {total}', { phase: t(pomo.phase === 'focus' ? 'Focus' : 'Break'), round: pomo.round, total: pomo.rounds })}</p>}
        {pomo && !pomo.completed && <div className="focus-rounds" aria-hidden="true">
          {Array.from({ length: pomo.rounds }, (_, index) => <span key={index} className={index < pomo.round ? 'complete' : ''} />)}
        </div>}
        <div className="focus-actions">
          <button onClick={timer.reset} aria-label={t("Reset timer")} title={t("Reset timer")} className="quiet-icon"><RefreshIcon /></button>
          <button onClick={timer.toggle} className="primary-button focus-start">{timer.isRunning ? <PauseIcon size={16} /> : <PlayIcon size={16} />}{timer.isRunning ? t("Pause") : pomo?.phase === 'break' && !pomo.completed ? t("Start break") : t("Start focus")}</button>
          <button onClick={startEdit} aria-label={t("Edit timer duration")} title={t("Edit duration")} className="quiet-icon"><UIIcon name="timer" /></button>
        </div>
        {timer.isRunning && <div className="focus-nudges">
          <button onClick={() => timer.nudge(-60)}>−1:00</button>
          <button onClick={() => timer.nudge(60)}>+1:00</button>
        </div>}
        {pomo && <div className="focus-pomodoro-status">
          {pomo.completed && <p>{t('All {count} rounds done. Well done!', { count: pomo.rounds })}</p>}
          {!pomo.completed && pomo.phase === 'break' && <button onClick={timer.skipBreak} className="text-action">{t("Skip break")}</button>}
          <button onClick={timer.stopPomodoro} className="text-action">{t("Exit Pomodoro")}</button>
        </div>}
      </div>

      <div className="focus-presets">
        <p className="surface-label">{t("Quick durations")}</p>
        <div className="timer-presets" role="group" aria-label={t("Timer presets")} onKeyDown={handleButtonArrows}>
          {PRESETS.map(preset => <button key={preset.label} onClick={() => timer.setDurationSeconds(preset.seconds)} aria-pressed={!pomo && timer.durationSeconds === preset.seconds}>{t(preset.label)}</button>)}
          <button onClick={startEdit}>{t("Custom")}</button>
        </div>
      </div>

      <details className="timer-settings">
        <summary><span><UIIcon name="timer" size={16} />{t("Session settings")}</span><UIIcon name="chevron" size={16} /></summary>
        <div className="timer-settings-body">
          {!pomo && <>
            <button onClick={() => setShowPomodoroForm(value => !value)} aria-expanded={showPomodoroForm} aria-controls="pomodoro-settings" className="pomodoro-toggle"><span>{t("Pomodoro rounds")}</span><UIIcon name="chevron" size={15} /></button>
            {showPomodoroForm && <div id="pomodoro-settings" className="pomodoro-settings">
              <div className="pomodoro-fields">
                <NumberField label={t("Focus")} value={focusMin} min={1} max={180} onChange={setFocusMin} suffix={t("min")} />
                <NumberField label={t("Break")} value={breakMin} min={1} max={60} onChange={setBreakMin} suffix={t("min")} />
                <NumberField label={t("Rounds")} value={rounds} min={1} max={12} onChange={setRounds} />
              </div>
              <label className="pause-break"><input type="checkbox" checked={pauseOnBreak} onChange={event => onSetPauseOnBreak(event.target.checked)} />{t("Pause video during breaks")}</label>
              <button onClick={() => {
                storageSetJson('sws.pomodoro', { focus: focusMin, break: breakMin, rounds })
                timer.startPomodoro({ focusMinutes: focusMin, breakMinutes: breakMin, rounds })
                setShowPomodoroForm(false)
              }} className="primary-button pomodoro-start">{t('Start {rounds} × {minutes} min', { rounds, minutes: focusMin })}</button>
            </div>}
          </>}
          {pomo && <p className="focus-caption">{t('{focus} min focus · {break} min break · {rounds} rounds', { focus: pomo.focusMinutes, break: pomo.breakMinutes, rounds: pomo.rounds })}</p>}
          <div className="focus-goal-settings">
            <p className="surface-label">{t("Daily focus goal")}</p>
            <div className="timer-presets" onKeyDown={handleButtonArrows}>
              {[60, 120, 180].map(minutes => <button key={minutes} onClick={() => { setFocusGoal(minutes); saveFocusGoal(minutes) }} aria-pressed={focusGoal === minutes}>{minutes === 60 ? t('1 hour') : t('{count} hours', { count: minutes / 60 })}</button>)}
            </div>
          </div>
        </div>
      </details>

      <div className="focus-stats">
        <div className="focus-stats-heading"><span className="surface-label">{t("Today's focus")}</span><span>{Math.round(goalProgress)}%</span></div>
        <p className="focus-stats-value">{focusMinutesLabel(todayMinutes)}<span> / {focusMinutesLabel(focusGoal)}</span></p>
        <div className="focus-goal-track" role="progressbar" aria-label={t("Daily focus goal")} aria-valuenow={Math.round(goalProgress)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${goalProgress}%` }} /></div>
        <p className="focus-stats-note">{streak > 1 ? t('{count} day streak. Keep your rhythm.', { count: streak }) : t("Small sessions add up.")}</p>
      </div>
    </div>
  )
}

interface NumberFieldProps { label: string; value: number; min: number; max: number; onChange: (value: number) => void; suffix?: string }
function NumberField({ label, value, min, max, onChange, suffix }: NumberFieldProps) {
  return <label className="pomodoro-field"><span>{label}{suffix ? ` (${suffix})` : ''}</span><input type="number" value={value} min={min} max={max} onChange={event => onChange(Number(event.target.value))} /></label>
}

function RefreshIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5" /></svg>
}
