import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function DonorsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Donors</h1>
          <p className="mt-2 text-foreground/60">Manage donor information and eligibility</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Donor
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              type="search"
              placeholder="Search by name, ID, or blood type..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Donors Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Last Donation</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Placeholder rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-secondary/5 transition">
                  <td className="px-6 py-4 text-sm text-foreground">John Donor {i}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      O+ {i === 3 ? 'Rh-' : 'Rh+'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/60">555-010{i}</td>
                  <td className="px-6 py-4 text-sm text-foreground/60">{45 + i} days ago</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                      {i % 2 === 0 ? 'Eligible' : 'Ineligible'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-primary hover:underline">View</button>
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
