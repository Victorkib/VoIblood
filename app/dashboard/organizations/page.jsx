'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  MapPin,
  Phone,
  Mail,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { NewOrganizationModal } from '@/components/modals/new-organization-modal'

export default function OrganizationsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    fetchOrganizations()
  }, [isAuthenticated, search, page])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: '10'
      })

      const response = await fetch(`/api/organizations?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data = await response.json()
      setOrganizations(data.data || [])
      setTotalPages(data.pagination?.pages || 1)
      setError(null)
    } catch (err) {
      console.error('[v0] Organizations fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = (newOrg) => {
    setOrganizations(prev => [newOrg, ...prev])
    setIsModalOpen(false)
  }

  const handleEdit = (org) => {
    setSelectedOrg(org)
    setIsModalOpen(true)
  }

  const handleDelete = async (org) => {
    if (!confirm(`Are you sure you want to delete ${org.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/organizations/${org._id}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete organization')
      }

      setOrganizations(prev => prev.filter(o => o._id !== org._id))
    } catch (err) {
      console.error('[v0] Delete organization error:', err)
      alert(err.message)
    }
  }

  const getOrgTypeColor = (type) => {
    const colors = {
      blood_bank: 'bg-red-100 text-red-800',
      hospital: 'bg-blue-100 text-blue-800',
      transfusion_center: 'bg-green-100 text-green-800',
      ngo: 'bg-purple-100 text-purple-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getOrgTypeLabel = (type) => {
    const labels = {
      blood_bank: 'Blood Bank',
      hospital: 'Hospital',
      transfusion_center: 'Transfusion Center',
      ngo: 'NGO'
    }
    return labels[type] || type
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organizations</h1>
          <p className="mt-2 text-foreground/60">Manage your blood bank organizations</p>
        </div>
        
        {user?.role === 'admin' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 w-5 h-5" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-500/50 bg-red-500/5">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Organizations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="space-y-3">
                  <div className="h-6 bg-secondary/20 rounded w-1/3"></div>
                  <div className="h-4 bg-secondary/20 rounded w-1/2"></div>
                  <div className="h-4 bg-secondary/20 rounded w-3/4"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No organizations found</h3>
            <p className="text-foreground/60 mb-6">
              {user?.role === 'admin' 
                ? 'Create your first organization to get started'
                : 'You haven\'t been assigned to any organization yet'
              }
            </p>
            {user?.role === 'admin' && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            )}
          </Card>
        ) : (
          organizations.map((org) => (
            <Card key={org._id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Organization Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{org.name}</h3>
                      <Badge className={getOrgTypeColor(org.type)}>
                        {getOrgTypeLabel(org.type)}
                      </Badge>
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                      <Mail className="w-4 h-4" />
                      {org.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                      <Phone className="w-4 h-4" />
                      {org.phone}
                    </div>
                    {org.city && (
                      <div className="flex items-center gap-2 text-sm text-foreground/60">
                        <MapPin className="w-4 h-4" />
                        {org.city}, {org.state}, {org.country}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                      <Users className="w-4 h-4" />
                      {org.totalStaff || 0} staff members
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(org.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <Badge className={org.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {org.isPremium && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {user?.role === 'admin' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(org)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(org)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && organizations.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-foreground/60">
            Page {page} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* New/Edit Organization Modal */}
      <NewOrganizationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedOrg(null)
        }}
        onSuccess={handleCreateSuccess}
        organization={selectedOrg}
      />
    </div>
  )
}
