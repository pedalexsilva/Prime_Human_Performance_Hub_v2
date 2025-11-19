"use client"

import { useLanguage } from "@/lib/i18n/i18n-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"

export default function I18nDebugPage() {
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [storageValue, setStorageValue] = useState<string | null>(null)
  const [htmlLang, setHtmlLang] = useState<string>("")

  useEffect(() => {
    setMounted(true)
    updateDebugInfo()
  }, [])

  useEffect(() => {
    if (mounted) {
      updateDebugInfo()
    }
  }, [language, mounted])

  const updateDebugInfo = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("prime-hp-language")
      setStorageValue(stored)
      setHtmlLang(document.documentElement.lang)
    }
  }

  const clearStorage = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("prime-hp-language")
      updateDebugInfo()
    }
  }

  const testTranslation = (key: string) => {
    try {
      const result = t(key)
      console.log(`[i18n Test] Key: "${key}" => Result: "${result}"`)
      return result
    } catch (error) {
      console.error(`[i18n Test] Error with key "${key}":`, error)
      return "ERROR"
    }
  }

  if (!mounted) {
    return <div className="container mx-auto p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">i18n Debug Console</h1>
        <p className="text-muted-foreground">Diagnostic tools for language system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current State</CardTitle>
            <CardDescription>Active language configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Active Language:</span>
              <Badge variant={language === "eng" ? "default" : "secondary"} className="text-base px-4 py-1">
                {language === "eng" ? "English" : "Português"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">localStorage Value:</span>
              <code className="bg-muted px-3 py-1 rounded text-sm">{storageValue || "null"}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">HTML lang Attribute:</span>
              <code className="bg-muted px-3 py-1 rounded text-sm">{htmlLang || "not-set"}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Component Mounted:</span>
              <Badge variant="outline">{mounted ? "Yes" : "No"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Test language switching and storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setLanguage("pt")} variant={language === "pt" ? "default" : "outline"} className="w-full">
              Switch to Português
            </Button>
            <Button onClick={() => setLanguage("eng")} variant={language === "eng" ? "default" : "outline"} className="w-full">
              Switch to English
            </Button>
            <Button onClick={clearStorage} variant="destructive" className="w-full">
              Clear localStorage
            </Button>
            <Button onClick={() => window.location.reload()} variant="secondary" className="w-full">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Translation Tests</CardTitle>
          <CardDescription>Test key translation resolution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2 font-mono text-sm">
            <div className="p-3 bg-muted rounded">
              <div className="text-muted-foreground">dashboard.title:</div>
              <div className="font-semibold">{testTranslation("dashboard.title")}</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-muted-foreground">dashboard.selectAthlete:</div>
              <div className="font-semibold">{testTranslation("dashboard.selectAthlete")}</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-muted-foreground">nav.dashboard:</div>
              <div className="font-semibold">{testTranslation("nav.dashboard")}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
