// Supabase service utilities
import { createClient } from "@supabase/supabase-js"

/**
 * Service Role Client - Bypasses RLS for server-side operations
 * Use ONLY for trusted server-side code (API routes, cron jobs, etc.)
 * Never expose this client to the browser!
 */
export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleClient can only be used on the server")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase Service Role credentials")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
