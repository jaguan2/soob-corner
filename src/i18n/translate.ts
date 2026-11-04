import { en, type MessageKey, type Messages } from './en'
import { zhCN } from './zh-CN'
import { ko } from './ko'
import { es } from './es'
import { ja } from './ja'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
] as const
export type Language = typeof LANGUAGES[number]['code']
export type MessageValues = Record<string, string | number>
export type Translate = (key: MessageKey, values?: MessageValues) => string
export const dictionaries: Record<Language, Messages> = { en, 'zh-CN': zhCN, ko, es, ja }
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some(item => item.code === value)
export const isMessageKey = (value: string): value is MessageKey => Object.prototype.hasOwnProperty.call(en, value)

export function translate(language: Language, key: MessageKey, values: MessageValues = {}): string {
  return dictionaries[language][key].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
}

/** Only app-owned dynamic copy (such as milestone descriptions) uses this lookup. */
export function translateText(language: Language, text: string): string {
  return isMessageKey(text) ? translate(language, text) : text
}
