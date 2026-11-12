import { useLanguage } from '../i18n/useLanguage'
import { useEffect, useRef } from 'react'
import type { Video } from '../types/playlist'
import { UIIcon } from './UIIcon'

export interface VideoQueueProps {
  videos: Video[]
  onPlay: (id: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onClear: () => void
}

export function VideoQueue({ videos, onPlay, onRemove, onMove, onClear }: VideoQueueProps) {
  const { t } = useLanguage()
  const heading = useRef<HTMLHeadingElement>(null)
  const removeButtons = useRef(new Map<string, HTMLButtonElement>())
  const focusAfterRemoval = useRef<{ id: string | null } | null>(null)
  useEffect(() => {
    const request = focusAfterRemoval.current
    if (!request) return
    focusAfterRemoval.current = null
    const destination = (request.id ? removeButtons.current.get(request.id) : null) ?? heading.current
    destination?.focus()
  }, [videos])

  return (
    <section className="video-queue" aria-label={t("Video queue")}>
      <div className="video-queue-heading">
        <h2 ref={heading} tabIndex={-1} className="section-heading"><UIIcon name="video" size={16} />{t("Up next")} <span className="video-queue-count" aria-live="polite">{videos.length}</span></h2>
        {videos.length > 0 && <div className="video-queue-actions">
          <button onClick={() => onPlay(videos[0].id)} className="queue-text-button">{t("Play queue")}</button>
          <button onClick={event => {
            if (document.activeElement === event.currentTarget) focusAfterRemoval.current = { id: null }
            onClear()
          }} className="queue-text-button">{t("Clear queue")}</button>
        </div>}
      </div>
      <p className="video-queue-hint">{videos.length ? t("Plays in this order when the video ends or you choose Next.") : t("Choose Add to queue on a video to plan your study session.")}</p>
      {videos.length > 0 && <ol className="video-queue-list">
        {videos.map((video, index) => <li key={video.id}>
          <span className="video-queue-position">{index + 1}</span>
          <button onClick={() => onPlay(video.id)} className="video-queue-title" title={t('Play now: {title}', { title: video.title })} aria-label={t('Play now: {title}', { title: video.title })}>{video.title}</button>
          <div className="video-queue-actions">
            <button onClick={() => onMove(video.id, -1)} disabled={index === 0} className="queue-icon-button" aria-label={t('Move up: {title}', { title: video.title })} title={t("Move up")}><UIIcon name="up" size={16} /></button>
            <button onClick={() => onMove(video.id, 1)} disabled={index === videos.length - 1} className="queue-icon-button" aria-label={t('Move down: {title}', { title: video.title })} title={t("Move down")}><UIIcon name="down" size={16} /></button>
            <button ref={button => {
              if (button) removeButtons.current.set(video.id, button)
              else removeButtons.current.delete(video.id)
            }} onClick={event => {
              if (document.activeElement === event.currentTarget) {
                focusAfterRemoval.current = { id: (videos[index + 1] ?? videos[index - 1])?.id ?? null }
              }
              onRemove(video.id)
            }} className="queue-icon-button" aria-label={t('Remove from queue: {title}', { title: video.title })} title={t('Remove from queue: {title}', { title: video.title })}><UIIcon name="close" size={14} /></button>
          </div>
        </li>)}
      </ol>}
    </section>
  )
}
