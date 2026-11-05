import { useEffect, useState } from 'react'
import { localDayKey } from '../lib/stats'

/** Refresh at local midnight and after sleep/backgrounding, without polling. */
export function useLocalDay() {
  const [day, setDay] = useState(() => localDayKey())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const refresh = () => {
      const now = new Date()
      setDay(localDayKey(now))
      clearTimeout(timeout)
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timeout = setTimeout(refresh, midnight.getTime() - now.getTime())
    }
    const onVisible = () => { if (!document.hidden) refresh() }
    refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [])

  return day
}
