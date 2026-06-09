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
import { OrgRouteGuard } from '@/components/dashboard/org-route-guard'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

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
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [deliveredBy, setDeliveredBy] = useState('')
  const [availableUnits, setAvailableUnits] = useState([])
  const [selectedUnitIds, setSelectedUnitIds] = useState([])

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

  const fetchAvailableUnits = async (sourceOrgId) => {
    if (!sourceOrgId) return
    try {
      const res = await fetch(
        `/api/inventory?organizationId=${sourceOrgId}&status=available&limit=100`
      )
      const data = await res.json()
      if (res.ok) {
        setAvailableUnits(data.data || [])
      }
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    if (!request?.sourceOrganizationId?._id && !request?.sourceOrganizationId) return
    const sourceOrgId = request.sourceOrganizationId?._id || request.sourceOrganizationId
    if (request?.canActAsSupplier) fetchAvailableUnits(sourceOrgId)
  }, [request?.sourceOrganizationId, request?.canActAsSupplier])

  const callAction = async (action, payload = {}) => {
    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)

      const res = await fetch(`/api/requests/${params.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')

      setActionSuccess(data.message || 'Request updated')
      await fetchRequest()
      if (request?.canActAsSupplier) {
        const sourceOrgId = request.sourceOrganizationId?._id || request.sourceOrganizationId
        await fetchAvailableUnits(sourceOrgId)
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
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
    <OrgRouteGuard feature="requests">
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/requests')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blood Request Details</h1>
            <p className="mt-1 text-foreground/60">
              {request.canActAsSupplier ? 'Incoming request from' : 'Request sent to'}{' '}
              {request.canActAsSupplier
                ? request.requestingOrganizationName || 'Unknown facility'
                : request.sourceOrganizationName || 'Unknown organization'}
            </p>
          </div>
        </div>
        <Badge className={`${status.color} text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {status.label}
        </Badge>
      </div>

      {actionError && (
        <Card className="p-4 border-red-500/40 bg-red-500/5 text-red-700">{actionError}</Card>
      )}
      {actionSuccess && (
        <Card className="p-4 border-green-500/40 bg-green-500/5 text-green-700">{actionSuccess}</Card>
      )}

      {(request.canActAsSupplier || request.canActAsRequester) && (
        <Card>
          <CardHeader>
            <CardTitle>Request Actions</CardTitle>
            <CardDescription>
              {request.canActAsSupplier
                ? 'Manage approval and fulfillment workflow'
                : 'Manage requester-side controls'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.canActAsSupplier && request.status === 'pending' && (
              <div className="flex flex-wrap gap-2 items-end">
                <Button onClick={() => callAction('approve')} disabled={actionLoading}>
                  Approve
                </Button>
                <div className="flex-1 min-w-[220px]">
                  <Input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => callAction('reject', { reason: rejectionReason })}
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  Reject
                </Button>
              </div>
            )}

            {request.canActAsSupplier &&
              ['approved', 'partially_fulfilled', 'pending'].includes(request.status) && (
                <div className="space-y-3 border rounded-lg p-3">
                  <p className="text-sm font-medium">Allocate units</p>
                  <div className="max-h-48 overflow-auto space-y-2">
                    {availableUnits.map((unit) => {
                      const checked = selectedUnitIds.includes(unit._id)
                      return (
                        <label key={unit._id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                          <span>
                            {unit.unitId} - {unit.bloodType} ({unit.component || 'whole blood'})
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedUnitIds((prev) =>
                                e.target.checked
                                  ? [...prev, unit._id]
                                  : prev.filter((id) => id !== unit._id)
                              )
                            }}
                          />
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => callAction('allocate', { unitIds: selectedUnitIds })}
                      disabled={actionLoading || selectedUnitIds.length === 0}
                    >
                      Allocate selected
                    </Button>
                    <Button
                      onClick={() => callAction('fulfill')}
                      disabled={actionLoading}
                    >
                      Mark fulfilled
                    </Button>
                  </div>
                </div>
              )}

            {request.canActAsSupplier && request.status === 'fulfilled' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    value={deliveredBy}
                    onChange={(e) => setDeliveredBy(e.target.value)}
                    placeholder="Delivered by"
                  />
                </div>
                <Button
                  onClick={() => callAction('deliver', { deliveredBy })}
                  disabled={actionLoading || !deliveredBy.trim()}
                >
                  Mark delivered
                </Button>
              </div>
            )}

            {request.canActAsRequester &&
              ['pending', 'approved', 'partially_fulfilled'].includes(request.status) && (
                <div className="space-y-2">
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Cancellation reason"
                  />
                  <Button
                    variant="outline"
                    onClick={() => callAction('cancel', { cancelReason })}
                    disabled={actionLoading}
                  >
                    Cancel request
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      )}

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
                  {request.requestingOrganizationName || 'N/A'}
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
                <p className="text-sm text-foreground/60">Source Organization</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {request.sourceOrganizationName || 'N/A'}
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
                  {request.requiredDate ? new Date(request.requiredDate).toLocaleDateString() : 'N/A'}
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

      {/* Diagnosis */}
      {request.diagnosis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.diagnosis}</p>
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

      {(request.fulfilledDate || request.deliveredDate) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Transfer Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 space-y-1">
            <p>
              {request.allocatedUnits?.length || 0} allocated unit(s) transferred from{' '}
              <strong>{request.sourceOrganizationName || 'source organization'}</strong> to{' '}
              <strong>{request.requestingOrganizationName || 'requesting organization'}</strong>{' '}
              when this request was marked fulfilled.
            </p>
            {request.deliveredDate ? (
              <p>
                Delivered by <strong>{request.deliveredBy || 'N/A'}</strong> on{' '}
                <strong>{new Date(request.deliveredDate).toLocaleString()}</strong>.
              </p>
            ) : (
              <p>Delivery confirmation is still pending.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </OrgRouteGuard>
  )
}
