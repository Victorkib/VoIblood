'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  Users,
  Droplet,
  FileText,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Activity,
  TrendingUp,
  Clock,
  LogIn,
  LogOut,
  Eye,
  Copy,
  KeyRound,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'

export default function OrganizationDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [organization, setOrganization] = useState(null)
  const [members, setMembers] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [isViewing, setIsViewing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [partnerSaving, setPartnerSaving] = useState(false)
  const [resendingUserId, setResendingUserId] = useState(null)
  const [lastSetupUrl, setLastSetupUrl] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    // Check if we're already viewing this organization
    const viewingOrgId = sessionStorage.getItem('viewingOrganizationId')
    if (viewingOrgId === params.id) {
      setIsViewing(true)
    }

    if (params.id) {
      fetchOrganizationDetails(params.id)
    }
  }, [isAuthenticated, user, params.id])

  const handleEnterOrganization = async () => {
    if (!organization) return
    
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}/enter`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setIsViewing(true)
        sessionStorage.setItem('viewingOrganizationId', organization.id)
        sessionStorage.setItem('viewingOrganizationName', organization.name)
        
        // Redirect to dashboard with org context
        router.push(`/dashboard?viewOrg=${organization.id}`)
      } else {
        setError(data.error || 'Failed to enter organization')
      }
    } catch (err) {
      setError('Failed to enter organization')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExitOrganization = async () => {
    if (!organization) return
    
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}/enter`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setIsViewing(false)
        sessionStorage.removeItem('viewingOrganizationId')
        sessionStorage.removeItem('viewingOrganizationName')
        
        // Refresh page to reset context
        router.refresh()
      } else {
        setError(data.error || 'Failed to exit organization')
      }
    } catch (err) {
      setError('Failed to exit organization')
    } finally {
      setActionLoading(false)
    }
  }

  const fetchOrganizationDetails = async (orgId) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch organization details
      const orgRes = await fetch(`/api/admin/organizations/${orgId}`)
      const orgData = await orgRes.json()

      if (!orgRes.ok) {
        throw new Error(orgData.error || 'Failed to fetch organization')
      }

      setOrganization(orgData.data)

      // Fetch members
      const membersRes = await fetch(`/api/admin/users?organizationId=${orgId}&limit=100`)
      const membersData = await membersRes.json()

      if (membersRes.ok) {
        setMembers(membersData.data)
      }

      // Fetch organization-specific stats (donors, inventory, requests)
      // For now, we'll calculate from available data
      setStats({
        totalMembers: membersData.data?.length || 0,
        activeMembers: membersData.data?.filter(m => m.accountStatus === 'active').length || 0,
        admins: membersData.data?.filter(m => m.role === 'org_admin').length || 0,
      })

    } catch (err) {
      setError(err.message || 'Failed to fetch organization details')
    } finally {
      setLoading(false)
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

  const handleToggleRewardsPartner = async (enabled) => {
    if (!organization) return
    setPartnerSaving(true)
    try {
      const res = await fetch('/api/gratitude/admin/partner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organizationId: organization.id,
          partnerActive: enabled,
          partnerOverride: organization.subscriptionPlan === 'professional',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update partner status')
      setOrganization((prev) => ({
        ...prev,
        rewardsProgram: data.data.rewardsProgram,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPartnerSaving(false)
    }
  }

  const handleResendActivation = async (memberId = null) => {
    if (!organization) return
    setResendingUserId(memberId || primaryAdmin?.id || 'org')
    setLastSetupUrl(null)
    try {
      const res = await fetch(
        `/api/admin/organizations/${organization.id}/resend-activation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: memberId || undefined }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend activation')

      setLastSetupUrl(data.data?.setupUrl || null)
      toast({
        title: 'Activation email sent',
        description: `New setup link sent to ${data.data?.email}. Previous links are no longer valid.`,
      })
    } catch (err) {
      toast({
        title: 'Could not resend activation',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setResendingUserId(null)
    }
  }

  const copySetupLink = async () => {
    if (!lastSetupUrl) return
    await navigator.clipboard.writeText(lastSetupUrl)
    toast({ title: 'Link copied', description: 'Paste into a message if email did not arrive.' })
  }

  const primaryAdmin =
    members.find((m) => m.role === 'org_admin') || members[0]

  const getTypeBadge = (type) => {
    const variants = {
      blood_bank: 'bg-red-100 text-red-800',
      hospital: 'bg-blue-100 text-blue-800',
      transfusion_center: 'bg-purple-100 text-purple-800',
      ngo: 'bg-green-100 text-green-800',
    }
    return (
      <Badge className={variants[type] || variants.blood_bank}>
        {type.replace('_', ' ')}
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
          <p className="text-gray-600">Loading organization details...</p>
        </div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Organization</h2>
          <p className="text-gray-600 mb-4">{error || 'Organization not found'}</p>
          <Button onClick={() => router.push('/dashboard/super-admin/organizations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
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
          <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {getTypeBadge(organization.type)}
            {getStatusBadge(organization.accountStatus)}
            {isViewing && (
              <Badge className="bg-purple-100 text-purple-800">
                <Eye className="w-3 h-3 mr-1" />
                Viewing
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isViewing ? (
            <Button
              variant="destructive"
              onClick={handleExitOrganization}
              disabled={actionLoading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit Organization
            </Button>
          ) : (
            <Button
              onClick={handleEnterOrganization}
              disabled={actionLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Enter Organization
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Active: {stats?.activeMembers || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.admins || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Organization admins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(organization.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(organization.createdAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(organization.updatedAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(organization.updatedAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <div className="mt-1">{getTypeBadge(organization.type)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${organization.email}`} className="text-blue-600 hover:underline">
                  {organization.email}
                </a>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${organization.phone}`} className="text-blue-600 hover:underline">
                  {organization.phone}
                </a>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div>{organization.address}</div>
                  <div>{organization.city}, {organization.state} {organization.zipCode}</div>
                  <div>{organization.country}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Organization Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Account Status</label>
              <div className="mt-1">{getStatusBadge(organization.accountStatus)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Active</label>
              <div className="mt-1">
                {organization.isActive ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Premium</label>
              <div className="mt-1">
                {organization.isPremium ? (
                  <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">Free</Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Subscription Plan</label>
              <div className="mt-1 capitalize">{organization.subscriptionPlan}</div>
            </div>
            {organization.type === 'hospital' && (
              <div className="pt-2 border-t">
                <label className="text-sm font-medium text-gray-500">Gratitude Points Partner</label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Professional+ or Enterprise. Enables hospital thank-you redemptions (Kenya).
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={partnerSaving || organization.rewardsProgram?.partnerActive}
                    onClick={() => handleToggleRewardsPartner(true)}
                  >
                    Enable partner
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={partnerSaving || !organization.rewardsProgram?.partnerActive}
                    onClick={() => handleToggleRewardsPartner(false)}
                  >
                    Disable
                  </Button>
                </div>
                {organization.rewardsProgram?.partnerActive && (
                  <Badge className="mt-2 bg-rose-100 text-rose-800">Partner active</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {primaryAdmin && (
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50/80 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <KeyRound className="w-5 h-5" />
              Admin account access
            </CardTitle>
            <CardDescription>
              Send one iBlood email with a link to set password (email prefilled). Use this if the
              admin never activated or lost the link.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 text-sm">
              <p className="font-medium text-gray-900">{primaryAdmin.fullName}</p>
              <p className="text-gray-600">{primaryAdmin.email}</p>
              {!primaryAdmin.lastLoginAt && (
                <p className="text-amber-700 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Has not signed in yet — resend activation recommended
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                className="bg-violet-600 hover:bg-violet-700"
                disabled={!!resendingUserId}
                onClick={() => handleResendActivation(primaryAdmin.id)}
              >
                {resendingUserId === primaryAdmin.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Resend activation email
              </Button>
              {lastSetupUrl && (
                <Button type="button" variant="outline" onClick={copySetupLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy setup link
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Members
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} in this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No members in this organization yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      <div className="text-sm">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-violet-700 hover:text-violet-900"
                        disabled={!!resendingUserId}
                        onClick={() => handleResendActivation(member.id)}
                      >
                        {resendingUserId === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-1" />
                            Resend activation
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
