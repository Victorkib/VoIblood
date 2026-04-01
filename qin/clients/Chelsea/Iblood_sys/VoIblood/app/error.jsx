'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({ error, reset }) {
  const [errorId] = useState(() => Math.random().toString(36).substr(2, 9).toUpperCase())

  useEffect(() => {
    // Log error to monitoring service
    console.error('[ERROR_BOUNDARY]', error)

    // Send error report to backend
    const reportError = async () => {
      try {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : 'N/A',
          }),
        })
      } catch (err) {
        console.error('Failed to report error:', err)
      }
    }

    reportError()
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-destructive/30 bg-destructive/5">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">Something Went Wrong</h1>

          <p className="text-foreground/60">
            An unexpected error occurred. Our team has been notified and we're working on a fix.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full p-3 rounded-md bg-foreground/5 border border-foreground/10">
              <p className="text-xs font-mono text-foreground/70 text-left break-words">
                {error?.message}
              </p>
            </div>
          )}

          <div className="w-full space-y-2 pt-4">
            <Button onClick={reset} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>

            <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = '/dashboard'}>
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          <p className="text-xs text-foreground/50 pt-2">
            Error ID: {errorId}
          </p>
        </div>
      </Card>
    </div>
  )
}
