import type { Theme } from '../lib/theme'
import { UIIcon, type UIIconName } from './UIIcon'

const THEMES: { value: Theme; label: string; icon: UIIconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'coffee', label: 'Cafe', icon: 'coffee' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
]

interface ThemeSwitcherProps {
  theme: Theme
  onSetTheme: (theme: Theme) => void
  customColor: string
  onSetCustomColor: (hex: string) => void
  expanded?: boolean
}

/** Theme controls shared by the welcome and dock Settings views. */
export function ThemeSwitcher({ theme, onSetTheme, customColor, onSetCustomColor, expanded = false }: ThemeSwitcherProps) {
  return (
    <div className={'theme-switcher' + (expanded ? ' expanded' : '')} role="group" aria-label="Color theme">
      {THEMES.map((t) => (
        <button
          key={t.value}
          onClick={() => onSetTheme(t.value)}
          aria-label={`${t.label} theme`}
          aria-pressed={theme === t.value}
          title={t.label}
          className={'theme-option' + (theme === t.value ? ' selected' : '')}
        >
          <UIIcon name={t.icon} size={16} />
          {expanded && <span>{t.label}</span>}
        </button>
      ))}
      {/* Clicking the swatch both selects the custom theme and opens the OS
          colour picker, so it's one control rather than two. */}
      <label
        onClick={() => onSetTheme('custom')}
        title="Custom colour — pick your own"
        className={'theme-option theme-custom' + (theme === 'custom' ? ' selected' : '')}
      >
        <span
          className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink-900/20"
          style={{ background: customColor }}
        />
        {expanded && <span>Custom</span>}
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            onSetCustomColor(e.target.value)
            onSetTheme('custom')
          }}
          aria-label="Custom colour theme"
          className="theme-color-input"
        />
      </label>
    </div>
  )
}
