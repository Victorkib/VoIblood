'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Building,
  UserPlus,
  Heart,
} from 'lucide-react'

export default function PendingApprovalPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/pending-approval')
      return
    }
    // Only redirect to dashboard if user is ACTIVE (approved)
    // Users with 'pending' role and 'pending_approval' status should STAY here
    if (!isLoading && isAuthenticated && user?.accountStatus === 'active' && user?.organizationId) {
      router.push('/dashboard')
      return
    }
    setChecking(false)
  }, [isAuthenticated, isLoading, user])

  if (checking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking your status...</p>
        </div>
      </div>
    )
  }

  // Determine signup type
  const isOrgCreation = user?.role === 'pending' && !user?.organizationId
  const isJoiningOrg = user?.role === 'pending' && user?.organizationId

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Pending Approval</h1>
          <p className="text-gray-600">Your request has been received and is being reviewed</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Request Status
            </CardTitle>
            <CardDescription>
              {isOrgCreation
                ? 'Your organization creation request is under review'
                : 'Your request to join the organization is pending'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                {isOrgCreation ? (
                  <Building className="w-5 h-5 text-yellow-600 mt-0.5" />
                ) : (
                  <UserPlus className="w-5 h-5 text-yellow-600 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-yellow-900">
                    {isOrgCreation ? 'Organization Creation Request' : 'Organization Join Request'}
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    {isOrgCreation
                      ? `Your request to create "${user?.organizationName || 'your organization'}" has been submitted to our platform administrators for review.`
                      : `Your request to join "${user?.organizationName || 'the organization'}" has been sent to the organization's admin for review.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 mb-1">Status</p>
                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 mb-1">Submitted</p>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 mb-1">Email</p>
                <p className="font-medium text-xs">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              What Happens Next?
            </CardTitle>
            <CardDescription>Here's what to expect while your request is being reviewed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-semibold text-green-900">Confirmation Email Sent</p>
                  <p className="text-sm text-green-800 mt-1">
                    We've sent a confirmation email to <strong>{user?.email}</strong> with your request details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Review Process</p>
                  <p className="text-sm text-blue-800 mt-1">
                    {isOrgCreation
                      ? 'Our platform administrators will review your organization creation request. This typically takes 24-48 hours.'
                      : 'The organization\'s admin will review your join request. This typically takes 1-3 business days.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Decision Notification</p>
                  <p className="text-sm text-purple-800 mt-1">
                    You'll receive an email notifying you of the decision. If approved, you'll get access to your dashboard immediately.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Need Help? */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Need Help?
            </CardTitle>
            <CardDescription>Contact us if you have any questions about your request</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Email Support</p>
                  <p className="font-medium text-sm">support@iblood.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Phone Support</p>
                  <p className="font-medium text-sm">+254 700 000 000</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Reference your email address <strong>{user?.email}</strong> when contacting us for faster assistance.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/auth/login')}
            className="flex-1"
          >
            Back to Login
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Check Status
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Info Note */}
        <p className="text-xs text-gray-500 text-center">
          You'll be automatically redirected to your dashboard once your request is approved.
          Keep checking this page or watch your email for updates.
        </p>
      </div>
    </div>
  )
}
