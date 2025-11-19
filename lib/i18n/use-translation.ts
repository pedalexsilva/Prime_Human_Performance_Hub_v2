"use client"

import { useLanguage } from "./i18n-context"
import { translations } from "./translations"

export function useTranslation() {
  const { language } = useLanguage()

  const createTranslationFunction = () => {
    // Function syntax: t("home.hero.title")
    const translationFn = (key: string): string => {
      const keys = key.split(".")
      let value: any = translations[language]

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k]
        } else {
          console.warn(`[i18n] Translation key not found: ${key} for language: ${language}`)
          return key
        }
      }

      return typeof value === "string" ? value : key
    }

    // Object syntax: t.home.hero.title
    // Attach all translation keys as properties to the function
    return Object.assign(translationFn, translations[language])
  }

  const t = createTranslationFunction()

  return { t, language }
}
