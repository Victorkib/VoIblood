'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Heart } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-secondary/5 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Transforming blood bank operations</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="mb-6 text-center text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
          Save Lives with{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Real-Time Blood Management
          </span>
        </h1>

        {/* Subheading */}
        <p className="mb-10 text-center text-lg text-foreground/70 sm:text-xl text-balance">
          iBlood is a modern, centralized platform that digitizes blood bank operations—from donor management to emergency requests. Reduce waste, save time, and save lives.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row justify-center">
          <Button size="lg" asChild className="group">
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">Watch Demo</Link>
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 border-t border-border pt-12">
          <p className="text-center text-sm font-medium text-foreground/60 mb-6">Trusted by Healthcare Institutions</p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {['Hospital A', 'Blood Bank B', 'Health Center C', 'Clinic D'].map((org, idx) => (
              <div key={idx} className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-foreground/50">
                {org}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
