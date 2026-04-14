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
} from 'lucide-react'

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
      alert('Please provide a rejection reason')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/org-requests/${selectedRequest._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          alert(`✅ Organization "${data.data.organizationName}" created successfully! User assigned as org_admin.`)
        } else {
          alert('✅ Request rejected successfully')
        }
      } else {
        alert(data.error || 'Failed to process request')
      }
    } catch (err) {
      alert('Failed to process request')
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization Creation Requests</h1>
          <p className="mt-2 text-foreground/60">Review and approve/deny requests to create new organizations</p>
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
          <p className="text-foreground/60 mt-2">No organization creation requests at this time</p>
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
                        <p className="text-sm text-foreground/60">Requested by {req.userId?.fullName}</p>
                      </div>
                      <Badge
                        className={
                          req.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : req.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-foreground/60">Organization Type</p>
                        <p className="font-medium">{orgTypeLabels[req.requestedOrgType] || req.requestedOrgType}</p>
                      </div>
                      <div>
                        <p className="text-foreground/60">Requester Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {req.userId?.email}
                        </p>
                      </div>
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
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {req.createdOrganizationId.name}
                      </Badge>
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
              </div>

              {/* Requester Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Requester Information
                </h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-foreground/60">Name:</span> {selectedRequest.userId?.fullName}</p>
                  <p><span className="text-foreground/60">Email:</span> {selectedRequest.userId?.email}</p>
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

                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-red-600">Rejection Reason *</label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Why is this request being rejected?"
                        rows={2}
                      />
                    </div>
                  )}

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
