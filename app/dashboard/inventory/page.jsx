import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Blood Inventory</h1>
          <p className="mt-2 text-foreground/60">Track all blood units and stock levels</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Record Collection
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: '1,247', color: 'bg-secondary/10 text-secondary' },
          { label: 'Available', value: '1,189', color: 'bg-accent/10 text-accent' },
          { label: 'Reserved', value: '58', color: 'bg-primary/10 text-primary' },
          { label: 'Low Stock', value: '5 Types', color: 'bg-destructive/10 text-destructive' },
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
              placeholder="Search by unit ID or blood type..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Collection Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Placeholder rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-secondary/5 transition">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">BLU-{String(100000 + i).slice(0, 5)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {['O+', 'A+', 'B+', 'AB+', 'O-'][i % 5]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/60">2024-03-{10 + i}</td>
                  <td className="px-6 py-4 text-sm text-foreground/60">2024-04-{10 + i}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      i === 1 ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                    }`}>
                      {i === 1 ? 'Near Expiry' : 'Available'}
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
