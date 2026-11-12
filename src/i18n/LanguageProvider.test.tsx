import { useState } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from './LanguageProvider'
import { useLanguage } from './useLanguage'
import type { Language } from './translate'

let root: ReactTestRenderer | undefined
let values: Map<string, string>
let languageApi: ReturnType<typeof useLanguage>
let element: { lang: string }
function Draft() {
  languageApi = useLanguage()
  const [draft, setDraft] = useState('')
  return <><h1>{languageApi.t('Settings')}</h1><input value={draft} onChange={event => setDraft(event.target.value)} /></>
}
function mount() { act(() => { root = create(<LanguageProvider><Draft /></LanguageProvider>) }) }
beforeEach(() => {
  values = new Map()
  element = { lang: 'en' }
  vi.stubGlobal('document', { documentElement: element })
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
  vi.unstubAllGlobals()
})

describe('saved interface language', () => {
  it('defaults safely, updates the document language, persists, and retains mounted drafts', () => {
    values.set('sws.language', 'invalid')
    mount()
    expect(languageApi.language).toBe('en')
    act(() => root!.root.findByType('input').props.onChange({ target: { value: 'My own text' } }))
    act(() => languageApi.setLanguage('es'))
    expect(root!.root.findByType('h1').children).toEqual(['Ajustes'])
    expect(root!.root.findByType('input').props.value).toBe('My own text')
    expect(element.lang).toBe('es')
    expect(values.get('sws.language')).toBe('es')
    act(() => languageApi.setLanguage('ja'))
    expect(root!.root.findByType('h1').children).toEqual(['設定'])
    expect(root!.root.findByType('input').props.value).toBe('My own text')
    expect(element.lang).toBe('ja')
    expect(values.get('sws.language')).toBe('ja')
    act(() => languageApi.setLanguage('invalid' as Language))
    expect(languageApi.language).toBe('ja')
    act(() => root!.unmount())
    mount()
    expect(root!.root.findByType('h1').children).toEqual(['設定'])
  })

  it('loads a saved language and remains usable when storage is unavailable', () => {
    values.set('sws.language', 'ko')
    mount()
    expect(root!.root.findByType('h1').children).toEqual(['설정'])
    act(() => root!.unmount())
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    mount()
    act(() => languageApi.setLanguage('zh-CN'))
    expect(root!.root.findByType('h1').children).toEqual(['设置'])
    expect(element.lang).toBe('zh-CN')
  })
})
