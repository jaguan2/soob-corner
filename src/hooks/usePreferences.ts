import { useCallback, useEffect, useState } from 'react'
import { storageGetJson, storageSetJson } from '../lib/storage'

interface Preferences {
  showMilestones: boolean
}

function loadPreferences(): Preferences {
  const raw = storageGetJson<unknown>('sws.preferences', null)
  return {
    showMilestones: raw !== null && typeof raw === 'object' &&
      'showMilestones' in raw && typeof raw.showMilestones === 'boolean' ? raw.showMilestones : true,
  }
}

/** Display preferences stay separate from earned progression and timer state. */
export function usePreferences() {
  const [preferences, setPreferences] = useState(loadPreferences)
  useEffect(() => { storageSetJson('sws.preferences', preferences) }, [preferences])
  const setShowMilestones = useCallback((showMilestones: boolean) => {
    setPreferences(previous => ({ ...previous, showMilestones }))
  }, [])
  return { preferences, setShowMilestones }
}
