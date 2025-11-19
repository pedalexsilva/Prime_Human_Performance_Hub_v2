"use client"

import { useLanguage } from "@/lib/i18n/i18n-context"
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/i18n/formatters"
import { Card } from "@/components/ui/card"

/**
 * Demo component showing localization formatting examples
 * You can use this component to test or demonstrate the formatting features
 */
export function FormatDemo() {
  const { language } = useLanguage()
  const now = new Date()
  const sampleNumber = 1234.56
  const sampleCurrency = 1234.56
  const samplePercent = 87.5

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-xl font-semibold text-primary mb-4">Localization Examples</h3>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Date: </span>
          <span className="font-mono">{formatDate(now, language)}</span>
        </div>

        <div>
          <span className="text-muted-foreground">Time: </span>
          <span className="font-mono">{formatTime(now, language)}</span>
        </div>

        <div>
          <span className="text-muted-foreground">DateTime: </span>
          <span className="font-mono">{formatDateTime(now, language)}</span>
        </div>

        <div>
          <span className="text-muted-foreground">Number: </span>
          <span className="font-mono">{formatNumber(sampleNumber, language)}</span>
        </div>

        <div>
          <span className="text-muted-foreground">Currency: </span>
          <span className="font-mono">{formatCurrency(sampleCurrency, language)}</span>
        </div>

        <div>
          <span className="text-muted-foreground">Percent: </span>
          <span className="font-mono">{formatPercent(samplePercent, language)}</span>
        </div>
      </div>
    </Card>
  )
}
