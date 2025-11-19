"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from "date-fns"
import { pt, enUS } from "date-fns/locale"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useLanguage } from "@/lib/i18n/i18n-context"
import { validate as isUuid } from "uuid"

interface ConnectionCardProps {
  isConnected: boolean
  lastSync?: string | null
  platform?: string
  isSyncing?: boolean
}

export function ConnectionCard({ isConnected, lastSync, platform = "Whoop" }: ConnectionCardProps) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Load translations safely
  const { t } = useTranslation()
  const { language } = useLanguage()

  // Protect translation tree
  const tr = t?.athlete?.dashboard?.connection ?? {
    active: "Connected",
    notConnected: "Not connected",
    connectionSuccess: "Connected successfully",
    lastSync: "Last sync",
    syncingAuto: "Automatic syncing enabled",
    connect: "Connect",
  }

  useEffect(() => {
    const getUser = async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const rawId = user?.id ?? null
      console.log("[v0] Raw userId from Supabase:", rawId)

      if (!rawId || !isUuid(rawId)) {
        console.error("[v0] Invalid or missing UUID in connection card:", rawId)
        setUserId(null)
        return
      }

      setUserId(rawId)
    }

    getUser()

    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "whoop_connected") {
      setShowSuccess(true)
      window.history.replaceState({}, "", window.location.pathname)
      setTimeout(() => {
        router.refresh()
        setShowSuccess(false)
      }, 2000)
    }
  }, [router])

  const handleConnect = () => {
    if (!userId || !isUuid(userId)) {
      console.error("[v0] Cannot initiate Whoop Connect. Invalid userId:", userId)
      router.push("/auth/login")
      return
    }

    console.log("[v0] Connecting Whoop for user:", userId)
    window.location.href = `/api/auth/whoop/authorize?user_id=${userId}`
  }

  const dateLocale = language === "pt" ? pt : enUS

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{platform}</CardTitle>
              <CardDescription>
                {isConnected ? tr.active : tr.notConnected}
              </CardDescription>
            </div>
          </div>
          {isConnected ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showSuccess && (
          <div className="p-3 rounded-lg bg-success/10 text-success text-sm font-medium">
            {tr.connectionSuccess}
          </div>
        )}

        {isConnected && lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>
              {tr.lastSync}:{" "}
              {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: dateLocale })}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {isConnected ? (
            <div className="text-sm text-muted-foreground">{tr.syncingAuto}</div>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={!userId}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {tr.connect}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
