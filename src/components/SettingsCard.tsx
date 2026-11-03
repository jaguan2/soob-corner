import { useId } from 'react'
import { AppearancePanel, type AppearancePanelProps } from './AppearancePanel'
import { UIIcon } from './UIIcon'

interface SettingsCardProps extends AppearancePanelProps {
  showMilestones: boolean
  onSetShowMilestones: (value: boolean) => void
  singleKeyShortcuts: boolean
  onSetSingleKeyShortcuts: (value: boolean) => void
}

export function SettingsCard({ showMilestones, onSetShowMilestones, singleKeyShortcuts, onSetSingleKeyShortcuts, ...appearance }: SettingsCardProps) {
  const milestonesDescription = useId()
  const shortcutsDescription = useId()
  return (
    <section className="settings-panel" aria-label="App settings">
      <header>
        <h2 className="section-heading"><UIIcon name="settings" />Settings</h2>
        <p className="settings-caption">Make this space feel like yours.</p>
      </header>
      <div className="settings-section">
        <h3 className="section-heading"><UIIcon name="palette" size={16} />Appearance</h3>
        <AppearancePanel {...appearance} />
      </div>
      <div className="settings-section">
        <h3 className="section-heading"><UIIcon name="user" size={16} />Profile</h3>
        <label className="settings-toggle">
          <span><span className="settings-toggle-title">Show milestones</span>
            <span id={milestonesDescription} className="settings-caption">Display milestone cards in your profile. Your progress stays saved when hidden.</span>
          </span>
          <input type="checkbox" role="switch" aria-label="Show milestones" aria-describedby={milestonesDescription}
            checked={showMilestones} onChange={event => onSetShowMilestones(event.target.checked)} />
        </label>
      </div>
      <div className="settings-section">
        <h3 className="section-heading"><UIIcon name="keyboard" size={16} />Accessibility</h3>
        <label className="settings-toggle">
          <span><span className="settings-toggle-title">Single-key shortcuts</span>
            <span id={shortcutsDescription} className="settings-caption">Enable Space, F, M, T and Z shortcuts. Escape and arrow navigation stay available.</span>
          </span>
          <input type="checkbox" role="switch" aria-label="Single-key shortcuts" aria-describedby={shortcutsDescription}
            checked={singleKeyShortcuts} onChange={event => onSetSingleKeyShortcuts(event.target.checked)} />
        </label>
        <details className="keyboard-help">
          <summary>Keyboard controls</summary>
          <dl>
            <div><dt>Tab / Shift+Tab</dt><dd>Move between controls.</dd></div>
            <div><dt>Enter / Space</dt><dd>Activate the focused control.</dd></div>
            <div><dt>Left / Right</dt><dd>Switch tools or move through button groups.</dd></div>
            <div><dt>Arrows on video cards</dt><dd>Move between videos. Home / End jumps to the first / last.</dd></div>
            <div><dt>Up / Down on the timer</dt><dd>Add / remove one minute.</dd></div>
            <div><dt>Escape</dt><dd>Close the current editor or disclosure first, then return to video selection.</dd></div>
            <div><dt>F / M / T / Z</dt><dd>Fullscreen / mute / timer / Zen, when shortcuts are enabled.</dd></div>
          </dl>
        </details>
      </div>
      <p className="settings-caption settings-local-note">Preferences save automatically on this device.</p>
    </section>
  )
}
