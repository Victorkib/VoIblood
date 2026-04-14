'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Droplet,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  TestTube,
  Thermometer,
} from 'lucide-react'

const statusConfig = {
  available: { label: 'Available', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  reserved: { label: 'Reserved', color: 'bg-blue-100 text-blue-800', icon: Clock },
  used: { label: 'Used', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800', icon: XCircle },
  discarded: { label: 'Discarded', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
}

export default function InventoryDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [unit, setUnit] = useState(null)
  const [donor, setDonor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/inventory/' + params.id)
      return
    }
    fetchUnit()
  }, [isAuthenticated, params.id])

  const fetchUnit = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/inventory/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setUnit(data.data)

        // Fetch donor if exists
        if (data.data.donorId) {
          fetchDonor(data.data.donorId)
        }
      } else {
        setError(data.error || 'Failed to load blood unit')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchDonor = async (donorId) => {
    try {
      const res = await fetch(`/api/donors/${donorId}`)
      if (res.ok) {
        const data = await res.json()
        setDonor(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch donor:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading blood unit details...</p>
        </div>
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p className="text-red-600">{error || 'Blood unit not found'}</p>
            <Button onClick={() => router.push('/dashboard/inventory')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const status = statusConfig[unit.status] || statusConfig.available
  const StatusIcon = status.icon

  const collectionDate = new Date(unit.collectionDate)
  const expiryDate = new Date(unit.expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
  const daysSinceCollection = Math.floor((now - collectionDate) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blood Unit Details</h1>
            <p className="mt-1 text-foreground/60 font-mono text-sm">{unit.unitId}</p>
          </div>
        </div>
        <Badge className={`${status.color} text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Unit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplet className="w-5 h-5 text-red-600" />
            Blood Unit Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Blood Type</p>
                <Badge className="bg-red-100 text-red-800 text-lg mt-1">
                  <Droplet className="w-4 h-4 mr-1" />
                  {unit.bloodType}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Component</p>
                <p className="font-medium capitalize">{unit.component || 'Whole Blood'}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Volume</p>
                <p className="font-medium">{unit.volume} ml</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Collection Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {collectionDate.toLocaleDateString()}
                </p>
                <p className="text-xs text-foreground/40 mt-1">{daysSinceCollection} days ago</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Expiry Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {expiryDate.toLocaleDateString()}
                </p>
                <p className={`text-xs mt-1 ${daysUntilExpiry < 7 ? 'text-red-600 font-semibold' : 'text-foreground/40'}`}>
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} days remaining` : 'Expired'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {unit.collectionFacility && (
                <div>
                  <p className="text-sm text-foreground/60">Collection Facility</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {unit.collectionFacility}
                  </p>
                </div>
              )}
              {unit.technician && (
                <div>
                  <p className="text-sm text-foreground/60">Technician</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {unit.technician}
                  </p>
                </div>
              )}
              {unit.storageLocation && (
                <div>
                  <p className="text-sm text-foreground/60">Storage Location</p>
                  <p className="font-medium flex items-center gap-2">
                    <Thermometer className="w-4 h-4" />
                    {unit.storageLocation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donor Information */}
      {donor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Donor Information
            </CardTitle>
            <CardDescription>Details about the blood donor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="grid md:grid-cols-3 gap-6 flex-1">
                <div>
                  <p className="text-sm text-foreground/60">Full Name</p>
                  <p className="font-medium">{donor.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {donor.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60">Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {donor.phone}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/donors/${donor.id}`)}
              >
                View Donor Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {unit.testedFor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-blue-600" />
              Test Results
            </CardTitle>
            <CardDescription>Screening test results for this blood unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: 'HIV', key: 'hiv' },
                { name: 'Hepatitis B', key: 'hepatitisB' },
                { name: 'Hepatitis C', key: 'hepatitisC' },
                { name: 'Syphilis', key: 'syphilis' },
                { name: 'Malaria', key: 'malaria' },
                { name: 'COVID-19', key: 'covid19' },
              ].map((test) => {
                const result = unit.testedFor[test.key]
                if (!result) return null

                const isNegative = result === 'negative'
                return (
                  <div key={test.key} className="p-3 bg-secondary/10 rounded-lg">
                    <p className="text-sm font-medium mb-1">{test.name}</p>
                    <Badge className={isNegative ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {isNegative ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      {result.charAt(0).toUpperCase() + result.slice(1)}
                    </Badge>
                  </div>
                )
              })}
              {unit.testedFor.testDate && (
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <p className="text-sm font-medium mb-1">Test Date</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(unit.testedFor.testDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drive Association */}
      {unit.driveName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Associated Donation Drive
            </CardTitle>
            <CardDescription>This blood unit was collected during a donation drive</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg">{unit.driveName}</p>
            {unit.driveId && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => router.push(`/dashboard/drives/${unit.driveId}`)}
              >
                View Drive Details
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {unit.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{unit.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Unit Timeline
          </CardTitle>
          <CardDescription>Complete history of this blood unit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Blood Unit Created</p>
                <p className="text-sm text-foreground/60">
                  {collectionDate.toLocaleDateString()} at {collectionDate.toLocaleTimeString()}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Available</Badge>
            </div>

            {unit.status === 'reserved' && (
              <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">Reserved for Request</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(unit.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Reserved</Badge>
              </div>
            )}

            {unit.status === 'used' && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium">Blood Unit Used</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(unit.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-gray-100 text-gray-800">Used</Badge>
              </div>
            )}

            {unit.status === 'expired' && (
              <div className="flex items-center gap-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium">Blood Unit Expired</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(unit.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-red-100 text-red-800">Expired</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
