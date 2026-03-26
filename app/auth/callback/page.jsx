'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters from hash fragment
        const hash = window.location.hash
        const params = new URLSearchParams(hash.substring(1))
        
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const error = params.get('error')
        const errorDescription = params.get('error_description')

        if (error) {
          console.error('OAuth error:', error, errorDescription)
          router.push(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }

        if (!accessToken) {
          router.push('/auth/login?error=No access token received')
          return
        }

        // Create Supabase client and set session
        const supabase = createBrowserClient()
        
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push(`/auth/login?error=${encodeURIComponent(sessionError.message)}`)
          return
        }

        // Redirect to API callback to handle server-side logic
        // Pass the session info to the API route
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken,
            refreshToken,
            user: data.user,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          // Redirect to dashboard or intended destination
          const redirectTo = searchParams.get('redirect') || '/dashboard'
          router.push(redirectTo)
        } else {
          const errorData = await response.json()
          router.push(`/auth/login?error=${encodeURIComponent(errorData.error || 'Authentication failed')}`)
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/auth/login?error=Authentication failed')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}
