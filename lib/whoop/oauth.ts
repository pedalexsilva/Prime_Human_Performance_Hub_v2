import crypto from "crypto"

// Whoop endpoints
const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth"
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"

// Required scopes
const WHOOP_SCOPES = [
  "offline",           // Required to receive refresh tokens
  "read:recovery",
  "read:sleep",
  "read:workout",
  "read:cycles",
  "read:profile",
  "read:body_measurement",  // ← ADICIONADO para body measurements
].join(" ")

const STATE_TTL_MS = 10 * 60 * 1000 // 10 min

//
// ---------------------------------------------------------------
// STATE ENCODING / DECODING (base64)
// ---------------------------------------------------------------
//

// Encode userId safely
function encodeUserId(userId: string): string {
  return Buffer.from(userId, "utf8").toString("base64")
}

// Decode userId safely (never return false)
function decodeUserId(encoded: string): string {
  try {
    return Buffer.from(encoded, "base64").toString("utf8")
  } catch {
    return ""
  }
}

/**
 * Generate OAuth state
 * Format: base64UserId:timestamp:nonce
 */
export function generateState(userId: string): string {
  const encoded = encodeUserId(userId)
  const timestamp = Date.now()
  const nonce = crypto.randomBytes(8).toString("hex")

  return `${encoded}:${timestamp}:${nonce}`
}

/**
 * Validate and extract userId from OAuth state
 */
export function validateState(rawState: string | null): string {
  if (!rawState) throw new Error("Missing state parameter")

  const parts = rawState.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid state format")
  }

  const [encodedUserId, tsString] = parts
  const timestamp = Number(tsString)

  if (!encodedUserId || Number.isNaN(timestamp)) {
    throw new Error("Malformed state content")
  }

  // Decode base64 → get original userId
  const userId = decodeUserId(encodedUserId)
  if (!userId) {
    throw new Error("Failed to decode userId")
  }

  // Validate TTL
  if (Date.now() - timestamp > STATE_TTL_MS) {
    throw new Error("State expired")
  }

  return userId
}

//
// ---------------------------------------------------------------
// AUTHORIZATION URL GENERATION
// ---------------------------------------------------------------
//

export function generateAuthorizationUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES,
    state, // Use the provided state from database
  })

  return `${WHOOP_AUTH_URL}?${params.toString()}`
}

//
// ---------------------------------------------------------------
// TOKEN EXCHANGE
// ⚠️ CORRIGIDO: Usar client_secret_post
// ---------------------------------------------------------------
//

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  // ✅ CORRIGIDO: Enviar client_id e client_secret no BODY, não no header
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code.trim(),
    redirect_uri: redirectUri,
    client_id: process.env.WHOOP_CLIENT_ID!,        // ← No body
    client_secret: process.env.WHOOP_CLIENT_SECRET!, // ← No body
  })

  const response = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      // ✅ NÃO incluir Authorization header!
    },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("[Whoop OAuth] Token exchange failed:", text)
    throw new Error("Token exchange failed")
  }

  return response.json()
}

//
// ---------------------------------------------------------------
// REFRESH TOKEN
// ⚠️ MELHORADO: Retry automático + classificação de erros
// ---------------------------------------------------------------
//

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

/**
 * ⚠️ MELHORADO: Refresh com retry e error handling detalhado
 */
