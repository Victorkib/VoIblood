'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Search,
  MoreVertical,
  Edit,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  XCircle,
  Building2,
  Plus,
  Mail,
  Copy,
  Link as LinkIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'org_admin', label: 'Organization Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'pending', label: 'Pending' },
]

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending_approval', label: 'Pending Approval' },
]

export default function UsersPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 })
  const [error, setError] = useState(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false)
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  
  // Create form
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    role: 'staff',
    organizationId: '',
    temporaryPassword: '',
  })
  
  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'staff',
    organizationId: '',
    department: '',
    title: '',
    message: '',
  })
  
  // Created user credentials (for display)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  
  // Created invitation (for display)
  const [createdInvitation, setCreatedInvitation] = useState(null)
  
  // Edit form
  const [editForm, setEditForm] = useState({
    role: '',
    accountStatus: '',
    organizationId: '',
  })
  
  // Organizations list (for assignment)
  const [organizations, setOrganizations] = useState([])
  
  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Redirect if not super_admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/super-admin/users')
      return
    }
    if (user?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, user, router])

  // Fetch organizations for dropdown
  useEffect(() => {
    fetchOrganizations()
  }, [])

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [pagination.page, roleFilter, statusFilter])

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/admin/organizations?limit=100')
      const data = await res.json()
      if (res.ok) {
        setOrganizations(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })
      
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setUsers(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages,
        }))
      } else {
        setError(data.error || 'Failed to fetch users')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    setActionSuccess(null)
    
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify(editForm),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setActionSuccess('User updated successfully!')
        setEditModalOpen(false)
        fetchUsers()
        
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || 'Failed to update user')
      }
    } catch (err) {
      setActionError('Failed to update user')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditForm({
      role: user.role,
      accountStatus: user.accountStatus,
      organizationId: user.organizationId || '',
    })
    setEditModalOpen(true)
  }

  // Bulk action handlers
  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
    setSelectAll(!selectAll)
  }

  const handleBulkSuspend = async () => {
    if (selectedUsers.length === 0) return
    
    if (!confirm(`Suspend ${selectedUsers.length} user(s)? This action can be undone.`)) {
      return
    }

    setBulkActionLoading(true)
    setActionError(null)

    try {
      const promises = selectedUsers.map(userId =>
        fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // CRITICAL: Send cookies (auth-session)
          body: JSON.stringify({ accountStatus: 'suspended' }),
        })
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length

      setActionSuccess(`Successfully suspended ${successCount}/${selectedUsers.length} user(s)`)
      setSelectedUsers([])
      setSelectAll(false)
      fetchUsers()
      
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError('Failed to suspend users')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkActivate = async () => {
    if (selectedUsers.length === 0) return
    
    if (!confirm(`Activate ${selectedUsers.length} user(s)?`)) {
      return
    }

    setBulkActionLoading(true)
    setActionError(null)

    try {
      const promises = selectedUsers.map(userId =>
        fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // CRITICAL: Send cookies (auth-session)
          body: JSON.stringify({ accountStatus: 'active' }),
        })
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length

      setActionSuccess(`Successfully activated ${successCount}/${selectedUsers.length} user(s)`)
      setSelectedUsers([])
      setSelectAll(false)
      fetchUsers()
      
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError('Failed to activate users')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkAssignOrg = async (organizationId) => {
    if (selectedUsers.length === 0 || !organizationId) return

    setBulkActionLoading(true)
    setActionError(null)

    try {
      const promises = selectedUsers.map(userId =>
        fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // CRITICAL: Send cookies (auth-session)
          body: JSON.stringify({ organizationId }),
        })
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length

      setActionSuccess(`Successfully assigned ${successCount}/${selectedUsers.length} user(s) to organization`)
      setSelectedUsers([])
      setSelectAll(false)
      fetchUsers()
      
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError('Failed to assign users to organization')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Create user handler
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    setCreatedCredentials(null)

    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify(createForm),
      })

      const data = await res.json()

      if (res.ok) {
        setCreatedCredentials(data.data.credentials)
        setActionSuccess('User created successfully!')
        fetchUsers()
        
        // Don't close modal yet - show credentials first
      } else {
        setActionError(data.error || 'Failed to create user')
      }
    } catch (err) {
      setActionError('Failed to create user')
    } finally {
      setActionLoading(false)
    }
  }

  // Invite user handler
  const handleInviteUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    setCreatedInvitation(null)

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify(inviteForm),
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

  const getRoleBadge = (role) => {
    const variants = {
      super_admin: 'bg-purple-100 text-purple-800',
      org_admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      staff: 'bg-gray-100 text-gray-800',
      viewer: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800',
    }
    return (
      <Badge className={variants[role] || variants.staff}>
        {role.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
    }
    return (
      <Badge className={variants[status] || variants.inactive}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (!isAuthenticated || user?.role !== 'super_admin') {
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
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage all users across all organizations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setInviteModalOpen(true)}
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite User
          </Button>
          <Button
            variant="outline"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              window.open('/api/admin/export/users?type=users', '_blank')
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
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

      {/* Bulk Action Bar */}
      {selectedUsers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkActivate}
                  disabled={bulkActionLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkSuspend}
                  disabled={bulkActionLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Open organization assignment modal
                    setActionSuccess('Organization assignment feature coming soon')
                    setTimeout(() => setActionSuccess(null), 3000)
                  }}
                  disabled={bulkActionLoading}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Assign to Org
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedUsers([])
                    setSelectAll(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <SelectTrigger className="w-[200px]">
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
              <SelectTrigger className="w-[200px]">
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {pagination.total} users found in the system
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => toggleSelectUser(u.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{u.fullName}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell>
                        {u.organizationName ? (
                          <div className="text-sm">{u.organizationName}</div>
                        ) : (
                          <span className="text-sm text-gray-400">No organization</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(u.accountStatus)}</TableCell>
                      <TableCell>
                        {u.lastLoginAt ? (
                          <div className="text-sm">
                            {new Date(u.lastLoginAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(u)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="w-4 h-4 mr-2" />
                              View Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem className={u.accountStatus === 'active' ? 'text-red-600' : 'text-green-600'}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              {u.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <UserX className="w-4 h-4 mr-2" />
                              Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and organization
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label>User</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedUser?.fullName}</div>
                <div className="text-sm text-gray-500">{selectedUser?.email}</div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="accountStatus">Account Status *</Label>
              <Select
                value={editForm.accountStatus}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, accountStatus: value }))}
              >
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

            <div>
              <Label htmlFor="organization">Assign to Organization</Label>
              <Select
                value={editForm.organizationId || 'none'}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, organizationId: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.type.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                User will be able to access this organization's data
              </p>
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

      {/* Create User Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new user with temporary password
            </DialogDescription>
          </DialogHeader>
          
          {createdCredentials ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">User Created Successfully!</h4>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${createdCredentials.email}\n${createdCredentials.temporaryPassword}`)
                      setActionSuccess('Credentials copied!')
                      setTimeout(() => setActionSuccess(null), 2000)
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Credentials
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreatedCredentials(null)
                      setCreateModalOpen(false)
                      setCreateForm({
                        email: '',
                        fullName: '',
                        role: 'staff',
                        organizationId: '',
                        temporaryPassword: '',
                      })
                    }}
                  >
                    Done
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Share these credentials securely. User must change password on first login.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-fullName">Full Name *</Label>
                <Input
                  id="create-fullName"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-role">Role *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">Organization Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-organization">Assign to Organization</Label>
                <Select
                  value={createForm.organizationId || 'none'}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, organizationId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-password">Temporary Password (optional)</Label>
                <Input
                  id="create-password"
                  type="text"
                  value={createForm.temporaryPassword}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, temporaryPassword: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generates 12-character secure password if left blank
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send invitation link via email
            </DialogDescription>
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
                      <Input
                        value={createdInvitation.invitationLink}
                        readOnly
                        className="font-mono text-xs"
                      />
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
                  <div className="text-sm space-y-1">
                    <p className="text-gray-600">Send this link via email to:</p>
                    <p className="font-medium">{createdInvitation.invitation.email}</p>
                    <p className="text-xs text-gray-500">
                      Role: {createdInvitation.invitation.role.replace('_', ' ')} • 
                      Organization: {createdInvitation.invitation.organization.name}
                    </p>
                    <p className="text-xs text-orange-600">
                      ⏰ Expires in {createdInvitation.invitation.daysUntilExpiry} days
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreatedInvitation(null)
                      setInviteModalOpen(false)
                      setInviteForm({
                        email: '',
                        role: 'staff',
                        organizationId: '',
                        department: '',
                        title: '',
                        message: '',
                      })
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role *</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">Organization Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invite-organization">Organization *</Label>
                <Select
                  value={inviteForm.organizationId || 'none'}
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, organizationId: value === 'none' ? '' : value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
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
                    placeholder="IT"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-title">Title</Label>
                  <Input
                    id="invite-title"
                    value={inviteForm.title}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Developer"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="invite-message">Message</Label>
                <Input
                  id="invite-message"
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="You're invited to join our organization!"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
