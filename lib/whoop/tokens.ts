// lib/whoop/tokens.ts
// ⚠️ VERSÃO MELHORADA: Não deleta tokens em erros temporários

import { createServiceRoleClient } from "@/lib/supabase/service"
import { refreshAccessToken } from "./oauth"

const ENCRYPTION_KEY =
  process.env.WHOOP_ENCRYPTION_KEY || "default-encryption-key-change-in-production"

export interface StoredTokens {
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
}

/**
 * Save encrypted tokens to Supabase using the RPC helper
 * Ensures p_refresh_token is always sent as a string to avoid PGRST202
 */
export async function saveTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
): Promise<void> {


  const supabase = createServiceRoleClient()

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const safeRefreshToken = refreshToken ?? ""



  const { data, error } = await supabase.rpc("save_whoop_tokens", {
    p_access_token: accessToken,
    p_encryption_key: ENCRYPTION_KEY,
    p_expires_at: expiresAt,
    p_refresh_token: safeRefreshToken,
    p_user_id: userId,
  })



  if (error) {
    console.error("[v0][Whoop Tokens] save_whoop_tokens FAILED", {
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
    })
    throw new Error(`Failed to save Whoop tokens. ${error.message}`)
  }



  const { data: verifyData, error: verifyError } = await supabase
    .from("whoop_tokens")
    .select("user_id, access_token, refresh_token")
    .eq("user_id", userId)
    .maybeSingle()

  if (verifyError) {
    console.error("[v0][Whoop Tokens] Verification query FAILED", {
      error: verifyError,
      code: verifyError.code,
      message: verifyError.message,
    })
    throw new Error(`Failed to verify saved tokens. ${verifyError.message}`)
  }

  if (!verifyData) {
    console.error("[v0][Whoop Tokens] Verification FAILED. No tokens found after save.")
    throw new Error("Tokens were not saved. verification failed")
  }

  if (!verifyData.access_token) {
    console.error("[v0][Whoop Tokens] Verification FAILED. access_token is NULL")
    throw new Error("Access token is NULL after save")
  }


}

/**
 * Raw fetch of encrypted tokens from Supabase
 * This RPC returns an array. not an object.
 */
