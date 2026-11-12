import { useLanguage } from '../i18n/useLanguage'
import type { Theme } from '../lib/theme'
import { ThemeSwitcher } from './ThemeSwitcher'

export interface AppearancePanelProps {
  theme: Theme
  onSetTheme: (theme: Theme) => void
  customColor: string
  onSetCustomColor: (color: string) => void
  opacity: number
  onSetOpacity: (value: number) => void
}

export function AppearancePanel({ opacity, onSetOpacity, ...themeProps }: AppearancePanelProps) {
  const { t } = useLanguage()
  return (
    <section className="appearance-settings" aria-label={t("Appearance settings")}>
      <div>
        <p className="surface-label">{t("Color palette")}</p>
        <ThemeSwitcher {...themeProps} expanded />
      </div>
      {themeProps.theme === 'custom' && <label className="appearance-hex">
        <span className="surface-label">{t("Custom color")}</span>
        <input aria-label={t("Custom theme hex color")} type="text" defaultValue={themeProps.customColor} key={themeProps.customColor}
          maxLength={7} spellCheck={false} placeholder="#8AA5C8"
          onBlur={event => {
            if (/^#[0-9a-f]{6}$/i.test(event.target.value)) themeProps.onSetCustomColor(event.target.value)
            else event.target.value = themeProps.customColor
          }}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
      </label>}
      <label className="appearance-opacity">
        <span className="surface-label">{t("Panel opacity")} <output>{opacity}%</output></span>
        <input aria-label={t("Panel opacity")} type="range" min={65} max={100} step={1} value={opacity} onChange={event => onSetOpacity(Number(event.target.value))} />
        <span className="appearance-range-labels"><span>{t("Frosted")}</span><span>{t("Solid")}</span></span>
      </label>
    </section>
  )
}
