import { useId } from 'react'
import { AppearancePanel, type AppearancePanelProps } from './AppearancePanel'
import { UIIcon } from './UIIcon'

interface SettingsCardProps extends AppearancePanelProps {
  showMilestones: boolean
  onSetShowMilestones: (value: boolean) => void
}

export function SettingsCard({ showMilestones, onSetShowMilestones, ...appearance }: SettingsCardProps) {
  const milestonesDescription = useId()
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
      <p className="settings-caption settings-local-note">Preferences save automatically on this device.</p>
    </section>
  )
}
