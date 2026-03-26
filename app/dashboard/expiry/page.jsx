import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'

export default function ExpiryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Expiry Monitoring</h1>
        <p className="mt-2 text-foreground/60">Track and manage blood units approaching expiration</p>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60 mb-1">Expired Units</p>
              <p className="text-3xl font-bold text-destructive">2</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-destructive opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60 mb-1">Expiring in 1-3 Days</p>
              <p className="text-3xl font-bold text-primary">12</p>
            </div>
            <Clock className="w-8 h-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60 mb-1">Expiring in 4-7 Days</p>
              <p className="text-3xl font-bold text-accent">22</p>
            </div>
            <Clock className="w-8 h-8 text-accent opacity-20" />
          </div>
        </Card>
      </div>

      {/* Expired Units Table */}
      <Card>
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Expired Units (Action Required)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-destructive/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Days Expired</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2].map((i) => (
                <tr key={i} className="hover:bg-destructive/5 transition">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">BLU-10000{i}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      A+
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-destructive font-medium">2024-03-{15 - i}</td>
                  <td className="px-6 py-4 text-sm text-destructive">{i} days</td>
                  <td className="px-6 py-4 text-sm">
                    <Button variant="outline" size="sm" className="text-destructive">
                      Discard
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Near Expiry Units */}
      <Card>
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Expiring Soon (1-3 Days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-primary/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Days Remaining</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <tr key={i} className="hover:bg-primary/5 transition">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">BLU-2000{i}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                      {['O+', 'B+', 'AB-'][i - 1]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary font-medium">2024-03-{20 + i}</td>
                  <td className="px-6 py-4 text-sm text-primary">{i} days</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-primary hover:underline">Priority Request</button>
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
