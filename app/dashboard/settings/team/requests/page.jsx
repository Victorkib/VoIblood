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
  User,
  Mail,
  Calendar,
  Eye,
  AlertCircle,
  Users,
} from 'lucide-react'

const roleLabels = {
  org_admin: 'Org Admin',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
}

export default function JoinRequestsPage() {
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
      router.push('/auth/login?redirect=/dashboard/settings/team/requests')
      return
    }
    if (user?.role !== 'org_admin' && user?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }
    fetchRequests()
  }, [isAuthenticated, user, filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/organization-requests?status=${filter}`)
      const data = await res.json()

      if (res.ok) {
        setRequests(data.data || [])
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
      const res = await fetch(`/api/organization-requests/${selectedRequest._id}/actions`, {
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
          alert(`✅ ${selectedRequest.userId?.fullName} has been approved and added to your organization!`)
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
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading join requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Join Requests</h1>
          <p className="mt-2 text-foreground/60">Review and approve/deny requests to join your organization</p>
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

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

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
          <Users className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Requests Found</h3>
          <p className="text-foreground/60 mt-2">No one has requested to join your organization yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{req.userId?.fullName}</h3>
                        <p className="text-sm text-foreground/60">Requested role: {roleLabels[req.requestedRole]}</p>
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
                        <p className="text-foreground/60">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {req.userId?.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground/60">Requested Date</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground/60">Availability</p>
                        <p className="font-medium capitalize">{req.availability}</p>
                      </div>
                    </div>

                    {req.motivation && (
                      <div className="mt-3 p-3 bg-secondary/10 rounded-lg">
                        <p className="text-sm text-foreground/60 mb-1">Motivation</p>
                        <p className="text-sm">{req.motivation}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRequest(req)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
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
              <User className="w-5 h-5" />
              Review Join Request
            </DialogTitle>
            <DialogDescription>
              Review the applicant's details and decide whether to approve or reject
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Applicant Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Applicant Information
                </h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-foreground/60">Full Name</p>
                    <p className="font-medium">{selectedRequest.userId?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-foreground/60">Email</p>
                    <p className="font-medium">{selectedRequest.userId?.email}</p>
                  </div>
                  <div>
                    <p className="text-foreground/60">Requested Role</p>
                    <Badge className="mt-1">{roleLabels[selectedRequest.requestedRole]}</Badge>
                  </div>
                  <div>
                    <p className="text-foreground/60">Availability</p>
                    <p className="font-medium capitalize">{selectedRequest.availability}</p>
                  </div>
                </div>
                {selectedRequest.userId?.bio && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-foreground/60 mb-1">Bio</p>
                    <p className="text-sm">{selectedRequest.userId.bio}</p>
                  </div>
                )}
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
                      placeholder="Internal notes about this applicant..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-600">Rejection Reason *</label>
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
                      Approve & Add to Organization
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
