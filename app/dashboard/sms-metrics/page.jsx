'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Phone,
  Clock,
  Activity,
  BarChart3,
  Download,
} from 'lucide-react'

export default function SMSMetricsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/sms-metrics')
      return
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
      router.push('/dashboard')
      return
    }
    fetchMetrics()
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!autoRefresh || !metrics) return

    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, metrics])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/admin/sms-metrics')
      const data = await res.json()

      if (res.ok) {
        setMetrics(data.data)
      } else {
        setError(data.error || 'Failed to fetch SMS metrics')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleResetMetrics = async () => {
    if (!confirm('Are you sure you want to reset all SMS metrics? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch('/api/admin/sms-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ action: 'reset' }),
      })

      const data = await res.json()

      if (res.ok) {
        await fetchMetrics()
      } else {
        setError(data.error || 'Failed to reset metrics')
      }
    } catch (err) {
      setError('Failed to reset metrics')
    } finally {
      setActionLoading(false)
    }
  }

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'twilio':
        return 'bg-blue-100 text-blue-800'
      case 'africastalking':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (success) => {
    if (success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    }
    return <XCircle className="w-4 h-4 text-red-600" />
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never'
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const calculateSuccessRate = (stats) => {
    const total = stats.success + stats.failure
    if (total === 0) return '0%'
    return `${Math.round((stats.success / total) * 100)}%`
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading SMS metrics...</p>
        </div>
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchMetrics} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!metrics) return null

  const { stats, recentAttempts, providers } = metrics

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SMS Delivery Metrics</h1>
          <p className="mt-2 text-foreground/60">Monitor SMS provider performance and delivery rates</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-600 animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            onClick={fetchMetrics}
            disabled={actionLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {user?.role === 'super_admin' && (
            <Button
              variant="outline"
              onClick={handleResetMetrics}
              disabled={actionLoading}
            >
              Reset Metrics
            </Button>
          )}
        </div>
      </div>

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Providers Status
          </CardTitle>
          <CardDescription>
            Current configuration and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Twilio */}
            <div className="p-4 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Twilio</h3>
                <Badge variant={providers.twilio ? 'default' : 'secondary'}>
                  {providers.twilio ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm text-foreground/60">
                <div className="flex justify-between">
                  <span>Account SID:</span>
                  <span className="font-mono">{stats.twilio.lastAttempt ? 'Configured' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone Number:</span>
                  <span className="font-mono">{providers.twilio ? 'Active' : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Africa's Talking */}
            <div className="p-4 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Africa&apos;s Talking</h3>
                <Badge variant={providers.africastalking ? 'default' : 'secondary'}>
                  {providers.africastalking ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm text-foreground/60">
                <div className="flex justify-between">
                  <span>API Key:</span>
                  <span className="font-mono">{stats.africastalking.lastAttempt ? 'Configured' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sender ID:</span>
                  <span className="font-mono">{providers.africastalking ? 'Active' : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Total SMS Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/60">Successful:</span>
                <span className="text-lg font-bold text-green-600">{stats.total.success}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/60">Failed:</span>
                <span className="text-lg font-bold text-red-600">{stats.total.failure}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-medium">Success Rate:</span>
                <span className="text-lg font-bold text-blue-600">
                  {calculateSuccessRate(stats.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Twilio Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              Twilio Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/60">Successful:</span>
                <span className="text-lg font-bold text-green-600">{stats.twilio.success}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/60">Failed:</span>
                <span className="text-lg font-bold text-red-600">{stats.twilio.failure}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-foreground/60">Last Attempt:</span>
                <span className="text-xs font-mono">{formatTimeAgo(stats.twilio.lastAttempt)}</span>
              </div>
              {stats.twilio.lastError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {stats.twilio.lastError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Africa's Talking Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              Africa&apos;s Talking Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/60">Successful:</span>
                <span className="text-lg font-bold text-green-600">{stats.africastalking.success}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/60">Failed:</span>
                <span className="text-lg font-bold text-red-600">{stats.africastalking.failure}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-foreground/60">Last Attempt:</span>
                <span className="text-xs font-mono">{formatTimeAgo(stats.africastalking.lastAttempt)}</span>
              </div>
              {stats.africastalking.lastError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {stats.africastalking.lastError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent SMS Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent SMS Attempts
          </CardTitle>
          <CardDescription>
            Last {recentAttempts.length} SMS delivery attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttempts.length === 0 ? (
            <div className="text-center py-8 text-foreground/60">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No SMS attempts yet. Send an OTP to see metrics here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(attempt.success)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-3 h-3 text-foreground/60" />
                        <span className="text-sm font-mono truncate">{attempt.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground/60">
                        <Badge variant="outline" className={`text-xs ${getProviderColor(attempt.provider)}`}>
                          {attempt.provider}
                        </Badge>
                        {attempt.error && (
                          <span className="text-red-600 truncate" title={attempt.error}>
                            {attempt.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-foreground/60 text-right">
                    <div>{formatTimeAgo(attempt.timestamp)}</div>
                    {attempt.messageId && (
                      <div className="font-mono text-xs mt-1" title={attempt.messageId}>
                        {attempt.messageId.substring(0, 12)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMetrics}
                className="ml-auto"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
