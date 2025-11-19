import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { LanguageProvider } from "@/lib/i18n/i18n-context"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "Portal Integrado - Prime Human Performance",
  description: "Portal integrado de métricas de saúde e performance para atletas e médicos",
  generator: "v0.app",
  icons: {
    icon: "/logo-prime-hp.png",
    apple: "/logo-prime-hp.png",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={poppins.variable}>
      <body className="font-sans antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
