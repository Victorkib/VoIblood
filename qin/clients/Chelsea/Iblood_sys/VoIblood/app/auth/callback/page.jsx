'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Loader2, Droplet, Heart } from 'lucide-react'

function AuthCallbackComponent() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('OAuth callback started, waiting for Supabase...')

      // Give Supabase time to process the OAuth callback and set session
      await new Promise(resolve => setTimeout(resolve, 2000))

      try {
        // Check if Supabase session exists
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        console.log('Supabase session:', session ? 'FOUND' : 'NOT FOUND')

        if (session) {
          console.log('Supabase session found, syncing to MongoDB...')

          // CRITICAL: Set the auth-session cookie from Supabase session!
          const cookieValue = JSON.stringify({
            user: {
              supabaseId: session.user.id,
              email: session.user.email,
              fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            },
            token: session.access_token,
            expiresAt: new Date(session.expires_at * 1000).toISOString(),
          })

          // Set cookie via API call
          console.log('Setting auth-session cookie...')
          const cookieRes = await fetch('/api/auth/set-cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookieValue }),
          })
          
          console.log('Cookie set response:', cookieRes.status)

          // CRITICAL: Wait for cookie to propagate
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Sync MongoDB
          console.log('Syncing to MongoDB...')
          const sessionRes = await fetch('/api/auth/session')
          const sessionData = await sessionRes.json()

          console.log('MongoDB sync result:', sessionData)

          if (sessionData.user) {
            console.log('MongoDB user synced successfully:', sessionData.user.email)
            console.log('User role:', sessionData.user.role)
            console.log('Has organization:', sessionData.user.hasOrganization)

            // CRITICAL: Force reload the page to refresh auth context
            // This ensures the AuthProvider picks up the new session
            console.log('Forcing page reload to sync auth state...')
            window.location.href = '/dashboard/super-admin'
          } else {
            console.error('MongoDB sync returned null - this should not happen!')
            window.location.href = '/auth/login?error=Failed%20to%20create%20user%20in%20database'
          }
        } else {
          console.error('No Supabase session found after OAuth')
          window.location.href = '/auth/login?error=Session%20not%20created'
        }
      } catch (error) {
        console.error('Callback error:', error)
        window.location.href = '/auth/login?error=Authentication%20failed'
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-600 via-red-500 to-red-700">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 text-center px-6">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Droplet className="w-12 h-12 text-white animate-pulse" />
          </div>
          {/* Rotating Ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-white/30 rounded-2xl animate-spin"></div>
        </div>
        
        {/* Loading Animation */}
        <div className="mb-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <Heart className="absolute inset-0 m-auto w-8 h-8 text-white animate-pulse" />
          </div>
        </div>
        
        {/* Text */}
        <h2 className="text-2xl font-bold text-white mb-3">
          Completing Authentication...
        </h2>
        <p className="text-lg text-white/90 mb-2">
          Please wait while we sign you in
        </p>
        <p className="text-sm text-white/70">
          This should only take a moment
        </p>
        
        {/* Progress Indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-400"></div>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackComponent />
    </Suspense>
  )
}
