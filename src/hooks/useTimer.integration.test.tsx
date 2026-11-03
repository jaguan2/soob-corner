import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useTimer } from './useTimer'
import { useProgression } from './useProgression'
import { normalizeProgression, progressionLevel, totalStudyMilliseconds } from '../lib/progression'
import { ProfileCard } from '../components/ProfileCard'
import { timerCue } from '../lib/cues'

vi.mock('../lib/cues', () => ({ ensureNotifyPermission: vi.fn(), timerCue: vi.fn() }))
let root: ReactTestRenderer | undefined
let timer: ReturnType<typeof useTimer>
let profile: ReturnType<typeof useProgression>
let values: Map<string, string>
let writable: boolean
const notice = vi.fn()
function Harness() {
  profile = useProgression(notice)
  timer = useTimer(25, profile.recordStudy, profile.recordTime)
  return <ProfileCard progression={profile.progression} onUpdateProfile={profile.updateProfile} showMilestones />
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 3, 12))
  values = new Map()
  writable = true
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (!writable) throw new Error('Storage full')
      values.set(key, value)
    },
  })
  vi.stubGlobal('navigator', {})
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval, clearInterval }))
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
})
afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  root = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function mount() { await act(async () => { root = create(<Harness />) }) }
async function advance(milliseconds: number) { await act(async () => { vi.advanceTimersByTime(milliseconds) }) }
const elapsed = () => totalStudyMilliseconds(profile.progression)
const saved = () => normalizeProgression(JSON.parse(values.get('sws.progression')!))
const shownTime = () => root!.root.findByProps({ className: 'profile-study-total' }).findByType('strong')
  .children.map(child => typeof child === 'string' ? child : child.children.join('')).join(' ')

