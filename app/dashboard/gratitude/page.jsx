'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Gift, Search, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import { CATALOG_CATEGORIES } from '@/lib/gratitude-points/constants'
import { OrgFeatureLayout } from '@/components/dashboard/org-route-guard'

const CATEGORY_LABELS = {
  consultation: 'Consultation',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  wellness: 'Wellness',
  other: 'Other',
}

export default function GratitudeDashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [tab, setTab] = useState('redeem')
  const [catalog, setCatalog] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const [lookupForm, setLookupForm] = useState({
    nationalId: '',
    donorToken: '',
    phone: '',
  })
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [verifyNationalId, setVerifyNationalId] = useState('')
  const [phoneVerifiedInPerson, setPhoneVerifiedInPerson] = useState(false)
  const [redeemLoading, setRedeemLoading] = useState(false)

  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: 'consultation',
    pointCost: '500',
  })
  const [catalogSaving, setCatalogSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.organizationId) return
    try {
      setLoading(true)
      const [catRes, redRes] = await Promise.all([
        fetch('/api/gratitude/catalog?manage=1', { credentials: 'include' }),
        fetch('/api/gratitude/redemptions?limit=30', { credentials: 'include' }),
      ])
      if (catRes.ok) {
        const catData = await catRes.json()
        setCatalog(catData.data || [])
      }
      if (redRes.ok) {
        const redData = await redRes.json()
        setRedemptions(redData.data || [])
      }
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user?.organizationId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (user.organizationType !== 'hospital') {
      setError('Gratitude Points management is for hospital partner accounts.')
      setLoading(false)
      return
    }
    if (!user.rewardsPartnerActive) {
      setError(
        'Your hospital is not enrolled in the Gratitude Points partner program. Contact platform support or upgrade to Professional with Rewards Partner.'
      )
      setLoading(false)
      return
    }
    loadData()
  }, [authLoading, user, router, loadData])

  const handleLookup = async (e) => {
    e.preventDefault()
    setLookupLoading(true)
    setLookupResult(null)
    setMessage(null)
    try {
      const res = await fetch('/api/gratitude/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nationalId: lookupForm.nationalId || undefined,
          donorToken: lookupForm.donorToken || undefined,
          phone: lookupForm.phone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setLookupResult(data.data)
      if (!data.data.found) setMessage('No wallet found for this identity.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (!lookupResult?.wallet?.id || !selectedItemId) {
      setMessage('Select a donor and catalog benefit first.')
      return
    }
    setRedeemLoading(true)
    setMessage(null)
    setError(null)
    try {
      const usePhone = lookupResult.verificationHint === 'phone_requires_in_person'
      const nationalIdValue = (verifyNationalId || lookupForm.nationalId || '').trim()
      if (!nationalIdValue) {
        setError('Enter and confirm the donor’s national ID in person before redeeming.')
        setRedeemLoading(false)
        return
      }
      const res = await fetch('/api/gratitude/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletId: lookupResult.wallet.id,
          catalogItemId: selectedItemId,
          donorId: lookupResult.donor?.id,
          verificationMethod: usePhone ? 'phone_in_person' : 'national_id',
          nationalId: nationalIdValue,
          phoneVerifiedInPerson: usePhone ? phoneVerifiedInPerson : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Redemption failed')
      setMessage(
        `Redemption complete: ${data.data.referenceCode} — ${data.data.catalogItemTitle} (${data.data.pointsSpent} points). Balance: ${data.data.balance}`
      )
      setLookupResult(null)
      setSelectedItemId('')
      setVerifyNationalId('')
      setLookupForm({ nationalId: '', donorToken: '', phone: '' })
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setRedeemLoading(false)
    }
  }

  const handleAddCatalogItem = async (e) => {
    e.preventDefault()
    setCatalogSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/gratitude/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          pointCost: Number(newItem.pointCost),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add item')
      setNewItem({ title: '', description: '', category: 'consultation', pointCost: '500' })
      setMessage('Catalog item added.')
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setCatalogSaving(false)
    }
  }

  const toggleCatalogItem = async (id, isActive) => {
    await fetch(`/api/gratitude/catalog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !isActive }),
    })
    loadData()
  }

  const activeCatalog = catalog.filter((c) => c.isActive)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && user?.organizationType === 'hospital' && !user?.rewardsPartnerActive) {
    return (
      <div className="p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6 flex gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <OrgFeatureLayout feature="gratitude">
      <p className="text-xs text-muted-foreground -mt-2">
        Community thank-you benefits for blood donors. Not payment for blood. No cash value (Kenya).
      </p>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {message}
        </div>
      )}

      <div className="flex gap-2 border-b pb-2">
        {['redeem', 'catalog', 'history'].map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t === 'redeem' ? 'Redeem' : t}
          </Button>
        ))}
      </div>

      {tab === 'redeem' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Find donor</CardTitle>
              <CardDescription>
                Verify government ID in person. Phone lookup requires staff confirmation on site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookup} className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">National ID</label>
                  <Input
                    value={lookupForm.nationalId}
                    onChange={(e) => setLookupForm({ ...lookupForm, nationalId: e.target.value })}
                    placeholder="Preferred"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Donor token</label>
                  <Input
                    value={lookupForm.donorToken}
                    onChange={(e) => setLookupForm({ ...lookupForm, donorToken: e.target.value })}
                    placeholder="From donor profile"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input
                    value={lookupForm.phone}
                    onChange={(e) => setLookupForm({ ...lookupForm, phone: e.target.value })}
                    placeholder="In-person only"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" disabled={lookupLoading}>
                    {lookupLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Look up wallet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {lookupResult?.found && (
            <Card className="border-rose-100">
              <CardHeader>
                <CardTitle className="text-lg">
                  {lookupResult.wallet.displayName || 'Donor wallet'}
                </CardTitle>
                <CardDescription>
                  Balance: <strong>{lookupResult.wallet.balance}</strong> gratitude points
                  {lookupResult.verificationHint === 'phone_requires_in_person' && (
                    <Badge className="ml-2 bg-amber-100 text-amber-900">In-person ID required</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium">Confirm national ID (in person)</label>
                  <Input
                    value={verifyNationalId}
                    onChange={(e) => setVerifyNationalId(e.target.value)}
                    placeholder="Re-enter ID to verify"
                  />
                </div>
                {lookupResult.verificationHint === 'phone_requires_in_person' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={phoneVerifiedInPerson}
                      onChange={(e) => setPhoneVerifiedInPerson(e.target.checked)}
                    />
                    I verified this donor in person using phone and government ID
                  </label>
                )}
                <div>
                  <label className="text-xs font-medium block mb-2">Select benefit</label>
                  <div className="grid gap-2">
                    {activeCatalog.map((item) => {
                      const itemId = item._id?.toString?.() || item.id
                      return (
                      <label
                        key={itemId}
                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer ${
                          selectedItemId === itemId ? 'border-rose-500 bg-rose-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="catalogItem"
                            checked={selectedItemId === itemId}
                            onChange={() => setSelectedItemId(itemId)}
                          />
                          <span className="font-medium">{item.title}</span>
                          <Badge variant="outline">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                        </div>
                        <span className="text-sm font-semibold text-rose-700">{item.pointCost} pts</span>
                      </label>
                    )})}
                  </div>
                </div>
                <Button onClick={handleRedeem} disabled={redeemLoading || !selectedItemId}>
                  {redeemLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Complete redemption
                </Button>
                <p className="text-xs text-muted-foreground">{lookupResult.disclaimer}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'catalog' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add benefit</CardTitle>
              <CardDescription>
                Set point costs high enough that benefits stay a small thank-you (e.g. 500–5000+ points).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCatalogItem} className="space-y-3">
                <Input
                  placeholder="Title e.g. General consultation thank-you"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  required
                />
                <Input
                  placeholder="Short description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  {CATALOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c] || c}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={50}
                  placeholder="Point cost"
                  value={newItem.pointCost}
                  onChange={(e) => setNewItem({ ...newItem, pointCost: e.target.value })}
                  required
                />
                <Button type="submit" disabled={catalogSaving}>
                  {catalogSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add to catalog
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your catalog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
              {catalog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                catalog.map((item) => {
                  const itemId = item._id?.toString?.() || item.id
                  return (
                  <div
                    key={itemId}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">{item.pointCost} points</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCatalogItem(itemId, item.isActive)}
                    >
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            {redemptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No redemptions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {redemptions.map((r) => (
                  <li key={r.id} className="flex justify-between border-b py-2">
                    <span>
                      {r.referenceCode} — {r.catalogItemTitle} ({r.pointsSpent} pts)
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </OrgFeatureLayout>
  )
}
