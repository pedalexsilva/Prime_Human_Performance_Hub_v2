import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const requestUrl = request.nextUrl.pathname

  const skipRoutes = [
    "/_next/static",
    "/_next/image",
    "/api/cron", // Cron jobs don't need session
  ]

  if (skipRoutes.some((route) => requestUrl.startsWith(route)) || requestUrl.includes(".")) {
    return response
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      },
    )

    // Refresh session if needed
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Public routes that don't require authentication
    const publicRoutes = [
      "/",
      "/about",
      "/features",
      "/auth/login",
      "/auth/signup",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/debug",
      "/api", // API routes handle their own auth
    ]

    const isPublicRoute = publicRoutes.some((route) => requestUrl === route || requestUrl.startsWith(route + "/"))

    // Redirect to login if not authenticated and route is protected
    if (!user && !isPublicRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/auth/login"
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  } catch (error) {
    console.error("[Middleware Error]:", error)
    // Allow request to continue even if middleware fails
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
