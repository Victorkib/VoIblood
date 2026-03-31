'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

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
          // The /api/auth/session endpoint reads from cookies, not local storage
          const cookieValue = JSON.stringify({
            user: {
              supabaseId: session.user.id,
              email: session.user.email,
              fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            },
            token: session.access_token,
            expiresAt: new Date(session.expires_at * 1000).toISOString(),
          })
          
          // Set cookie via API call (can't set httpOnly cookies from client)
          console.log('Setting auth-session cookie...')
          await fetch('/api/auth/set-cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookieValue }),
          })
          
          // Now call our session endpoint to sync MongoDB
          // This will CREATE the user in MongoDB if they don't exist
          const sessionRes = await fetch('/api/auth/session')
          const sessionData = await sessionRes.json()
          
          console.log('MongoDB sync result:', sessionData)
          
          if (sessionData.user) {
            console.log('MongoDB user synced successfully:', sessionData.user.email)
            
            // Redirect based on user state
            if (!sessionData.user.hasOrganization) {
              console.log('No organization, redirecting to setup')
              router.push('/dashboard/setup')
            } else {
              console.log('Has organization, redirecting to dashboard')
              router.push('/dashboard')
            }
          } else {
            console.error('MongoDB sync returned null - this should not happen!')
            router.push('/auth/login?error=Failed%20to%20create%20user%20in%20database')
          }
        } else {
          console.error('No Supabase session found after OAuth')
          router.push('/auth/login?error=Session%20not%20created')
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/auth/login?error=Authentication%20failed')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing authentication...</h2>
        <p className="text-gray-600">Please wait while we sign you in</p>
        <p className="text-sm text-gray-500 mt-4">This should only take a moment</p>
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
