'use client'

import { Check } from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Register Donors',
    description: 'Streamlined donor registration with comprehensive medical and eligibility information.',
  },
  {
    number: 2,
    title: 'Collect & Record',
    description: 'Log blood collection immediately with automatic unit assignment and expiry tracking.',
  },
  {
    number: 3,
    title: 'Inventory Management',
    description: 'Real-time visibility of blood units organized by type, availability, and expiry date.',
  },
  {
    number: 4,
    title: 'Hospital Requests',
    description: 'Hospitals submit requests through the system with instant availability verification.',
  },
  {
    number: 5,
    title: 'Approval & Distribution',
    description: 'Automated approval workflow with alert generation and request status tracking.',
  },
  {
    number: 6,
    title: 'Reports & Analytics',
    description: 'Comprehensive dashboards with actionable insights for decision-making.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8 bg-secondary/5">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4 text-balance">
            How iBlood Works
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto text-balance">
            A streamlined workflow designed for efficiency, accuracy, and safety in blood bank operations.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              {/* Step Card */}
              <div className="rounded-lg border border-border bg-background p-8 h-full">
                {/* Step Number Circle */}
                <div className="mb-4 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {step.number}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-foreground/60">{step.description}</p>
              </div>

              {/* Connector Line (hidden on last item) */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-foreground/70 mb-6">Ready to digitize your blood bank operations?</p>
          <div className="flex flex-col gap-3 sm:flex-row justify-center text-sm">
            <span className="flex items-center gap-2 text-foreground/60">
              <Check className="w-4 h-4 text-accent" />
              No setup fees
            </span>
            <span className="flex items-center gap-2 text-foreground/60">
              <Check className="w-4 h-4 text-accent" />
              24/7 Support
            </span>
            <span className="flex items-center gap-2 text-foreground/60">
              <Check className="w-4 h-4 text-accent" />
              HIPAA Compliant
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
