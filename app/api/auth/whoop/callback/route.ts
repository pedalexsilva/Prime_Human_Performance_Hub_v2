import { NextRequest, NextResponse } from "next/server"
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { saveTokens, diagnoseCryptoAndRLS } from "@/lib/whoop/tokens"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const requestUrl = new URL(req.url)
  const origin = requestUrl.origin

  // Create response object first to capture cookies
  const response = NextResponse.next()

  // Create Supabase client with cookie management
  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  console.log("[🔍 DIAGNOSTIC] Callback received", {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    cookieCount: req.cookies.getAll().length,
    cookieNames: req.cookies.getAll().map(c => c.name),
  })

  // Validar erro vindo da Whoop
  if (error) {
    console.error("[OAuth Callback] Whoop returned an error", error)
    const redirectResponse = NextResponse.redirect(
      `${origin}/athlete/dashboard?error=whoop_oauth_error`,
    )
    req.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Validar state e obter user_id associado
  if (!state) {
    console.error("[OAuth Callback] Missing state param")
    const redirectResponse = NextResponse.redirect(
      `${origin}/athlete/dashboard?error=missing_state`,
    )
    req.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  const { data: stateRecord, error: stateError } = await supabase
    .from("oauth_states")
    .select("user_id")
    .eq("state", state)
    .single()

  console.log("[🔍 DIAGNOSTIC] State validation", {
    stateFound: !!stateRecord,
    userId: stateRecord?.user_id,
    stateError: stateError?.message,
  })

  if (stateError || !stateRecord) {
    console.error("[OAuth Callback] Invalid or expired state", stateError)
    const redirectResponse = NextResponse.redirect(
      `${origin}/athlete/dashboard?error=invalid_state`,
    )
    req.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  const userId = stateRecord.user_id

  if (!code) {
    console.error("[OAuth Callback] Missing OAuth code")
    const redirectResponse = NextResponse.redirect(
      `${origin}/athlete/dashboard?error=missing_code`,
    )
    req.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  try {
    console.log("[🔍 DIAGNOSTIC] Starting token exchange", {
      userId,
      codeLength: code.length,
    })

    // Trocar o code pelo access token
    const tokenResponse = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.WHOOP_CLIENT_ID ?? "",
        client_secret: process.env.WHOOP_CLIENT_SECRET ?? "",
        redirect_uri: `${origin}/api/auth/whoop/callback`,
      }),
    })

    console.log("[🔍 DIAGNOSTIC] Token exchange response", {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
    })

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text()
      console.error("[OAuth Callback] Token exchange failed", {
        status: tokenResponse.status,
        response: text,
      })
      const redirectResponse = NextResponse.redirect(
        `${origin}/athlete/dashboard?error=token_exchange_failed`,
      )
      req.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    const tokenData = await tokenResponse.json()

    console.log("[🔍 DIAGNOSTIC] Token data received", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      accessTokenLength: tokenData.access_token?.length,
      refreshTokenLength: tokenData.refresh_token?.length,
    })

    if (!tokenData.access_token) {
      console.error("[OAuth Callback] No access token in Whoop response")
      const redirectResponse = NextResponse.redirect(
        `${origin}/athlete/dashboard?error=invalid_token_response`,
      )
      req.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    const expiresIn = tokenData.expires_in || 3600

    try {
      console.log("[🔍 DIAGNOSTIC] Attempting to save tokens", {
        userId,
        expiresIn,
      })

      await saveTokens(
        userId,
        tokenData.access_token,
        tokenData.refresh_token ?? null,
        expiresIn,
      )

      console.log("[✅ SUCCESS] Tokens saved successfully", {
        userId,
        timestamp: new Date().toISOString(),
      })

      console.log("[🔍 DIAGNOSTIC] Running post-save diagnostics...")
      await diagnoseCryptoAndRLS(userId)

      const { data: connectionCheck, error: connError } = await supabase
        .from("device_connections")
        .select("is_active, initial_sync_completed")
        .eq("user_id", userId)
        .eq("platform", "whoop")
        .maybeSingle()

      console.log("[🔍 DIAGNOSTIC] Connection check after save", {
        connectionExists: !!connectionCheck,
        isActive: connectionCheck?.is_active,
        initialSyncCompleted: connectionCheck?.initial_sync_completed,
        error: connError?.message,
      })

      if (!connectionCheck) {
        console.log("[🔍 DIAGNOSTIC] Creating device_connections record...")
        const { error: insertError } = await supabase
          .from("device_connections")
          .insert({
            user_id: userId,
            platform: "whoop",
            is_active: true,
            initial_sync_completed: false,
          })
        
        if (insertError) {
          console.error("[❌ ERROR] Failed to create device_connections record", insertError)
        } else {
          console.log("[✅ SUCCESS] device_connections record created")
        }
      } else {
        console.log("[🔍 DIAGNOSTIC] Updating device_connections to active...")
        const { error: updateError } = await supabase
          .from("device_connections")
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("platform", "whoop")
        
        if (updateError) {
          console.error("[❌ ERROR] Failed to update device_connections", updateError)
        } else {
          console.log("[✅ SUCCESS] device_connections marked as active")
        }
      }

    } catch (saveError) {
      console.error("[❌ ERROR] Failed to save tokens", {
        error: saveError,
        errorName: saveError instanceof Error ? saveError.name : "Unknown",
        message: saveError instanceof Error ? saveError.message : String(saveError),
        stack: saveError instanceof Error ? saveError.stack : undefined,
        userId,
      })

      console.log("[🔍 DIAGNOSTIC] Running diagnostics after save failure...")
      try {
        await diagnoseCryptoAndRLS(userId)
      } catch (diagError) {
        console.error("[❌ ERROR] Diagnostics also failed", diagError)
      }
      
      const redirectResponse = NextResponse.redirect(
        `${origin}/athlete/dashboard?error=save_tokens_failed`,
      )
      req.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    // Apagar o state usado
    await supabase.from("oauth_states").delete().eq("state", state)
    console.log("[🔍 DIAGNOSTIC] OAuth state cleaned up")

    // CRITICAL FIX: Create redirect response with all session cookies preserved
    const redirectResponse = NextResponse.redirect(
      `${origin}/athlete/dashboard?success=whoop_connected`,
    )
    
    // Copy all existing cookies (including Supabase session cookies)
    req.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || '/',
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite as 'strict' | 'lax' | 'none' | undefined,
        maxAge: cookie.maxAge,
      })
    })

    // Also copy any cookies set by the Supabase client
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      })
    })

    console.log("[✅ SUCCESS] Redirecting to dashboard", {
      cookieCount: req.cookies.getAll().length,
      responseCookieCount: response.cookies.getAll().length,
    })

    return redirectResponse
  } catch (e) {
    console.error("[❌ FATAL ERROR] Unexpected error in callback", {
      error: e,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
    const redirectResponse = NextResponse.redirect(
      `${origin}/athlete/dashboard?error=unexpected_error`,
    )
    req.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }
}
