'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Droplet } from 'lucide-react'

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Droplet className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">iBlood</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden gap-8 md:flex">
          <Link href="#features" className="text-sm font-medium text-foreground/70 hover:text-foreground transition">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm font-medium text-foreground/70 hover:text-foreground transition">
            How It Works
          </Link>
          <Link href="#modules" className="text-sm font-medium text-foreground/70 hover:text-foreground transition">
            Modules
          </Link>
          <Link href="#contact" className="text-sm font-medium text-foreground/70 hover:text-foreground transition">
            Contact
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
