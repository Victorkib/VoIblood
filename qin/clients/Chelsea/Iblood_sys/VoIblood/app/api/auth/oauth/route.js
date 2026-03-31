/**
 * POST /api/auth/oauth
 * Initiate OAuth authentication with provider
 */

import { NextResponse } from 'next/server'
import { createServerClient, OAUTH_PROVIDERS } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { provider } = await request.json()

    if (!provider || !OAUTH_PROVIDERS[provider]) {
      return NextResponse.json(
        { error: 'Invalid OAuth provider' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        scopes: provider === 'google' ? 'email profile' : 
                provider === 'discord' ? 'identify email' :
                provider === 'github' ? 'user:email' : undefined,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
