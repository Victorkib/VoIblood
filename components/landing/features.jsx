'use client'

import { Droplet, Zap, AlertCircle, TrendingUp, Lock, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: Droplet,
    title: 'Blood Inventory Tracking',
    description: 'Real-time monitoring of blood units with automatic categorization by blood group and Rh factor.',
  },
  {
    icon: AlertCircle,
    title: 'Expiry Monitoring',
    description: 'Smart alerts for near-expiry units reduce wastage and ensure only safe blood is distributed.',
  },
  {
    icon: Zap,
    title: 'Emergency Response',
    description: 'Instant processing of hospital blood requests with real-time availability verification.',
  },
  {
    icon: TrendingUp,
    title: 'Donor Management',
    description: 'Comprehensive donor profiles with eligibility tracking and donation history analytics.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Data-driven insights into inventory trends, donor patterns, and operational efficiency.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Role-based access control and secure authentication protect sensitive medical data.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8 bg-background">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4 text-balance">
            Powerful Features for Modern Blood Banks
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto text-balance">
            Everything you need to manage blood donations, inventory, and requests in one integrated platform.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div key={idx} className="group rounded-lg border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-foreground/60">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
