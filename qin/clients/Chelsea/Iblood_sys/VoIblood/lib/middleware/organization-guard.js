/**
 * Organization Guard Middleware
 * Ensures users can only access resources from their organization
 * 
 * Usage in API routes:
 * import { withOrganizationGuard } from '@/lib/middleware/organization-guard'
 * 
 * export const GET = withOrganizationGuard(async function GET(request) {
 *   // Your handler code
 * })
 */

import { NextResponse } from 'next/server'
import { getCurrentUser, getOrganizationFilter, canAccessOrganization, requireOrganizationAccess } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

/**
 * Extract organization ID from request
 * Tries multiple sources: query params, body, URL path
 */
function extractOrganizationId(request, url) {
  // Try query params
  const { searchParams } = new URL(url)
  let organizationId = searchParams.get('organizationId')
  
  if (organizationId) {
    return organizationId
  }

  // Try path segments (e.g., /api/org/[id]/...)
  const pathSegments = url.pathname.split('/')
  const orgIndex = pathSegments.indexOf('org')
  if (orgIndex !== -1 && pathSegments[orgIndex + 1]) {
    return pathSegments[orgIndex + 1]
  }

  return null
}

/**
 * Get user from request and validate
 */
async function validateUser(request) {
  const user = await getCurrentUser(request.cookies)
  
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  return { user }
}

/**
 * Check organization access
 */
function checkOrganizationAccess(user, resourceOrganizationId) {
  // Super admins can access everything
  if (isSuperAdmin(user.role)) {
    return { allowed: true }
  }

  // Pending users can't access organization resources
  if (user.role === 'pending' || !user.organizationId) {
    return {
      allowed: false,
      error: NextResponse.json(
        { 
          error: 'Organization access required',
          action: 'browse_organizations',
        },
        { status: 403 }
      ),
    }
  }

  // Check if user can access the resource's organization
  if (resourceOrganizationId && !canAccessOrganization(user, resourceOrganizationId)) {
    return {
      allowed: false,
      error: NextResponse.json(
        { 
          error: 'Access denied - cannot access resources from another organization',
          yourOrganization: user.organizationName,
        },
        { status: 403 }
      ),
    }
  }

  // User doesn't have organization assigned
  if (!user.organizationId) {
    return {
      allowed: false,
      error: NextResponse.json(
        { 
          error: 'You are not assigned to any organization',
          action: 'browse_organizations',
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

/**
 * Main middleware wrapper
 * @param {Function} handler - The API route handler
 * @param {Object} options - Middleware options
 * @returns {Function} Wrapped handler
 */
export function withOrganizationGuard(handler, options = {}) {
  const {
    requireOrg = true,        // Require user to have organization
    allowSuperAdmin = true,   // Allow super admin access
    extractOrgFromRequest = true, // Try to extract org ID from request
  } = options

  return async function protectedHandler(request) {
    try {
      // Validate user
      const userValidation = await validateUser(request)
      if (userValidation.error) {
        return userValidation.error
      }

      const user = userValidation.user

      // Check if organization is required
      if (requireOrg && !isSuperAdmin(user.role)) {
        try {
          requireOrganizationAccess(user)
        } catch (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          )
        }
      }

      // Extract organization ID from request if needed
      let resourceOrganizationId = null
      if (extractOrgFromRequest) {
        const url = request.url
        resourceOrganizationId = extractOrganizationId(request, url)
        
        // Also try request body for POST/PUT
        if (!resourceOrganizationId && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
          try {
            const body = await request.clone().json()
            resourceOrganizationId = body.organizationId
          } catch {
            // Body might not be JSON or already consumed
          }
        }
      }

      // Check organization access
      const accessCheck = checkOrganizationAccess(user, resourceOrganizationId)
      if (!accessCheck.allowed) {
        return accessCheck.error
      }

      // Add user and organization filter to request context
      request.user = user
      request.context = {
        ...request.context,
        user,
        organizationId: isSuperAdmin(user.role) ? resourceOrganizationId : user.organizationId,
        organizationFilter: getOrganizationFilter(user),
      }

      // Call the original handler
      return handler(request)
    } catch (error) {
      console.error('Organization guard middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Simplified middleware for basic protection
 */
export function requireAuth() {
  return withOrganizationGuard
}

/**
 * Middleware for super admin only routes
 */
export function requireSuperAdmin(handler) {
  return async function superAdminHandler(request) {
    const user = await getCurrentUser(request.cookies)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    request.user = user
    request.context = {
      ...request.context,
      user,
      isSuperAdmin: true,
    }

    return handler(request)
  }
}

/**
 * Middleware for org admin only routes
 */
export function requireOrgAdmin(handler) {
  return withOrganizationGuard(async function orgAdminHandler(request) {
    const user = request.user
    
    if (!['super_admin', 'org_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Organization admin access required' },
        { status: 403 }
      )
    }

    return handler(request)
  })
}