export async function refreshAccessToken(
  refreshToken: string,
  retryCount = 0,
  maxRetries = 2
): Promise<RefreshTokenResponse> {
  console.log(`[🔄 OAuth] Refreshing access token (attempt ${retryCount + 1}/${maxRetries + 1})`)

  // Clean the refresh token (remove any whitespace)
  const cleanRefreshToken = refreshToken.trim()
  
  // 🔍 DEBUG: Log token info (sem mostrar o token completo)
  console.log('[🔍 OAuth] Refresh token info:', {
    originalLength: refreshToken.length,
    cleanLength: cleanRefreshToken.length,
    hasWhitespace: refreshToken !== cleanRefreshToken,
    firstChars: cleanRefreshToken.substring(0, 10) + '...',
    lastChars: '...' + cleanRefreshToken.substring(cleanRefreshToken.length - 10),
    hasNewlines: refreshToken.includes('\n'),
    hasCarriageReturn: refreshToken.includes('\r'),
  })
  
  try {
    // ✅ CORRIGIDO: Enviar client_id e client_secret no BODY
    // O erro era usar Authorization: Basic header
    // Whoop requer "client_secret_post" não "client_secret_basic"
    
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cleanRefreshToken,
      client_id: process.env.WHOOP_CLIENT_ID!,        // ← Adicionar ao body
      client_secret: process.env.WHOOP_CLIENT_SECRET!, // ← Adicionar ao body
    })

    // 🔍 DEBUG: Log request info
    console.log('[🔍 OAuth] Request params:', {
      grant_type: body.get('grant_type'),
      refresh_token_length: body.get('refresh_token')?.length,
      client_id_prefix: body.get('client_id')?.substring(0, 10) + '...',
      client_secret_present: !!body.get('client_secret'),
      client_secret_length: body.get('client_secret')?.length,
    })

    const response = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        // ✅ NÃO incluir Authorization: Basic header!
      },
      body,
    })

    // Log response status
    console.log(`[🔍 OAuth] Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const text = await response.text()
      let errorJson: any = null
      
      try {
        errorJson = JSON.parse(text)
      } catch {
        // errorText não é JSON
      }

      console.error('[❌ OAuth] Whoop API error:', {
        status: response.status,
        statusText: response.statusText,
        body: text,
        errorJson,
      })

      // ============================================
      // 🎯 CRITICAL: Classificar tipo de erro
      // ============================================
      
      // 400 = Bad request - pode ser token corrompido/expirado (PERMANENTE)
      if (response.status === 400) {
        console.error('[❌ OAuth] Bad request (400) - Token may be corrupted or expired')
        throw new Error(`400: Whoop refresh token is invalid or corrupted`)
      }
      
      // 401/403 = Token inválido/revogado (PERMANENTE)
      if (response.status === 401 || response.status === 403) {
        console.error('[❌ OAuth] Token revoked or invalid (401/403)')
        throw new Error(`401: Whoop refresh token is invalid or revoked`)
      }

      // 429 = Rate limit (TEMPORÁRIO)
      if (response.status === 429) {
        console.warn('[⚠️ OAuth] Rate limited (429)')
        
        // Retry com backoff se ainda temos tentativas
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
          console.log(`[🔄 OAuth] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          return refreshAccessToken(refreshToken, retryCount + 1, maxRetries)
        }
        
        throw new Error(`429: Rate limit exceeded, max retries reached`)
      }

      // 5xx = Server error (TEMPORÁRIO)
      if (response.status >= 500) {
        console.warn('[⚠️ OAuth] Whoop server error (5xx)')
        
        // Retry se ainda temos tentativas
        if (retryCount < maxRetries) {
          const waitTime = 2000 // 2 segundos
          console.log(`[🔄 OAuth] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          return refreshAccessToken(refreshToken, retryCount + 1, maxRetries)
        }
        
        throw new Error(`${response.status}: Whoop server error, max retries reached`)
      }

      // Outro erro
      throw new Error(`${response.status}: ${text}`)
    }

    // Success!
    const data: RefreshTokenResponse = await response.json()

    console.log('[✅ OAuth] Tokens refreshed successfully:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    })

    return data

  } catch (error) {
    // Network errors (fetch failed)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[❌ OAuth] Network error:', error.message)
      
      // Retry se ainda temos tentativas
      if (retryCount < maxRetries) {
        const waitTime = 2000
        console.log(`[🔄 OAuth] Network error, waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return refreshAccessToken(refreshToken, retryCount + 1, maxRetries)
      }
      
      throw new Error(`network: ${error.message}`)
    }

    // Re-throw outros erros
    throw error
  }
}
