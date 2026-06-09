'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { DashboardOverview } from '@/components/dashboard/overview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [showPendingMessage, setShowPendingMessage] = useState(false)

  useEffect(() => {
    if (!isLoading && user?.accountStatus === 'pending_approval') {
      setShowPendingMessage(true)
    }
  }, [isLoading, user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (showPendingMessage) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Account pending approval
            </CardTitle>
            <CardDescription>
              Your organization request is being reviewed by iBlood platform administrators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-900/90">
              Hello <strong>{user?.fullName}</strong>, once approved you will access a dashboard
              tailored to your organization type (blood bank, hospital, NGO, or transfusion
              center).
            </p>
            <Button
              onClick={() => router.push('/pending-approval')}
              variant="outline"
              className="border-amber-300"
            >
              Check request status
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <DashboardOverview />
}
