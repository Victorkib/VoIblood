'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Mail, CheckCircle, XCircle, Users, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

function InvitePageComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      return
    }

    // Fetch invitation details from API
    const fetchInvitation = async () => {
      try {
        // For demo purposes, still allow demo tokens
        if (token.startsWith('demo-')) {
          setInvitation({
            id: 'demo-invitation',
            organizationName: 'Demo Blood Bank',
            organizationType: 'blood_bank',
            role: 'staff',
            invitedBy: 'Admin User',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            email: 'demo@example.com'
          })
          return
        }

        // Fetch real invitation from API
        const response = await fetch(`/api/invitations/validate?token=${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Invalid invitation')
        }

        const data = await response.json()
        setInvitation({
          id: data.data._id,
          organizationName: data.data.organizationId?.name || 'Unknown Organization',
          organizationType: data.data.organizationId?.type || 'organization',
          role: data.data.role,
          invitedBy: data.data.invitedBy?.fullName || 'Unknown',
          expiresAt: new Date(data.data.expiresAt),
          email: data.data.email,
          message: data.data.message,
          department: data.data.department,
          title: data.data.title,
        })
      } catch (err) {
        console.error('[Invite Page] Error fetching invitation:', err)
        setError(err.message || 'This invitation is invalid or has expired')
      }
    }

    fetchInvitation()
  }, [token])

  const handleAcceptInvite = async () => {
    if (!invitation || !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ token })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept invitation')
      }

      const data = await response.json()
      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      console.error('[v0] Accept invitation error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    router.push(`/auth/login?redirect=${encodeURIComponent('/auth/invite?token=' + token)}`)
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invitation</h1>
            <p className="text-foreground/60 mb-6">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => router.push('/auth/login')}>
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            You're Invited!
          </h1>
          <p className="text-foreground/60">
            You've been invited to join an organization on iBlood
          </p>
        </div>

        {/* Invitation Details */}
        {invitation && (
          <div className="bg-secondary/20 rounded-lg p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {invitation.organizationName}
              </h3>
              <div className="flex items-center justify-center gap-2 text-sm text-foreground/60">
                <Users className="w-4 h-4" />
                <span>Invitation to join as <strong className="text-foreground">{invitation.role.replace('_', ' ')}</strong></span>
              </div>
              <div className="text-xs text-foreground/40 mt-2">
                Invited by {invitation.invitedBy} • Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </div>
            </div>
            
            {/* Additional Details */}
            {(invitation.message || invitation.department || invitation.title) && (
              <div className="border-t border-secondary pt-4 mt-4">
                {invitation.message && (
                  <div className="mb-3">
                    <p className="text-xs text-foreground/60 mb-1">Message:</p>
                    <p className="text-sm text-foreground italic">&quot;{invitation.message}&quot;</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {invitation.department && (
                    <div>
                      <p className="text-xs text-foreground/60">Department</p>
                      <p className="text-foreground font-medium">{invitation.department}</p>
                    </div>
                  )}
                  {invitation.title && (
                    <div>
                      <p className="text-xs text-foreground/60">Title</p>
                      <p className="text-foreground font-medium">{invitation.title}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Expiry Warning */}
            {invitation.expiresAt && (
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>This invitation expires in {Math.ceil((new Date(invitation.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))} days</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isAuthenticated ? (
          <div className="text-center">
            <p className="text-foreground/60 mb-6">
              Please sign in to accept this invitation
            </p>
            <Button onClick={handleLogin} className="w-full">
              Sign In to Accept
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {success ? (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Invitation Accepted!
                </h3>
                <p className="text-foreground/60">
                  You've successfully joined {invitation?.organizationName}. Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Button 
                  onClick={handleAcceptInvite} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Accepting...' : 'Accept Invitation'}
                </Button>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                {error}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <InvitePageComponent />
    </Suspense>
  )
}
