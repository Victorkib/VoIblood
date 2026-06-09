/**
 * Server-side org capability checks for API routes.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { getCurrentUser, canAccessOrganization } from '@/lib/session'
import {
  hasOrgCapability,
  isSuperAdmin,
  ORG_CAPABILITIES,
} from '@/lib/rbac'

export { ORG_CAPABILITIES }

/**
 * Resolve authenticated user and organization for an API call.
 */
export async function resolveOrgContext(request, organizationIdParam) {
  const user = await getCurrentUser(request.cookies)
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  let organizationId =
    organizationIdParam ||
    new URL(request.url).searchParams.get('organizationId') ||
    user.organizationId

  if (!organizationId && !isSuperAdmin(user.role)) {
    return {
      error: NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      ),
    }
  }

  if (
    organizationId &&
    !isSuperAdmin(user.role) &&
    !canAccessOrganization(user, organizationId)
  ) {
    return {
      error: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
    }
  }

  await connectDB()

  const organization = organizationId
    ? await Organization.findById(organizationId).lean()
    : null

  if (organizationId && !organization) {
    return {
      error: NextResponse.json({ error: 'Organization not found' }, { status: 404 }),
    }
  }

  return { user, organization, organizationId }
}

export function capabilityDeniedResponse(message) {
  return NextResponse.json(
    {
      error:
        message ||
        'Your organization type does not have access to this feature',
    },
    { status: 403 }
  )
}

/**
 * Returns a NextResponse if access should be denied, otherwise null.
 */
export function assertOrgCapability(organization, capability, user) {
  if (isSuperAdmin(user?.role)) return null
  if (!organization || !hasOrgCapability(organization, capability)) {
    return capabilityDeniedResponse()
  }
  return null
}

export function assertAnyOrgCapability(organization, capabilities, user) {
  if (isSuperAdmin(user?.role)) return null
  const allowed = capabilities.some((c) =>
    hasOrgCapability(organization, c)
  )
  if (!allowed) return capabilityDeniedResponse()
  return null
}

const DRIVE_ORG_TYPES = new Set(['blood_bank', 'ngo'])

export function assertDriveOrgAccess(organization, user) {
  if (isSuperAdmin(user?.role)) return null
  if (!organization || !DRIVE_ORG_TYPES.has(organization.type)) {
    return capabilityDeniedResponse(
      'Donation drives are only available for blood banks and NGOs'
    )
  }
  return null
}
