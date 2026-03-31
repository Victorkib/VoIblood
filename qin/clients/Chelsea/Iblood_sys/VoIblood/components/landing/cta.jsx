'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, Zap } from 'lucide-react'

export function CTASection() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className="rounded-lg border border-primary/20 bg-background/80 backdrop-blur-sm p-8 sm:p-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Get Started Today</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4 text-balance sm:text-4xl">
              Transform Your Blood Bank Operations
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto text-balance">
              Join healthcare facilities across the region already saving time, reducing waste, and saving lives with iBlood.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="group">
              <Link href="/signup">
                Start Free Trial
                <Heart className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#contact">Schedule Demo</Link>
            </Button>
          </div>

          {/* Benefits */}
          <div className="mt-8 pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary mb-1">100%</p>
              <p className="text-sm text-foreground/60">Uptime SLA</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent mb-1">24/7</p>
              <p className="text-sm text-foreground/60">Expert Support</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary mb-1">HIPAA</p>
              <p className="text-sm text-foreground/60">Compliant</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
