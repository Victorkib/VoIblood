'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Building, CheckCircle, Search, Globe, Lock } from 'lucide-react'

export function OrganizationSearch({ onSelect, selectedOrg }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch organizations on mount or when showAll changes
  useEffect(() => {
    if (showAll) {
      fetchOrganizations('', true)
    }
  }, [showAll])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) {
        fetchOrganizations(search)
      } else if (search.length === 0 && showAll) {
        // Keep showing all when search is cleared
      } else if (search.length === 0) {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, showAll])

  const fetchOrganizations = async (query, showAllFlag = false) => {
    setLoading(true)
    try {
      const url = showAllFlag
        ? '/api/auth/organizations?all=true&limit=20'
        : `/api/auth/organizations?q=${encodeURIComponent(query)}&limit=20`
      
      const res = await fetch(url)
      const data = await res.json()
      setResults(data.organizations || [])
      setHasSearched(true)
    } catch (error) {
      console.error('Failed to search organizations:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search organizations by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Show All Button */}
      {!showAll && !hasSearched && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">
            Or browse all public organizations
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAll(true)}
            className="w-full"
          >
            <Globe className="w-4 h-4 mr-2" />
            Show All Organizations
          </Button>
        </div>
      )}

      {/* Show All Toggle */}
      {showAll && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing all public organizations
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAll(false)
              setSearch('')
              setResults([])
            }}
          >
            Clear
          </Button>
        </div>
      )}

      {search.length > 0 && search.length < 2 && (
        <p className="text-sm text-gray-500">Enter at least 2 characters to search</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((org) => (
            <Card
              key={org.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedOrg?.id === org.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelect(org)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <h4 className="font-semibold text-gray-900">{org.name}</h4>
                      {!org.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {org.city}
                      </span>
                      {org.address && (
                        <span className="truncate max-w-[200px]">{org.address}</span>
                      )}
                    </div>
                  </div>
                  {selectedOrg?.id === org.id && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && hasSearched && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>No organizations found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}
    </div>
  )
}

export default OrganizationSearch
