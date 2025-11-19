"use client"

import type React from "react"

import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, User, Stethoscope } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"

export default function SignUpPage() {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"athlete" | "doctor">("athlete")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError(t("common.error"))
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError(t("common.error"))
      setIsLoading(false)
      return
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/${role}/dashboard`,
          data: {
            full_name: fullName,
            role: role,
            preferred_language: "pt",
          },
        },
      })

      if (signUpError) throw signUpError

      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("common.error"))
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
              <CardTitle className="text-2xl text-foreground">{t("auth.signup.title")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("auth.signup.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label className="text-foreground font-semibold">{t("auth.signup.userType")}</Label>
                    <RadioGroup value={role} onValueChange={(value) => setRole(value as "athlete" | "doctor")}>
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-background hover:bg-muted transition-colors cursor-pointer">
                        <RadioGroupItem value="athlete" id="athlete" />
                        <Label htmlFor="athlete" className="flex items-center gap-3 cursor-pointer flex-1">
                          <User className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold text-foreground">{t("auth.signup.athlete")}</p>
                            <p className="text-sm text-muted-foreground">{t("home.hero.subtitleHighlight1")}</p>
                          </div>
                        </Label>
                      </div>

                      {/* Temporarily hidden - only allowing athlete signups
                      <div className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-background hover:bg-muted transition-colors cursor-pointer">
                        <RadioGroupItem value="doctor" id="doctor" />
                        <Label htmlFor="doctor" className="flex items-center gap-3 cursor-pointer flex-1">
                          <Stethoscope className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold text-foreground">{t("auth.signup.doctor")}</p>
                            <p className="text-sm text-muted-foreground">{t("home.hero.subtitleHighlight2")}</p>
                          </div>
                        </Label>
                      </div>
                      */}
                    </RadioGroup>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fullName" className="text-foreground">
                      {t("auth.signup.name")}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t("auth.signup.namePlaceholder")}
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-background border-input text-foreground"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-foreground">
                      {t("auth.signup.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.signup.emailPlaceholder")}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-input text-foreground"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-foreground">
                      {t("auth.signup.password")}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("auth.signup.passwordPlaceholder")}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-input text-foreground"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword" className="text-foreground">
                      {t("auth.signup.confirmPassword")}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("auth.signup.confirmPasswordPlaceholder")}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                    {isLoading ? t("common.loading") : t("auth.signup.signupButton")}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {t("auth.signup.hasAccount")}{" "}
                  <Link
                    href="/auth/login"
                    className="text-primary hover:text-primary/80 underline underline-offset-4 font-semibold"
                  >
                    {t("auth.signup.loginLink")}
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
