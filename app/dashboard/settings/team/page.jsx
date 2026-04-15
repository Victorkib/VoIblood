'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mail,
  Copy,
  X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROLES = [
  { value: 'org_admin', label: 'Organization Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
]

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending_approval', label: 'Pending' },
]

export default function TeamPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 })
  const [error, setError] = useState(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  
  // Forms
  const [editForm, setEditForm] = useState({ role: '', accountStatus: '' })
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff', department: '', title: '', message: '' })
  const [createForm, setCreateForm] = useState({ email: '', fullName: '', role: 'staff', temporaryPassword: '' })
  
  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [createdInvitation, setCreatedInvitation] = useState(null)

  // Redirect if not authenticated or not org_admin/staff
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/settings/team')
      return
    }
    if (!user?.organizationId) {
      router.push('/dashboard/setup')
      return
    }
    // org_admin, manager, staff can view team
    if (!['org_admin', 'manager', 'staff'].includes(user.role)) {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, user, router])

  // Fetch team members
  useEffect(() => {
    fetchTeamMembers()
  }, [pagination.page, roleFilter, statusFilter])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
        organizationId: user.organizationId,
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })
      
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        // Filter to only show users from this organization
        const orgMembers = data.data.filter(m => m.organizationId === user.organizationId)
        setMembers(orgMembers)
        setPagination(prev => ({
          ...prev,
          total: orgMembers.length,
          pages: Math.ceil(orgMembers.length / 20),
        }))
      } else {
        setError(data.error || 'Failed to fetch team members')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMember = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    
    try {
      const res = await fetch(`/api/admin/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify(editForm),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setActionSuccess('Member updated successfully!')
        setEditModalOpen(false)
        fetchTeamMembers()
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || 'Failed to update member')
      }
    } catch (err) {
      setActionError('Failed to update member')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInviteMember = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    setCreatedInvitation(null)
    
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          ...inviteForm,
          organizationId: user.organizationId,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setCreatedInvitation(data.data)
        setActionSuccess('Invitation created successfully!')
      } else {
        setActionError(data.error || 'Failed to create invitation')
      }
    } catch (err) {
      setActionError('Failed to create invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateMember = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    setCreatedCredentials(null)
    
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          ...createForm,
          organizationId: user.organizationId,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setCreatedCredentials(data.data.credentials)
        setActionSuccess('User created successfully!')
        fetchTeamMembers()
      } else {
        setActionError(data.error || 'Failed to create user')
      }
    } catch (err) {
      setActionError('Failed to create user')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (member) => {
    setSelectedMember(member)
    setEditForm({ role: member.role, accountStatus: member.accountStatus })
    setEditModalOpen(true)
  }

  const getRoleBadge = (role) => {
    const variants = {
      super_admin: 'bg-purple-100 text-purple-800',
      org_admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      staff: 'bg-gray-100 text-gray-800',
      viewer: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800',
    }
    return <Badge className={variants[role] || variants.staff}>{role.replace('_', ' ')}</Badge>
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
    }
    return <Badge className={variants[status] || variants.inactive}>{status.replace('_', ' ')}</Badge>
  }

  // Only org_admin can edit/invite/create
  const canManageTeam = user?.role === 'org_admin'

  if (!isAuthenticated || !user?.organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage your organization's team members</p>
        </div>
        {canManageTeam && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteModalOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
            <Button variant="outline" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Member
            </Button>
          </div>
        )}
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {actionSuccess}
        </div>
      )}
      
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {actionError}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ACCOUNT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {pagination.total} member{pagination.total !== 1 ? 's' : ''} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.fullName}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.accountStatus)}</TableCell>
                    <TableCell>
                      {member.lastLoginAt ? (
                        <div className="text-sm">
                          {new Date(member.lastLoginAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </TableCell>
                    {canManageTeam && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(member)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManageTeam ? 5 : 4} className="text-center py-12 text-gray-500">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update member role and status</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <div>
              <Label>Member</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedMember?.fullName}</div>
                <div className="text-sm text-gray-500">{selectedMember?.email}</div>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role">Role *</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter(r => r.value !== 'super_admin').map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Account Status *</Label>
              <Select value={editForm.accountStatus} onValueChange={(value) => setEditForm(prev => ({ ...prev, accountStatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send invitation link via email</DialogDescription>
          </DialogHeader>
          
          {createdInvitation ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Invitation Created!</h4>
                </div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="text-gray-600 mb-1">Invitation Link:</p>
                    <div className="flex gap-2">
                      <Input value={createdInvitation.invitationLink} readOnly className="font-mono text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdInvitation.invitationLink)
                          setActionSuccess('Link copied!')
                          setTimeout(() => setActionSuccess(null), 2000)
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600 mb-1">Sent to:</p>
                    <p className="font-medium">{createdInvitation.invitation.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Role: {createdInvitation.invitation.role.replace('_', ' ')} • 
                      Expires in {createdInvitation.invitation.daysUntilExpiry} days
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button size="sm" onClick={() => { setCreatedInvitation(null); setInviteModalOpen(false) }}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email *</Label>
                <Input 
                  id="invite-email" 
                  type="email" 
                  value={inviteForm.email} 
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))} 
                  placeholder="user@example.com"
                  required 
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role *</Label>
                <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => r.value !== 'super_admin').map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invite-department">Department</Label>
                  <Input 
                    id="invite-department" 
                    value={inviteForm.department} 
                    onChange={(e) => setInviteForm(prev => ({ ...prev, department: e.target.value }))} 
                    placeholder="e.g., IT"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-title">Title</Label>
                  <Input 
                    id="invite-title" 
                    value={inviteForm.title} 
                    onChange={(e) => setInviteForm(prev => ({ ...prev, title: e.target.value }))} 
                    placeholder="e.g., Developer"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="invite-message">Message (Optional)</Label>
                <Input 
                  id="invite-message" 
                  value={inviteForm.message} 
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))} 
                  placeholder="Personal message to include..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? (<> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating... </>) : ('Send Invitation')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Member Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Member</DialogTitle>
            <DialogDescription>Create a new member with temporary password</DialogDescription>
          </DialogHeader>
          
          {createdCredentials ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Member Created!</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-mono">{createdCredentials.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temporary Password:</span>
                    <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{createdCredentials.temporaryPassword}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(`${createdCredentials.email}\n${createdCredentials.temporaryPassword}`)
                    setActionSuccess('Credentials copied!')
                    setTimeout(() => setActionSuccess(null), 2000)
                  }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Credentials
                  </Button>
                  <Button size="sm" onClick={() => { setCreatedCredentials(null); setCreateModalOpen(false) }}>Done</Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email *</Label>
                <Input id="create-email" type="email" value={createForm.email} onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="create-fullName">Full Name *</Label>
                <Input id="create-fullName" value={createForm.fullName} onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="create-role">Role *</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => r.value !== 'super_admin').map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-password">Temporary Password (optional)</Label>
                <Input id="create-password" type="text" value={createForm.temporaryPassword} onChange={(e) => setCreateForm(prev => ({ ...prev, temporaryPassword: e.target.value }))} placeholder="Leave blank to auto-generate" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? (<> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating... </>) : ('Create Member')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
