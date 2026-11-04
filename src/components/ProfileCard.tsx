import { useLanguage } from '../i18n/useLanguage'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  currentCheckInStreak, PROFILE_AVATARS, progressionLevel, progressionMilestones,
  totalStudyMilliseconds, XP_RULES, type ProfileAvatar, type Progression,
} from '../lib/progression'
import { UIIcon } from './UIIcon'
import { WatchStats } from './WatchStats'
import type { WatchStats as VideoWatchStats } from '../lib/watchHistory'

interface ProfileCardProps {
  progression: Progression
  onUpdateProfile: (name: string, avatar: ProfileAvatar) => Promise<boolean>
  showMilestones: boolean
  watchStats?: VideoWatchStats
}
const AVATAR_LABELS: Record<ProfileAvatar, string> = { leaf: 'Little leaf', book: 'Open book', moon: 'Night owl', coffee: 'Coffee break' }

function ProfileCardInner({ progression, onUpdateProfile, showMilestones, watchStats }: ProfileCardProps) {
  const { t, text, language } = useLanguage()
  const level = useMemo(() => progressionLevel(progression), [progression])
  const milestones = useMemo(() => progressionMilestones(progression), [progression])
  const [nameDraft, setNameDraft] = useState(progression.name)
  const [avatarDraft, setAvatarDraft] = useState(progression.avatar)
  const [saveMessage, setSaveMessage] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setNameDraft(progression.name); setAvatarDraft(progression.avatar) }, [progression.name, progression.avatar])
  const seconds = Math.floor(totalStudyMilliseconds(progression) / 1000)
  const studiedHours = Math.floor(seconds / 3600)
  const studiedMinutes = Math.floor(seconds % 3600 / 60)
  const studiedSeconds = seconds % 60
  const streak = currentCheckInStreak(progression)
  const earnedCount = milestones.filter(item => item.earned).length

  return (
    <section className="profile-panel" aria-label={t("Your study profile")}>
      <header className="profile-heading">
        <span className="profile-avatar"><UIIcon name={progression.avatar} size={28} /></span>
        <div><p className="surface-label">{t("Your study profile")}</p><h2>{progression.name || t("Study friend")}</h2></div>
      </header>
      <div className="profile-level-card">
        <div className="profile-level-heading"><h3><UIIcon name="sparkles" size={20} />{t('Level {level}', { level: level.level })}</h3><span>{t('{xp} XP total', { xp: level.totalXP.toLocaleString(language) })}</span></div>
        <div className="profile-xp-caption"><span>{level.earned} / {level.required} XP</span><span>{t('{xp} to level {level}', { xp: level.remaining, level: level.level + 1 })}</span></div>
        <div className="profile-xp-track" role="progressbar" aria-label={t("Experience toward the next level")}
          aria-valuemin={0} aria-valuemax={level.required} aria-valuenow={level.earned}
          aria-valuetext={t('{earned} of {required} XP toward level {level}', { earned: level.earned, required: level.required, level: level.level + 1 })}>
          <span style={{ width: `${level.earned / level.required * 100}%` }} />
        </div>
        <p className="profile-encouragement">{t("Every small session is a step forward.")}</p>
      </div>
      <div className="profile-totals">
        <div className="profile-study-total">
          <span className="profile-study-heading"><UIIcon name="timer" size={17} />{t("Total time studied")}</span>
          <strong>{studiedHours.toLocaleString(language)}<span className="study-time-unit">{studiedHours === 1 ? t("hour") : t("hours")}</span>{studiedMinutes}<span className="study-time-unit">{t("min")}</span>{studiedSeconds}<span className="study-time-unit">{t("sec")}</span></strong>
          <span>{t("Time with your focus timer running, including unfinished sessions")}</span>
        </div>
        <div><UIIcon name="check" size={17} /><strong>{progression.taskClaims.length}</strong><span>{t("Tasks completed")}</span></div>
        <div><UIIcon name="flame" size={17} /><strong>{t(streak === 1 ? '{count} day' : '{count} days', { count: streak })}</strong><span>{t('Check-in streak · best {count}', { count: progression.bestStreak })}</span></div>
      </div>
      {watchStats && <WatchStats stats={watchStats} />}
      {showMilestones && <>
      <div className="profile-milestone-heading"><h3 className="section-heading"><UIIcon name="award" size={17} />{t("Milestones")}</h3><span>{earnedCount} / {milestones.length}</span></div>
      <ul className="profile-milestones" aria-label={t("Study milestones")}>
        {milestones.map(item => <li key={item.id} className={item.earned ? 'earned' : ''}>
          <span className="milestone-icon"><UIIcon name={item.earned ? 'award' : 'leaf'} size={19} /></span>
          <div><h4>{text(item.title)}</h4><p>{text(item.description)}</p><span className="milestone-progress">{item.earned ? t("Earned") : `${Math.min(item.current, item.target)} / ${item.target}`}</span></div>
        </li>)}
      </ul>
      </>}
      <details className="profile-disclosure">
        <summary><span>{t("How to earn XP")}</span><UIIcon name="chevron" size={16} /></summary>
        <dl className="profile-xp-rules">
          <div><dt>{t("Focus sessions")}</dt><dd>{t('{xp} XP per saved focus minute. Your available study history counts too.', { xp: XP_RULES.studyMinute })}</dd></div>
          <div><dt>{t("Finish a task")}</dt><dd>{t('{xp} XP the first time you check it off. Reopening or restoring the same task keeps its original credit.', { xp: XP_RULES.task })}</dd></div>
          <div><dt>{t("Daily check-in")}</dt><dd>{t('{xp} XP, plus 1 for each extra consecutive day, up to {max} XP per day.', { xp: XP_RULES.checkIn, max: XP_RULES.checkIn + XP_RULES.streakMaxBonus })}</dd></div>
        </dl>
        <p className="profile-note">{t(showMilestones ? 'The first level-up takes 100 XP. Each later level takes 50 more. Breaks and reset timers give no XP. Your earned levels and milestones stay with you when a streak ends.' : 'The first level-up takes 100 XP. Each later level takes 50 more. Breaks and reset timers give no XP. Your earned levels stay with you when a streak ends.')}</p>
      </details>
      <details className="profile-disclosure">
        <summary><span>{t("Edit profile")}</span><UIIcon name="chevron" size={16} /></summary>
        <form onSubmit={async event => {
          event.preventDefault()
          setSaving(true)
          setSaveMessage('')
          const trimmedName = nameDraft.trim()
          try {
            const saved = await onUpdateProfile(trimmedName, avatarDraft)
            setSaveMessage(saved ? 'Profile saved.' : 'Profile updated for this session.')
          } finally { setSaving(false) }
        }} className="profile-editor">
          <label className="task-field"><span>{t("Display name (optional)")}</span><input aria-label={t("Profile display name")} disabled={saving} maxLength={32} value={nameDraft} placeholder={t("Study friend")}
            onChange={event => { setNameDraft(event.target.value); setSaveMessage('') }} /></label>
          <fieldset disabled={saving} className="profile-avatar-choices"><legend>{t("Choose an avatar")}</legend><div>
            {PROFILE_AVATARS.map(avatar => <button type="button" key={avatar} aria-label={text(AVATAR_LABELS[avatar])} aria-pressed={avatarDraft === avatar}
              onClick={() => { setAvatarDraft(avatar); setSaveMessage('') }}><UIIcon name={avatar} size={23} /></button>)}
          </div></fieldset>
          <button type="submit" disabled={saving} className="primary-button">{saving ? t("Saving…") : t("Save profile")}</button>
          {saveMessage && <p role="status" className="profile-note">{text(saveMessage)}</p>}
        </form>
      </details>
      <p className="profile-note profile-local-note">{t("Saved on this device. Build your own rhythm.")}</p>
    </section>
  )
}

export const ProfileCard = memo(ProfileCardInner)
