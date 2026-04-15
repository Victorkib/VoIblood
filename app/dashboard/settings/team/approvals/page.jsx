'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Mail,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react'

export default function PendingApprovalsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/settings/team/approvals')
      return
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
      router.push('/dashboard')
      return
    }
    fetchPendingRequests()
  }, [isAuthenticated, user, router])

  const fetchPendingRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/admin/users/pending-approvals')
      const data = await res.json()

      if (res.ok) {
        setRequests(data.requests || [])
      } else {
        setError(data.error || 'Failed to load pending requests')
      }
    } catch (err) {
      console.error('Failed to fetch pending requests:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedRequest.user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          role: selectedRole,
          reviewNotes,
          organizationId: user.organizationId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setActionSuccess(`✅ ${selectedRequest.user.fullName} approved successfully!`)
        setIsApproveDialogOpen(false)
        setSelectedRequest(null)
        setReviewNotes('')
        fetchPendingRequests()
        setTimeout(() => setActionSuccess(null), 5000)
      } else {
        setActionError(data.error || 'Failed to approve user')
      }
    } catch (err) {
      console.error('Approve error:', err)
      setActionError('Failed to approve user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedRequest.user.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          organizationId: user.organizationId,
          reviewNotes,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setActionSuccess(`❌ Request rejected`)
        setIsRejectDialogOpen(false)
        setSelectedRequest(null)
        setReviewNotes('')
        fetchPendingRequests()
        setTimeout(() => setActionSuccess(null), 5000)
      } else {
        setActionError(data.error || 'Failed to reject request')
      }
    } catch (err) {
      console.error('Reject error:', err)
      setActionError('Failed to reject request')
    } finally {
      setActionLoading(false)
    }
  }

  const openApproveDialog = (request) => {
    setSelectedRequest(request)
    setSelectedRole(request.requestedRole || 'viewer')
    setIsApproveDialogOpen(true)
  }

  const openRejectDialog = (request) => {
    setSelectedRequest(request)
    setReviewNotes('')
    setIsRejectDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            Pending Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage organization join requests
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/settings/team')}>
          Back to Team
        </Button>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {actionError}
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{requests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              This feature coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              This feature coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && requests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-600 mb-4">
              There are no pending join requests at the moment
            </p>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings/team')}>
              View Team Members
            </Button>
          </CardContent>
        </Card>
      )}

      {requests.length > 0 && (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      {request.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{request.user.fullName}</CardTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                          <User className="w-3 h-3 mr-1" />
                          {request.requestedRole}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {request.user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {request.message && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Message to Admin</span>
                    </div>
                    <p className="text-sm text-gray-600">{request.message}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => openApproveDialog(request)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openRejectDialog(request)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button variant="outline" className="ml-auto">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Join Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>Approve <strong>{selectedRequest.user.fullName}</strong>'s request to join the organization</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="role">Assign Role *</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                  <SelectItem value="staff">Staff - Manage donors & inventory</SelectItem>
                  <SelectItem value="manager">Manager - Manage requests & team</SelectItem>
                  <SelectItem value="org_admin">Org Admin - Full organization control</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Requested role: {selectedRequest?.requestedRole}
              </p>
            </div>

            <div>
              <Label htmlFor="approveNotes">Welcome Message (Optional)</Label>
              <Textarea
                id="approveNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Welcome to the team! We're excited to have you..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be included in the approval email
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Assign Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Join Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>Reject <strong>{selectedRequest.user.fullName}</strong>'s request to join</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">This action cannot be undone</p>
                  <p className="text-sm text-amber-700 mt-1">
                    The user will be notified that their request was rejected.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="rejectNotes">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejectNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="We're currently not accepting new members..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be included in the rejection email
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading}
              variant="destructive"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
