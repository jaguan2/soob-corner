import { createContext, useContext } from 'react'
import { translate, translateText, type Language, type Translate } from './translate'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Translate
  text: (message: string) => string
}
export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en', setLanguage: () => {},
  t: (key, values) => translate('en', key, values), text: message => translateText('en', message),
})

export const useLanguage = () => useContext(LanguageContext)
