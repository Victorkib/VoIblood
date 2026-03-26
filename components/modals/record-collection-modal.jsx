'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

export function RecordCollectionModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    donorName: '',
    donorEmail: '',
    bloodType: 'O+',
    volume: '450',
    collectionDate: new Date().toISOString().split('T')[0],
    collectionMethod: 'venipuncture',
    testResults: {
      hiv: 'negative',
      hepatitisB: 'negative',
      hepatitisC: 'negative',
      syphilis: 'negative',
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
  const testStatuses = ['negative', 'positive', 'inconclusive']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTestChange = (testName, value) => {
    setFormData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [testName]: value },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          volume: parseInt(formData.volume),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record collection')
      }

      const data = await response.json()
      onSuccess(data.data)
      setFormData({
        donorName: '',
        donorEmail: '',
        bloodType: 'O+',
        volume: '450',
        collectionDate: new Date().toISOString().split('T')[0],
        collectionMethod: 'venipuncture',
        testResults: {
          hiv: 'negative',
          hepatitisB: 'negative',
          hepatitisC: 'negative',
          syphilis: 'negative',
        },
      })
      onClose()
    } catch (err) {
      console.error('[v0] Record collection error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-border px-6 py-4 flex items-center justify-between bg-background">
          <h2 className="text-xl font-semibold text-foreground">Record Blood Collection</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Donor Name *</label>
              <Input
                type="text"
                name="donorName"
                value={formData.donorName}
                onChange={handleInputChange}
                required
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Donor Email</label>
              <Input
                type="email"
                name="donorEmail"
                value={formData.donorEmail}
                onChange={handleInputChange}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Blood Type *</label>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {bloodTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Collection Method</label>
              <select
                name="collectionMethod"
                value={formData.collectionMethod}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="venipuncture">Venipuncture</option>
                <option value="apheresis">Apheresis</option>
                <option value="plasmapheresis">Plasmapheresis</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Volume (ml) *</label>
              <Input
                type="number"
                name="volume"
                value={formData.volume}
                onChange={handleInputChange}
                required
                placeholder="450"
                min="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Collection Date *</label>
              <Input
                type="date"
                name="collectionDate"
                value={formData.collectionDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground">Test Results</h3>
            <div className="grid grid-cols-2 gap-4">
              {['hiv', 'hepatitisB', 'hepatitisC', 'syphilis'].map((test) => (
                <div key={test}>
                  <label className="block text-sm font-medium text-foreground mb-2 capitalize">
                    {test === 'hiv' ? 'HIV' : test === 'hepatitisB' ? 'Hepatitis B' : test === 'hepatitisC' ? 'Hepatitis C' : 'Syphilis'}
                  </label>
                  <select
                    value={formData.testResults[test]}
                    onChange={(e) => handleTestChange(test, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {testStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Recording...' : 'Record Collection'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
