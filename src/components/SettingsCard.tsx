import { useLanguage } from '../i18n/useLanguage'
import { useId } from 'react'
import { AppearancePanel, type AppearancePanelProps } from './AppearancePanel'
import { UIIcon } from './UIIcon'
import { isLanguage, LANGUAGES } from '../i18n/translate'

interface SettingsCardProps extends AppearancePanelProps {
  showMilestones: boolean
  onSetShowMilestones: (value: boolean) => void
  singleKeyShortcuts: boolean
  onSetSingleKeyShortcuts: (value: boolean) => void
}

export function SettingsCard({ showMilestones, onSetShowMilestones, singleKeyShortcuts, onSetSingleKeyShortcuts, ...appearance }: SettingsCardProps) {
  const { t, language, setLanguage } = useLanguage()
  const languageId = useId()
  const milestonesDescription = useId()
  const shortcutsDescription = useId()
  return (
    <section className="settings-panel" aria-label={t("App settings")}>
      <header>
        <h2 className="section-heading"><UIIcon name="settings" />{t("Settings")}</h2>
        <p className="settings-caption">{t("Make this space feel like yours.")}</p>
      </header>
      <div className="settings-section">
        <label className="surface-label" htmlFor={languageId}>{t('App language')}</label>
        <select id={languageId} className="language-select" value={language} onChange={event => {
          if (isLanguage(event.target.value)) setLanguage(event.target.value)
        }}>
          {LANGUAGES.map(item => <option key={item.code} value={item.code} lang={item.code}>{item.label}</option>)}
        </select>
        <p className="settings-caption">{t('Choose the language for the interface. Video titles and subtitles keep their own language.')}</p>
      </div>
      <div className="settings-section">
        <h3 className="section-heading"><UIIcon name="palette" size={16} />{t("Appearance")}</h3>
        <AppearancePanel {...appearance} />
      </div>
      <div className="settings-section">
        <h3 className="section-heading"><UIIcon name="user" size={16} />{t("Profile")}</h3>
        <label className="settings-toggle">
          <span><span className="settings-toggle-title">{t("Show milestones")}</span>
            <span id={milestonesDescription} className="settings-caption">{t("Display milestone cards in your profile. Your progress stays saved when hidden.")}</span>
          </span>
          <input type="checkbox" role="switch" aria-label={t("Show milestones")} aria-describedby={milestonesDescription}
            checked={showMilestones} onChange={event => onSetShowMilestones(event.target.checked)} />
        </label>
      </div>
      <div className="settings-section">
        <h3 className="section-heading"><UIIcon name="keyboard" size={16} />{t("Accessibility")}</h3>
        <label className="settings-toggle">
          <span><span className="settings-toggle-title">{t("Single-key shortcuts")}</span>
            <span id={shortcutsDescription} className="settings-caption">{t("Enable Space, F, M, T and Z shortcuts. Escape and arrow navigation stay available.")}</span>
          </span>
          <input type="checkbox" role="switch" aria-label={t("Single-key shortcuts")} aria-describedby={shortcutsDescription}
            checked={singleKeyShortcuts} onChange={event => onSetSingleKeyShortcuts(event.target.checked)} />
        </label>
        <details className="keyboard-help">
          <summary>{t("Keyboard controls")}</summary>
          <dl>
            <div><dt>Tab / Shift+Tab</dt><dd>{t("Move between controls.")}</dd></div>
            <div><dt>Enter / Space</dt><dd>{t("Activate the focused control.")}</dd></div>
            <div><dt>Left / Right</dt><dd>{t("Switch tools or move through button groups.")}</dd></div>
            <div><dt>{t("Arrows on video cards")}</dt><dd>{t("Move between videos. Home / End jumps to the first / last.")}</dd></div>
            <div><dt>{t("Up / Down on the timer")}</dt><dd>{t("Add / remove one minute.")}</dd></div>
            <div><dt>Escape</dt><dd>{t("Close the current editor or disclosure first, then return to video selection.")}</dd></div>
            <div><dt>F / M / T / Z</dt><dd>{t("Fullscreen / mute / timer / Zen, when shortcuts are enabled.")}</dd></div>
          </dl>
        </details>
      </div>
      <p className="settings-caption settings-local-note">{t("Preferences save automatically on this device.")}</p>
    </section>
  )
}
