import { useLanguage } from '../i18n/useLanguage'
import { memo } from 'react'
import { TXT_GROUP_SOCIALS, TXT_MEMBER_INSTAGRAMS } from '../data/social'
import { UIIcon } from './UIIcon'

function SocialCardInner() {
  const { t } = useLanguage()
  return (
    <section className="social-panel" aria-label={t("TXT social accounts")}>
      <header className="social-heading">
        <span className="social-mark"><UIIcon name="social" size={24} /></span>
        <div><p className="surface-label">{t("A little study break")}</p><h2>{t("Keep up with TXT")}</h2></div>
      </header>
      <p className="social-caption">{t("Find the group and your favorite members in one place.")}</p>

      <section className="social-group" aria-labelledby="social-group-heading">
        <h3 id="social-group-heading">{t("TXT together")}</h3>
        <p className="social-caption">{t("Group updates and posts from the members.")}</p>
        <div className="social-links">
          {TXT_GROUP_SOCIALS.map(account => (
            <a key={account.handle + account.icon} href={account.url} target="_blank" rel="noopener noreferrer" className="social-link" aria-label={t('Open TXT {label}, @{handle} (opens in a new tab)', { label: account.label, handle: account.handle })}>
              <UIIcon name={account.icon} size={20} />
              <span className="social-account-text"><span className="social-link-label">{account.label}</span><span className="social-handle">@{account.handle}</span></span>
              <UIIcon name="external" size={16} />
            </a>
          ))}
        </div>
      </section>

      <section className="social-members" aria-labelledby="social-members-heading">
        <h3 id="social-members-heading"><UIIcon name="instagram" size={17} />{t("Members on Instagram")}</h3>
        <div className="social-links">
          {TXT_MEMBER_INSTAGRAMS.map(member => (
            <a key={member.handle} href={member.url} target="_blank" rel="noopener noreferrer" className="social-link social-member" title={t('Open {name} on Instagram, @{handle} (opens in a new tab)', { name: member.name, handle: member.handle })}>
              <span className="social-initials" aria-hidden="true">{member.initials}</span>
              <span className="social-account-text"><span className="social-link-label">{member.name}</span><span className="social-handle">@{member.handle}</span></span>
              <UIIcon name="external" size={16} />
            </a>
          ))}
        </div>
      </section>
      <p className="social-browser-note"><UIIcon name="external" size={15} /><span>{t("Opens in your browser. Instagram and X may ask you to sign in.")}</span></p>
    </section>
  )
}

export const SocialCard = memo(SocialCardInner)
