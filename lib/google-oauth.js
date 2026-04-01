/**
 * Google OAuth Integration
 * Handles Google authentication and user management
 * Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
 */

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/**
 * Check if Google OAuth is configured
 * @returns {boolean}
 */
export function isGoogleOAuthConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
}

/**
 * Get Google OAuth authorization URL
 * @param {string} state - CSRF protection state token
 * @returns {string} Authorization URL
 */
export function getGoogleAuthUrl(state) {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth not configured')
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })

  return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from Google
 * @returns {Promise<object>} Token response
 */
export async function exchangeCodeForToken(code) {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth not configured')
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    })

    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Google OAuth token exchange error:', error)
    throw error
  }
}

/**
 * Get user info from Google
 * @param {string} accessToken - Google access token
 * @returns {Promise<object>} User info
 */
export async function getGoogleUserInfo(accessToken) {
  try {
    const response = await fetch(GOOGLE_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get Google user info: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Google user info retrieval error:', error)
    throw error
  }
}

/**
 * Handle Google OAuth callback
 * @param {string} code - Authorization code
 * @param {string} state - State token for CSRF verification
 * @returns {Promise<object>} { success, user, error }
 */
export async function handleGoogleCallback(code, state) {
  try {
    // Verify state (in production, check against session)
    if (!state) {
      return {
        success: false,
        error: 'Invalid state parameter',
      }
    }

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code)
    const { access_token: accessToken, id_token: idToken } = tokenResponse

    // Get user info
    const userInfo = await getGoogleUserInfo(accessToken)

    return {
      success: true,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        provider: 'google',
      },
      tokens: {
        accessToken,
        idToken,
      },
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Refresh Google access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} New token response
 */
export async function refreshGoogleToken(refreshToken) {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth not configured')
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Google token refresh error:', error)
    throw error
  }
}

/**
 * Get Google OAuth configuration status
 * @returns {object} Configuration status
 */
export function getGoogleOAuthStatus() {
  const configured = isGoogleOAuthConfigured()
  return {
    configured,
    clientId: configured ? process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...' : null,
    redirectUri: configured ? process.env.GOOGLE_OAUTH_REDIRECT_URI : null,
  }
}
