import { useLanguage } from '../i18n/useLanguage'
import type { WatchStats as Stats } from '../lib/watchHistory'
import { UIIcon } from './UIIcon'

export function WatchStats({ stats }: { stats: Stats }) {
  const { t, language } = useLanguage()
  return <section className="profile-watch-stats" aria-label={t("Video watching stats")}>
    <h3 className="section-heading"><UIIcon name="video" size={17} />{t("Videos watched")}</h3>
    <p className="watch-total"><strong className="watch-total-phrase">{t(stats.uniqueVideos === 1 ? '{count} video total' : '{count} videos total', { count: stats.uniqueVideos.toLocaleString(language) })}</strong></p>
    <p className="settings-caption">{t(stats.totalPlays === 1 ? 'Distinct videos that started playing · {count} play including rewatches' : 'Distinct videos that started playing · {count} plays including rewatches', { count: stats.totalPlays.toLocaleString(language) })}</p>
    <dl className="watch-member-stats" aria-label={t("Videos watched by member")}>
      {stats.byMember.map(item => <div key={item.member}><dt>{item.label}</dt><dd>{t(item.videos === 1 ? '{count} video' : '{count} videos', { count: item.videos.toLocaleString(language) })}</dd></div>)}
    </dl>
    <p className="settings-caption">{t("Group videos count for each member featured. Tracking starts with this update.")}</p>
  </section>
}
