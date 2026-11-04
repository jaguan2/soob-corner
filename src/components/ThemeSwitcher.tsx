import { useLanguage } from '../i18n/useLanguage'
import { handleButtonArrows } from '../lib/keyboardNavigation'
import type { Theme } from '../lib/theme'
import { UIIcon, type UIIconName } from './UIIcon'
import type { MessageKey } from '../i18n/en'

const THEMES: { value: Theme; label: MessageKey; icon: UIIconName }[] = [
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
  const { t } = useLanguage()
  return (
    <div className={'theme-switcher' + (expanded ? ' expanded' : '')} role="group" aria-label={t("Color theme")} onKeyDown={handleButtonArrows}>
      {THEMES.map((option) => (
        <button
          key={option.value}
          onClick={() => onSetTheme(option.value)}
          aria-label={t('{theme} theme', { theme: t(option.label) })}
          aria-pressed={theme === option.value}
          title={t(option.label)}
          className={'theme-option' + (theme === option.value ? ' selected' : '')}
        >
          <UIIcon name={option.icon} size={16} />
          {expanded && <span>{t(option.label)}</span>}
        </button>
      ))}
      {/* Clicking the swatch both selects the custom theme and opens the OS
          colour picker, so it's one control rather than two. */}
      <label
        onClick={() => onSetTheme('custom')}
        title={t("Custom colour — pick your own")}
        className={'theme-option theme-custom' + (theme === 'custom' ? ' selected' : '')}
      >
        <span
          className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink-900/20"
          style={{ background: customColor }}
        />
        {expanded && <span>{t("Custom")}</span>}
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            onSetCustomColor(e.target.value)
            onSetTheme('custom')
          }}
          aria-label={t("Custom colour theme")}
          className="theme-color-input"
        />
      </label>
    </div>
  )
}
