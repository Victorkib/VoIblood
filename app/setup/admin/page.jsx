'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Shield, CheckCircle, AlertCircle } from 'lucide-react'

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSetupAdmin = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Setup failed')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      console.error('Admin setup error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Admin Setup
          </h1>
          <p className="text-foreground/60">
            Set up {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'your-admin-email@example.com'} as the default admin user
          </p>
        </div>

        {!result && !error && (
          <div className="text-center">
            <p className="text-foreground/70 mb-6">
              This will create the default admin user and organization for the iBlood system.
            </p>
            <Button
              onClick={handleSetupAdmin}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? 'Setting up...' : 'Setup Admin User'}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Admin setup complete!</h3>
            </div>

            <div className="bg-secondary/20 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">User Details</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Email:</strong> {result.user.email}</div>
                  <div><strong>Name:</strong> {result.user.fullName}</div>
                  <div><strong>Role:</strong> {result.user.role}</div>
                  <div><strong>User ID:</strong> {result.user.id}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Organization Details</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {result.organization.name}</div>
                  <div><strong>Type:</strong> {result.organization.type}</div>
                  <div><strong>Email:</strong> {result.organization.email}</div>
                  <div><strong>ID:</strong> {result.organization.id}</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-foreground/60 mb-4">
                You can now log in with qinalexander56@gmail.com and access the admin dashboard.
              </p>
              <Button onClick={() => window.location.href = '/auth/login'}>
                Go to Login
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Setup Failed</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>

            <div className="text-center">
              <Button onClick={handleSetupAdmin} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
