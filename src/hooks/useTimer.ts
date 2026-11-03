import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureNotifyPermission, timerCue } from '../lib/cues'
import { recordFocusMinutes } from '../lib/stats'

const MIN_SECONDS = 10
const MAX_SECONDS = 12 * 60 * 60

export interface PomodoroConfig {
  focusMinutes: number
  breakMinutes: number
  rounds: number
}

export interface PomodoroState extends PomodoroConfig {
  phase: 'focus' | 'break'
  round: number
  completed: boolean
}

export interface TimerApi {
  label: string
  isRunning: boolean
  durationSeconds: number
  pomodoro: PomodoroState | null
  toggle: () => void
  pause: () => void
  reset: () => void
  setDurationSeconds: (seconds: number) => void
  /** Add/remove time mid-session (e.g. ±60s) without stopping the clock. */
  nudge: (deltaSeconds: number) => void
  /** Adjust the countdown, keeping an active session running and Pomodoro intact. */
  adjustTime: (deltaSeconds: number) => void
  startPomodoro: (config: PomodoroConfig) => void
  stopPomodoro: () => void
  /** During a pomodoro break: jump straight into the next focus round. */
  skipBreak: () => void
}

export function formatTime(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Accepts "45" (minutes), "25:30" (mm:ss) or "1:30:00" (h:mm:ss).
 *  Returns seconds clamped to a sane range, or null if unparseable. */
export function parseTimeInput(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  let seconds: number
  if (/^\d+$/.test(t)) {
    seconds = Number(t) * 60
  } else {
    const parts = t.split(':')
    if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
    const n = parts.map(Number)
    seconds = parts.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2]
  }
  return Math.min(Math.max(seconds, MIN_SECONDS), MAX_SECONDS)
}

