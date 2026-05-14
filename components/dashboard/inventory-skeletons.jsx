import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

/** Full-page shell while auth is resolving */
export function InventoryListAuthSkeleton() {
  return (
    <div className="space-y-6">
      <InventoryListHeader />
      <InventoryStatsSkeleton />
      <Card className="p-4">
        <Skeleton className="h-10 w-full max-w-xl" />
      </Card>
      <InventoryTableSkeleton rows={8} />
    </div>
  )
}

export function InventoryStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
  )
}

export function InventoryTableSkeleton({ rows = 8 }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              {['Unit ID', 'Blood Type', 'Collected', 'Expires', 'Status', 'Action'].map((label) => (
                <th key={label} className="px-6 py-3 text-left">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-14 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-12" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** List page: header + optional disabled CTA (matches loaded layout) */
export function InventoryListHeader({ showButton = true }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Blood Inventory</h1>
        <p className="mt-2 text-foreground/60">Track all blood units and stock levels</p>
      </div>
      {showButton ? (
        <Button className="gap-2 shrink-0" disabled>
          <Plus className="h-4 w-4" />
          Record Collection
        </Button>
      ) : null}
    </div>
  )
}

export function InventoryDetailPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 font-mono" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <Card>
        <div className="border-b border-border p-6">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-3">
          {[1, 2, 3].map((col) => (
            <div key={col} className="space-y-4">
              {[1, 2, 3].map((row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-full max-w-[180px]" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border p-6">
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="grid gap-3 p-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border p-6">
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="space-y-3 p-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </Card>
    </div>
  )
}
