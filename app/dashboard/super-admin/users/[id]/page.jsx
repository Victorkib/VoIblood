'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  Building2,
  Key,
  FileText,
  TrendingUp
} from 'lucide-react'

export default function UserDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    if (params.id) {
      fetchUserDetails(params.id)
    }
  }, [isAuthenticated, user, params.id])

  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all users and find the specific one
      const usersRes = await fetch('/api/admin/users?limit=100')
      const usersData = await usersRes.json()

      if (!usersRes.ok) {
        throw new Error(usersData.error || 'Failed to fetch users')
      }

      const foundUser = usersData.data.find(u => u.id === userId)
      
      if (!foundUser) {
        throw new Error('User not found')
      }

      setUserData(foundUser)

      // Fetch organization if user has one
      if (foundUser.organizationId) {
        try {
          const orgRes = await fetch(`/api/admin/organizations/${foundUser.organizationId}`)
          const orgData = await orgRes.json()
          if (orgRes.ok) {
            setOrganization(orgData.data)
          }
        } catch (err) {
          console.error('Failed to fetch organization:', err)
        }
      }

      // Generate mock audit logs (in production, this would come from an API)
      setAuditLogs(generateMockAuditLogs(foundUser))

    } catch (err) {
      setError(err.message || 'Failed to fetch user details')
    } finally {
      setLoading(false)
    }
  }

  const generateMockAuditLogs = (user) => {
    // Mock audit logs for demonstration
    const actions = [
      { action: 'auth.login', description: 'User logged in', severity: 'low' },
      { action: 'donors.create', description: 'Created new donor', severity: 'medium' },
      { action: 'inventory.view', description: 'Viewed inventory', severity: 'low' },
      { action: 'requests.approve', description: 'Approved blood request', severity: 'high' },
      { action: 'users.update', description: 'Updated user profile', severity: 'medium' },
    ]

    return actions.map((action, index) => ({
      id: index + 1,
      action: action.action,
      description: action.description,
      severity: action.severity,
      timestamp: new Date(Date.now() - (index * 3600000)).toISOString(), // Spread over hours
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0',
    }))
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

  const getSeverityBadge = (severity) => {
    const variants = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={variants[severity] || variants.low}>
        {severity}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Error Loading User</h2>
          <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
          <Button onClick={() => router.push('/dashboard/super-admin/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{userData.fullName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {getRoleBadge(userData.role)}
            {getStatusBadge(userData.accountStatus)}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold capitalize">{userData.accountStatus}</div>
            <p className="text-xs text-gray-500 mt-1">
              {userData.emailVerified ? 'Email verified' : 'Email not verified'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold capitalize">{userData.role.replace('_', ' ')}</div>
            <p className="text-xs text-gray-500 mt-1">
              Access level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Login</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {userData.lastLoginAt 
                ? new Date(userData.lastLoginAt).toLocaleDateString()
                : 'Never'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {userData.lastLoginAt 
                ? new Date(userData.lastLoginAt).toLocaleTimeString()
                : 'No login history'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(userData.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Account created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <div className="mt-1 text-lg">{userData.fullName}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email Address</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${userData.email}`} className="text-blue-600 hover:underline">
                  {userData.email}
                </a>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email Verified</label>
              <div className="mt-1">
                {userData.emailVerified ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Verified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Organization</label>
                  <div className="mt-1 text-lg">{organization.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <div className="mt-1 capitalize">{organization.type.replace('_', ' ')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <div className="mt-1">
                    {organization.city}, {organization.country}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Not assigned to any organization</p>
                <p className="text-sm mt-1">This user needs to be assigned to an organization</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Permissions & Access
          </CardTitle>
          <CardDescription>
            Access levels based on role: <strong className="capitalize">{userData.role.replace('_', ' ')}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">Resource Access</h4>
              <div className="space-y-1">
                <PermissionItem label="View Donors" granted={true} />
                <PermissionItem label="Create Donors" granted={['org_admin', 'manager', 'staff', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Edit Donors" granted={['org_admin', 'manager', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Delete Donors" granted={['org_admin', 'super_admin'].includes(userData.role)} />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">Inventory Access</h4>
              <div className="space-y-1">
                <PermissionItem label="View Inventory" granted={true} />
                <PermissionItem label="Create Records" granted={['org_admin', 'manager', 'staff', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Edit Records" granted={['org_admin', 'manager', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Delete Records" granted={['org_admin', 'super_admin'].includes(userData.role)} />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">Request Management</h4>
              <div className="space-y-1">
                <PermissionItem label="View Requests" granted={true} />
                <PermissionItem label="Create Requests" granted={['org_admin', 'manager', 'staff', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Approve Requests" granted={['org_admin', 'manager', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Reject Requests" granted={['org_admin', 'manager', 'super_admin'].includes(userData.role)} />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">User Management</h4>
              <div className="space-y-1">
                <PermissionItem label="View Users" granted={['org_admin', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Create Users" granted={['org_admin', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Edit Users" granted={['org_admin', 'super_admin'].includes(userData.role)} />
                <PermissionItem label="Delete Users" granted={['org_admin', 'super_admin'].includes(userData.role)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Activity (Audit Log)
          </CardTitle>
          <CardDescription>
            Last {auditLogs.length} actions performed by this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">{log.description}</div>
                    <div className="text-xs text-gray-500">{log.action}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(log.severity)}
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper component for permission items
function PermissionItem({ label, granted }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-700">{label}</span>
      {granted ? (
        <Badge className="bg-green-100 text-green-800 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Granted
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-800 text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Denied
        </Badge>
      )}
    </div>
  )
}
