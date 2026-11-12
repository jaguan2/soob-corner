import { Slider } from './Slider'
import { useLanguage } from '../i18n/useLanguage'

interface VolumeControlProps {
  volume: number
  muted: boolean
  onToggleMute: () => void
  onChange: (volume: number) => void
}

export function VolumeControl({ volume, muted, onToggleMute, onChange }: VolumeControlProps) {
  const { t } = useLanguage()
  const silent = muted || volume === 0
  const action = t(silent ? 'Unmute video' : 'Mute video')
  return (
    <div className="video-volume" role="group" aria-label={t('Video audio')}>
      <button onClick={onToggleMute} aria-label={action} aria-pressed={silent}
        title={`${action} (M)`} className="video-mute-button"><SpeakerIcon muted={silent} /></button>
      <Slider value={volume} onChange={onChange} ariaLabel={t('Video volume')} className="video-volume-slider" />
      <span className="video-volume-value">{volume}%</span>
    </div>
  )
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="shrink-0 text-ink-700 dark:text-cream-300"
    >
      <path d="M4 9v6h4l5 5V4L8 9H4z" strokeLinecap="round" strokeLinejoin="round" />
      {!muted && <path d="M16.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" strokeLinejoin="round" />}
      {muted && <path d="M17 9l4 6M21 9l-4 6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}
