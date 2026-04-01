import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-2xl font-semibold text-foreground">Page Not Found</p>
        </div>
        
        <p className="text-foreground/60 max-w-md mx-auto">
          The page you are looking for doesn&apos;t exist or has been moved. Please check the URL and try again.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
