/**
 * Client-safe dashboard route and feature access (aligns with RBAC + org experience).
 */

import {
  hasOrgCapability,
  isSuperAdmin,
  isOrgAdmin,
  ORG_CAPABILITIES,
  ORGANIZATION_TYPES,
} from '@/lib/rbac'
import { getOrgExperience } from '@/lib/dashboard/org-experience'

const DRIVE_TYPES = new Set([
  ORGANIZATION_TYPES.BLOOD_BANK,
  ORGANIZATION_TYPES.NGO,
])

const FEATURE_RULES = {
  donors: {
    capabilities: [ORG_CAPABILITIES.MANAGE_DONORS],
    denyTypes: [ORGANIZATION_TYPES.HOSPITAL],
  },
  inventory: { capabilities: [ORG_CAPABILITIES.MANAGE_INVENTORY] },
  expiry: { capabilities: [ORG_CAPABILITIES.MANAGE_INVENTORY] },
  requests: {
    capabilities: [
      ORG_CAPABILITIES.REQUEST_BLOOD,
      ORG_CAPABILITIES.FULFILL_REQUESTS,
    ],
    requireAny: true,
  },
  drives: { driveTypes: true, adminOnly: true },
  analytics: { adminOnly: true },
  gratitude: {
    allowedTypes: [ORGANIZATION_TYPES.HOSPITAL],
    requiresGratitudePartner: true,
  },
  reports: { allowAll: true },
  settings: { allowAll: true },
  team: { adminOnly: true },
}

export const FEATURE_PAGE_CONFIG = {
  donors: {
    blood_bank: {
      title: 'Donor registry',
      description:
        'Register and manage donors linked to your blood bank. Eligible donations can earn Gratitude Points at partner hospitals.',
      emptyTitle: 'No donors yet',
      emptyDescription: 'Register your first donor or import from a completed drive.',
    },
    ngo: {
      title: 'Community donors',
      description:
        'Track donors reached through your outreach and donation drives across Kenya.',
      emptyTitle: 'No donors yet',
      emptyDescription: 'Add donors manually or convert walk-ins from an active drive.',
    },
  },
  inventory: {
    blood_bank: {
      title: 'Blood inventory',
      description: 'Units in stock, components, and collection records for your facility.',
    },
    hospital: {
      title: 'Hospital blood stock',
      description: 'On-site units available for transfusion and internal transfers.',
    },
    transfusion_center: {
      title: 'Component inventory',
      description: 'Manage separated components and stock levels for fulfillment.',
    },
  },
  expiry: {
    default: {
      title: 'Expiry alerts',
      description:
        'Units nearing expiry so you can rotate stock, transfer, or use before wastage.',
    },
  },
  requests: {
    blood_bank: {
      title: 'Incoming blood requests',
      description: 'Review and fulfill requests from hospitals and clinics in the network.',
    },
    hospital: {
      title: 'My blood requests',
      description: 'Submit and track requests to blood banks and fulfillment partners.',
    },
    transfusion_center: {
      title: 'Fulfillment queue',
      description: 'Process and fulfill incoming requests from partner organizations.',
    },
  },
  drives: {
    blood_bank: {
      title: 'Donation drives',
      description: 'Schedule collection events, manage registrations, and record donations.',
    },
    ngo: {
      title: 'Community drives',
      description: 'Plan outreach events and coordinate with partner blood banks.',
    },
  },
  reports: {
    default: {
      title: 'Reports & exports',
      description: 'Download operational summaries for inventory, donors, and requests.',
    },
  },
  analytics: {
    default: {
      title: 'Analytics',
      description: 'Trends across drives, donors, and operational activity.',
    },
  },
  gratitude: {
    hospital: {
      title: 'Gratitude Points',
      description:
        'Kenya donor thank-you program — verify donors and redeem non-monetary points at your hospital.',
    },
  },
}

