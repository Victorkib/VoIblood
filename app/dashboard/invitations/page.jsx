'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  Calendar,
  UserCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function InvitationsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState([])
  const [error, setError] = useState(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchEmail, setSearchEmail] = useState('')
  
  // Modal states
  const [resendModalOpen, setResendModalOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState(null)
  const [resending, setResending] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvitations()
    }
  }, [isAuthenticated, statusFilter])

  const fetchInvitations = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      
      const response = await fetch(`/api/invitations?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch invitations')
      }
      
      const data = await response.json()
      setInvitations(data.data || [])
    } catch (err) {
      console.error('[Invitations] Fetch error:', err)
      setError(err.message)
      toast.error('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = (token) => {
    const inviteLink = `${window.location.origin}/auth/signup?token=${token}`
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invitation link copied to clipboard')
  }

  const handleResend = async () => {
    if (!selectedInvitation) return
    
    setResending(true)
    try {
      const response = await fetch('/api/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ invitationId: selectedInvitation._id }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resend invitation')
      }
      
      toast.success('Invitation email resent successfully')
      setResendModalOpen(false)
      setSelectedInvitation(null)
      fetchInvitations()
    } catch (err) {
      console.error('[Invitations] Resend error:', err)
      toast.error(err.message)
    } finally {
      setResending(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedInvitation) return
    
    setDeleting(true)
    try {
      const response = await fetch('/api/invitations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ invitationId: selectedInvitation._id }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel invitation')
      }
      
      toast.success('Invitation cancelled successfully')
      setDeleteConfirmOpen(false)
      setSelectedInvitation(null)
      fetchInvitations()
    } catch (err) {
      console.error('[Invitations] Cancel error:', err)
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      expired: 'outline',
      cancelled: 'outline',
    }
    
    const icons = {
      pending: Clock,
      accepted: CheckCircle,
      declined: XCircle,
      expired: Calendar,
      cancelled: AlertCircle,
    }
    
    const Icon = icons[status] || Clock
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getDaysUntilExpiry = (expiresAt) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffTime = expires - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredInvitations = invitations.filter(inv => {
    if (!searchEmail) return true
    return inv.email?.toLowerCase().includes(searchEmail.toLowerCase())
  })

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Please sign in to view invitations</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track organization invitations
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/super-admin/users')}>
          Invite User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations.filter(i => i.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations.filter(i => i.status === 'accepted').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations.filter(i => i.status === 'expired').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardDescription>Filter and search invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive py-8">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invitations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation) => (
                  <TableRow key={invitation._id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invitation.role?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invitation.organizationId?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {invitation.invitedBy?.fullName || 'System'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status)}
                    </TableCell>
                    <TableCell>
                      {invitation.status === 'pending' ? (
                        <span className={getDaysUntilExpiry(invitation.expiresAt) <= 2 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                          {getDaysUntilExpiry(invitation.expiresAt)} days
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(invitation.token)}
                              title="Copy invitation link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvitation(invitation)
                                setResendModalOpen(true)
                              }}
                              title="Resend email"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvitation(invitation)
                                setDeleteConfirmOpen(true)
                              }}
                              title="Cancel invitation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {invitation.status === 'accepted' && (
                          <Badge variant="default" className="gap-1">
                            <UserCheck className="w-3 h-3" />
                            Joined
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resend Dialog */}
      <Dialog open={resendModalOpen} onOpenChange={setResendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend Invitation</DialogTitle>
            <DialogDescription>
              This will send a new invitation email to {selectedInvitation?.email}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResendModalOpen(false)}
              disabled={resending}
            >
              Cancel
            </Button>
            <Button onClick={handleResend} disabled={resending}>
              {resending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Resend Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this invitation? This action cannot be undone.
              The user will no longer be able to accept this invitation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Keep Invitation
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
