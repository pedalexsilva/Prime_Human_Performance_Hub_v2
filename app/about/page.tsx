"use client"

import { NavHeader } from "@/components/nav-header"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Shield, Target, Zap } from "lucide-react"

export default function AboutPage() {
  const { t } = useTranslation()

  const stats = [
    { value: "10,000+", label: t("about.stats.users") },
    { value: "2.5M+", label: t("about.stats.metrics") },
    { value: "99.9%", label: t("about.stats.uptime") },
    { value: "50+", label: t("about.stats.countries") },
  ]

  const values = [
    {
      icon: Shield,
      title: t("about.values.items.privacy.title"),
      description: t("about.values.items.privacy.description"),
    },
    {
      icon: Target,
      title: t("about.values.items.accuracy.title"),
      description: t("about.values.items.accuracy.description"),
    },
    {
      icon: Zap,
      title: t("about.values.items.simplicity.title"),
      description: t("about.values.items.simplicity.description"),
    },
  ]

  return (
    <>
      <NavHeader />
      <div className="min-h-screen pt-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-primary">{t("about.title")}</h1>
            <p className="text-xl text-muted-foreground">{t("about.subtitle")}</p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-surface py-16 border-y border-border">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="container mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-primary">{t("about.mission.title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("about.mission.description")}</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-primary">{t("about.vision.title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("about.vision.description")}</p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-surface py-20 border-y border-border">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto space-y-12">
              <h2 className="text-4xl font-bold text-center text-primary">{t("about.values.title")}</h2>

              <div className="grid md:grid-cols-3 gap-8">
                {values.map((value, index) => {
                  const Icon = value.icon
                  return (
                    <div key={index} className="p-6 rounded-lg bg-background border border-border space-y-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">{value.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
