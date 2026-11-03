import type { WatchStats as Stats } from '../lib/watchHistory'
import { UIIcon } from './UIIcon'

export function WatchStats({ stats }: { stats: Stats }) {
  return <section className="profile-watch-stats" aria-label="Video watching stats">
    <h3 className="section-heading"><UIIcon name="video" size={17} />Videos watched</h3>
    <p className="watch-total"><strong>{stats.uniqueVideos.toLocaleString()}</strong> {stats.uniqueVideos === 1 ? 'video' : 'videos'} total</p>
    <p className="settings-caption">Distinct videos that started playing · {stats.totalPlays.toLocaleString()} {stats.totalPlays === 1 ? 'play' : 'plays'} including rewatches</p>
    <dl className="watch-member-stats" aria-label="Videos watched by member">
      {stats.byMember.map(item => <div key={item.member}><dt>{item.label}</dt><dd>{item.videos.toLocaleString()} {item.videos === 1 ? 'video' : 'videos'}</dd></div>)}
    </dl>
    <p className="settings-caption">Group videos count for each member featured. Tracking starts with this update.</p>
  </section>
}
