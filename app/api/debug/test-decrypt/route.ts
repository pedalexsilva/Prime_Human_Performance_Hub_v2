import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const encryptionKey = process.env.WHOOP_ENCRYPTION_KEY

  console.log("[v0][Debug] Testing decryption for user:", userId)
  console.log("[v0][Debug] Encryption key present:", !!encryptionKey)
  console.log("[v0][Debug] Encryption key length:", encryptionKey?.length)

  // Test 1: Raw query to see encrypted data
  const { data: rawData, error: rawError } = await supabase
    .from("whoop_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  console.log("[v0][Debug] Raw query result:", {
    hasData: !!rawData,
    hasAccessToken: !!rawData?.access_token,
    hasRefreshToken: !!rawData?.refresh_token,
    error: rawError,
  })

  // Test 2: Try RPC with encryption key
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_whoop_tokens",
    {
      p_user_id: userId,
      p_encryption_key: encryptionKey,
    }
  )

  console.log("[v0][Debug] RPC result:", {
    hasData: !!rpcData,
    hasAccessToken: !!rpcData?.access_token,
    hasRefreshToken: !!rpcData?.refresh_token,
    error: rpcError,
  })

  // Test 3: Try manual decryption with SQL query
  const { data: manualDecrypt, error: manualError } = await supabase.rpc(
    "sql",
    {
      query: `
        SELECT 
          pgp_sym_decrypt(access_token::bytea, $1) as decrypted_access,
          pgp_sym_decrypt(refresh_token::bytea, $1) as decrypted_refresh
        FROM whoop_tokens 
        WHERE user_id = $2
      `,
      params: [encryptionKey, userId],
    }
  )

  return NextResponse.json({
    userId,
    encryptionKeyLength: encryptionKey?.length,
    tests: {
      rawQuery: {
        success: !rawError,
        hasData: !!rawData,
        hasTokens: !!rawData?.access_token,
        error: rawError?.message,
      },
      rpcFunction: {
        success: !rpcError,
        hasData: !!rpcData,
        hasAccessToken: !!rpcData?.access_token,
        hasRefreshToken: !!rpcData?.refresh_token,
        error: rpcError?.message,
      },
      manualDecrypt: {
        success: !manualError,
        hasData: !!manualDecrypt,
        error: manualError?.message,
      },
    },
    rawData: rawData
      ? {
          hasAccessToken: !!rawData.access_token,
          accessTokenLength: rawData.access_token?.length,
          hasRefreshToken: !!rawData.refresh_token,
          expiresAt: rawData.expires_at,
        }
      : null,
  })
}
