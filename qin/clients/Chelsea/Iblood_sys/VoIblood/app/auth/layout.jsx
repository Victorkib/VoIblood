import { Droplet } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header with Logo */}
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Droplet className="w-6 h-6 text-primary-foreground" />
          </div>
          <Link href="/" className="text-xl font-bold text-foreground hover:opacity-80 transition">
            iBlood
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        {children}
      </div>
    </div>
  )
}