describe('elapsed focus time and profile persistence', () => {
  it('adjusts idle and paused durations without adding study time, including multiple adjustments before rendering', async () => {
    await mount()
    await act(async () => { timer.adjustTime(60); timer.adjustTime(60); timer.adjustTime(60) })
    expect(timer.label).toBe('28:00')
    expect(timer.durationSeconds).toBe(1680)
    await act(async () => { timer.reset(); timer.toggle() })
    await advance(5000)
    await act(async () => { timer.pause() })
    await act(async () => { timer.adjustTime(-60) })
    expect(timer.label).toBe('26:55')
    expect(timer.durationSeconds).toBe(1615)
    expect(timer.isRunning).toBe(false)
    expect(elapsed()).toBe(5000)
    await act(async () => { timer.adjustTime(-1e8) })
    expect(timer.label).toBe('00:10')
    await act(async () => { timer.adjustTime(1e8) })
    expect(timer.label).toBe('12:00:00')
    await act(async () => { timer.adjustTime(NaN) })
    expect(timer.label).toBe('12:00:00')
    expect(elapsed()).toBe(5000)
  })

  it('adjusts a running countdown within limits while preserving actual elapsed focus time', async () => {
    await mount()
    await act(async () => { timer.toggle() })
    await advance(2500)
    await act(async () => { timer.adjustTime(60) })
    expect(timer.label).toBe('25:58')
    expect(timer.isRunning).toBe(true)
    expect(elapsed()).toBe(2500)
    await act(async () => { timer.adjustTime(1e8) })
    expect(timer.label).toBe('12:00:00')
    await act(async () => { timer.adjustTime(-1e8) })
    expect(timer.label).toBe('00:01')
    expect(timer.isRunning).toBe(true)
    await advance(1000)
    expect(timer.isRunning).toBe(false)
    expect(elapsed()).toBe(3500)
    expect(timerCue).toHaveBeenCalledTimes(1)
  })

  it('preserves paused Pomodoro rounds and break transitions, then adjusts a completed cycle into a new duration', async () => {
    await mount()
    await act(async () => { timer.startPomodoro({ focusMinutes: 1, breakMinutes: 1, rounds: 2 }); timer.pause() })
    await act(async () => { timer.adjustTime(60) })
    expect(timer.label).toBe('02:00')
    expect(timer.pomodoro).toMatchObject({ phase: 'focus', round: 1, completed: false })
    expect(timer.isRunning).toBe(false)
    await act(async () => { timer.toggle() })
    await advance(120_000)
    expect(timer.pomodoro?.phase).toBe('break')
    await act(async () => { timer.adjustTime(-60) })
    expect(timer.label).toBe('00:01')
    await advance(1000)
    expect(timer.pomodoro).toMatchObject({ phase: 'focus', round: 2 })
    expect(elapsed()).toBe(120_000)
    await advance(60_000)
    expect(timer.pomodoro?.completed).toBe(true)
    await act(async () => { timer.adjustTime(60) })
    expect(timer.pomodoro).toBeNull()
    expect(timer.label).toBe('01:00')
    expect(timer.isRunning).toBe(false)
    expect(elapsed()).toBe(180_000)
  })

  it('updates the profile before completion and retains partial work after pause, reset, and relaunch', async () => {
    await mount()
    expect(root!.root.findByProps({ className: 'profile-study-heading' }).children).toContain('Total time studied')
    await act(async () => { timer.toggle() })
    await advance(12_500)
    await act(async () => { timer.pause() })
    expect(elapsed()).toBe(12_500)
    expect(totalStudyMilliseconds(saved())).toBe(12_500)
    expect(shownTime()).toBe('0 hours 0 min 12 sec')
    await advance(30_000)
    expect(elapsed()).toBe(12_500)
    await act(async () => { timer.toggle() })
    await advance(2500)
    await act(async () => { timer.reset() })
    expect(elapsed()).toBe(15_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(10) // check-in only
    await act(async () => { root!.unmount() })
    root = undefined
    await mount()
    expect(elapsed()).toBe(15_000)
    expect(timer.isRunning).toBe(false)
  })

  it('counts a short finished session once and stops after the deadline', async () => {
    await mount()
    await act(async () => { timer.setDurationSeconds(10) })
    await act(async () => { timer.toggle() })
    await advance(30_000)
    expect(elapsed()).toBe(10_000)
    expect(timer.isRunning).toBe(false)
    expect(timerCue).toHaveBeenCalledOnce()
    await advance(30_000)
    expect(elapsed()).toBe(10_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(10)
  })

  it('excludes breaks, handles skip-break, and keeps completion XP independent from elapsed time', async () => {
    await mount()
    await act(async () => { timer.startPomodoro({ focusMinutes: 1, breakMinutes: 1, rounds: 2 }) })
    await advance(60_000)
    expect(timer.pomodoro?.phase).toBe('break')
    expect(elapsed()).toBe(60_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(11)
    await advance(20_000)
    expect(elapsed()).toBe(60_000)
    await act(async () => { timer.skipBreak() })
    await advance(10_000)
    expect(elapsed()).toBe(70_000)
    await act(async () => { timer.stopPomodoro() })
    await advance(60_000)
    expect(elapsed()).toBe(70_000)
  })

  it('counts wall time rather than time added or removed by nudging', async () => {
    await mount()
    await act(async () => { timer.toggle() })
    await advance(5000)
    await act(async () => { timer.nudge(-1200) })
    expect(elapsed()).toBe(5000)
    await advance(5000)
    await act(async () => { timer.nudge(1200) })
    await advance(5000)
    await act(async () => { timer.pause() })
    expect(elapsed()).toBe(15_000)
  })

  it('counts each completed Pomodoro focus phase once and excludes the automatic break', async () => {
    await mount()
    await act(async () => { timer.startPomodoro({ focusMinutes: 1, breakMinutes: 1, rounds: 2 }) })
    await advance(60_000)
    await advance(60_000)
    expect(timer.pomodoro?.phase).toBe('focus')
    expect(elapsed()).toBe(60_000)
    await advance(60_000)
    expect(timer.pomodoro?.completed).toBe(true)
    expect(elapsed()).toBe(120_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(12)
    await advance(60_000)
    expect(elapsed()).toBe(120_000)
  })

  it('starts a fresh cycle when toggling a completed Pomodoro without repeating its credit', async () => {
    await mount()
    await act(async () => { timer.startPomodoro({ focusMinutes: 1, breakMinutes: 1, rounds: 1 }) })
    await advance(60_000)
    expect(timer.pomodoro?.completed).toBe(true)
    expect(timer.label).toBe('00:00')
    expect(elapsed()).toBe(60_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(11)

    await act(async () => { timer.toggle() })
    expect(timer.pomodoro).toMatchObject({ completed: false, phase: 'focus', round: 1, rounds: 1 })
    expect(timer.label).toBe('01:00')
    await advance(5000)
    expect(timer.isRunning).toBe(true)
    expect(timer.label).toBe('00:55')
    expect(elapsed()).toBe(65_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(11)
    await advance(55_000)
    expect(timer.pomodoro?.completed).toBe(true)
    expect(elapsed()).toBe(120_000)
    expect(progressionLevel(profile.progression).totalXP).toBe(12)
  })

  it('flushes actual time before switching an already-running timer to Pomodoro or a new preset', async () => {
    await mount()
    await act(async () => { timer.toggle() })
    await advance(2500)
    await act(async () => { timer.startPomodoro({ focusMinutes: 1, breakMinutes: 1, rounds: 2 }) })
    await advance(5000)
    await act(async () => { timer.setDurationSeconds(120) })
    expect(elapsed()).toBe(7500)
    await advance(30_000)
    expect(elapsed()).toBe(7500)
  })

  it('caps throttled catch-up at the focus deadline', async () => {
    await mount()
    await act(async () => { timer.setDurationSeconds(10) })
    await act(async () => { timer.toggle() })
    await act(async () => {
      vi.setSystemTime(Date.now() + 90_000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(elapsed()).toBe(10_000)
    expect(timer.isRunning).toBe(false)
  })

  it('backfills legacy history once and preserves it across later partial sessions', async () => {
    values.set('sws.stats', '{"2026-11-02":60}')
    await mount()
    expect(elapsed()).toBe(3_600_000)
    await act(async () => { timer.toggle() })
    await advance(6000)
    await act(async () => { timer.pause() })
    await act(async () => { root!.unmount() })
    root = undefined
    await mount()
    expect(elapsed()).toBe(3_606_000)
  })

  it('keeps live time when saving fails, warns once, and saves pending time on recovery', async () => {
    await mount()
    writable = false
    await act(async () => { timer.toggle() })
    for (let second = 0; second < 5; second++) await advance(1000)
    expect(elapsed()).toBe(5000)
    expect(notice).toHaveBeenCalledOnce()
    expect(totalStudyMilliseconds(saved())).toBe(0)
    writable = true
    await advance(1000)
    expect(totalStudyMilliseconds(saved())).toBe(6000)
    expect(progressionLevel(saved()).totalXP).toBe(10)
  })

  it('flushes the final partial second on page hide and unmount without counting it twice', async () => {
    await mount()
    await act(async () => { timer.toggle() })
    await advance(1250)
    await act(async () => { window.dispatchEvent(new Event('pagehide')) })
    expect(elapsed()).toBe(1250)
    await advance(250)
    await act(async () => { root!.unmount() })
    root = undefined
    expect(totalStudyMilliseconds(saved())).toBe(1500)
  })
})
