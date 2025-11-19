"use client"

import type React from "react"

import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

        if (profile?.role === "doctor") {
          router.push("/doctor/dashboard")
        } else {
          router.push("/athlete/dashboard")
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao fazer login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center mb-4">
            <Logo size="medium" />
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">{t("auth.login.title")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("auth.login.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-foreground">
                      {t("auth.login.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.login.emailPlaceholder")}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-input text-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-foreground">
                        {t("auth.login.password")}
                      </Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        {t("auth.login.forgotPassword")}
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("auth.login.passwordPlaceholder")}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-input text-foreground"
                    />
                  </div>

                  {error && (
                    <Alert className="bg-critical/10 border-critical">
                      <AlertCircle className="h-4 w-4 text-critical" />
                      <AlertDescription className="text-critical">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? t("common.loading") : t("auth.login.loginButton")}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {t("auth.login.noAccount")}{" "}
                  <Link
                    href="/auth/signup"
                    className="text-primary hover:text-primary/80 underline underline-offset-4 font-semibold"
                  >
                    {t("auth.login.signupLink")}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/" className="text-sm text-primary hover:text-primary/80 underline underline-offset-4">
              ← {t("common.back")} {t("nav.home")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
