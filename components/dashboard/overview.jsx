'use client'

import { Card } from '@/components/ui/card'
import { Package, Users, AlertCircle, TrendingUp } from 'lucide-react'

const stats = [
  {
    label: 'Total Blood Units',
    value: '1,247',
    change: '+12% from last month',
    icon: Package,
    color: 'text-secondary',
  },
  {
    label: 'Active Donors',
    value: '3,821',
    change: '+8% from last month',
    icon: Users,
    color: 'text-accent',
  },
  {
    label: 'Near Expiry Units',
    value: '34',
    change: '-5% from last month',
    icon: AlertCircle,
    color: 'text-primary',
  },
  {
    label: 'Request Fulfillment',
    value: '98.5%',
    change: '+2% from last month',
    icon: TrendingUp,
    color: 'text-accent',
  },
]

export function DashboardOverview() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground/60">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-2 text-xs text-accent">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg bg-secondary/10 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Type Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Blood Type Distribution</h3>
          <div className="space-y-4">
            {[
              { type: 'O+', units: 450, percentage: 36 },
              { type: 'A+', units: 320, percentage: 26 },
              { type: 'B+', units: 285, percentage: 23 },
              { type: 'AB+', units: 192, percentage: 15 },
            ].map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{item.type}</span>
                  <span className="text-sm text-foreground/60">{item.units} units</span>
                </div>
                <div className="h-2 rounded-full bg-secondary/20 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'Blood collection recorded', detail: '5 units O+', time: '2 hours ago' },
              { action: 'Hospital request processed', detail: 'City Hospital - 3 units A+', time: '4 hours ago' },
              { action: 'Expiry alert triggered', detail: '2 units B- expiring soon', time: '6 hours ago' },
              { action: 'New donor registered', detail: 'John Smith - O+ donor', time: '1 day ago' },
            ].map((activity, idx) => (
              <div key={idx} className="flex gap-4 pb-4 last:pb-0 border-b last:border-0 border-border">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-xs text-foreground/60">{activity.detail}</p>
                  <p className="text-xs text-foreground/40 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Register Donor', href: '/dashboard/donors/new' },
            { label: 'Record Collection', href: '/dashboard/inventory/add' },
            { label: 'Process Request', href: '/dashboard/requests' },
            { label: 'View Reports', href: '/dashboard/reports' },
          ].map((action, idx) => (
            <a
              key={idx}
              href={action.href}
              className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition text-center"
            >
              <p className="text-sm font-medium text-foreground">{action.label}</p>
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}
