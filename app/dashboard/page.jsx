import { DashboardOverview } from '@/components/dashboard/overview'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-foreground/60">Welcome to your blood bank management system</p>
      </div>

      <DashboardOverview />
    </div>
  )
}
