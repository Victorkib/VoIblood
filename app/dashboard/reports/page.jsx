import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Calendar } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="mt-2 text-foreground/60">View comprehensive reports and data insights</p>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: 'Inventory Report',
            description: 'Blood stock levels and distribution by type',
            icon: '📦',
          },
          {
            title: 'Donor Analytics',
            description: 'Donor activity, eligibility, and trends',
            icon: '👥',
          },
          {
            title: 'Request Summary',
            description: 'Hospital requests and fulfillment rates',
            icon: '🏥',
          },
          {
            title: 'Usage Trends',
            description: 'Monthly usage patterns and projections',
            icon: '📈',
          },
          {
            title: 'Expiry Analysis',
            description: 'Wastage reduction and expiry patterns',
            icon: '⏰',
          },
          {
            title: 'Performance Metrics',
            description: 'System performance and KPIs',
            icon: '📊',
          },
        ].map((report, idx) => (
          <Card key={idx} className="p-6 hover:border-primary/30 hover:shadow-lg transition cursor-pointer">
            <div className="mb-4 text-3xl">{report.icon}</div>
            <h3 className="font-semibold text-foreground mb-2">{report.title}</h3>
            <p className="text-sm text-foreground/60 mb-4">{report.description}</p>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Generate
            </Button>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Recent Reports</h3>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              name: 'Monthly Inventory Report - March 2024',
              date: 'Mar 15, 2024',
              size: '2.4 MB',
            },
            {
              name: 'Donor Activity Summary - Q1 2024',
              date: 'Mar 10, 2024',
              size: '1.8 MB',
            },
            {
              name: 'Hospital Request Analysis - February 2024',
              date: 'Mar 5, 2024',
              size: '1.2 MB',
            },
            {
              name: 'Quarterly Performance Review',
              date: 'Feb 28, 2024',
              size: '3.1 MB',
            },
            {
              name: 'Wastage Reduction Report - January 2024',
              date: 'Feb 15, 2024',
              size: '0.9 MB',
            },
          ].map((report, idx) => (
            <div key={idx} className="flex items-center justify-between p-6 hover:bg-secondary/5 transition">
              <div>
                <p className="font-medium text-foreground">{report.name}</p>
                <p className="text-sm text-foreground/60 mt-1">{report.date} • {report.size}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Custom Report Builder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Generate Custom Report</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Report Type</label>
              <select className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground">
                <option>Inventory</option>
                <option>Donors</option>
                <option>Requests</option>
                <option>Usage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <div className="flex gap-2">
                <input type="date" className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground" />
                <span className="flex items-center text-foreground/60">to</span>
                <input type="date" className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Format</label>
              <select className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground">
                <option>PDF</option>
                <option>CSV</option>
                <option>Excel</option>
              </select>
            </div>
          </div>
          <Button className="w-full gap-2">
            <Calendar className="w-4 h-4" />
            Generate Custom Report
          </Button>
        </div>
      </Card>
    </div>
  )
}
