/**
 * Supabase Client Configuration
 * Handles authentication and database operations
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  )
}

/**
 * Create Supabase client for client-side operations
 * Uses anon key for public operations
 */
let browserClient = null

export function createBrowserClient() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not properly configured. Authentication will not work.')
  }
  
  // Return existing client to prevent multiple instances
  if (browserClient) {
    return browserClient
  }
  
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  
  return browserClient
}

/**
 * Create Supabase client for server-side operations
 * Uses service role key for admin operations
 * @param {string} [accessToken] - Optional user access token
 */
export function createServerClient(accessToken) {
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * OAuth provider configuration
 */
export const OAUTH_PROVIDERS = {
  google: 'google',
  discord: 'discord',
  github: 'github',
}

/**
 * Get OAuth redirect URL
 * @param {string} provider - OAuth provider name
 * @returns {string}
 */
export function getOAuthRedirectURL(provider) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/auth/callback/${provider}`
}
