'use client'

import { AuthProvider } from '@/components/auth/auth-provider'

export function ClientAuthProvider({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