export async function getTokens(userId: string): Promise<StoredTokens | null> {


  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.rpc("get_whoop_tokens", {
    p_user_id: userId,
    p_encryption_key: ENCRYPTION_KEY,
  })

  if (error) {
    console.error("[Whoop Tokens] get_whoop_tokens failed", {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to load Whoop tokens. ${error.message}`)
  }

  if (!data || data.length === 0) {
    console.warn("[v0][Whoop Tokens] No tokens found for user.", userId)
    return null
  }

  const row = data[0]



  return {
    access_token: row.access_token ?? null,
    refresh_token: row.refresh_token ?? null,
    expires_at: row.expires_at ?? null,
  }
}

/**
 * ⚠️ MELHORADO: Distingue entre erros temporários e permanentes
 * 
 * Ensure we have a valid access token.
 * Refresh if needed and update Supabase.
 */
export async function ensureValidToken(userId: string): Promise<string> {
  console.log("[🔍 Token Validation] Starting for user:", userId)

  const tokens = await getTokens(userId)

  if (!tokens || !tokens.access_token) {
    console.error("[❌ Token Validation] No tokens found")
    throw new Error("No Whoop tokens stored for user")
  }

  const now = Date.now()
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : null

  // Check if token is still valid (with 60s buffer)
  const stillValid = expiresAt !== null && expiresAt - 60_000 > now

  if (stillValid) {
    const timeUntilExpiry = Math.floor((expiresAt - now) / 1000)
    console.log(`[✅ Token Validation] Token still valid for ${timeUntilExpiry}s`)
    return tokens.access_token
  }

  // Token expired or expiring soon - need to refresh
  if (!tokens.refresh_token) {
    console.error("[❌ Token Validation] No refresh token available")
    throw new Error("Whoop access token expired and no refresh token is available")
  }

  console.log("[🔄 Token Validation] Token expired, attempting refresh...")

  try {
    const refreshed = await refreshAccessToken(tokens.refresh_token)

    console.log("[✅ Token Validation] Refresh successful, saving new tokens...")

    await saveTokens(
      userId,
      refreshed.access_token,
      refreshed.refresh_token || tokens.refresh_token,
      refreshed.expires_in,
    )

    console.log("[✅ Token Validation] New tokens saved successfully")
    return refreshed.access_token

  } catch (refreshError) {
    const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError)

    console.error("[❌ Token Validation] Refresh failed:", {
      error: errorMessage,
      errorType: refreshError instanceof Error ? refreshError.constructor.name : typeof refreshError,
    })

    // ============================================
    // 🎯 CRITICAL: Distinguir erros temporários vs permanentes
    // ============================================

    const supabase = createServiceRoleClient()

    // Verificar se é erro de tokens revogados/inválidos (permanente)
    const isPermanentError =
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('invalid_grant') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('token_revoked') ||
      errorMessage.includes('invalid or revoked')

    // Verificar se é erro temporário (rede, rate limit, etc)
    const isTemporaryError =
      errorMessage.includes('429') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('5') && errorMessage.includes('server error')

    if (isPermanentError) {
      // ❌ ERRO PERMANENTE: Tokens inválidos/revogados
      console.error("[❌ Token Validation] PERMANENT ERROR - Tokens revoked or invalid")
      console.warn("[⚠️ Token Validation] Marking connection as inactive and deleting tokens")

      // Desativar conexão
      await supabase
        .from("device_connections")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("platform", "whoop")

      // Deletar tokens inválidos
      await supabase
        .from("whoop_tokens")
        .delete()
        .eq("user_id", userId)

      throw new Error("Whoop tokens expired or revoked. Please reconnect your account.")

    } else if (isTemporaryError) {
      // ⚠️ ERRO TEMPORÁRIO: Manter tokens, tentar novamente mais tarde
      console.warn("[⚠️ Token Validation] TEMPORARY ERROR - Keeping tokens for retry")
      console.warn("[⚠️ Token Validation] Next sync will retry refresh")

      // NÃO deletar tokens, NÃO desativar conexão
      throw new Error(`Temporary error refreshing Whoop tokens: ${errorMessage}. Will retry on next sync.`)

    } else {
      // ❓ ERRO DESCONHECIDO: Por segurança, manter tokens mas avisar
      console.warn("[⚠️ Token Validation] UNKNOWN ERROR - Keeping tokens but marking as suspicious")

      // NÃO deletar tokens, mas logar para investigação
      console.error("[🔍 Token Validation] Unknown error type - please investigate:", {
        errorMessage,
        fullError: refreshError,
      })

      throw new Error(`Error refreshing Whoop tokens: ${errorMessage}. Please check logs.`)
    }
  }
}

/**
 * Validate if tokens can be decrypted with current encryption key
 */
export async function validateTokenEncryption(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.rpc("validate_whoop_token_encryption", {
    p_user_id: userId,
    p_encryption_key: ENCRYPTION_KEY,
  })

  if (error) {
    console.error("[Whoop Tokens] validate_whoop_token_encryption failed", error)
    return false
  }

  return data === true
}

/**
 * Delete corrupted tokens
 */
export async function deleteCorruptedTokens(userId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.rpc("delete_corrupted_whoop_tokens", {
    p_user_id: userId,
  })

  if (error) {
    console.error("[Whoop Tokens] delete_corrupted_whoop_tokens failed", error)
  }
}

/**
 * Diagnostic functions for debugging RPC, RLS and encryption
 */
export async function diagnoseCryptoAndRLS(userId: string): Promise<void> {
  console.log("[v0][DIAGNOSTIC] Starting crypto and RLS diagnosis for user.", userId)

  const supabase = createServiceRoleClient()

  console.log("[v0][DIAGNOSTIC] Test 1. Counting whoop_tokens records...")
  const { count: tokenCount, error: countError } = await supabase
    .from("whoop_tokens")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (countError) {
    console.error("[v0][DIAGNOSTIC] Test 1 FAILED. RLS may be blocking.", {
      error: countError,
      code: countError.code,
      message: countError.message,
    })
  } else {
    console.log("[v0][DIAGNOSTIC] Test 1 SUCCESS. Records found.", tokenCount)
  }

  console.log("[v0][DIAGNOSTIC] Test 2. Reading raw BYTEA data...")
  const { data: rawData, error: rawError } = await supabase
    .from("whoop_tokens")
    .select("user_id, access_token, refresh_token, expires_at, created_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (rawError) {
    console.error("[v0][DIAGNOSTIC] Test 2 FAILED. Cannot read raw data.", {
      error: rawError,
      code: rawError.code,
      message: rawError.message,
    })
  } else if (!rawData) {
    console.warn("[v0][DIAGNOSTIC] Test 2. No records found")
  } else {
    console.log("[v0][DIAGNOSTIC] Test 2 SUCCESS. Raw data.", {
      user_id: rawData.user_id,
      hasAccessToken: rawData.access_token !== null,
      accessTokenType: typeof rawData.access_token,
      accessTokenLength: rawData.access_token?.length,
      hasRefreshToken: rawData.refresh_token !== null,
      refreshTokenType: typeof rawData.refresh_token,
      expiresAt: rawData.expires_at,
      createdAt: rawData.created_at,
    })
  }

  console.log("[v0][DIAGNOSTIC] Test 3. Checking device_connections...")
  const { data: connectionData, error: connectionError } = await supabase
    .from("device_connections")
    .select("user_id, platform, is_active, created_at")
    .eq("user_id", userId)
    .eq("platform", "whoop")
    .maybeSingle()

  if (connectionError) {
    console.error("[v0][DIAGNOSTIC] Test 3 FAILED.", connectionError)
  } else if (!connectionData) {
    console.warn("[v0][DIAGNOSTIC] Test 3. No device_connections record")
  } else {
    console.log("[v0][DIAGNOSTIC] Test 3 SUCCESS.", connectionData)
  }

  console.log("[v0][DIAGNOSTIC] Test 4. Testing get_whoop_tokens RPC...")
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_whoop_tokens", {
    p_user_id: userId,
    p_encryption_key: ENCRYPTION_KEY,
  })

  if (rpcError) {
    console.error("[v0][DIAGNOSTIC] Test 4 FAILED.", {
      error: rpcError,
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    })
  } else if (!rpcData || rpcData.length === 0) {
    console.warn("[v0][DIAGNOSTIC] Test 4. RPC returned no rows")
  } else {
    const row = rpcData[0]
    console.log("[v0][DIAGNOSTIC] Test 4 SUCCESS. RPC returned data.", {
      hasAccessToken: !!row.access_token,
      hasRefreshToken: !!row.refresh_token,
      expiresAt: row.expires_at,
    })
  }

  console.log("[v0][DIAGNOSTIC] Diagnosis complete")
}
