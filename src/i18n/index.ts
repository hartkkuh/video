import i18n from 'i18next'

import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'

import he from './locales/he.json'

import { defaultAppSettings } from '../settings/settings'



export const defaultNS = 'translation'



export const resources = {

  en: { translation: en },

  he: { translation: he },

} as const



export type SupportedLanguage = keyof typeof resources



void i18n.use(initReactI18next).init({

  resources,

  lng: defaultAppSettings.language,

  fallbackLng: 'en',

  defaultNS,

  interpolation: {

    escapeValue: false,

  },

})



export { i18n }

export default i18n


