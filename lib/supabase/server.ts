import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

/**
 * Supabase server-side client (SSR seguro)
 * IMPORTANT: Don't put this in a global variable (Fluid compute compatibility)
 * Always create a new client for each request
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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
            console.warn("[Supabase] setAll called from Server Component:", error)
            // This can be ignored if middleware is refreshing sessions
          }
        },
      },
    },
  )
}

export { createClient as createServerClient }
