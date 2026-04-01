'use client'

import Link from 'next/link'
import { Droplet } from 'lucide-react'

export function FooterSection() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                <Droplet className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">iBlood</span>
            </div>
            <p className="text-sm text-foreground/60">
              Transforming blood bank operations with modern technology.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground text-sm">Product</h3>
            <ul className="space-y-2">
              <li><Link href="#features" className="text-sm text-foreground/60 hover:text-foreground transition">Features</Link></li>
              <li><Link href="#how-it-works" className="text-sm text-foreground/60 hover:text-foreground transition">How It Works</Link></li>
              <li><Link href="#modules" className="text-sm text-foreground/60 hover:text-foreground transition">Modules</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Pricing</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground text-sm">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">About</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Blog</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Careers</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Contact</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground text-sm">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Privacy</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Terms</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Security</Link></li>
              <li><Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Compliance</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-foreground/60">
            © {currentYear} iBlood. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">Twitter</Link>
            <Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">LinkedIn</Link>
            <Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
