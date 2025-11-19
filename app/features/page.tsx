"use client"

import { NavHeader } from "@/components/nav-header"
import { useTranslation } from "@/lib/i18n/use-translation"
import { formatDate, formatTime, formatNumber, formatCurrency } from "@/lib/i18n/formatters"
import { Activity, BarChart3, MessageSquare, Check } from "lucide-react"
import { useLanguage } from "@/lib/i18n/i18n-context"

export default function FeaturesPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const features = [
    {
      icon: Activity,
      title: t("features.integration.title"),
      description: t("features.integration.description"),
      items: [
        t("features.integration.items.whoop"),
        t("features.integration.items.strava"),
        t("features.integration.items.garmin"),
        t("features.integration.items.realtime"),
      ],
    },
    {
      icon: BarChart3,
      title: t("features.analytics.title"),
      description: t("features.analytics.description"),
      items: [
        t("features.analytics.items.trends"),
        t("features.analytics.items.patterns"),
        t("features.analytics.items.insights"),
        t("features.analytics.items.export"),
      ],
    },
    {
      icon: MessageSquare,
      title: t("features.communication.title"),
      description: t("features.communication.description"),
      items: [
        t("features.communication.items.messaging"),
        t("features.communication.items.sharing"),
        t("features.communication.items.alerts"),
        t("features.communication.items.notes"),
      ],
    },
  ]

  // Demo data for localization
  const now = new Date()
  const demoNumber = 1234567.89
  const demoCurrency = 1234.56

  return (
    <>
      <NavHeader />
      <div className="min-h-screen pt-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-primary">{t("features.title")}</h1>
            <p className="text-xl text-muted-foreground">{t("features.subtitle")}</p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="p-8 rounded-lg bg-surface border border-border space-y-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-primary">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                  <ul className="space-y-3">
                    {feature.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* Localization Demo */}
        <section className="bg-surface py-20 border-y border-border">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-primary">{t("features.demo.title")}</h2>
                <p className="text-muted-foreground">{t("features.demo.description")}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg bg-background border border-border">
                  <div className="text-sm text-muted-foreground mb-2">{t("features.demo.currentLocale")}</div>
                  <div className="text-2xl font-semibold text-primary">
                    {language === "pt" ? "pt-BR (Português)" : "en-US (English)"}
                  </div>
                </div>

                <div className="p-6 rounded-lg bg-background border border-border">
                  <div className="text-sm text-muted-foreground mb-2">{t("features.demo.date")}</div>
                  <div className="text-2xl font-semibold text-primary">{formatDate(now, language)}</div>
                </div>

                <div className="p-6 rounded-lg bg-background border border-border">
                  <div className="text-sm text-muted-foreground mb-2">{t("features.demo.time")}</div>
                  <div className="text-2xl font-semibold text-primary">{formatTime(now, language)}</div>
                </div>

                <div className="p-6 rounded-lg bg-background border border-border">
                  <div className="text-sm text-muted-foreground mb-2">{t("features.demo.number")}</div>
                  <div className="text-2xl font-semibold text-primary">{formatNumber(demoNumber, language)}</div>
                </div>

                <div className="p-6 rounded-lg bg-background border border-border md:col-span-2">
                  <div className="text-sm text-muted-foreground mb-2">{t("features.demo.currency")}</div>
                  <div className="text-2xl font-semibold text-primary">{formatCurrency(demoCurrency, language)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
