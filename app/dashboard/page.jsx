'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { DashboardOverview } from '@/components/dashboard/overview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowRight, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [showPendingMessage, setShowPendingMessage] = useState(false)

  useEffect(() => {
    // If user is pending approval, show pending message instead of dashboard
    if (!isLoading && user?.accountStatus === 'pending_approval') {
      setShowPendingMessage(true)
    }
  }, [isLoading, user])

  if (showPendingMessage) {
    return (
      <div className="space-y-8">
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Account Pending Approval
            </CardTitle>
            <CardDescription>Your organization creation request is being reviewed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-800">
              Hello <strong>{user?.fullName}</strong>, your account is currently pending approval by our platform administrators.
              Once approved, you will have full access to your organization dashboard.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/pending-approval')}
                variant="outline"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                Check Request Status
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-foreground/60">Welcome to your blood bank management system</p>
      </div>

      <DashboardOverview />
    </div>
  )
}
