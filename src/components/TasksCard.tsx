import { useLanguage } from '../i18n/useLanguage'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  clampTaskDuration, isTaskOrder, movePlannedTask, normalizePlannedTask,
  orderTasks, plannedMinutes, restoreRemovedTasks,
  type PlannedTask, type TaskOrder, type TaskPriority,
} from '../lib/taskPlanning'
import { storageGet, storageGetJson, storageSet, storageSetJson } from '../lib/storage'
import { UIIcon } from './UIIcon'

const TASKS_KEY = 'sws.tasks'
const ORDER_KEY = 'sws.tasks.order'
const ACTIVE_KEY = 'sws.tasks.active'
const ORDER_OPTIONS: { value: TaskOrder; label: string }[] = [
  { value: 'custom', label: 'My order' },
  { value: 'shortest', label: 'Quick wins' },
  { value: 'priority', label: 'Priority' },
]

export type Task = PlannedTask
interface TaskDraft { text: string; duration: string; priority: TaskPriority }
interface Removal { before: Task[]; ids: string[]; activeId: string | null }

function loadTasks(): Task[] {
  const raw = storageGetJson<unknown>(TASKS_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.flatMap(value => {
    const task = normalizePlannedTask(value)
    return task ? [task] : []
  })
}
function loadOrder(): TaskOrder {
  const value = storageGet(ORDER_KEY)
  return isTaskOrder(value) ? value : 'custom'
}
function taskId(): string {
  try { return crypto.randomUUID() }
  catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

interface TasksCardProps { onUseDuration: (seconds: number) => void; onTaskCompleted: (id: string) => void }

function TasksCardInner({ onUseDuration, onTaskCompleted }: TasksCardProps) {
  const { t, text } = useLanguage()
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [draft, setDraft] = useState('')
  const [duration, setDuration] = useState('25')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [order, setOrder] = useState<TaskOrder>(loadOrder)
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = storageGet(ACTIVE_KEY)
    return tasks.some(task => task.id === saved && !task.done) ? saved : null
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const previousEditor = useRef<string | null>(null)
  useEffect(() => {
    if (previousEditor.current && !editingId) document.getElementById(`task-edit-${previousEditor.current}`)?.focus()
    previousEditor.current = editingId
  }, [editingId])
  const [editDraft, setEditDraft] = useState<TaskDraft>({ text: '', duration: '25', priority: 'medium' })
  const [editError, setEditError] = useState('')
  const [removal, setRemoval] = useState<Removal | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // One guarded persistence path; React state updaters stay pure in StrictMode.
  useEffect(() => { storageSetJson(TASKS_KEY, tasks) }, [tasks])
  useEffect(() => { storageSet(ORDER_KEY, order) }, [order])
  useEffect(() => { storageSet(ACTIVE_KEY, activeId ?? '') }, [activeId])

  const ordered = useMemo(() => orderTasks(tasks, order), [tasks, order])
  const todo = ordered.filter(task => !task.done)
  const done = ordered.filter(task => task.done)
  const minutesLeft = plannedMinutes(tasks)
  const completion = tasks.length ? Math.round(done.length / tasks.length * 100) : 0

  const addTask = () => {
    const text = draft.trim()
    if (!text) return
    const task: Task = {
      id: taskId(), text, done: false, duration: clampTaskDuration(duration || 25), priority, completedAt: null,
    }
    setTasks(previous => [...previous, task])
    setDraft('')
    inputRef.current?.focus()
  }
  const toggleTask = (task: Task) => {
    const nextDone = !task.done
    const completedAt = nextDone ? new Date().toISOString() : null
    setTasks(previous => previous.map(item => item.id === task.id ? { ...item, done: nextDone, completedAt } : item))
    if (nextDone && activeId === task.id) setActiveId(null)
    if (nextDone) onTaskCompleted(task.id)
  }
  const beginEdit = (task: Task) => {
    setEditingId(task.id)
    setEditDraft({ text: task.text, duration: String(task.duration), priority: task.priority })
    setEditError('')
  }
  const saveEdit = (task: Task) => {
    const text = editDraft.text.trim()
    if (!text) { setEditError('Give this task a name.'); return }
    const nextDuration = clampTaskDuration(editDraft.duration || 25)
    setTasks(previous => previous.map(item => item.id === task.id
      ? { ...item, text, duration: nextDuration, priority: editDraft.priority } : item))
    if (activeId === task.id && nextDuration !== task.duration) setActiveId(null)
    setEditingId(null)
  }
  const removeTasks = (ids: string[]) => {
    setRemoval({ before: tasks, ids, activeId: activeId && ids.includes(activeId) ? activeId : null })
    setTasks(previous => previous.filter(task => !ids.includes(task.id)))
    if (activeId && ids.includes(activeId)) setActiveId(null)
    if (editingId && ids.includes(editingId)) setEditingId(null)
  }
  const undoRemoval = () => {
    if (!removal) return
    setTasks(previous => restoreRemovedTasks(previous, removal.before, removal.ids))
    if (!activeId && removal.activeId) setActiveId(removal.activeId)
    setRemoval(null)
  }

  const renderTask = (task: Task, index: number) => {
    const active = activeId === task.id && !task.done
    return <li key={task.id} className={'checklist-task group' + (task.done ? ' is-done' : '') + (active ? ' is-active' : '')}>
      {editingId === task.id ? <form className="task-editor" onSubmit={event => { event.preventDefault(); saveEdit(task) }}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setEditingId(null) } }}>
        <label className="task-field"><span>{t("Task name")}</span><input autoFocus aria-label={t("Edit task name")} value={editDraft.text} maxLength={200} required
          onChange={event => { setEditDraft({ ...editDraft, text: event.target.value }); setEditError('') }} /></label>
        <TaskOptions duration={editDraft.duration} priority={editDraft.priority}
          onDuration={value => setEditDraft({ ...editDraft, duration: value })}
          onPriority={value => setEditDraft({ ...editDraft, priority: value })} prefix="Edit" />
        {editError && <p role="alert" className="task-error">{text(editError)}</p>}
        <div className="task-editor-actions"><button type="submit" className="primary-button">{t("Save")}</button><button type="button" onClick={() => setEditingId(null)} className="workspace-button">{t("Cancel")}</button></div>
      </form> : <>
        <div className="checklist-task-main">
          <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)}
            aria-label={t(task.done ? 'Mark {task} not done' : 'Mark {task} done', { task: task.text })} className="task-checkbox" />
          <span className="task-name">{task.text}</span>
          <div className="task-row-actions">
            <button id={`task-edit-${task.id}`} onClick={() => beginEdit(task)} aria-label={t('Edit {task}', { task: task.text })} title={t("Edit task")} className="task-delete hover-reveal"><UIIcon name="edit" size={15} /></button>
            <button onClick={() => removeTasks([task.id])} aria-label={t('Delete {task}', { task: task.text })} title={t("Delete task")} className="task-delete hover-reveal"><UIIcon name="close" size={15} /></button>
          </div>
        </div>
        {!task.done && <div className="checklist-task-meta">
          <span>{task.duration} {t("min")}</span><span className="task-priority" data-priority={task.priority}>{t(task.priority === 'low' ? 'Low' : task.priority === 'high' ? 'High' : 'Medium')}</span>
          <div className="task-secondary-actions">
            {order === 'custom' && todo.length > 1 && <>
              <button onClick={() => setTasks(previous => movePlannedTask(previous, task.id, -1))} disabled={index === 0} aria-label={t('Move {task} up', { task: task.text })} title={t("Move up")}><UIIcon name="up" size={14} /></button>
              <button onClick={() => setTasks(previous => movePlannedTask(previous, task.id, 1))} disabled={index === todo.length - 1} aria-label={t('Move {task} down', { task: task.text })} title={t("Move down")}><UIIcon name="down" size={14} /></button>
            </>}
            <button onClick={() => { setActiveId(task.id); onUseDuration(task.duration * 60) }} aria-label={t('Focus on {task}', { task: task.text })} title={t('Load {minutes} minutes into the timer', { minutes: task.duration })} className="task-focus"><UIIcon name="timer" size={13} /><span>{active ? t("Loaded") : t("Focus")}</span></button>
          </div>
        </div>}
      </>}
    </li>
  }

  return (
    <section className="study-plan checklist-panel" aria-label={t("To-do list")}>
      <header className="checklist-heading"><h2 className="section-heading"><UIIcon name="tasks" />{t("Your tasks")}</h2><span>{t('{count} to do', { count: todo.length })}</span></header>
      <p className="checklist-intro">{t("Write it down. Take it one task at a time.")}</p>
      <form className="task-add-form" onSubmit={event => { event.preventDefault(); addTask() }}>
        <div className="task-add-row"><input ref={inputRef} aria-label={t("New task")} value={draft} maxLength={200} onChange={event => setDraft(event.target.value)} placeholder={t("Add a task…")} />
          <button type="submit" disabled={!draft.trim()} className="primary-button" aria-label={t("Add task")} title={t("Add task")}><UIIcon name="plus" size={17} /><span>{t("Add")}</span></button></div>
        <details className="task-add-options"><summary><span>{t("Estimate & priority")}</span><UIIcon name="chevron" size={14} /></summary>
          <TaskOptions duration={duration} priority={priority} onDuration={setDuration} onPriority={setPriority} prefix="New" />
        </details>
      </form>
      {tasks.length > 0 && <div className="checklist-progress">
        <span>{t('{done} of {total} completed', { done: done.length, total: tasks.length })}</span><span>{completion}%</span>
        <div role="progressbar" aria-label={t("Task completion")} aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completion}%` }} /></div>
      </div>}
      {todo.length > 1 && <label className="task-sort"><span>{t("Arrange by")}</span><select aria-label={t("Task order")} value={order} onChange={event => setOrder(event.target.value as TaskOrder)}>
        {ORDER_OPTIONS.map(option => <option key={option.value} value={option.value}>{text(option.label)}</option>)}
      </select></label>}
      {todo.length > 0 ? <ul className="checklist-list" aria-label={t("Tasks to do")}>{todo.map(renderTask)}</ul>
        : <div className="plan-empty"><span className="plan-empty-icon"><UIIcon name={done.length ? 'check' : 'tasks'} size={24} /></span>
          <p>{done.length ? t("All tasks checked off.") : t("A fresh start.")}</p><span>{done.length ? t("Enjoy a little breathing room.") : t("Add your first task above. Press Enter to keep adding.")}</span></div>}
      {done.length > 0 && <details className="completed-tasks"><summary><span>{t('Completed ({count})', { count: done.length })}</span><UIIcon name="chevron" size={16} /></summary>
        <ul className="checklist-list" aria-label={t("Completed tasks")}>{done.map(renderTask)}</ul>
        <button onClick={() => removeTasks(done.map(task => task.id))} className="text-action task-clear">{t("Clear completed")}</button>
      </details>}
      {minutesLeft > 0 && <p className="task-plan-total">{t("{minutes} min planned · choose Focus to load a task's timer", { minutes: minutesLeft })}</p>}
      {removal && <div className="task-undo" role="status"><span>{removal.ids.length === 1 ? t("Task removed.") : t('{count} tasks removed.', { count: removal.ids.length })}</span><button onClick={undoRemoval}>{t("Undo")}</button></div>}
    </section>
  )
}

interface TaskOptionsProps {
  duration: string; priority: TaskPriority; onDuration: (value: string) => void
  onPriority: (value: TaskPriority) => void; prefix: 'New' | 'Edit'
}
function TaskOptions({ duration, priority, onDuration, onPriority, prefix }: TaskOptionsProps) {
  const { t } = useLanguage()
  return <div className="task-option-fields">
    <label className="task-field"><span>{t("Estimate (min)")}</span><input type="number" min={1} max={720} step={1} aria-label={t(`${prefix} task estimated minutes`)} value={duration} onChange={event => onDuration(event.target.value)} /></label>
    <label className="task-field"><span>{t("Priority")}</span><select aria-label={t(`${prefix} task priority`)} value={priority} onChange={event => onPriority(event.target.value as TaskPriority)}>
      <option value="low">{t("Low")}</option><option value="medium">{t("Medium")}</option><option value="high">{t("High")}</option>
    </select></label>
  </div>
}

export const TasksCard = memo(TasksCardInner)
