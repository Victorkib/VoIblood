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
  // Check configuration first
  const configured = isSupabaseConfigured()
  
  if (!configured) {
    console.warn('Supabase not properly configured. Using mock auth client.')
    // Return a mock client object that won't crash
    return {
      auth: {
        onAuthStateChange: () => ({ 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }),
        signOut: async () => ({}),
      },
    }
  }
  
  // Return existing client to prevent multiple instances
  if (browserClient) {
    return browserClient
  }
  
  try {
    // Only attempt to create if we have valid keys
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration')
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
    
    browserClient = client
    return browserClient
  } catch (error) {
    console.error('Failed to create Supabase client:', error.message)
    // Return mock client as fallback
    return {
      auth: {
        onAuthStateChange: () => ({ 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }),
        signOut: async () => ({}),
      },
    }
  }
}

/**
 * Create Supabase client for server-side operations
 * Uses service role key for admin operations
 * @param {string} [accessToken] - Optional user access token
 */
export function createServerClient(accessToken) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not properly configured for server client.')
    // Return mock client
    return {
      from: () => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      auth: {
        admin: {
          createUser: async () => ({ data: null, error: null }),
        },
      },
    }
  }

  try {
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
  } catch (error) {
    console.error('Failed to create server Supabase client:', error)
    // Return mock client
    return {
      from: () => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      auth: {
        admin: {
          createUser: async () => ({ data: null, error: null }),
        },
      },
    }
  }
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