function matchesPath(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function getFeatureFromPath(pathname) {
  if (matchesPath(pathname, '/dashboard/donors')) return 'donors'
  if (matchesPath(pathname, '/dashboard/inventory')) return 'inventory'
  if (matchesPath(pathname, '/dashboard/expiry')) return 'expiry'
  if (matchesPath(pathname, '/dashboard/requests')) return 'requests'
  if (matchesPath(pathname, '/dashboard/drives')) return 'drives'
  if (matchesPath(pathname, '/dashboard/analytics')) return 'analytics'
  if (matchesPath(pathname, '/dashboard/gratitude')) return 'gratitude'
  if (matchesPath(pathname, '/dashboard/reports')) return 'reports'
  if (matchesPath(pathname, '/dashboard/settings/team')) return 'team'
  if (matchesPath(pathname, '/dashboard/settings')) return 'settings'
  if (matchesPath(pathname, '/dashboard/organizations')) return 'legacy_orgs'
  if (matchesPath(pathname, '/dashboard/super-admin')) return 'super_admin'
  return null
}

export function canAccessFeature(feature, context) {
  const {
    user,
    orgType = 'blood_bank',
    rewardsPartnerActive = false,
    organizationCapabilities = [],
  } = context

  if (!user) {
    return { allowed: false, reason: 'loading' }
  }

  if (user.role === 'pending') {
    const allowedPending = feature === null || feature === 'dashboard'
    return {
      allowed: allowedPending,
      reason: allowedPending ? null : 'pending_approval',
    }
  }

  if (feature === 'super_admin') {
    return {
      allowed: isSuperAdmin(user.role),
      reason: isSuperAdmin(user.role) ? null : 'super_admin_only',
    }
  }

  if (feature === 'legacy_orgs') {
    return {
      allowed: isSuperAdmin(user.role),
      reason: isSuperAdmin(user.role) ? null : 'redirect_dashboard',
    }
  }

  if (!feature || feature === 'dashboard') {
    return { allowed: true, reason: null }
  }

  const rule = FEATURE_RULES[feature]
  if (!rule) return { allowed: true, reason: null }

  if (rule.allowAll) return { allowed: true, reason: null }

  if (rule.adminOnly && !isOrgAdmin(user.role) && !isSuperAdmin(user.role)) {
    return { allowed: false, reason: 'admin_only' }
  }

  if (rule.denyTypes?.includes(orgType)) {
    return { allowed: false, reason: 'org_type_denied' }
  }

  if (rule.allowedTypes && !rule.allowedTypes.includes(orgType)) {
    return { allowed: false, reason: 'org_type_denied' }
  }

  if (rule.requiresGratitudePartner && !rewardsPartnerActive) {
    return { allowed: false, reason: 'gratitude_not_enrolled' }
  }

  if (rule.driveTypes && !DRIVE_TYPES.has(orgType)) {
    return { allowed: false, reason: 'org_type_denied' }
  }

  if (isSuperAdmin(user.role)) return { allowed: true, reason: null }

  const orgLike = organizationCapabilities.length
    ? { capabilities: organizationCapabilities }
    : { type: orgType }

  if (rule.capabilities?.length) {
    if (rule.requireAny) {
      const ok = rule.capabilities.some((c) => hasOrgCapability(orgLike, c))
      if (!ok) return { allowed: false, reason: 'capability_denied' }
    } else {
      const ok = rule.capabilities.every((c) => hasOrgCapability(orgLike, c))
      if (!ok) return { allowed: false, reason: 'capability_denied' }
    }
  }

  return { allowed: true, reason: null }
}

export function canAccessDashboardPath(pathname, context) {
  if (pathname === '/dashboard' || pathname === '/dashboard/setup') {
    return { allowed: true, reason: null }
  }

  const feature = getFeatureFromPath(pathname)
  if (feature === 'super_admin') {
    return canAccessFeature('super_admin', context)
  }
  if (feature === 'legacy_orgs') {
    return canAccessFeature('legacy_orgs', context)
  }
  if (feature === 'settings' || feature === 'team') {
    return canAccessFeature(feature, context)
  }

  const access = canAccessFeature(feature, context)
  if (!access.allowed) return access

  const experience = getOrgExperience(context.orgType || 'blood_bank', {
    rewardsPartnerActive: context.rewardsPartnerActive,
    isOrgAdmin: isOrgAdmin(context.user?.role),
    isSuperAdmin: isSuperAdmin(context.user?.role),
  })

  const allowedHrefs = new Set(
    experience.navItems.map((item) => item.href)
  )
  allowedHrefs.add('/dashboard/settings')

  if (feature && !['settings', 'team'].includes(feature)) {
    const baseHref = `/dashboard/${feature === 'expiry' ? 'expiry' : feature}`
    const pathAllowed = [...allowedHrefs].some((href) =>
      matchesPath(pathname, href)
    )
    if (!pathAllowed && !isSuperAdmin(context.user?.role)) {
      return { allowed: false, reason: 'not_in_nav' }
    }
  }

  return { allowed: true, reason: null }
}

export function getFeaturePageConfig(feature, orgType) {
  const byType = FEATURE_PAGE_CONFIG[feature]
  if (!byType) return null
  return (
    byType[orgType] ||
    byType.default ||
    Object.values(byType)[0] ||
    null
  )
}
