import { describe, expect, it } from 'vitest'
import { dictionaries, isLanguage, LANGUAGES, translate, translateText } from './translate'
import { en, type MessageKey } from './en'

describe('interface translations', () => {
  it('supports the four requested languages with complete messages and matching placeholders', () => {
    const keys = Object.keys(en) as MessageKey[]
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
    expect(LANGUAGES.map(item => item.code)).toEqual(['en', 'zh-CN', 'ko', 'es'])
    for (const { code } of LANGUAGES) {
      expect(Object.keys(dictionaries[code]).sort()).toEqual([...keys].sort())
      for (const key of keys) {
        expect(dictionaries[code][key].trim(), `${code}: ${key}`).not.toBe('')
        expect(placeholders(dictionaries[code][key]), `${code}: ${key}`).toEqual(placeholders(en[key]))
      }
    }
    expect(['en', 'zh-CN', 'ko', 'es'].every(isLanguage)).toBe(true)
    expect([null, 'fr', 'zh', {}, 42].some(isLanguage)).toBe(false)
  })

  it('translates key controls and interpolates counts and user text once', () => {
    expect(translate('zh-CN', 'Settings')).toBe('设置')
    expect(translate('ko', 'Settings')).toBe('설정')
    expect(translate('es', 'Settings')).toBe('Ajustes')
    expect(translate('es', '{count} of {total} videos', { count: 2, total: 10 })).toBe('2 de 10 videos')
    expect(translate('ko', 'Edit {task}', { task: '<tag>{count}</tag>' })).toBe('<tag>{count}</tag> 수정')
    expect(translateText('zh-CN', 'First focus')).toBe('首次专注')
    expect(translateText('ko', 'User-owned title')).toBe('User-owned title')
  })
})
