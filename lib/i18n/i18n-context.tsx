"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Language } from "./translations"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = "prime-hp-language"
const DEFAULT_LANGUAGE: Language = "pt"

function isValidLanguage(lang: any): lang is Language {
  return lang === "pt" || lang === "eng"
}

function safeGetLanguage(): Language | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isValidLanguage(stored) ? stored : null
  } catch {
    return null
  }
}

function safeSetLanguage(lang: Language): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch (error) {
    console.warn("[i18n] Failed to save language:", error)
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize with default, will update after hydration
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)
  const [mounted, setMounted] = useState(false)

  // First effect: Mark as mounted and load from storage
  useEffect(() => {
    setMounted(true)
    const stored = safeGetLanguage()
    if (stored && stored !== DEFAULT_LANGUAGE) {
      setLanguageState(stored)
      console.log("[i18n] Loaded language from storage:", stored)
    }
  }, [])

  // Second effect: Update HTML lang attribute when language changes
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language === "pt" ? "pt-PT" : "en-US"
    }
  }, [language, mounted])

  const setLanguage = (lang: Language) => {
    console.log("[i18n] Changing language to:", lang)
    setLanguageState(lang)
    safeSetLanguage(lang)
  }

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
