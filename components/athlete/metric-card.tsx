// components/athlete/metric-card.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { MetricMessage } from "@/lib/utils/metric-messages"

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  message: MetricMessage
  icon?: React.ReactNode
}

export function MetricCard({ title, value, subtitle, message, icon }: MetricCardProps) {
  const colorClasses = {
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-500"
    },
    yellow: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      text: "text-yellow-500"
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      text: "text-green-500"
    }
  }

  const colors = colorClasses[message.color]

  return (
    <Card className={cn("transition-all hover:shadow-lg", colors.border, "border-2")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>{title}</span>
          {icon && <span className="text-lg">{icon}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main Value */}
        <div className="text-4xl font-bold tracking-tight">
          {value}
        </div>

        {/* Subtitle (date or additional info) */}
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}

        {/* Dynamic Message */}
        <div className={cn(
          "rounded-lg p-3 space-y-1",
          colors.bg
        )}>
          <div className="flex items-center gap-2">
            <span className="text-base">{message.icon}</span>
            <span className={cn("text-xs font-medium", colors.text)}>
              {message.color === "green" ? "Excelente" : message.color === "yellow" ? "Moderado" : "Atenção"}
            </span>
          </div>
          <p className="text-sm text-foreground/80">
            {message.message}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
