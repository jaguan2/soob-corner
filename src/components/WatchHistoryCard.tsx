import { useMemo, useState } from 'react'
import { MEMBERS } from '../lib/catalog'
import type { WatchHistory } from '../lib/watchHistory'
import type { Member, Video } from '../types/playlist'
import { UIIcon } from './UIIcon'

interface Props {
  history: WatchHistory
  playable: Video[]
  queuedVideos: Video[]
  onPlay: (id: string) => void
  onQueue: (id: string) => void
}
const PAGE_SIZE = 20
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function WatchHistoryCard({ history, playable, queuedVideos, onPlay, onQueue }: Props) {
  const [query, setQuery] = useState('')
  const [member, setMember] = useState<Member | ''>('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const available = useMemo(() => new Set(playable.map(video => video.id)), [playable])
  const filtered = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    return history.entries.filter(entry => (!member || entry.members.includes(member)) &&
      terms.every(term => [entry.title, ...entry.members].join(' ').toLocaleLowerCase().includes(term)))
      .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt || a.id.localeCompare(b.id))
  }, [history, query, member])

  return <section className="watch-history-panel" aria-label="Watch history">
    <header><h2 className="section-heading"><UIIcon name="history" />Watch history</h2>
      <p className="settings-caption">Your recently played videos, newest first. Tracking starts with this update.</p></header>
    {history.entries.length === 0 ? <p className="history-empty">Play a video to start your watch history. Videos appear once playback begins.</p> : <>
      <div className="history-filters">
        <input type="search" aria-label="Search watch history" placeholder="Search watched videos" value={query}
          onChange={event => { setQuery(event.target.value); setLimit(PAGE_SIZE) }} />
        <select aria-label="Filter watch history by member" value={member} onChange={event => { setMember(event.target.value as Member | ''); setLimit(PAGE_SIZE) }}>
          <option value="">All members</option>{MEMBERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <p className="settings-caption">{filtered.length} of {history.entries.length} distinct videos</p>
      {filtered.length === 0 && <p className="history-empty">No watched videos match. Try another search or member.</p>}
      <ol className="watch-history-list" aria-label="Recently watched videos">
        {filtered.slice(0, limit).map(entry => {
          const canPlay = available.has(entry.id)
          const queued = queuedVideos.some(video => video.id === entry.id)
          return <li key={entry.id}>
            <div className="history-video-heading">
              <img src={entry.thumbnail} alt="" loading="lazy" />
              <div><h3>{entry.title}</h3><p>{MEMBERS.filter(item => entry.members.includes(item.value)).map(item => item.label).join(', ') || 'TXT'} · {entry.duration}</p></div>
            </div>
            <p className="history-last-played"><time dateTime={new Date(entry.lastWatchedAt).toISOString()}>{dateFormat.format(entry.lastWatchedAt)}</time> · {entry.plays} {entry.plays === 1 ? 'play' : 'plays'}</p>
            <div className="history-actions">
              <button disabled={!canPlay} onClick={() => onPlay(entry.id)} aria-label={`Play again: ${entry.title}`} className="queue-text-button">Play again</button>
              <button disabled={!canPlay || queued} onClick={() => onQueue(entry.id)} aria-label={`${queued ? 'Queued' : 'Add to queue'}: ${entry.title}`} className="queue-text-button"><UIIcon name={queued ? 'check' : 'plus'} size={13} />{queued ? 'Queued' : 'Add to queue'}</button>
            </div>
            {!canPlay && <p className="settings-caption">Unavailable in the current catalog or this session.</p>}
          </li>
        })}
      </ol>
      {filtered.length > limit && <button className="workspace-button history-more" onClick={() => setLimit(value => value + PAGE_SIZE)}>Show more history</button>}
    </>}
  </section>
}
