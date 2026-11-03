import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { usePreferences } from './usePreferences'
import { SettingsCard } from '../components/SettingsCard'
import { ProfileCard } from '../components/ProfileCard'
import { normalizeProgression, rewardTaskCompletion } from '../lib/progression'

let root: ReactTestRenderer | undefined
let api: ReturnType<typeof usePreferences>
let values: Map<string, string>
const progression = rewardTaskCompletion(normalizeProgression(null), 'saved-task')
const noop = () => {}
function Harness() {
  api = usePreferences()
  return <>
    <SettingsCard theme="dark" onSetTheme={noop} customColor="#8AA5C8" onSetCustomColor={noop}
      opacity={88} onSetOpacity={noop} showMilestones={api.preferences.showMilestones} onSetShowMilestones={api.setShowMilestones}
      singleKeyShortcuts={api.preferences.singleKeyShortcuts} onSetSingleKeyShortcuts={api.setSingleKeyShortcuts} />
    <ProfileCard progression={progression} onUpdateProfile={async () => true} showMilestones={api.preferences.showMilestones} />
  </>
}
const mount = () => act(() => { root = create(<Harness />) })
beforeEach(() => {
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.unstubAllGlobals()
})

describe('saved profile display preferences', () => {
  it('hides and restores milestone cards through Settings without changing earned progress', () => {
    const saved = JSON.stringify(progression)
    values.set('sws.progression', saved)
    mount()
    const milestones = () => root!.root.findAllByProps({ 'aria-label': 'Study milestones' })
    expect(milestones()).toHaveLength(1)
    expect(milestones()[0].findAllByProps({ className: 'earned' }).length).toBeGreaterThan(0)
    act(() => root!.root.findByProps({ 'aria-label': 'Show milestones' }).props.onChange({ target: { checked: false } }))
    expect(milestones()).toHaveLength(0)
    expect(root!.root.findByProps({ role: 'progressbar' }).props['aria-valuenow']).toBe(10)
    expect(JSON.parse(values.get('sws.preferences')!)).toEqual({ showMilestones: false, singleKeyShortcuts: true })
    expect(values.get('sws.progression')).toBe(saved)
    act(() => root!.unmount())
    mount()
    expect(api.preferences.showMilestones).toBe(false)
    expect(milestones()).toHaveLength(0)
    act(() => api.setShowMilestones(true))
    expect(milestones()).toHaveLength(1)
    expect(values.get('sws.progression')).toBe(saved)
  })

  it.each(['not json', 'null', '[]', '{"showMilestones":"false"}'])('uses the existing visible default for invalid preferences: %s', raw => {
    values.set('sws.preferences', raw)
    mount()
    expect(api.preferences.showMilestones).toBe(true)
  })

  it('keeps the toggle usable when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('Unavailable') }, setItem: () => { throw Error('Unavailable') } })
    mount()
    expect(api.preferences.showMilestones).toBe(true)
    act(() => api.setShowMilestones(false))
    expect(api.preferences.showMilestones).toBe(false)
    expect(root!.root.findAllByProps({ 'aria-label': 'Study milestones' })).toHaveLength(0)
  })

  it('migrates older preferences and persists disabling shortcuts without changing milestone visibility', () => {
    values.set('sws.preferences', JSON.stringify({ showMilestones: false }))
    mount()
    expect(api.preferences).toEqual({ showMilestones: false, singleKeyShortcuts: true })
    act(() => api.setSingleKeyShortcuts(false))
    expect(api.preferences).toEqual({ showMilestones: false, singleKeyShortcuts: false })
    act(() => root!.unmount())
    mount()
    expect(api.preferences.singleKeyShortcuts).toBe(false)
    expect(api.preferences.showMilestones).toBe(false)
  })
})
