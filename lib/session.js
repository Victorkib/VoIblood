/**
 * Session Utilities
 * Helpers for managing user sessions and organization context
 */

import User from '@/lib/models/User'

/**
 * Get current user from session cookie
 * @param {Object} cookies - Request cookies
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser(cookies) {
  try {
    const sessionCookie = cookies.get('auth-session')
    if (!sessionCookie?.value) {
      return null
    }

    const session = JSON.parse(sessionCookie.value)
    if (!session.user?.supabaseId) {
      return null
    }

    // Check if session is expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return null
    }

    // Get fresh user data from database
    const user = await User.findOne({ supabaseId: session.user.supabaseId, isActive: true })
    if (!user) {
      return null
    }

    // Return user with all fields
    return {
      _id: user._id.toString(),
      supabaseId: user.supabaseId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId?.toString(),
      organizationName: user.organizationName,
      accountStatus: user.accountStatus,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      initials: user.initials,
      lastLoginAt: user.lastLoginAt,
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

/**
 * Get current organization for user
 * @param {Object} user - User object
 * @returns {Promise<Object|null>} Organization object or null
 */
export async function getCurrentOrganization(user) {
  if (!user?.organizationId) {
    return null
  }

  try {
    const Organization = (await import('@/lib/models/Organization')).default
    const organization = await Organization.findById(user.organizationId)
    return organization ? {
      _id: organization._id.toString(),
      ...organization.toObject(),
    } : null
  } catch (error) {
    console.error('Organization fetch error:', error)
    return null
  }
}

/**
 * Check if user can access organization
 * @param {Object} user - User object
 * @param {string} organizationId - Organization ID to check
 * @returns {boolean}
 */
export function canAccessOrganization(user, organizationId) {
  if (!user) return false
  
  // Super admins can access all organizations
  if (user.role === 'super_admin') {
    return true
  }

  // Other users can only access their own organization
  return user.organizationId?.toString() === organizationId
}

/**
 * Get organization filter for queries
 * Ensures users only see data from their organization
 * @param {Object} user - User object
 * @returns {Object} MongoDB query filter
 */
export function getOrganizationFilter(user) {
  if (!user) {
    throw new Error('User required for organization filter')
  }

  // Super admins can see all data
  if (user.role === 'super_admin') {
    return {}
  }

  // Other users can only see their organization's data
  if (!user.organizationId) {
    throw new Error('User not assigned to any organization')
  }

  return { organizationId: user.organizationId }
}

/**
 * Validate user has organization access
 * @param {Object} user - User object
 * @throws {Error} If user doesn't have organization access
 */
export function requireOrganizationAccess(user) {
  if (!user) {
    throw new Error('Authentication required')
  }

  if (user.role === 'pending' || !user.organizationId) {
    throw new Error('Organization access required')
  }

  if (user.accountStatus !== 'active') {
    throw new Error('Account is not active')
  }
}

/**
 * Create session cookie data
 * @param {Object} user - User object
 * @param {Object} session - Supabase session
 * @returns {Object} Session cookie data
 */
export function createSessionCookie(user, session) {
  return {
    user: {
      id: user._id.toString(),
      supabaseId: user.supabaseId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId?.toString(),
      organizationName: user.organizationName,
      accountStatus: user.accountStatus,
      avatarUrl: user.avatarUrl,
    },
    token: session?.access_token,
    expiresAt: session ? new Date(session.expires_at * 1000).toISOString() : null,
  }
}

/**
 * Clear session cookie
 * @returns {Object} Cookie options to clear
 */
export function clearSessionCookie() {
  return {
    name: 'auth-session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }
}

/**
 * Set session cookie
 * @param {Object} response - NextResponse object
 * @param {Object} sessionData - Session data
 */
export function setSessionCookie(response, sessionData) {
  response.cookies.set({
    name: 'auth-session',
    value: JSON.stringify(sessionData),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  })
}

/**
 * Update session cookie
 * @param {Object} response - NextResponse object
 * @param {Object} request - Request object
 * @param {Object} updates - Updates to apply
 */
export async function updateSessionCookie(response, request, updates) {
  const sessionCookie = request.cookies.get('auth-session')
  if (sessionCookie?.value) {
    const session = JSON.parse(sessionCookie.value)
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        ...updates,
      },
    }
    setSessionCookie(response, updatedSession)
  }
}
