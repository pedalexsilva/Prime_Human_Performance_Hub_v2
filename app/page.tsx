"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { useTranslation } from "@/lib/i18n/use-translation"
import { NavHeader } from "@/components/nav-header"

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      <NavHeader />
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-surface" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          {/* Hero section */}
          <div className="space-y-6">
            <div className="mb-8">
              <Logo size="large" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="text-primary">{t("home.hero.title.optimize")}</span>{" "}
              <span className="text-foreground">{t("home.hero.title.performance")}</span>
            </h1>

            <p className="text-3xl md:text-4xl font-light max-w-2xl">
              {t("home.hero.subtitle").split(t("home.hero.subtitleHighlight1"))[0]}
              <span className="text-primary font-semibold">{t("home.hero.subtitleHighlight1")}</span>
              {
                t("home.hero.subtitle")
                  .split(t("home.hero.subtitleHighlight1"))[1]
                  .split(t("home.hero.subtitleHighlight2"))[0]
              }
              <span className="text-primary font-semibold">{t("home.hero.subtitleHighlight2")}</span>
            </p>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t("home.hero.description")}
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg"
            >
              <Link href="/auth/signup">{t("home.hero.ctaStart")}</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-6 text-lg bg-transparent"
            >
              <Link href="/auth/login">{t("home.hero.ctaLogin")}</Link>
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl">
            <div className="p-6 rounded-lg bg-surface border border-border">
              <h3 className="text-xl font-semibold text-primary mb-2">{t("home.features.sync.title")}</h3>
              <p className="text-muted-foreground">{t("home.features.sync.description")}</p>
            </div>

            <div className="p-6 rounded-lg bg-surface border border-border">
              <h3 className="text-xl font-semibold text-primary mb-2">{t("home.features.alerts.title")}</h3>
              <p className="text-muted-foreground">{t("home.features.alerts.description")}</p>
            </div>

            <div className="p-6 rounded-lg bg-surface border border-border">
              <h3 className="text-xl font-semibold text-primary mb-2">{t("home.features.communication.title")}</h3>
              <p className="text-muted-foreground">{t("home.features.communication.description")}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
