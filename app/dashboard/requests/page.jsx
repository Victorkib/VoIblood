import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function RequestsPage() {
  const statuses = {
    pending: { label: 'Pending', color: 'bg-primary/10 text-primary' },
    approved: { label: 'Approved', color: 'bg-accent/10 text-accent' },
    fulfilled: { label: 'Fulfilled', color: 'bg-accent/10 text-accent' },
    rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hospital Requests</h1>
          <p className="mt-2 text-foreground/60">Manage blood requests from hospitals and healthcare facilities</p>
        </div>
        <Button>New Request</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: '8', color: 'bg-primary/10 text-primary' },
          { label: 'Approved', value: '12', color: 'bg-secondary/10 text-secondary' },
          { label: 'Fulfilled', value: '145', color: 'bg-accent/10 text-accent' },
          { label: 'Rejected', value: '3', color: 'bg-destructive/10 text-destructive' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4">
            <p className="text-sm text-foreground/60 mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              type="search"
              placeholder="Search by hospital name or request ID..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Requests Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Request ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Hospital</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Pending */}
              {[1, 2].map((i) => (
                <tr key={`pending-${i}`} className="hover:bg-secondary/5 transition">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">REQ-2024-{1000 + i}</td>
                  <td className="px-6 py-4 text-sm text-foreground/60">City Hospital</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                      O+
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/60">{2 + i} units</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statuses.pending.color}`}>
                      {statuses.pending.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/60">Today</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button className="text-accent hover:underline">Approve</button>
                    <button className="text-destructive hover:underline">Reject</button>
                  </td>
                </tr>
              ))}

              {/* Approved */}
              {[3, 4, 5].map((i) => (
                <tr key={`approved-${i}`} className="hover:bg-secondary/5 transition">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">REQ-2024-{1000 + i}</td>
                  <td className="px-6 py-4 text-sm text-foreground/60">Regional Hospital</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      A+
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/60">{i - 1} units</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statuses.approved.color}`}>
                      {statuses.approved.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/60">Yesterday</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-accent hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
