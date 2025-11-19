import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

let clientInstance: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null

export function createBrowserClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase] Missing environment variables:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    })
    throw new Error("Missing Supabase environment variables")
  }

  // Singleton pattern for browser client
  if (clientInstance) {
    return clientInstance
  }

  console.log("[v0] Creating Supabase browser client")

  clientInstance = createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  return clientInstance
}

export const supabase = createBrowserClient()
