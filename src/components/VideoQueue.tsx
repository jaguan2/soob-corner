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
  return (
    <section className="video-queue" aria-label="Video queue">
      <div className="video-queue-heading">
        <h2 className="section-heading"><UIIcon name="video" size={16} />Up next <span className="video-queue-count" aria-live="polite">{videos.length}</span></h2>
        {videos.length > 0 && <div className="video-queue-actions">
          <button onClick={() => onPlay(videos[0].id)} className="queue-text-button">Play queue</button>
          <button onClick={onClear} className="queue-text-button">Clear queue</button>
        </div>}
      </div>
      <p className="video-queue-hint">{videos.length ? 'Plays in this order when the video ends or you choose Next.' : 'Choose Add to queue on a video to plan your study session.'}</p>
      {videos.length > 0 && <ol className="video-queue-list">
        {videos.map((video, index) => <li key={video.id}>
          <span className="video-queue-position">{index + 1}</span>
          <button onClick={() => onPlay(video.id)} className="video-queue-title" title={`Play now: ${video.title}`} aria-label={`Play now: ${video.title}`}>{video.title}</button>
          <div className="video-queue-actions">
            <button onClick={() => onMove(video.id, -1)} disabled={index === 0} className="queue-icon-button" aria-label={`Move up: ${video.title}`} title="Move up"><UIIcon name="up" size={16} /></button>
            <button onClick={() => onMove(video.id, 1)} disabled={index === videos.length - 1} className="queue-icon-button" aria-label={`Move down: ${video.title}`} title="Move down"><UIIcon name="down" size={16} /></button>
            <button onClick={() => onRemove(video.id)} className="queue-icon-button" aria-label={`Remove from queue: ${video.title}`} title="Remove from queue"><UIIcon name="close" size={14} /></button>
          </div>
        </li>)}
      </ol>}
    </section>
  )
}
