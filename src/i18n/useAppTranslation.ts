import { useTranslation } from 'react-i18next'
import type en from './locales/en.json'

type LeafKeys<T, Prefix extends string = ''> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? Prefix extends ''
          ? K
          : `${Prefix}.${K}`
        : LeafKeys<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
    }[keyof T & string]

export type TranslationKey = LeafKeys<typeof en>

type TranslationOptions = Record<string, unknown>
type Translate = (key: TranslationKey, options?: TranslationOptions) => string

export function useAppTranslation() {
  const { t, i18n, ready } = useTranslation('translation')

  return {
    t: t as Translate,
    i18n,
    ready,
  }
}
