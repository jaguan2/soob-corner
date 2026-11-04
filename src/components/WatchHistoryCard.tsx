import { useLanguage } from '../i18n/useLanguage'
import { useMemo, useState } from 'react'
import { MEMBERS } from '../lib/catalog'
import type { WatchHistory } from '../lib/watchHistory'
import type { Member, Video } from '../types/playlist'
import { UIIcon } from './UIIcon'

interface Props {
  history: WatchHistory
  playable: Video[]
  catalogVideos?: Video[]
  queuedVideos: Video[]
  onPlay: (id: string) => void
  onQueue: (id: string) => void
  headingLevel?: 'h1' | 'h2'
}
const PAGE_SIZE = 20

export function WatchHistoryCard({ history, playable, catalogVideos = playable, queuedVideos, onPlay, onQueue, headingLevel = 'h2' }: Props) {
  const { t, language } = useLanguage()
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }), [language])
  const Heading = headingLevel
  const [query, setQuery] = useState('')
  const [member, setMember] = useState<Member | ''>('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const available = useMemo(() => new Set(playable.map(video => video.id)), [playable])
  const catalog = useMemo(() => new Map(catalogVideos.map(video => [video.id, video])), [catalogVideos])
  const filtered = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    return history.entries.map(entry => {
      const video = catalog.get(entry.id)
      return { ...entry, title: video?.title ?? entry.title, originalTitle: video?.originalTitle ?? entry.title }
    }).filter(entry => (!member || entry.members.includes(member)) &&
      terms.every(term => [entry.title, entry.originalTitle, ...entry.members].join(' ').toLocaleLowerCase().includes(term)))
      .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt || a.id.localeCompare(b.id))
  }, [history, query, member, catalog])

  return <section className="watch-history-panel" aria-label={t("Watch history")}>
    <header><Heading className="section-heading"><UIIcon name="history" />{t("Watch history")}</Heading>
      <p className="settings-caption">{t("Your recently played videos, newest first. Tracking starts with this update.")}</p></header>
    {history.entries.length === 0 ? <p className="history-empty">{t("Play a video to start your watch history. Videos appear once playback begins.")}</p> : <>
      <div className="history-filters">
        <input type="search" aria-label={t("Search watch history")} placeholder={t("Search watched videos")} value={query}
          onChange={event => { setQuery(event.target.value); setLimit(PAGE_SIZE) }} />
        <select aria-label={t("Filter watch history by member")} value={member} onChange={event => { setMember(event.target.value as Member | ''); setLimit(PAGE_SIZE) }}>
          <option value="">{t("All members")}</option>{MEMBERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <p className="settings-caption">{t('{count} of {total} distinct videos', { count: filtered.length, total: history.entries.length })}</p>
      {filtered.length === 0 && <p className="history-empty">{t("No watched videos match. Try another search or member.")}</p>}
      <ol className="watch-history-list" aria-label={t("Recently watched videos")}>
        {filtered.slice(0, limit).map(entry => {
          const canPlay = available.has(entry.id)
          const queued = queuedVideos.some(video => video.id === entry.id)
          return <li key={entry.id}>
            <div className="history-video-heading">
              <img src={entry.thumbnail} alt="" loading="lazy" />
              <div><h3 title={entry.originalTitle !== entry.title ? t('Original title: {title}', { title: entry.originalTitle }) : undefined}>{entry.title}</h3><p>{MEMBERS.filter(item => entry.members.includes(item.value)).map(item => item.label).join(', ') || 'TXT'} · {entry.duration}</p></div>
            </div>
            <p className="history-last-played"><time dateTime={new Date(entry.lastWatchedAt).toISOString()}>{dateFormat.format(entry.lastWatchedAt)}</time> · {t(entry.plays === 1 ? '{count} play' : '{count} plays', { count: entry.plays })}</p>
            <div className="history-actions">
              <button disabled={!canPlay} onClick={() => onPlay(entry.id)} aria-label={t('Play again: {title}', { title: entry.title })} className="queue-text-button">{t("Play again")}</button>
              <button disabled={!canPlay || queued} onClick={() => onQueue(entry.id)} aria-label={t(queued ? 'Queued: {title}' : 'Add to queue: {title}', { title: entry.title })} className="queue-text-button"><UIIcon name={queued ? 'check' : 'plus'} size={13} />{queued ? t("Queued") : t("Add to queue")}</button>
            </div>
            {!canPlay && <p className="settings-caption">{t("Unavailable in the current catalog or this session.")}</p>}
          </li>
        })}
      </ol>
      {filtered.length > limit && <button className="workspace-button history-more" onClick={() => setLimit(value => value + PAGE_SIZE)}>{t("Show more history")}</button>}
    </>}
  </section>
}
