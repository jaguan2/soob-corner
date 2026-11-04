import { useLanguage } from '../i18n/useLanguage'
import { useId, useRef, type ReactNode } from 'react'
import { STUDY_TOOLS, type StudyToolId } from '../lib/workspace'
import { UIIcon } from './UIIcon'
import { tabDestination } from '../lib/keyboardNavigation'

interface StudyToolsProps {
  active: StudyToolId
  onSelect: (id: StudyToolId) => void
  hidden: boolean
  panels: Record<StudyToolId, ReactNode>
  timerLabel: string
  timerRunning: boolean
}

/** Hidden panels stay mounted so timers, edits and audio survive navigation. */
export function StudyTools({ active, onSelect, hidden, panels, timerLabel, timerRunning }: StudyToolsProps) {
  const { t } = useLanguage()
  const helpId = useId()
  const tabList = useRef<HTMLDivElement>(null)
  return (
    <aside id="workspace-tools" tabIndex={-1} className="workspace-dock" hidden={hidden} aria-label={t("Study tools")}>
      <p id={helpId} className="sr-only">{t("Use Left and Right arrows to switch tools, Home or End to jump, and Tab to enter the selected panel.")}</p>
      <div ref={tabList} className="tool-tabs" role="tablist" aria-label={t("Study tools")} aria-describedby={helpId}>
        {STUDY_TOOLS.map(tool => <button key={tool.id} id={`tab-${tool.id}`} role="tab"
          tabIndex={active === tool.id ? 0 : -1}
          aria-selected={active === tool.id} aria-controls={`tool-${tool.id}`}
          onKeyDown={event => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
            const index = STUDY_TOOLS.findIndex(item => item.id === tool.id)
            const next = tabDestination(event.key, index, STUDY_TOOLS.length)
            if (next === null) return
            event.preventDefault()
            const destination = STUDY_TOOLS[next]
            onSelect(destination.id)
            const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
            buttons?.[next]?.focus()
          }}
          onClick={() => onSelect(tool.id)} className={'tool-tab' + (active === tool.id ? ' selected' : '')}>
          <UIIcon name={tool.icon} size={17} /><span>{t(tool.label)}</span>
        </button>)}
      </div>
      <div className="tool-body scrollbar-thin">
        {STUDY_TOOLS.map(tool => <div key={tool.id} role="tabpanel" id={`tool-${tool.id}`}
          aria-labelledby={`tab-${tool.id}`} tabIndex={0} hidden={active !== tool.id}>{panels[tool.id]}</div>)}
      </div>
      {active !== 'timer' && <div className="dock-timer"><button onClick={() => {
        onSelect('timer')
        tabList.current?.querySelector<HTMLButtonElement>('#tab-timer')?.focus()
      }} title={t("Open timer")}>
        <UIIcon name="timer" size={16} /><span>{timerLabel}</span>
        <span className="timer-status">{timerRunning ? t("Running") : t("Open timer")}</span>
      </button></div>}
    </aside>
  )
}
