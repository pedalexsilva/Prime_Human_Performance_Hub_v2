import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

export const dynamic = "force-dynamic"

export async function POST() {
  console.log("[Logout] Request received")

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch (error) {
            console.error("[Logout] Error setting cookies:", error)
          }
        },
      },
    },
  )

  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error("[Logout] Supabase signOut error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[Logout] User successfully logged out")

    // Create response
    const response = NextResponse.json({ success: true })

    // Clear all Supabase-related cookies
    const allCookies = cookieStore.getAll()
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set(cookie.name, '', {
          path: '/',
          expires: new Date(0),
          maxAge: 0,
        })
      }
    })

    return response
  } catch (e) {
    console.error("[Logout] Unexpected error:", e)
    return NextResponse.json({ success: false, error: "Unexpected error" }, { status: 500 })
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
