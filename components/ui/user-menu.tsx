"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { createBrowserClient } from "@/lib/supabase/client"

interface UserMenuProps {
  userName: string
  userRole?: string
}

export function UserMenu({ userName, userRole }: UserMenuProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const supabase = createBrowserClient()

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    console.log("🚪 [UserMenu] Starting logout process")

    try {
      // 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("❌ [UserMenu] Supabase signOut error:", error)
        throw error
      }

      console.log("✅ [UserMenu] Supabase logout successful")

      // 2. Clear localStorage
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const keys = Object.keys(localStorage)
          keys.forEach((key) => {
            if (key.startsWith("sb-")) {
              localStorage.removeItem(key)
            }
          })
        }
      } catch (storageError) {
        console.warn("[UserMenu] Could not clear localStorage:", storageError)
      }

      // 3. Redirect to login
      console.log("🔄 [UserMenu] Redirecting to login...")
      router.push("/auth/login")
      
      // 4. Force refresh after a delay
      setTimeout(() => {
        window.location.href = "/auth/login"
      }, 100)

    } catch (error) {
      console.error("❌ [UserMenu] Logout failed:", error)
      
      // Even if error, try to redirect
      router.push("/auth/login")
      setTimeout(() => {
        window.location.href = "/auth/login"
      }, 100)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full w-10 h-10 p-0 font-bold bg-transparent"
          title={t("userMenu.title")}
        >
          {userName.charAt(0).toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-semibold">{userName}</span>
            {userRole && <span className="text-xs text-muted-foreground">{userRole}</span>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout} 
          disabled={isLoggingOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Saindo..." : t("userMenu.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
