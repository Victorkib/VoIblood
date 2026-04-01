import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <AlertCircle className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Page Not Found</h2>

          <p className="text-foreground/60">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="w-full space-y-2 pt-4">
            <Button asChild className="w-full gap-2">
              <Link href="/dashboard">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full gap-2">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
