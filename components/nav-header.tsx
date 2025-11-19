"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

export function NavHeader() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/about", label: t("nav.about") },
    { href: "/features", label: t("nav.features") },
    { href: "/dashboard", label: t("nav.dashboard") },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <nav className="container mx-auto flex h-16 items-center justify-between px-6">
        <ul className="flex items-center gap-6">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center">
          <LanguageToggle />
        </div>
      </nav>
    </header>
  )
}
