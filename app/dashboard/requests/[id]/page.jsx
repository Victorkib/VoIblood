'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Hospital,
  Calendar,
  MapPin,
  Phone,
  User,
  Droplet,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Activity,
} from 'lucide-react'

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  fulfilled: { label: 'Fulfilled', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

export default function RequestDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/requests/' + params.id)
      return
    }
    fetchRequest()
  }, [isAuthenticated, params.id])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/requests/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setRequest(data.data)
      } else {
        setError(data.error || 'Failed to load request')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading request details...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p className="text-red-600">{error || 'Request not found'}</p>
            <Button onClick={() => router.push('/dashboard/requests')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const status = statusConfig[request.status] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/requests')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blood Request Details</h1>
            <p className="mt-1 text-foreground/60">Request from {request.requestingFacility || 'Unknown Facility'}</p>
          </div>
        </div>
        <Badge className={`${status.color} text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Request Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Request Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Requesting Facility</p>
                <p className="font-medium flex items-center gap-2">
                  <Hospital className="w-4 h-4" />
                  {request.requestingFacility || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Contact Person</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {request.contactPerson || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Contact Phone</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {request.contactPhone || 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Facility Location</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {request.facilityLocation || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Request Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Required By</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {request.requiredBy ? new Date(request.requiredBy).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blood Requirements */}
      {request.bloodRequirements && request.bloodRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-red-600" />
              Blood Requirements
            </CardTitle>
            <CardDescription>Requested blood types and quantities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {request.bloodRequirements.map((req, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-red-100 text-red-800 text-lg">
                      <Droplet className="w-4 h-4 mr-1" />
                      {req.bloodType}
                    </Badge>
                    <div>
                      <p className="font-medium">{req.quantity} units</p>
                      {req.component && (
                        <p className="text-sm text-foreground/60 capitalize">{req.component}</p>
                      )}
                    </div>
                  </div>
                  {req.urgency && (
                    <Badge
                      className={
                        req.urgency === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : req.urgency === 'urgent'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purpose/Reason */}
      {request.purpose && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Purpose / Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.purpose}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Request Timeline
          </CardTitle>
          <CardDescription>Complete status history of this request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium">Request Created</p>
                <p className="text-sm text-foreground/60">
                  {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
            </div>

            {request.status !== 'pending' && (
              <div className={`flex items-center gap-4 p-3 rounded-lg ${
                request.status === 'approved' ? 'bg-blue-50 border-blue-200 border' :
                request.status === 'fulfilled' ? 'bg-green-50 border-green-200 border' :
                'bg-red-50 border-red-200 border'
              }`}>
                {request.status === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                ) : request.status === 'fulfilled' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium">Request {request.status.charAt(0).toUpperCase() + request.status.slice(1)}</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(request.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {request.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
