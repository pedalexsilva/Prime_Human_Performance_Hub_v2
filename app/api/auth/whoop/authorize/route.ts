import { NextResponse } from "next/server"
import { generateAuthorizationUrl } from "@/lib/whoop/oauth"
import { validate as isUuid } from "uuid"
import { createServerClient } from "@/lib/supabase/server"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get("user_id")

    console.log("[DEBUG][authorize] raw userId param =", userId)

    // 1. Validate presence
    if (!userId) {
      console.error("[Whoop OAuth] Missing user_id in authorize request")
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
    }

    // 2. Validate that it's a UUID
    if (!isUuid(userId)) {
      console.error("[Whoop OAuth] Invalid user_id (not a UUID):", userId)
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 })
    }

    // 3. Construct redirect URI
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      console.error("[Whoop OAuth] Missing NEXT_PUBLIC_SITE_URL")
      return NextResponse.json({ error: "Misconfigured server" }, { status: 500 })
    }

    const redirectUri = `${siteUrl}/api/auth/whoop/callback`
    console.log("[DEBUG][authorize] Using redirectUri:", redirectUri)

    const state = crypto.randomBytes(32).toString("hex")
    
    const supabase = await createServerClient()
    const { error: stateError } = await supabase
      .from("oauth_states")
      .insert({
        state,
        user_id: userId,
      })

    if (stateError) {
      console.error("[Whoop OAuth] Failed to save state:", stateError)
      return NextResponse.json({ error: "Failed to initiate OAuth" }, { status: 500 })
    }

    console.log("[DEBUG][authorize] Saved state to database for user:", userId)

    // 4. Generate the OAuth URL with state
    const authUrl = generateAuthorizationUrl(state, redirectUri)
    console.log("[DEBUG][authorize] Full Whoop auth URL:", authUrl)

    // 5. Redirect to Whoop OAuth
    return NextResponse.redirect(authUrl, { status: 302 })
  } catch (err) {
    console.error("[Whoop OAuth] Authorize route fatal error:", err)
    return NextResponse.json(
      { error: "Authorize route failed" },
      { status: 500 }
    )
  }
}
