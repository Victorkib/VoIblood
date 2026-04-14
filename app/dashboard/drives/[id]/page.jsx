'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  UserX,
  Download,
  Mail,
  MessageSquare,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Heart,
  Droplet,
  Award,
  Phone,
  FileText,
  History,
  Edit,
  Save,
  X,
  Bell,
  UserCheck,
  Trash2,
  Copy,
  ExternalLink,
  TrendingUp,
  Activity,
} from 'lucide-react'

// Blood type color coding
const bloodTypeStyles = {
  'O+': { bg: 'bg-gradient-to-br from-red-400 to-red-600', text: 'text-white', border: 'border-red-700' },
  'O-': { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', border: 'border-red-900' },
  'A+': { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-white', border: 'border-blue-700' },
  'A-': { bg: 'bg-gradient-to-br from-blue-600 to-blue-800', text: 'text-white', border: 'border-blue-900' },
  'B+': { bg: 'bg-gradient-to-br from-green-400 to-green-600', text: 'text-white', border: 'border-green-700' },
  'B-': { bg: 'bg-gradient-to-br from-green-600 to-green-800', text: 'text-white', border: 'border-green-900' },
  'AB+': { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', text: 'text-white', border: 'border-purple-700' },
  'AB-': { bg: 'bg-gradient-to-br from-purple-600 to-purple-800', text: 'text-white', border: 'border-purple-900' },
}

const statusConfig = {
  registered: { 
    label: 'Registered', 
    bg: 'bg-blue-100', 
    text: 'text-blue-800', 
    border: 'border-blue-300',
    icon: CheckCircle,
    color: 'text-blue-600'
  },
  confirmed: { 
    label: 'Confirmed', 
    bg: 'bg-green-100', 
    text: 'text-green-800', 
    border: 'border-green-300',
    icon: UserCheck,
    color: 'text-green-600'
  },
  checked_in: { 
    label: 'Checked In', 
    bg: 'bg-purple-100', 
    text: 'text-purple-800', 
    border: 'border-purple-300',
    icon: Users,
    color: 'text-purple-600'
  },
  cancelled: { 
    label: 'Cancelled', 
    bg: 'bg-gray-100', 
    text: 'text-gray-800', 
    border: 'border-gray-300',
    icon: XCircle,
    color: 'text-gray-600'
  },
  no_show: { 
    label: 'No Show', 
    bg: 'bg-red-100', 
    text: 'text-red-800', 
    border: 'border-red-300',
    icon: UserX,
    color: 'text-red-600'
  },
}

export default function DriveDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [drive, setDrive] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [bloodTypeFilter, setBloodTypeFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)
  
  // Email/SMS Modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageType, setMessageType] = useState('email') // 'email' or 'sms'
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  
  // Notes
  const [donorNotes, setDonorNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  // Record Donation Modal
  const [isRecordDonationOpen, setIsRecordDonationOpen] = useState(false)
  const [recordDonationForm, setRecordDonationForm] = useState({
    volume: 450,
    component: 'whole_blood',
    technician: '',
    notes: '',
  })
  const [recordDonationLoading, setRecordDonationLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/drives/' + params.id)
      return
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
      router.push('/dashboard')
      return
    }
    fetchDriveDetails()
  }, [isAuthenticated, user, params.id])

  const fetchDriveDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/drives/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setDrive(data.data)
        setRegistrations(data.data.registrations || [])
      } else {
        setError(data.error || 'Failed to load drive details')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (registrationId, newStatus) => {
    setActionLoading(true)
    try {
      // Update the status (notifications sent automatically by backend)
      const res = await fetch(`/api/admin/drives/${params.id}/registrations/${registrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, sendNotification: true }),
      })

      if (res.ok) {
        setActionSuccess(`✅ Status updated to ${statusConfig[newStatus]?.label || newStatus}`)
        fetchDriveDetails()
        if (selectedDonor && selectedDonor.id === registrationId) {
          setSelectedDonor({ ...selectedDonor, status: newStatus })
        }
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        const data = await res.json()
        setActionError(data.error || 'Failed to update status')
      }
    } catch (err) {
      setActionError('Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkCheckIn = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/drives/${params.id}/registrations/bulk-checkin`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setActionSuccess(`✅ Checked in ${data.checkedIn} donors`)
        fetchDriveDetails()
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        const data = await res.json()
        setActionError(data.error || 'Failed to check in donors')
      }
    } catch (err) {
      setActionError('Failed to check in donors')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenRecordDonation = (donor) => {
    setSelectedDonor(donor)
    setRecordDonationForm({
      volume: 450,
      component: 'whole_blood',
      technician: '',
      notes: '',
    })
    setIsRecordDonationOpen(true)
  }

  const handleRecordDonation = async () => {
    if (!selectedDonor) return

    setRecordDonationLoading(true)
    try {
      const res = await fetch(
        `/api/admin/drives/${params.id}/registrations/${selectedDonor.id}/record-donation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...recordDonationForm,
            sendNotification: true,
          }),
        }
      )

      const data = await res.json()

      if (res.ok) {
        setActionSuccess(`✅ Donation recorded for ${selectedDonor.fullName}! Unit ID: ${data.data.unitId}`)
        setIsRecordDonationOpen(false)
        fetchDriveDetails()
        setTimeout(() => setActionSuccess(null), 5000)
      } else {
        setActionError(data.error || 'Failed to record donation')
      }
    } catch (err) {
      setActionError('Failed to record donation')
    } finally {
      setRecordDonationLoading(false)
    }
  }

  const handleOpenMessageModal = (type, donor = null) => {
    setMessageType(type)
    setSelectedDonor(donor)
    setMessageSubject(type === 'email' ? 'Blood Donation Drive Reminder' : '')
    setMessageBody(type === 'email' 
      ? `Dear ${donor?.fullName || 'Donor'},\n\nThis is a friendly reminder about your upcoming blood donation appointment.\n\nThank you for being a hero!\n\nBest regards,\nThe Team`
      : `Hi ${donor?.fullName || 'Donor'}! This is a friendly reminder about your blood donation appointment. Thank you for being a hero!`
    )
    setIsMessageModalOpen(true)
  }

  const handleSendMessage = async () => {
    if (!selectedDonor && !messageSubject && !messageBody) return
    
    setActionLoading(true)
    try {
      if (selectedDonor) {
        // Send to individual donor
        const endpoint = messageType === 'email' 
          ? `/api/admin/drives/${params.id}/registrations/${selectedDonor.id}/email`
          : `/api/admin/drives/${params.id}/registrations/${selectedDonor.id}/sms`
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: messageSubject,
            message: messageBody,
          }),
        })

        const data = await res.json()

        if (res.ok) {
          setActionSuccess(`${messageType === 'email' ? 'Email' : 'SMS'} sent to ${selectedDonor.fullName}`)
          setIsMessageModalOpen(false)
          setTimeout(() => setActionSuccess(null), 3000)
        } else {
          setActionError(data.error || `Failed to send ${messageType}`)
        }
      } else {
        // Send to all donors (would need bulk endpoint)
        setActionError('Bulk messaging coming soon! For now, send messages individually.')
      }
    } catch (err) {
      console.error('Send message error:', err)
      setActionError(`Failed to send ${messageType}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedDonor) return
    
    setNotesSaving(true)
    try {
      const res = await fetch(`/api/admin/drives/${params.id}/registrations/${selectedDonor.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: donorNotes }),
      })

      const data = await res.json()

      if (res.ok) {
        setActionSuccess('Notes saved successfully')
        setIsEditingNotes(false)
        // Update selected donor with new notes
        setSelectedDonor({ ...selectedDonor, notes: donorNotes })
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || 'Failed to save notes')
      }
    } catch (err) {
      console.error('Save notes error:', err)
      setActionError('Failed to save notes')
    } finally {
      setNotesSaving(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Blood Type', 'Status', 'Registered At'],
      ...registrations.map(r => [
        r.fullName,
        r.email,
        r.phone,
        r.bloodType,
        r.status,
        new Date(r.registeredAt).toLocaleDateString(),
      ]),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${drive.name.replace(/\s+/g, '_')}_registrations.csv`
    a.click()
    URL.revokeObjectURL(url)
    setActionSuccess('Export successful!')
    setTimeout(() => setActionSuccess(null), 3000)
  }

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.registered
    const Icon = config.icon
    return (
      <Badge className={`${config.bg} ${config.text} ${config.border} border font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getBloodTypeBadge = (bloodType) => {
    const style = bloodTypeStyles[bloodType] || bloodTypeStyles['O+']
    return (
      <Badge className={`${style.bg} ${style.text} ${style.border} border font-bold px-3 py-1`}>
        <Droplet className="w-3 h-3 mr-1" />
        {bloodType}
      </Badge>
    )
  }

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = r.fullName.toLowerCase().includes(search.toLowerCase()) ||
                         r.email.toLowerCase().includes(search.toLowerCase()) ||
                         r.phone.includes(search)
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesBloodType = bloodTypeFilter === 'all' || r.bloodType === bloodTypeFilter
    return matchesSearch && matchesStatus && matchesBloodType
  })

  const stats = {
    total: registrations.length,
    checkedIn: registrations.filter(r => r.status === 'checked_in').length,
    noShow: registrations.filter(r => r.status === 'no_show').length,
    cancelled: registrations.filter(r => r.status === 'cancelled').length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    registered: registrations.filter(r => r.status === 'registered').length,
  }

  const progressPercentage = drive?.targetDonors > 0 
    ? Math.round((stats.total / drive.targetDonors) * 100) 
    : 0

  const showRate = stats.total > 0 
    ? Math.round((stats.checkedIn / stats.total) * 100) 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center">
          <Heart className="w-16 h-16 animate-pulse text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading drive details...</p>
        </div>
      </div>
    )
  }

  if (error || !drive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-4">{error || 'Drive not found'}</p>
            <Button onClick={() => router.push('/dashboard/drives')} className="bg-red-600 hover:bg-red-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Drives
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50">
      {/* Action Messages */}
      {actionSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5" />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <AlertCircle className="w-5 h-5" />
          {actionError}
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0">
          <svg className="absolute bottom-0 left-0 right-0 h-12 text-red-50" preserveAspectRatio="none" viewBox="0 0 1200 60">
            <path d="M0,30 C150,60 300,0 450,30 C600,60 750,0 900,30 C1050,60 1200,0 1200,30 L1200,60 L0,60 Z" fill="currentColor"/>
          </svg>
        </div>
        
        <div className="relative p-6 pb-16">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/drives')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 animate-pulse" />
                <h1 className="text-3xl font-bold">{drive.name}</h1>
                {drive.isActive && (
                  <Badge className="bg-green-500 text-white">
                    <Activity className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-6 mt-3 text-white/90">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {new Date(drive.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {drive.location}{drive.city && `, ${drive.city}`}
                </span>
                {drive.startTime && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {drive.startTime} - {drive.endTime}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExport}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {drive.targetDonors > 0 && (
            <div className="mt-6 bg-white/20 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-500 h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              >
                <span className="text-xs font-bold text-white">
                  {stats.total}/{drive.targetDonors}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 -mt-8 space-y-6 relative z-10">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Registered */}
          <Card className="border-t-4 border-t-blue-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">TOTAL HEROES</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-2">
                {drive.targetDonors > 0 ? (
                  <>
                    <span className="font-semibold">{progressPercentage}%</span> of target ({drive.targetDonors})
                  </>
                ) : 'No target set'}
              </p>
              <div className="mt-3 bg-blue-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-1000"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Checked In */}
          <Card className="border-t-4 border-t-green-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">CHECKED IN</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{stats.checkedIn}</div>
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-semibold text-green-600">{showRate}%</span> show rate
              </p>
              <div className="mt-3 bg-green-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-1000"
                  style={{ width: `${showRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Confirmed */}
          <Card className="border-t-4 border-t-purple-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">CONFIRMED</CardTitle>
              <UserCheck className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">{stats.confirmed}</div>
              <p className="text-xs text-gray-500 mt-2">
                Awaiting check-in
              </p>
              <div className="mt-3 bg-purple-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-1000"
                  style={{ width: `${stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* No Shows */}
          <Card className="border-t-4 border-t-red-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">NO SHOWS</CardTitle>
              <UserX className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600">{stats.noShow}</div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.total > 0 ? `${Math.round((stats.noShow / stats.total) * 100)}% no-show rate` : '0%'}
              </p>
              <div className="mt-3 bg-red-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-1000"
                  style={{ width: `${stats.total > 0 ? (stats.noShow / stats.total) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Action Hub
            </CardTitle>
            <CardDescription>Manage registrations efficiently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleBulkCheckIn}
                disabled={actionLoading || stats.checkedIn === stats.total}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-md"
                title={stats.checkedIn === stats.total ? 'All donors checked in' : 'Check in all registered donors'}
              >
                <Users className="w-4 h-4 mr-2" />
                Check In All ({stats.total - stats.checkedIn} pending)
              </Button>
              <Button
                variant="outline"
                disabled={actionLoading || stats.total === 0}
                onClick={() => handleOpenMessageModal('email')}
                title="Email all registered donors"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email All
              </Button>
              <Button
                variant="outline"
                disabled={actionLoading || stats.total === 0}
                onClick={() => handleOpenMessageModal('sms')}
                title="SMS all registered donors"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS All
              </Button>
              <Button
                variant="outline"
                disabled={stats.noShow === 0}
                onClick={() => {
                  setActionError('Reminder feature coming soon!')
                  setTimeout(() => setActionError(null), 3000)
                }}
                title="Remind no-shows"
              >
                <Bell className="w-4 h-4 mr-2" />
                Remind No-Shows
              </Button>
            </div>
            {stats.total === 0 && (
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No registrations yet. Share the drive registration link to get donors!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-red-600" />
                  Hero Roster
                </CardTitle>
                <CardDescription>Manage your registered donors</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-72"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="all">All Status</option>
                  <option value="registered">Registered</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked In</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
                <select
                  value={bloodTypeFilter}
                  onChange={(e) => setBloodTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="all">All Blood Types</option>
                  {Object.keys(bloodTypeStyles).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No donors found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredRegistrations.map((reg) => (
                  <Card 
                    key={reg.id} 
                    className="hover:shadow-lg transition-all cursor-pointer group border-l-4"
                    style={{ 
                      borderLeftColor: statusConfig[reg.status]?.color || '#3b82f6' 
                    }}
                    onClick={() => {
                      setSelectedDonor(reg)
                      setDonorNotes(reg.notes || '')
                      setIsDrawerOpen(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold shadow-md">
                            {reg.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{reg.fullName}</h3>
                              {getBloodTypeBadge(reg.bloodType)}
                              {getStatusBadge(reg.status)}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {reg.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {reg.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Registered {new Date(reg.registeredAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenMessageModal('email', reg)
                            }}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenMessageModal('sms', reg)
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Filter className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDonor(reg)
                                setDonorNotes(reg.notes || '')
                                setIsDrawerOpen(true)
                              }}>
                                <FileText className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(reg.id, 'confirmed')
                              }}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Mark as Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(reg.id, 'checked_in')
                              }}>
                                <Users className="w-4 h-4 mr-2" />
                                Mark as Checked In
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(reg.id, 'cancelled')
                              }}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Registration
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Donor Details Drawer */}
      {selectedDonor && (
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent className="w-[500px] sm:w-[600px] p-0 overflow-hidden flex flex-col">
            <SheetDescription className="sr-only">
              Donor details for {selectedDonor.fullName}
            </SheetDescription>
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-red-600 via-red-500 to-red-700 text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <Heart className="absolute top-4 right-4 w-32 h-32" />
                <Droplet className="absolute bottom-4 left-4 w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {selectedDonor.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <SheetTitle className="text-2xl font-bold">{selectedDonor.fullName}</SheetTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {getBloodTypeBadge(selectedDonor.bloodType)}
                        {getStatusBadge(selectedDonor.status)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/90">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {selectedDonor.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {selectedDonor.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Timeline */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  Donation Journey
                </h4>
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border p-4">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10"></div>
                    {['registered', 'confirmed', 'checked_in'].map((status, index) => {
                      const config = statusConfig[status]
                      const isCompleted = 
                        status === selectedDonor.status || 
                        Object.keys(statusConfig).indexOf(selectedDonor.status) > index
                      return (
                        <div key={status} className="flex flex-col items-center gap-2 bg-white px-2">
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isCompleted 
                                ? `${config.bg} ${config.text} shadow-md scale-110` 
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <config.icon className="w-4 h-4" />
                          </div>
                          <span className={`text-xs font-medium ${isCompleted ? config.text : 'text-gray-400'}`}>
                            {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                    <p>Registered: <span className="font-medium">{new Date(selectedDonor.registeredAt).toLocaleDateString()}</span></p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'confirmed')}
                    disabled={selectedDonor.status !== 'registered'}
                    className="justify-start"
                    title={selectedDonor.status === 'registered' ? 'Mark as confirmed' : `Already ${selectedDonor.status}`}
                  >
                    <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'checked_in')}
                    disabled={!['registered', 'confirmed'].includes(selectedDonor.status)}
                    className="justify-start"
                    title={selectedDonor.status !== 'checked_in' && selectedDonor.status !== 'completed' ? 'Mark as checked in' : `Already ${selectedDonor.status}`}
                  >
                    <Users className="w-4 h-4 mr-2 text-purple-600" />
                    Check In
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'cancelled')}
                    disabled={['cancelled', 'completed'].includes(selectedDonor.status)}
                    className="justify-start"
                    title={selectedDonor.status !== 'cancelled' && selectedDonor.status !== 'completed' ? 'Cancel registration' : `Already ${selectedDonor.status}`}
                  >
                    <XCircle className="w-4 h-4 mr-2 text-gray-600" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'no_show')}
                    disabled={['no_show', 'completed'].includes(selectedDonor.status)}
                    className="justify-start"
                    title={selectedDonor.status !== 'no_show' && selectedDonor.status !== 'completed' ? 'Mark as no show' : `Already ${selectedDonor.status}`}
                  >
                    <UserX className="w-4 h-4 mr-2 text-red-600" />
                    No Show
                  </Button>
                </div>

                {/* Record Donation - Only for checked_in donors */}
                {selectedDonor.status === 'checked_in' && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      onClick={() => handleOpenRecordDonation(selectedDonor)}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <Droplet className="w-4 h-4 mr-2" />
                      Record Blood Donation
                    </Button>
                  </div>
                )}
              </div>

              {/* Communication */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Send Message
                </h4>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenMessageModal('email', selectedDonor)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenMessageModal('sms', selectedDonor)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Notes
                  </h4>
                  {!isEditingNotes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={donorNotes}
                      onChange={(e) => setDonorNotes(e.target.value)}
                      placeholder="Add notes about this donor..."
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={notesSaving}
                        className="flex-1"
                      >
                        {notesSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingNotes(false)
                          setDonorNotes(selectedDonor.notes || '')
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg border p-4 min-h-[80px]">
                    {donorNotes ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{donorNotes}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No notes added yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Message Modal */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby="message-modal-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {messageType === 'email' ? (
                <>
                  <Mail className="w-5 h-5 text-blue-600" />
                  Send Email
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Send SMS
                </>
              )}
            </DialogTitle>
            <DialogDescription id="message-modal-description">
              {selectedDonor 
                ? `To: ${selectedDonor.fullName} (${messageType === 'email' ? selectedDonor.email : selectedDonor.phone})`
                : `To: All registered donors (${registrations.length})`
              }
            </DialogDescription>
          </DialogHeader>
          {messageType === 'email' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Type your message..."
              rows={messageType === 'email' ? 8 : 4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={actionLoading || !messageBody.trim()}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  {messageType === 'email' ? (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send SMS
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Donation Modal */}
      <Dialog open={isRecordDonationOpen} onOpenChange={setIsRecordDonationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <Droplet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl">Record Blood Donation</h2>
                <p className="text-sm text-gray-500 font-normal">
                  {selectedDonor?.fullName} • {selectedDonor?.bloodType}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Complete the donation details below. This will create a blood inventory record and update the donor&apos;s history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Blood Component */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Blood Component</label>
              <select
                value={recordDonationForm.component}
                onChange={(e) => setRecordDonationForm({ ...recordDonationForm, component: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="whole_blood">Whole Blood</option>
                <option value="rbc">Red Blood Cells</option>
                <option value="plasma">Plasma</option>
                <option value="platelets">Platelets</option>
                <option value="cryo">Cryoprecipitate</option>
              </select>
            </div>

            {/* Volume */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Volume (ml)</label>
              <Input
                type="number"
                value={recordDonationForm.volume}
                onChange={(e) => setRecordDonationForm({ ...recordDonationForm, volume: parseInt(e.target.value) || 450 })}
                placeholder="450"
                min={200}
                max={500}
              />
              <p className="text-xs text-gray-500">Standard whole blood donation is 450ml</p>
            </div>

            {/* Technician */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Technician Name (Optional)</label>
              <Input
                value={recordDonationForm.technician}
                onChange={(e) => setRecordDonationForm({ ...recordDonationForm, technician: e.target.value })}
                placeholder="Who collected this donation?"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={recordDonationForm.notes}
                onChange={(e) => setRecordDonationForm({ ...recordDonationForm, notes: e.target.value })}
                placeholder="Any additional notes about this donation..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">What happens next:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Donor status will change to &quot;completed&quot;</li>
                    <li>Blood unit added to inventory</li>
                    <li>Thank you SMS &amp; email sent to donor</li>
                    <li>Next eligible date calculated (56 days)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRecordDonationOpen(false)}
              disabled={recordDonationLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordDonation}
              disabled={recordDonationLoading}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            >
              {recordDonationLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Droplet className="w-4 h-4 mr-2" />
                  Record Donation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
