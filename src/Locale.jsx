import React, { createContext, useContext, useEffect } from 'react';
import { useSavedState } from './storage.js';
import english from './translations.json';

const LocaleContext = createContext(null);
export function LocaleProvider({ children }) {
  const [language, setLanguage] = useSavedState('language', navigator.language?.startsWith('id') ? 'id' : 'en');
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const t = text => language === 'en' ? (english[text] ?? text) : text;
  return <LocaleContext.Provider value={{ language, setLanguage, t }}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext);
