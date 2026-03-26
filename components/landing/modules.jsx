'use client'

import { Users, Package, Clock, Hospital, BarChart3, Shield } from 'lucide-react'

const modules = [
  {
    icon: Users,
    title: 'Donor Management',
    features: [
      'Donor registration and profiles',
      'Eligibility tracking',
      'Donation history',
      'Contact management',
    ],
  },
  {
    icon: Package,
    title: 'Blood Inventory',
    features: [
      'Real-time stock tracking',
      'Blood group categorization',
      'Unit status management',
      'Location tracking',
    ],
  },
  {
    icon: Clock,
    title: 'Expiry Monitoring',
    features: [
      'Automatic expiry detection',
      'Smart alerts',
      'Waste reduction',
      'Compliance tracking',
    ],
  },
  {
    icon: Hospital,
    title: 'Hospital Requests',
    features: [
      'Digital request submission',
      'Real-time availability check',
      'Request approval workflow',
      'Status tracking',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    features: [
      'Inventory reports',
      'Donor activity analytics',
      'Usage trends',
      'Performance dashboards',
    ],
  },
  {
    icon: Shield,
    title: 'Security & Access',
    features: [
      'Role-based access control',
      'User authentication',
      'Data encryption',
      'Audit logging',
    ],
  },
]

export function ModulesSection() {
  return (
    <section id="modules" className="px-4 py-20 sm:px-6 lg:px-8 bg-background">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4 text-balance">
            Core System Modules
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto text-balance">
            Comprehensive modules designed to cover all aspects of blood bank management.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, idx) => {
            const Icon = module.icon
            return (
              <div key={idx} className="rounded-lg border border-border bg-card p-8 hover:border-secondary/50 transition">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/10">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-foreground">{module.title}</h3>
                <ul className="space-y-2">
                  {module.features.map((feature, fidx) => (
                    <li key={fidx} className="text-sm text-foreground/60">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
