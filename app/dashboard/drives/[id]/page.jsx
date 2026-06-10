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
  Sparkles,
  Info,
  Megaphone,
} from 'lucide-react'
import { DONATION_COMPONENTS } from '@/lib/donation-eligibility'
import { OrgRouteGuard } from '@/components/dashboard/org-route-guard'
import { CONFIRMED_BLOOD_TYPES, formatBloodTypeLabel } from '@/lib/donor-blood-types'

// Blood type color coding

const bloodTypeStyles = {
  unknown: { bg: 'bg-gradient-to-br from-slate-300 to-slate-500', text: 'text-white', border: 'border-slate-600' },
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
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    icon: Award,
    color: 'text-emerald-600',
  },
  declined: {
    label: 'Declined',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: XCircle,
    color: 'text-slate-500',
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
  const [sourceFilter, setSourceFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  
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
    eligibilityStatus: 'pending',
    bloodWorkFindings: '',
    recommendations: '',
    screeningResults: {
      hiv: 'pending',
      hepatitisB: 'pending',
      hepatitisC: 'pending',
      syphilis: 'pending',
    },
    bloodType: '',
  })
  const [recordDonationLoading, setRecordDonationLoading] = useState(false)
  const [screeningBloodType, setScreeningBloodType] = useState('')
  const [screeningBloodTypeSaving, setScreeningBloodTypeSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/drives/' + params.id)
      return
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
      router.push('/dashboard')
      return
    }
    
    // Only fetch on initial load, not on every dependency change
    if (params.id && !drive) {
      fetchDriveDetails()
    }
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
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
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

  const handleSaveScreeningBloodType = async () => {
    if (!selectedDonor || !screeningBloodType) {
      setActionError('Please select a confirmed blood type')
      return
    }

    setScreeningBloodTypeSaving(true)
    try {
      const res = await fetch(
        `/api/admin/drives/${params.id}/registrations/${selectedDonor.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: selectedDonor.status,
            sendNotification: false,
            bloodType: screeningBloodType,
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const updatedBloodType = data.data?.bloodType || screeningBloodType
        setActionSuccess(`✅ Blood type confirmed: ${updatedBloodType}`)
        setSelectedDonor({ ...selectedDonor, bloodType: updatedBloodType })
        setScreeningBloodType('')
        fetchDriveDetails()
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        const data = await res.json()
        setActionError(data.error || 'Failed to save blood type')
      }
    } catch {
      setActionError('Failed to save blood type')
    } finally {
      setScreeningBloodTypeSaving(false)
    }
  }

  const handleBulkCheckIn = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/drives/${params.id}/registrations/bulk-checkin`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
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
      eligibilityStatus: 'pending',
      bloodWorkFindings: '',
      recommendations: '',
      screeningResults: {
        hiv: 'pending',
        hepatitisB: 'pending',
        hepatitisC: 'pending',
        syphilis: 'pending',
      },
      bloodType:
        donor.bloodType && donor.bloodType !== 'unknown' ? donor.bloodType : '',
    })
    setIsRecordDonationOpen(true)
  }

  const handleRecordDonation = async () => {
    if (!selectedDonor) {
      setActionError('No donor selected')
      return
    }

    // Validation checks
    if (!recordDonationForm.volume || recordDonationForm.volume < 200 || recordDonationForm.volume > 500) {
      setActionError('Volume must be between 200ml and 500ml')
      return
    }

    if (!recordDonationForm.component) {
      setActionError('Please select a blood component')
      return
    }

    if (selectedDonor.status !== 'checked_in') {
      setActionError('Donor must be checked in before recording donation')
      return
    }

    const needsBloodType =
      !selectedDonor.bloodType || selectedDonor.bloodType === 'unknown'
    if (needsBloodType && !recordDonationForm.bloodType) {
      setActionError('Please confirm the donor blood type before recording the donation')
      return
    }

    setRecordDonationLoading(true)
    setActionError(null)
    try {
      // Use dedicated record-donation endpoint.
      // It records inventory + donor completion + notifications atomically.
      const res = await fetch(`/api/admin/drives/${params.id}/registrations/${selectedDonor.id}/record-donation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          volume: recordDonationForm.volume,
          component: recordDonationForm.component,
          technician: recordDonationForm.technician,
          notes: recordDonationForm.notes,
          eligibilityStatus: recordDonationForm.eligibilityStatus,
          bloodWorkFindings: recordDonationForm.bloodWorkFindings,
          recommendations: recordDonationForm.recommendations,
          screeningResults: recordDonationForm.screeningResults,
          sendNotification: true,
          ...(recordDonationForm.bloodType ? { bloodType: recordDonationForm.bloodType } : {}),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        const gp = data.data?.gratitudePoints
        let gpNote = ''
        if (gp?.awarded) {
          gpNote = ` Gratitude Points: +${gp.points} (balance ${gp.balance}).`
        } else if (gp?.reason === 'not_eligible') {
          gpNote =
            ' No gratitude points yet — set eligibility to "Eligible for future donation" when screening is clear.'
        } else if (gp?.reason === 'org_cannot_issue') {
          gpNote = ' Gratitude points are not issued by this organization type.'
        }
        setActionSuccess(
          `✅ Donation recorded for ${selectedDonor.fullName}! Unit ID: ${data.data.unitId}.${gpNote}`
        )
        setIsRecordDonationOpen(false)
        setRecordDonationForm({
          volume: 450,
          component: 'whole_blood',
          technician: '',
          notes: '',
          eligibilityStatus: 'pending',
          bloodWorkFindings: '',
          recommendations: '',
          screeningResults: {
            hiv: 'pending',
            hepatitisB: 'pending',
            hepatitisC: 'pending',
            syphilis: 'pending',
          },
          bloodType: '',
        })
        fetchDriveDetails()
        setTimeout(() => setActionSuccess(null), 5000)
      } else {
        const errorMessage = data.error || data.message || 'Failed to record donation'
        setActionError(errorMessage)
      }
    } catch (err) {
      console.error('[Record Donation Error]', err)
      setActionError('Network error: Unable to record donation. Please check your connection and try again.')
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
          credentials: 'include', // CRITICAL: Send cookies (auth-session)
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
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
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
      ['Name', 'Email', 'Phone', 'Blood Type', 'Status', 'Source', 'Registered At'],
      ...registrations.map(r => [
        r.fullName,
        r.email,
        r.phone,
        r.bloodType,
        r.status,
        r.source || 'public',
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

  const getRoleBadge = (participantRole, intendedDonationComponent) => {
    if (participantRole === 'supporter') {
      return (
        <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 font-medium">
          <Megaphone className="w-3 h-3 mr-1" />
          Supporter
        </Badge>
      )
    }
    const componentLabel =
      DONATION_COMPONENTS[intendedDonationComponent]?.shortLabel || 'Whole blood'
    return (
      <Badge className="bg-red-50 text-red-800 border border-red-200 text-xs font-medium">
        <Droplet className="w-3 h-3 mr-1" />
        {componentLabel}
      </Badge>
    )
  }

  const getBloodTypeBadge = (bloodType) => {
    const style = bloodTypeStyles[bloodType] || bloodTypeStyles.unknown
    return (
      <Badge className={`${style.bg} ${style.text} ${style.border} border font-bold px-3 py-1`}>
        <Droplet className="w-3 h-3 mr-1" />
        {formatBloodTypeLabel(bloodType)}
      </Badge>
    )
  }

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = r.fullName.toLowerCase().includes(search.toLowerCase()) ||
                         r.email.toLowerCase().includes(search.toLowerCase()) ||
                         r.phone.includes(search)
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesBloodType = bloodTypeFilter === 'all' || r.bloodType === bloodTypeFilter
    const matchesSource = sourceFilter === 'all' || (r.source || 'public') === sourceFilter
    const role = r.participantRole || 'donor'
    const matchesRole = roleFilter === 'all' || role === roleFilter
    return matchesSearch && matchesStatus && matchesBloodType && matchesSource && matchesRole
  })

  const rosterForStats = registrations.filter((r) => r.status !== 'declined')
  const donorRoster = rosterForStats.filter((r) => (r.participantRole || 'donor') === 'donor')
  const pendingCheckIn = donorRoster.filter((r) =>
    ['registered', 'confirmed'].includes(r.status)
  ).length

  const stats = {
    total: rosterForStats.length,
    supporters: rosterForStats.filter((r) => r.participantRole === 'supporter').length,
    donors: donorRoster.length,
    declined: registrations.filter((r) => r.status === 'declined').length,
    checkedIn: rosterForStats.filter(r => r.status === 'checked_in').length,
    noShow: rosterForStats.filter(r => r.status === 'no_show').length,
    cancelled: rosterForStats.filter(r => r.status === 'cancelled').length,
    confirmed: rosterForStats.filter(r => r.status === 'confirmed').length,
    registered: rosterForStats.filter(r => r.status === 'registered').length,
    completed: rosterForStats.filter(r => r.status === 'completed').length,
  }

  const progressPercentage = drive?.targetDonors > 0 
    ? Math.round((stats.donors / drive.targetDonors) * 100) 
    : 0

  const showRate = stats.donors > 0 
    ? Math.round((stats.checkedIn / stats.donors) * 100) 
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
    <OrgRouteGuard feature="drives">
    <div className="min-h-screen bg-gradient-to-br from-red-50/80 via-background to-blue-50/80 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
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
                  {stats.donors}/{drive.targetDonors} donors
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
                {stats.donors} donors
                {stats.supporters > 0 && (
                  <span className="text-amber-700 font-medium"> · {stats.supporters} supporters</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {drive.targetDonors > 0 ? (
                  <>
                    <span className="font-semibold">{progressPercentage}%</span> of donor target ({drive.targetDonors})
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
                disabled={actionLoading || pendingCheckIn === 0}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-md"
                title={pendingCheckIn === 0 ? 'No registered/confirmed donors to check in' : 'Check in all registered donors'}
              >
                <Users className="w-4 h-4 mr-2" />
                Check In All ({pendingCheckIn})
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
                  <option value="declined">Declined (RSVP)</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="all">All channels</option>
                  <option value="public">Public link</option>
                  <option value="outreach">Outreach / RSVP</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="all">All roles</option>
                  <option value="donor">Donors</option>
                  <option value="supporter">Supporters</option>
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
                              {reg.source === 'outreach' && (
                                <Badge className="bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  RSVP
                                </Badge>
                              )}
                              {reg.source === 'walk_in' && (
                                <Badge className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium">
                                  Walk-in
                                </Badge>
                              )}
                              {getRoleBadge(reg.participantRole, reg.intendedDonationComponent)}
                              {reg.participantRole !== 'supporter' && getBloodTypeBadge(reg.bloodType)}
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
          <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md md:max-w-lg">
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
                <div className="flex min-w-0 items-start justify-between gap-2 mb-4">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold shadow-lg sm:w-16 sm:h-16 sm:text-2xl">
                      {selectedDonor.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-xl font-bold break-words sm:text-2xl">{selectedDonor.fullName}</SheetTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {getRoleBadge(selectedDonor.participantRole, selectedDonor.intendedDonationComponent)}
                        {selectedDonor.participantRole !== 'supporter' && getBloodTypeBadge(selectedDonor.bloodType)}
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
                <div className="flex flex-col gap-2 text-sm text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="break-all" title={selectedDonor.email}>
                      {selectedDonor.email}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="break-all" title={selectedDonor.phone}>
                      {selectedDonor.phone}
                    </span>
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
                      const rank = {
                        registered: 0,
                        confirmed: 1,
                        checked_in: 2,
                        completed: 3,
                        no_show: 2,
                        cancelled: 0,
                        declined: -1,
                      }
                      const r = rank[selectedDonor.status] ?? -1
                      const isCompleted = r >= index
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

              {selectedDonor &&
                (!selectedDonor.bloodType || selectedDonor.bloodType === 'unknown') &&
                ['confirmed', 'checked_in'].includes(selectedDonor.status) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-900">
                      <Droplet className="w-5 h-5 text-amber-700" />
                      Screening — confirm blood type
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Donor registered without a known blood group. Confirm during screening before
                      collection.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        value={screeningBloodType}
                        onChange={(e) => setScreeningBloodType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        disabled={screeningBloodTypeSaving}
                      >
                        <option value="">Select confirmed blood type…</option>
                        {CONFIRMED_BLOOD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={handleSaveScreeningBloodType}
                        disabled={!screeningBloodType || screeningBloodTypeSaving}
                        className="shrink-0 bg-amber-700 hover:bg-amber-800"
                      >
                        {screeningBloodTypeSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {screeningBloodTypeSaving ? 'Saving…' : 'Save blood type'}
                      </Button>
                    </div>
                  </div>
                )}

              {selectedDonor.participantRole === 'supporter' && (
                <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                  <h4 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
                    <Megaphone className="w-5 h-5" />
                    Drive supporter
                  </h4>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    This person registered to help share the drive — not to donate blood. They are excluded
                    from check-in and collection workflows.
                  </p>
                </div>
              )}

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
                    disabled={
                      selectedDonor.participantRole === 'supporter' ||
                      selectedDonor.status !== 'registered' ||
                      actionLoading
                    }
                    className="justify-start"
                    title={selectedDonor.status === 'registered' ? 'Mark as confirmed' : `Already ${selectedDonor.status}`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-green-600" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                    )}
                    {actionLoading ? 'Confirming...' : 'Confirm'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'checked_in')}
                    disabled={
                      selectedDonor.participantRole === 'supporter' ||
                      !['registered', 'confirmed'].includes(selectedDonor.status) ||
                      actionLoading
                    }
                    className="justify-start"
                    title={selectedDonor.status !== 'checked_in' && selectedDonor.status !== 'completed' ? 'Mark as checked in' : `Already ${selectedDonor.status}`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-purple-600" />
                    ) : (
                      <Users className="w-4 h-4 mr-2 text-purple-600" />
                    )}
                    {actionLoading ? 'Checking In...' : 'Check In'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'cancelled')}
                    disabled={['cancelled', 'completed'].includes(selectedDonor.status) || actionLoading}
                    className="justify-start"
                    title={selectedDonor.status !== 'cancelled' && selectedDonor.status !== 'completed' ? 'Cancel registration' : `Already ${selectedDonor.status}`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-600" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2 text-gray-600" />
                    )}
                    {actionLoading ? 'Cancelling...' : 'Cancel'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedDonor.id, 'no_show')}
                    disabled={['no_show', 'completed'].includes(selectedDonor.status) || actionLoading}
                    className="justify-start"
                    title={selectedDonor.status !== 'no_show' && selectedDonor.status !== 'completed' ? 'Mark as no show' : `Already ${selectedDonor.status}`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-red-600" />
                    ) : (
                      <UserX className="w-4 h-4 mr-2 text-red-600" />
                    )}
                    {actionLoading ? 'Marking...' : 'No Show'}
                  </Button>
                </div>

                {/* Record Donation - Only for checked_in donors (not supporters) */}
                {selectedDonor.status === 'checked_in' && selectedDonor.participantRole !== 'supporter' && (
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

      {/* Record Donation Modal — constrained height, scrollable body, pinned footer */}
      <Dialog
        open={isRecordDonationOpen}
        onOpenChange={(open) => {
          setIsRecordDonationOpen(open)
          if (!open) setActionError(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,880px)] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-xl md:max-w-2xl"
        >
          <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-br from-red-600 via-red-600 to-rose-700 px-5 pb-4 pt-5 text-white sm:px-6 sm:pb-5 sm:pt-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-9 w-9 text-white hover:bg-white/15 sm:right-3 sm:top-3"
              onClick={() => {
                setIsRecordDonationOpen(false)
                setActionError(null)
              }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
            <DialogHeader className="space-y-2 pr-10 text-left sm:pr-12">
              <DialogTitle className="flex items-start gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/20">
                  <Droplet className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden />
                </span>
                <span className="min-w-0 pt-0.5 leading-snug">Record blood donation</span>
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-white/85">
                {selectedDonor ? (
                  <>
                    <span className="font-medium text-white">{selectedDonor.fullName}</span>
                    <span className="text-white/70"> · </span>
                    <span>{selectedDonor.bloodType}</span>
                    <span className="mt-2 block text-white/80">
                      Creates an inventory unit, marks the donor completed, and sends their follow-up email.
                    </span>
                  </>
                ) : (
                  'Complete the donation details for this donor.'
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 sm:py-5">
            <div className="space-y-5">
              {selectedDonor && selectedDonor.status !== 'checked_in' && (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <div className="min-w-0 text-sm text-red-900">
                    <p className="font-semibold">Cannot record yet</p>
                    <p className="mt-1 text-red-800/90">
                      Donor must be checked in first. Current status:{' '}
                      <span className="font-semibold capitalize">
                        {selectedDonor.status?.replace(/_/g, ' ')}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <section className="rounded-xl border border-border/80 bg-muted/30 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                  Collection
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedDonor &&
                    (!selectedDonor.bloodType || selectedDonor.bloodType === 'unknown') && (
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="record-blood-type" className="text-sm font-medium">
                          Confirm blood type <span className="text-red-600">*</span>
                        </label>
                        <select
                          id="record-blood-type"
                          value={recordDonationForm.bloodType}
                          onChange={(e) =>
                            setRecordDonationForm({
                              ...recordDonationForm,
                              bloodType: e.target.value,
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled={recordDonationLoading}
                        >
                          <option value="">Select confirmed blood type…</option>
                          {CONFIRMED_BLOOD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Donor registered without a known blood type — confirm during screening.
                        </p>
                      </div>
                    )}
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="record-component" className="text-sm font-medium">
                      Blood component <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="record-component"
                      value={recordDonationForm.component}
                      onChange={(e) =>
                        setRecordDonationForm({ ...recordDonationForm, component: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={recordDonationLoading}
                    >
                      <option value="">Select component…</option>
                      <option value="whole_blood">Whole blood</option>
                      <option value="rbc">Red blood cells</option>
                      <option value="plasma">Plasma</option>
                      <option value="platelets">Platelets</option>
                      <option value="cryo">Cryoprecipitate</option>
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="record-volume" className="text-sm font-medium">
                      Volume (ml) <span className="text-red-600">*</span>
                    </label>
                    <Input
                      id="record-volume"
                      type="number"
                      value={recordDonationForm.volume || ''}
                      onChange={(e) =>
                        setRecordDonationForm({
                          ...recordDonationForm,
                          volume: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      placeholder="450"
                      min={200}
                      max={500}
                      disabled={recordDonationLoading}
                      className="h-10"
                    />
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
                      <span>Standard whole blood: 450 ml</span>
                      <span>Allowed range: 200–500 ml</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                  Staff & notes
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="record-tech" className="text-sm font-medium">
                      Technician <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="record-tech"
                      value={recordDonationForm.technician}
                      onChange={(e) =>
                        setRecordDonationForm({ ...recordDonationForm, technician: e.target.value })
                      }
                      placeholder="Who collected this unit?"
                      disabled={recordDonationLoading}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="record-notes" className="text-sm font-medium">
                      Notes <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Textarea
                      id="record-notes"
                      value={recordDonationForm.notes}
                      onChange={(e) =>
                        setRecordDonationForm({ ...recordDonationForm, notes: e.target.value })
                      }
                      placeholder="Arm site, reaction, deferral context…"
                      rows={3}
                      disabled={recordDonationLoading}
                      className="min-h-[5rem] resize-y text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                  Screening markers
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">Infectious disease screening results on file.</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {['hiv', 'hepatitisB', 'hepatitisC', 'syphilis'].map((testKey) => (
                    <div key={testKey} className="space-y-1.5">
                      <label className="text-sm font-medium">
                        {testKey === 'hiv'
                          ? 'HIV'
                          : testKey === 'hepatitisB'
                            ? 'Hepatitis B'
                            : testKey === 'hepatitisC'
                              ? 'Hepatitis C'
                              : 'Syphilis'}
                      </label>
                      <select
                        value={recordDonationForm.screeningResults[testKey]}
                        onChange={(e) =>
                          setRecordDonationForm({
                            ...recordDonationForm,
                            screeningResults: {
                              ...recordDonationForm.screeningResults,
                              [testKey]: e.target.value,
                            },
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={recordDonationLoading}
                      >
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                        <option value="inconclusive">Inconclusive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  Donor communication
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Included in the post-donation email to the donor.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="record-elig" className="text-sm font-medium">
                      Eligibility status
                    </label>
                    <select
                      id="record-elig"
                      value={recordDonationForm.eligibilityStatus}
                      onChange={(e) =>
                        setRecordDonationForm({
                          ...recordDonationForm,
                          eligibilityStatus: e.target.value,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={recordDonationLoading}
                    >
                      <option value="eligible">Eligible for future donation (awards gratitude points)</option>
                      <option value="temporarily_deferred">Temporarily deferred</option>
                      <option value="ineligible">Needs follow-up</option>
                      <option value="pending">Pending review (no gratitude points)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Thank-you points (10 per donation) are added only when eligibility is{' '}
                      <strong>Eligible</strong> and the host is a blood bank or NGO.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="record-findings" className="text-sm font-medium">
                      Blood work findings
                    </label>
                    <Textarea
                      id="record-findings"
                      value={recordDonationForm.bloodWorkFindings}
                      onChange={(e) =>
                        setRecordDonationForm({
                          ...recordDonationForm,
                          bloodWorkFindings: e.target.value,
                        })
                      }
                      placeholder="e.g. Screening panel negative; hemoglobin within range."
                      rows={3}
                      disabled={recordDonationLoading}
                      className="min-h-[5rem] resize-y text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="record-rec" className="text-sm font-medium">
                      Recommendations
                    </label>
                    <Textarea
                      id="record-rec"
                      value={recordDonationForm.recommendations}
                      onChange={(e) =>
                        setRecordDonationForm({
                          ...recordDonationForm,
                          recommendations: e.target.value,
                        })
                      }
                      placeholder="Hydration, iron-rich foods, when to donate again…"
                      rows={3}
                      disabled={recordDonationLoading}
                      className="min-h-[5rem] resize-y text-sm"
                    />
                  </div>
                </div>
              </section>

              {actionError && (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <div className="min-w-0 text-sm text-red-900">
                    <p className="font-semibold">Something went wrong</p>
                    <p className="mt-1 break-words text-red-800/95">{actionError}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 rounded-lg border border-blue-200/80 bg-blue-50/90 px-3 py-3 text-xs text-blue-950 sm:px-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <div>
                  <p className="font-semibold text-blue-900">After you save</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-blue-900/90">
                    <li>Donor moves to completed</li>
                    <li>Unit appears in inventory</li>
                    <li>Thank-you email sent</li>
                    <li>Next eligible date set (56 days)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsRecordDonationOpen(false)
                setActionError(null)
              }}
              disabled={recordDonationLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 sm:w-auto"
              onClick={handleRecordDonation}
              disabled={recordDonationLoading || selectedDonor?.status !== 'checked_in'}
            >
              {recordDonationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording…
                </>
              ) : (
                <>
                  <Droplet className="mr-2 h-4 w-4" />
                  Record donation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </OrgRouteGuard>
  )
}
