import { useLanguage } from '../i18n/useLanguage'
import type { TimerApi } from '../hooks/useTimer'
import { TimerPanel } from './TimerPanel'

interface TimerCardProps {
  timer: TimerApi
  pauseOnBreak: boolean
  onSetPauseOnBreak: (value: boolean) => void
}

export function TimerCard({ timer, pauseOnBreak, onSetPauseOnBreak }: TimerCardProps) {
  const { t } = useLanguage()
  return <section className="min-w-0 p-4" aria-label={t("Focus timer")}><TimerPanel timer={timer} pauseOnBreak={pauseOnBreak} onSetPauseOnBreak={onSetPauseOnBreak} /></section>
}
