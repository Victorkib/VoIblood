'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => {
    try {
      const { createBrowserClient } = require('@/lib/supabase')
      return createBrowserClient()
    } catch (error) {
      console.warn('Supabase not available:', error.message)
      return null
    }
  })

  // Initialize auth state from API
  useEffect(() => {
    async function initAuth() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Set up Supabase auth state listener only if supabase exists and has the method
    if (!supabase || typeof supabase?.auth?.onAuthStateChange !== 'function') {
      return
    }

    let unsubscribe
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event)
          
          if (event === 'SIGNED_IN' && session) {
            // Fetch user from API
            const res = await fetch('/api/auth/session')
            const data = await res.json()
            setUser(data.user)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
          }
        }
      )
      unsubscribe = () => subscription?.unsubscribe?.()
    } catch (error) {
      console.warn('Failed to set up auth state listener:', error)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [supabase])

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Auth state listener will handle the update
    return data
  }, [])

  const signup = useCallback(async (userData) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Signup failed')
    }

    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      if (supabase && typeof supabase?.auth?.signOut === 'function') {
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }, [supabase])

  const loginWithOAuth = useCallback(async (provider) => {
    const res = await fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'OAuth login failed')
    }

    // Redirect to OAuth provider
    window.location.href = data.url
  }, [])

  const updateUser = useCallback(async (updates) => {
    const res = await fetch('/api/auth/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Update failed')
    }

    setUser(data.user)
    return data
  }, [])

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    loginWithOAuth,
    updateUser,
    supabase,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
