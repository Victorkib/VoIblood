import { NextResponse } from 'next/server'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import { isRewardsPartnerHospital } from '@/lib/gratitude-points/hospital-access'

const HOSPITAL_STAFF_ROLES = ['org_admin', 'manager', 'staff', 'super_admin']

/**
 * Hospital staff with active Rewards Partner subscription.
 */
export async function requireGratitudeHospitalStaff(cookies) {
  const user = await getCurrentUser(cookies)
  if (!user) {
    return { error: NextResponse403('Authentication required') }
  }

  if (isSuperAdmin(user.role)) {
    return { user, org: null, isSuperAdmin: true }
  }

  if (!HOSPITAL_STAFF_ROLES.includes(user.role)) {
    return { error: NextResponse403('Insufficient permissions') }
  }

  if (!user.organizationId) {
    return { error: NextResponse403('No organization assigned') }
  }

  const org = await Organization.findById(user.organizationId).lean()
  if (!org || org.type !== 'hospital') {
    return { error: NextResponse403('Gratitude redemption is for hospital accounts only') }
  }

  if (!isRewardsPartnerHospital(org)) {
    return {
      error: NextResponse403(
        'Gratitude Points partner access is not active. Requires Professional plan or higher and Rewards Partner enrollment.'
      ),
    }
  }

  return { user, org, isSuperAdmin: false }
}

function NextResponse403(message) {
  return { status: 403, body: { error: message } }
}

export function jsonError(result) {
  if (!result?.error) return null
  return NextResponse.json(result.error.body, { status: result.error.status })
}

export async function requireSuperAdmin(cookies) {
  const user = await getCurrentUser(cookies)
  if (!user || !isSuperAdmin(user.role)) {
    return { error: NextResponse403('Super admin access required') }
  }
  return { user }
}

export function canManageCatalog(user) {
  return user && (isSuperAdmin(user.role) || isOrgAdmin(user.role) || user.role === 'manager')
}
