'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  User,
  Mail,
  Calendar,
  Eye,
  AlertCircle,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

const orgTypeLabels = {
  blood_bank: 'Blood Bank',
  hospital: 'Hospital',
  transfusion_center: 'Transfusion Center',
  ngo: 'NGO',
}

export default function OrgRequestsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/super-admin/org-requests')
      return
    }
    if (user?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }
    fetchRequests()
  }, [isAuthenticated, user, filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/org-requests?status=${filter}`)
      const data = await res.json()

      if (res.ok) {
        setRequests(data.data)
      } else {
        setError(data.error || 'Failed to fetch requests')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleViewRequest = (req) => {
    setSelectedRequest(req)
    setAdminNotes('')
    setRejectionReason('')
    setIsDialogOpen(true)
  }

  const handleAction = async (action) => {
    if (!selectedRequest) return

    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please explain why this request is being rejected.',
        variant: 'destructive',
      })
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/org-requests/${selectedRequest._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          action,
          adminNotes: adminNotes || undefined,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setIsDialogOpen(false)
        fetchRequests()
        if (action === 'approve') {
          toast({
            title: 'Organization approved',
            description: `"${data.data?.organizationName}" is live. The requester is now org admin.`,
          })
        } else {
          toast({
            title: 'Request rejected',
            description: 'The applicant has been notified by email.',
          })
        }
      } else {
        toast({
          title: 'Action failed',
          description: data.error || 'Failed to process request',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: 'Network error',
        description: 'Could not reach the server. Try again.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading organization requests...</p>
        </div>
      </div>
    )
  }

  const requesterEmail = (req) => req.userId?.email || req.userEmail

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-600/10 via-background to-purple-500/5 p-8">
        <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Platform onboarding
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Organization requests
            </h1>
            <p className="mt-2 max-w-xl text-foreground/60">
              Review self-signup applications. Approved requests create a live organization and assign the applicant as org admin.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit text-sm px-3 py-1">
            {requests.length} shown
          </Badge>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
          >
            <option value="pending">Pending Only</option>
            <option value="pending_email_verification">Awaiting Email Verification</option>
            <option value="all">All Requests</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </Card>

      {/* Requests List */}
      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRequests} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Requests Found</h3>
          <p className="text-foreground/60 mt-2">
            {filter === 'pending_email_verification'
              ? 'No requests are waiting for applicant email verification right now.'
              : 'No organization creation requests at this time'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{req.requestedOrgName}</h3>
                        <p className="text-sm text-foreground/60">
                          {req.userId?.fullName || requesterEmail(req) || 'Pending verification'}
                        </p>
                      </div>
                      <Badge
                        className={
                          req.status === 'pending_email_verification'
                            ? 'bg-blue-100 text-blue-800'
                            :
                          req.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : req.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {req.status === 'pending_email_verification'
                          ? 'Awaiting verification'
                          : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-foreground/60">Organization Type</p>
                        <p className="font-medium">{orgTypeLabels[req.requestedOrgType] || req.requestedOrgType}</p>
                      </div>
                      <div>
                        <p className="text-foreground/60">Requester Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {requesterEmail(req) || '—'}
                        </p>
                      </div>
                      {(req.requestedOrgPhone || req.requestedOrgCity) && (
                        <div>
                          <p className="text-foreground/60">Contact / Location</p>
                          <p className="font-medium flex items-center gap-1">
                            {req.requestedOrgPhone && (
                              <>
                                <Phone className="w-3 h-3 shrink-0" />
                                {req.requestedOrgPhone}
                              </>
                            )}
                          </p>
                          {req.requestedOrgCity && (
                            <p className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {[req.requestedOrgAddress, req.requestedOrgCity, req.requestedOrgCountry]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="text-foreground/60">Submitted</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {req.motivation && (
                      <div className="mt-3 p-3 bg-secondary/10 rounded-lg">
                        <p className="text-sm text-foreground/60 mb-1">Motivation</p>
                        <p className="text-sm">{req.motivation}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRequest(req)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    {req.status === 'approved' && req.createdOrganizationId && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/super-admin/organizations/${req.createdOrganizationId._id || req.createdOrganizationId}`}>
                          View org
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Review Organization Request
            </DialogTitle>
            <DialogDescription>
              Review the details and decide whether to approve or reject this request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Request Details */}
              <div className="p-4 bg-secondary/10 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-foreground/60">Organization Name</p>
                  <p className="font-semibold text-lg">{selectedRequest.requestedOrgName}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60">Organization Type</p>
                  <p className="font-medium">{orgTypeLabels[selectedRequest.requestedOrgType]}</p>
                </div>
                {selectedRequest.requestedOrgDescription && (
                  <div>
                    <p className="text-sm text-foreground/60">Description</p>
                    <p className="text-sm">{selectedRequest.requestedOrgDescription}</p>
                  </div>
                )}
                {(selectedRequest.requestedOrgPhone ||
                  selectedRequest.requestedOrgAddress ||
                  selectedRequest.requestedOrgCity) && (
                  <div className="rounded-lg border bg-background/80 p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground/80">Location & contact</p>
                    {selectedRequest.requestedOrgPhone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="w-4 h-4 text-violet-600" />
                        {selectedRequest.requestedOrgPhone}
                      </p>
                    )}
                    {(selectedRequest.requestedOrgAddress || selectedRequest.requestedOrgCity) && (
                      <p className="text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                        <span>
                          {[
                            selectedRequest.requestedOrgAddress,
                            selectedRequest.requestedOrgCity,
                            selectedRequest.requestedOrgState,
                            selectedRequest.requestedOrgCountry,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Requester Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Requester Information
                </h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-foreground/60">Name:</span> {selectedRequest.userId?.fullName}</p>
                  <p><span className="text-foreground/60">Email:</span> {requesterEmail(selectedRequest)}</p>
                  {selectedRequest.userId?.bio && (
                    <p><span className="text-foreground/60">Bio:</span> {selectedRequest.userId.bio}</p>
                  )}
                </div>
              </div>

              {/* Motivation */}
              {selectedRequest.motivation && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Motivation</h4>
                  <p className="text-sm">{selectedRequest.motivation}</p>
                </div>
              )}

              {/* Admin Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Notes (Optional)</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Internal notes about this decision..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-600">Rejection reason (required to reject)</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Why is this request being rejected?"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAction('reject')}
                      disabled={actionLoading}
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Reject Request
                    </Button>
                    <Button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve & Create Organization
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