export function useTimer(initialMinutes = 25, onFocusComplete?: (minutes: number) => void,
  onFocusElapsed?: (milliseconds: number) => void): TimerApi {
  const [durationSeconds, setDuration] = useState(initialMinutes * 60)
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [pomodoro, setPomodoro] = useState<PomodoroState | null>(null)
  // Counting down by decrementing on a 1s interval drifts badly: browsers
  // throttle background-tab timers to as little as one tick per minute, and
  // the study-session use case is precisely "this tab is in the background".
  // So the source of truth is an absolute deadline; the interval only
  // refreshes the display from it.
  const endAtRef = useRef<number | null>(null)
  const secondsLeftRef = useRef(secondsLeft)
  secondsLeftRef.current = secondsLeft
  const pomodoroRef = useRef(pomodoro)
  pomodoroRef.current = pomodoro
  const durationRef = useRef(durationSeconds)
  durationRef.current = durationSeconds
  const onFocusCompleteRef = useRef(onFocusComplete)
  onFocusCompleteRef.current = onFocusComplete
  const onFocusElapsedRef = useRef(onFocusElapsed)
  onFocusElapsedRef.current = onFocusElapsed
  const focusClockRef = useRef<{ at: number; focus: boolean } | null>(null)
  const pendingFocusMs = useRef(0)
  // Use wall time rather than duration minus remaining: nudges, resets, and
  // configured block lengths must not invent study time. Cap throttled ticks
  // at the current deadline so time after a finished block is not credited.
  const flushFocusTime = useCallback((force = false) => {
    const clock = focusClockRef.current
    const deadline = endAtRef.current
    if (clock && deadline !== null) {
      const until = Math.min(Date.now(), deadline)
      if (until > clock.at) {
        if (clock.focus) pendingFocusMs.current += until - clock.at
        clock.at = until
      }
    }
    if (pendingFocusMs.current > 0 && (force || pendingFocusMs.current >= 1000)) {
      const elapsed = pendingFocusMs.current
      pendingFocusMs.current = 0
      onFocusElapsedRef.current?.(elapsed)
    }
  }, [])
  const stopClock = useCallback(() => {
    flushFocusTime(true)
    endAtRef.current = null
    focusClockRef.current = null
  }, [flushFocusTime])
  const recordCompletedFocus = useCallback((minutes: number) => {
    recordFocusMinutes(minutes)
    onFocusCompleteRef.current?.(minutes)
  }, [])

  useEffect(() => {
    if (!isRunning) return
    // (Re)arm the deadline from whatever is on the clock right now. Starting
    // a finished plain timer restarts it from its duration rather than
    // instantly re-firing the completion cue.
    let base = secondsLeftRef.current
    if (base <= 0 && !pomodoroRef.current) {
      base = durationRef.current
      setSecondsLeft(base)
    }
    const startedAt = Date.now()
    endAtRef.current = startedAt + base * 1000
    focusClockRef.current = { at: startedAt, focus: !pomodoroRef.current ||
      (pomodoroRef.current.phase === 'focus' && !pomodoroRef.current.completed) }
    const tick = () => {
      if (endAtRef.current === null) return
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      flushFocusTime(remaining <= 0)
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        // Disarm before cueing: setIsRunning(false) only stops the interval
        // after React processes it, so a second fire (possible when a
        // throttled tab catches up) would otherwise chime and log twice.
        endAtRef.current = null
        setIsRunning(false)
        // Pomodoro phase edges cue (and log focus) from the advancement
        // effect below; a plain timer has no other place to announce itself.
        if (!pomodoroRef.current) {
          timerCue("Time's up", 'Your focus timer finished.')
          recordCompletedFocus(durationRef.current / 60)
        }
      }
    }
    // 250ms so a throttled-then-restored tab snaps to the right time quickly;
    // setState with an unchanged value skips the re-render, so the visible
    // update rate is still once a second.
    const id = window.setInterval(tick, 250)
    const onVisible = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    const onPageHide = () => flushFocusTime(true)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      stopClock()
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [isRunning, recordCompletedFocus, flushFocusTime, stopClock])

  // Pomodoro phase advancement: when a focus/break block hits zero, roll into
  // the next block (or finish after the last focus round).
  useEffect(() => {
    if (!pomodoro || pomodoro.completed || secondsLeft > 0) return
    if (pomodoro.phase === 'focus' && pomodoro.round >= pomodoro.rounds) {
      setPomodoro({ ...pomodoro, completed: true })
      timerCue('All rounds done! 🎉', `${pomodoro.rounds} focus rounds complete — great work.`)
      recordCompletedFocus(pomodoro.focusMinutes)
      return
    }
    const nextPhase = pomodoro.phase === 'focus' ? 'break' : 'focus'
    const nextRound = pomodoro.phase === 'break' ? pomodoro.round + 1 : pomodoro.round
    setPomodoro({ ...pomodoro, phase: nextPhase, round: nextRound })
    setSecondsLeft(
      (nextPhase === 'focus' ? pomodoro.focusMinutes : pomodoro.breakMinutes) * 60,
    )
    setIsRunning(true)
    if (nextPhase === 'break') {
      timerCue('Focus round done', `Take a ${pomodoro.breakMinutes} minute break.`)
      recordCompletedFocus(pomodoro.focusMinutes)
    } else {
      timerCue('Break over', `Round ${nextRound} — ${pomodoro.focusMinutes} minutes of focus.`)
    }
  }, [secondsLeft, pomodoro, recordCompletedFocus])

  const pause = useCallback(() => {
    stopClock()
    setIsRunning(false)
  }, [stopClock])
  const toggle = useCallback(() => {
    if (isRunning) pause()
    else { ensureNotifyPermission(); setIsRunning(true) }
  }, [isRunning, pause])

  const reset = useCallback(() => {
    stopClock()
    setIsRunning(false)
    if (pomodoro) {
      setPomodoro({ ...pomodoro, phase: 'focus', round: 1, completed: false })
      setSecondsLeft(pomodoro.focusMinutes * 60)
    } else {
      setSecondsLeft(durationSeconds)
    }
  }, [durationSeconds, pomodoro, stopClock])

  const setDurationSeconds = useCallback((seconds: number) => {
    stopClock()
    const clamped = Math.min(Math.max(seconds, MIN_SECONDS), MAX_SECONDS)
    setPomodoro(null)
    setDuration(clamped)
    setSecondsLeft(clamped)
    setIsRunning(false)
  }, [stopClock])

  // The deadline is the source of truth while running, so a nudge adjusts it
  // directly; the display refreshes from it. Over-subtracting clamps to one
  // second rather than zero: completion must go through the tick (which
  // stops the clock and lets the pomodoro effect re-arm the deadline) — a
  // nudge writing 0 directly would advance the phase against a stale
  // deadline and cascade through the remaining blocks.
  const nudge = useCallback((deltaSeconds: number) => {
    flushFocusTime(true)
    if (endAtRef.current !== null) {
      endAtRef.current = Math.max(Date.now() + 1000, endAtRef.current + deltaSeconds * 1000)
      setSecondsLeft(Math.max(1, Math.ceil((endAtRef.current - Date.now()) / 1000)))
    } else {
      setSecondsLeft((prev) => Math.max(1, prev + deltaSeconds))
    }
  }, [flushFocusTime])

  const adjustTime = useCallback((deltaSeconds: number) => {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds === 0) return
    const current = endAtRef.current === null ? secondsLeftRef.current
      : Math.max(1, Math.ceil((endAtRef.current - Date.now()) / 1000))
    const active = isRunning || (pomodoroRef.current !== null && !pomodoroRef.current.completed)
    const next = Math.min(MAX_SECONDS, Math.max(active ? 1 : MIN_SECONDS, current + deltaSeconds))
    if (next === current) return
    if (active) nudge(next - current)
    else setDurationSeconds(next)
    // Multiple wheel events can arrive before React renders the next snapshot.
    secondsLeftRef.current = next
  }, [isRunning, nudge, setDurationSeconds])

  const skipBreak = useCallback(() => {
    const p = pomodoroRef.current
    if (!p || p.completed || p.phase !== 'break') return
    flushFocusTime(true)
    setPomodoro({ ...p, phase: 'focus', round: p.round + 1 })
    setSecondsLeft(p.focusMinutes * 60)
    // Already running → the isRunning effect won't re-arm, so re-arm here.
    if (endAtRef.current !== null) {
      const now = Date.now()
      endAtRef.current = now + p.focusMinutes * 60_000
      focusClockRef.current = { at: now, focus: true }
    }
    setIsRunning(true)
  }, [flushFocusTime])

  const startPomodoro = useCallback((config: PomodoroConfig) => {
    flushFocusTime(true)
    const focusMinutes = Math.min(Math.max(Math.round(config.focusMinutes), 1), 180)
    const breakMinutes = Math.min(Math.max(Math.round(config.breakMinutes), 1), 60)
    const rounds = Math.min(Math.max(Math.round(config.rounds), 1), 12)
    ensureNotifyPermission()
    setPomodoro({ focusMinutes, breakMinutes, rounds, phase: 'focus', round: 1, completed: false })
    setSecondsLeft(focusMinutes * 60)
    // Starting from an already-running plain timer leaves isRunning true, so
    // the arming effect won't re-run — the old deadline would survive and the
    // first focus round would inherit its remainder. Re-arm here (same reason
    // as skipBreak).
    if (endAtRef.current !== null) {
      const now = Date.now()
      endAtRef.current = now + focusMinutes * 60_000
      focusClockRef.current = { at: now, focus: true }
    }
    setIsRunning(true)
  }, [flushFocusTime])

  const stopPomodoro = useCallback(() => {
    stopClock()
    setPomodoro(null)
    setIsRunning(false)
    setSecondsLeft(durationSeconds)
  }, [durationSeconds, stopClock])

  return {
    label: formatTime(secondsLeft),
    isRunning,
    durationSeconds,
    pomodoro,
    toggle,
    pause,
    reset,
    setDurationSeconds,
    nudge,
    adjustTime,
    startPomodoro,
    stopPomodoro,
    skipBreak,
  }
}
