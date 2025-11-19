"use client"

import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/lib/i18n/i18n-context"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const languages: { code: string; label: string; flag: string }[] = [
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "eng", label: "English", flag: "🇺🇸" },
  ]

  const currentLanguage = languages.find((l) => l.code === language) || languages[0]

  const handleLanguageChange = (newLang: string) => {
    // @ts-ignore
    setLanguage(newLang)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-colors"
          aria-label="Toggle language"
        >
          <Globe className="h-5 w-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`cursor-pointer ${language === lang.code ? "bg-primary/10 text-primary" : ""}`}
          >
            <span className="mr-2 text-lg">{lang.flag}</span>
            <span className="font-medium">{lang.label}</span>
            {language === lang.code && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
