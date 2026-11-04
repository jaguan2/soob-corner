import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storageGet, storageSet } from '../lib/storage'
import { LanguageContext } from './useLanguage'
import { isLanguage, translate, translateText, type Language, type Translate } from './translate'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setValue] = useState<Language>(() => {
    const saved = storageGet('sws.language')
    return isLanguage(saved) ? saved : 'en'
  })
  const setLanguage = useCallback((next: Language) => { if (isLanguage(next)) setValue(next) }, [])
  useEffect(() => {
    storageSet('sws.language', language)
    document.documentElement.lang = language
  }, [language])
  const t: Translate = useCallback((key, values) => translate(language, key, values), [language])
  const text = useCallback((message: string) => translateText(language, message), [language])
  const value = useMemo(() => ({ language, setLanguage, t, text }), [language, setLanguage, t, text])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
