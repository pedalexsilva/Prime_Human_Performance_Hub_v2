import { syncUser } from "@/lib/whoop/sync"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  console.log("[🔍 SYNC] Request received")
  
  try {
    // Create response object first to capture cookies
    let response = NextResponse.next()

    // Create Supabase client with proper cookie management
    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    console.log("[🔍 SYNC] Getting authenticated user")
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error("[❌ SYNC] Auth error:", authError)
      const unauthorizedResponse = NextResponse.json(
        { error: "Unauthorized", details: authError.message }, 
        { status: 401 }
      )
      request.cookies.getAll().forEach(cookie => {
        unauthorizedResponse.cookies.set(cookie.name, cookie.value)
      })
      return unauthorizedResponse
    }
    
    if (!user) {
      console.error("[❌ SYNC] No user found")
      const unauthorizedResponse = NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
      request.cookies.getAll().forEach(cookie => {
        unauthorizedResponse.cookies.set(cookie.name, cookie.value)
      })
      return unauthorizedResponse
    }
    
    console.log("[✅ SYNC] User authenticated:", user.id)
    
    // Check if Whoop is connected
    console.log("[🔍 SYNC] Checking Whoop connection")
    const { data: connection, error: connError } = await supabase
      .from("device_connections")
      .select("is_active, initial_sync_completed")
      .eq("user_id", user.id)
      .eq("platform", "whoop")
      .maybeSingle()

    console.log("[🔍 SYNC] Connection check result:", {
      exists: !!connection,
      isActive: connection?.is_active,
      initialSyncCompleted: connection?.initial_sync_completed,
      error: connError?.message,
    })

    if (!connection) {
      console.error("[❌ SYNC] No Whoop connection found")
      const errorResponse = NextResponse.json(
        { error: "Whoop not connected" }, 
        { status: 400 }
      )
      request.cookies.getAll().forEach(cookie => {
        errorResponse.cookies.set(cookie.name, cookie.value)
      })
      return errorResponse
    }

    console.log("[🚀 SYNC] Starting syncUser for:", user.id)
    
    let result
    try {
      result = await syncUser(user.id)
      console.log("[🔍 SYNC] syncUser completed:", {
        success: result.success,
        error: result.error,
        cyclesCount: result.cyclesCount,
        sleepCount: result.sleepCount,
        workoutsCount: result.workoutsCount,
      })
    } catch (syncError) {
      console.error("[❌ SYNC] syncUser threw error:", {
        error: syncError,
        message: syncError instanceof Error ? syncError.message : String(syncError),
        stack: syncError instanceof Error ? syncError.stack : undefined,
      })
      throw syncError
    }
    
    // Create success response
    const successResponse = NextResponse.json(
      result.success
        ? {
            success: true,
            message: "Sync completed successfully",
            cyclesCount: result.cyclesCount,
            sleepCount: result.sleepCount,
            workoutsCount: result.workoutsCount,
            validationErrors: result.validationErrors,
          }
        : {
            success: false,
            error: result.error || "Sync failed"
          },
      { status: result.success ? 200 : 500 }
    )

    // CRITICAL: Preserve session cookies in the response
    console.log("[🔍 SYNC] Preserving cookies in response")
    request.cookies.getAll().forEach(cookie => {
      successResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || '/',
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite as 'strict' | 'lax' | 'none' | undefined,
        maxAge: cookie.maxAge,
      })
    })

    // Also copy any cookies set by Supabase operations
    response.cookies.getAll().forEach(cookie => {
      successResponse.cookies.set(cookie.name, cookie.value, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      })
    })

    console.log("[✅ SYNC] Response prepared with cookies", {
      cookieCount: request.cookies.getAll().length,
      success: result.success,
      statusCode: result.success ? 200 : 500,
    })

    return successResponse
  } catch (error) {
    console.error("[❌ FATAL] Sync endpoint fatal error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    const errorResponse = NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )

    // Preserve cookies even in error response
    request.cookies.getAll().forEach(cookie => {
      errorResponse.cookies.set(cookie.name, cookie.value)
    })

    return errorResponse
  }
}
