'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Search,
  MoreVertical,
  Copy,
  Share2,
  Power,
  PowerOff,
  Trash2,
  Link as LinkIcon,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DrivesPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)
  const [selectedDrive, setSelectedDrive] = useState(null)
  const [actionMode, setActionMode] = useState(null) // 'activate' or 'deactivate'
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    address: '',
    city: '',
    targetDonors: '50',
    whatsappGroupLink: '',
    registrationDeadline: '',
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/drives')
      return
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
      router.push('/dashboard')
      return
    }
    fetchDrives()
  }, [isAuthenticated, user, statusFilter])

  const fetchDrives = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        status: statusFilter !== 'all' ? statusFilter : '',
        search: search || '',
      })
      
      const res = await fetch(`/api/admin/drives?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setDrives(data.data)
      } else {
        setError(data.error || 'Failed to fetch drives')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/admin/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setActionSuccess('Drive created successfully!')
        setIsModalOpen(false)
        fetchDrives()
        // Open share modal with the new drive
        setSelectedDrive(data.data)
        setIsShareModalOpen(true)
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || 'Failed to create drive')
      }
    } catch (err) {
      setActionError('Failed to create drive')
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivate = (drive) => {
    setSelectedDrive(drive)
    setActionMode('activate')
    setIsActivateModalOpen(true)
  }

  const handleDeactivate = (drive) => {
    setSelectedDrive(drive)
    setActionMode('deactivate')
    setIsActivateModalOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedDrive || !actionMode) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/drives/${selectedDrive.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionMode }),
      })

      const data = await res.json()

      if (res.ok) {
        if (actionMode === 'activate') {
          setActionSuccess('Drive activated!')
          setSelectedDrive({ ...selectedDrive, ...data.data })
          setIsShareModalOpen(true)
        } else {
          setActionSuccess('Drive deactivated')
        }
        fetchDrives()
        setIsActivateModalOpen(false)
        setSelectedDrive(null)
        setActionMode(null)
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || 'Failed to ' + actionMode + ' drive')
      }
    } catch (err) {
      setActionError('Failed to ' + actionMode + ' drive')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = (drive) => {
    setSelectedDrive(drive)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedDrive) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/drives/${selectedDrive.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        setActionSuccess('Drive deleted')
        fetchDrives()
        setIsDeleteModalOpen(false)
        setSelectedDrive(null)
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || 'Failed to delete drive')
      }
    } catch (err) {
      setActionError('Failed to delete drive')
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text)
    setActionSuccess('Copied to clipboard!')
    setTimeout(() => setActionSuccess(null), 2000)
  }

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return <Badge className={variants[status] || variants.draft}>{status}</Badge>
  }

  if (!isAuthenticated || !user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Donation Drives</h1>
          <p className="mt-2 text-foreground/60">Create and manage blood donation drives</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Drive
        </Button>
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
          <span>{actionError}</span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search drives..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Drives List */}
      <Card>
        <CardHeader>
          <CardTitle>All Drives</CardTitle>
          <CardDescription>{drives.length} drive{drives.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : drives.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No drives yet</p>
              <p className="text-sm mt-1">Create your first donation drive</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drives.map((drive) => (
                  <TableRow key={drive.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-left hover:underline cursor-pointer"
                        onClick={() => router.push(`/dashboard/drives/${drive.id}`)}
                      >
                        {drive.name}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(drive.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {drive.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {drive.stats.registrations} / {drive.targetDonors}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(drive.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/drives/${drive.id}`)}>
                            <Users className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {drive.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleActivate(drive)}>
                              <Power className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {drive.status === 'active' && (
                            <DropdownMenuItem onClick={() => handleDeactivate(drive)}>
                              <PowerOff className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {drive.registrationUrl && (
                            <DropdownMenuItem onClick={() => { setSelectedDrive(drive); setIsShareModalOpen(true) }}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(drive)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Drive Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Donation Drive</DialogTitle>
            <DialogDescription>Set up a new blood donation drive</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Drive Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Blood Donation Camp - March 2026"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the drive..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="targetDonors">Target Donors</Label>
                <Input
                  id="targetDonors"
                  type="number"
                  value={formData.targetDonors}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDonors: e.target.value }))}
                  min="1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., City Hall"
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., New York"
              />
            </div>
            <div>
              <Label htmlFor="whatsappGroupLink">WhatsApp Group Link</Label>
              <Input
                id="whatsappGroupLink"
                value={formData.whatsappGroupLink}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsappGroupLink: e.target.value }))}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (<> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating... </>) : ('Create Drive')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Link Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Registration Link</DialogTitle>
            <DialogDescription>Share this link with potential donors</DialogDescription>
          </DialogHeader>
          {selectedDrive && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">{selectedDrive.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-700" />
                    <span>{new Date(selectedDrive.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-700" />
                    <span>{selectedDrive.location}</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Registration Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={selectedDrive.registrationUrl} readOnly className="font-mono text-sm" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(selectedDrive.registrationUrl)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {selectedDrive.whatsappGroupLink && (
                <div>
                  <Label>WhatsApp Group Link</Label>
                  <div className="flex gap-2 mt-2">
                    <Input value={selectedDrive.whatsappGroupLink} readOnly className="font-mono text-sm" />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(selectedDrive.whatsappGroupLink)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => window.open(`https://wa.me/?text=Join%20our%20blood%20donation%20drive!%20${selectedDrive.registrationUrl}`, '_blank')}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share to WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Drive</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this drive? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedDrive && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">{selectedDrive.name}</h4>
              <div className="space-y-1 text-sm text-red-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedDrive.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{selectedDrive.stats?.registrations || 0} registered donors</span>
                </div>
              </div>
              {(selectedDrive.stats?.registrations || 0) > 0 && (
                <p className="text-xs text-red-600 mt-3 font-semibold">
                  ⚠️ This will remove all {selectedDrive.stats?.registrations || 0} registrations!
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Drive
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate/Deactivate Confirmation Modal */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionMode === 'activate' ? 'Activate Drive' : 'Deactivate Drive'}
            </DialogTitle>
            <DialogDescription>
              {actionMode === 'activate'
                ? 'This will generate a registration link and make the drive visible to donors.'
                : 'This will deactivate the drive and stop accepting registrations.'}
            </DialogDescription>
          </DialogHeader>
          {selectedDrive && (
            <div className={`p-4 border rounded-lg ${
              actionMode === 'activate' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h4 className="font-semibold mb-2">{selectedDrive.name}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedDrive.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedDrive.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Target: {selectedDrive.targetDonors} donors</span>
                </div>
              </div>
              {actionMode === 'activate' && (
                <p className="text-xs text-green-600 mt-3 font-semibold">
                  ✅ After activation, you can share the registration link!
                </p>
              )}
              {actionMode === 'deactivate' && (
                <p className="text-xs text-gray-600 mt-3 font-semibold">
                  ℹ️ Existing registrations will be preserved.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivateModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAction} 
              disabled={actionLoading}
              className={actionMode === 'activate' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {actionMode === 'activate' ? 'Activating...' : 'Deactivating...'}
                </>
              ) : (
                <>
                  {actionMode === 'activate' ? (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Activate Drive
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Deactivate Drive
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
