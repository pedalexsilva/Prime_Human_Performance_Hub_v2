import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

let clientInstance: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null

export function createBrowserClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Missing environment variables. Returning dummy client for build/preview.")
    // Return a dummy client that conforms to the interface but does nothing or throws on usage
    // This prevents build-time crashes when env vars are not present
    return createSupabaseBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key"
    )
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
