/**
 * Per-organization-type dashboard experience (nav, copy, metrics, quick actions).
 * Aligns UI with lib/rbac.js ORG_TYPE_CAPABILITIES.
 */

import {
  LayoutDashboard,
  Users,
  Package,
  AlertCircle,
  Hospital,
  BarChart3,
  Building2,
  Gift,
  Heart,
  Droplets,
  CalendarDays,
  ClipboardList,
} from 'lucide-react'

export const ORG_TYPE_LABELS = {
  blood_bank: 'Blood Bank',
  hospital: 'Hospital',
  transfusion_center: 'Transfusion Center',
  ngo: 'NGO / Community',
}

const NAV_DEFS = {
  dashboard: { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  donors: { id: 'donors', label: 'Donors', href: '/dashboard/donors', icon: Users },
  inventory: { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: Package },
  expiry: { id: 'expiry', label: 'Expiry Alerts', href: '/dashboard/expiry', icon: AlertCircle },
  requests: { id: 'requests', label: 'Blood Requests', href: '/dashboard/requests', icon: Hospital },
  reports: { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  drives: { id: 'drives', label: 'Donation Drives', href: '/dashboard/drives', icon: Building2 },
  analytics: { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  gratitude: { id: 'gratitude', label: 'Gratitude Points', href: '/dashboard/gratitude', icon: Gift },
}

const EXPERIENCE = {
  blood_bank: {
    tagline: 'Collect, store, and supply safe blood across Kenya',
    description:
      'Monitor stock levels, donor pool, and incoming hospital requests. Fulfill transfers from your inventory.',
    accent: 'rose',
    gradient: 'from-rose-600/10 via-background to-orange-500/5',
    icon: Droplets,
    navIds: ['dashboard', 'donors', 'inventory', 'expiry', 'requests', 'reports'],
    adminNavIds: ['drives', 'analytics'],
    requestsNavLabel: 'Incoming Requests',
    searchPlaceholder: 'Search donors, units, request IDs…',
    statKeys: ['inventory', 'donors', 'expiring', 'incomingRequests'],
    showBloodTypeChart: true,
    showRecentRequests: true,
    activityTitle: 'Recent hospital requests',
    quickActions: [
      { label: 'Register donor', href: '/dashboard/donors', icon: Users, color: 'blue' },
      { label: 'Add blood unit', href: '/dashboard/inventory', icon: Package, color: 'orange' },
      { label: 'Fulfill request', href: '/dashboard/requests', icon: ClipboardList, color: 'green' },
      { label: 'Run a drive', href: '/dashboard/drives', icon: Building2, color: 'violet' },
    ],
    tips: [
      'Review expiry alerts weekly to reduce wastage.',
      'Use donation drives to grow your donor pool before shortages.',
    ],
  },
  hospital: {
    tagline: 'Request blood and thank donors through Gratitude Points',
    description:
      'Submit blood requests to the network, track your hospital stock, and redeem donor thank-you points when enrolled.',
    accent: 'blue',
    gradient: 'from-blue-600/10 via-background to-indigo-500/5',
    icon: Hospital,
    navIds: ['dashboard', 'inventory', 'expiry', 'requests', 'reports'],
    adminNavIds: ['analytics'],
    requestsNavLabel: 'My Blood Requests',
    searchPlaceholder: 'Search requests, patients, inventory…',
    statKeys: ['pendingRequests', 'approvedRequests', 'inventory', 'expiring'],
    showBloodTypeChart: true,
    showRecentRequests: true,
    activityTitle: 'Your recent requests',
    quickActions: [
      { label: 'New blood request', href: '/dashboard/requests', icon: Hospital, color: 'blue' },
      { label: 'Check inventory', href: '/dashboard/inventory', icon: Package, color: 'orange' },
      { label: 'Expiry alerts', href: '/dashboard/expiry', icon: AlertCircle, color: 'red' },
      { label: 'View reports', href: '/dashboard/reports', icon: BarChart3, color: 'purple' },
    ],
    tips: [
      'Submit requests early for routine cases; use emergency urgency when needed.',
      'Enroll in Gratitude Points to thank donors at your facility (Kenya program).',
    ],
  },
  transfusion_center: {
    tagline: 'Specialized transfusion services and blood component management',
    description:
      'Manage component inventory, expiry, and fulfillment for hospitals and clinics in your network.',
    accent: 'violet',
    gradient: 'from-violet-600/10 via-background to-purple-500/5',
    icon: Heart,
    navIds: ['dashboard', 'inventory', 'expiry', 'requests', 'reports'],
    adminNavIds: ['analytics'],
    requestsNavLabel: 'Fulfillment Queue',
    searchPlaceholder: 'Search inventory, requests…',
    statKeys: ['inventory', 'expiring', 'incomingRequests', 'fulfilledMonth'],
    showBloodTypeChart: true,
    showRecentRequests: true,
    activityTitle: 'Requests to fulfill',
    quickActions: [
      { label: 'Record collection', href: '/dashboard/inventory', icon: Package, color: 'orange' },
      { label: 'Process request', href: '/dashboard/requests', icon: ClipboardList, color: 'green' },
      { label: 'Expiry review', href: '/dashboard/expiry', icon: AlertCircle, color: 'red' },
      { label: 'Reports', href: '/dashboard/reports', icon: BarChart3, color: 'purple' },
    ],
    tips: [
      'Prioritize emergency and urgent requests in the fulfillment queue.',
      'Keep component-level inventory accurate for matching hospital needs.',
    ],
  },
  ngo: {
    tagline: 'Community blood drives and donor engagement',
    description:
      'Plan drives, register donors, and track outreach. Blood collection is coordinated with partner banks.',
    accent: 'emerald',
    gradient: 'from-emerald-600/10 via-background to-teal-500/5',
    icon: CalendarDays,
    navIds: ['dashboard', 'drives', 'donors', 'reports'],
    adminNavIds: ['analytics'],
    requestsNavLabel: 'Blood Requests',
    searchPlaceholder: 'Search donors, drives…',
    statKeys: ['activeDrives', 'donors', 'donationsMonth', 'upcomingDrive'],
    showBloodTypeChart: false,
    showRecentRequests: false,
    activityTitle: 'Upcoming drives',
    quickActions: [
      { label: 'Create drive', href: '/dashboard/drives', icon: Building2, color: 'emerald' },
      { label: 'View donors', href: '/dashboard/donors', icon: Users, color: 'blue' },
      { label: 'Drive analytics', href: '/dashboard/analytics', icon: BarChart3, color: 'purple' },
      { label: 'Reports', href: '/dashboard/reports', icon: BarChart3, color: 'violet' },
    ],
    tips: [
      'Activate drives before outreach so donors receive SMS and email invites.',
      'Eligible donations earn donors Gratitude Points at partner hospitals.',
    ],
  },
}

const DEFAULT_EXPERIENCE = EXPERIENCE.blood_bank

export function getOrgExperience(orgType, options = {}) {
  const base = EXPERIENCE[orgType] || DEFAULT_EXPERIENCE
  const { rewardsPartnerActive = false, isOrgAdmin = false, isSuperAdmin = false } = options

  const navIds = [...base.navIds]
  if (isOrgAdmin || isSuperAdmin) {
    base.adminNavIds.forEach((id) => {
      if (!navIds.includes(id)) navIds.push(id)
    })
  }

  const navItems = navIds.map((id) => {
    const item = { ...NAV_DEFS[id] }
    if (id === 'requests' && base.requestsNavLabel) {
      item.label = base.requestsNavLabel
    }
    return item
  })

  if (orgType === 'hospital' && rewardsPartnerActive) {
    navItems.push({ ...NAV_DEFS.gratitude })
  }

  return {
    ...base,
    typeLabel: ORG_TYPE_LABELS[orgType] || 'Organization',
    orgType: orgType || 'blood_bank',
    navItems,
  }
}

export function buildStatCards(stats, experience) {
  if (!stats || !experience) return []

  const s = stats
  const defs = {
    inventory: {
      label: 'Units in stock',
      value: s.inventory?.totalUnits ?? 0,
      icon: Package,
      color: 'orange',
    },
    donors: {
      label: 'Active donors',
      value: s.donors?.available ?? 0,
      icon: Users,
      color: 'green',
    },
    expiring: {
      label: 'Expiring soon',
      value: s.inventory?.alerts?.expiring ?? 0,
      icon: AlertCircle,
      color: 'red',
    },
    incomingRequests: {
      label: 'Requests to fulfill',
      value: s.requests?.incomingPending ?? s.requests?.pending ?? 0,
      icon: Hospital,
      color: 'blue',
    },
    pendingRequests: {
      label: 'Pending requests',
      value: s.requests?.outgoingPending ?? s.requests?.pending ?? 0,
      icon: Hospital,
      color: 'blue',
    },
    approvedRequests: {
      label: 'Awaiting supply',
      value: s.requests?.approved ?? 0,
      icon: ClipboardList,
      color: 'violet',
    },
    fulfilledMonth: {
      label: 'Fulfilled this month',
      value: s.requests?.fulfilledThisMonth ?? 0,
      icon: BarChart3,
      color: 'green',
    },
    activeDrives: {
      label: 'Active drives',
      value: s.drives?.active ?? 0,
      icon: Building2,
      color: 'emerald',
    },
    donationsMonth: {
      label: 'Donations this month',
      value: s.activities?.donationsThisMonth ?? 0,
      icon: Heart,
      color: 'rose',
    },
    upcomingDrive: {
      label: 'Days to next drive',
      value:
        s.drives?.daysUntilNext != null ? String(s.drives.daysUntilNext) : '—',
      icon: CalendarDays,
      color: 'teal',
    },
  }

  return experience.statKeys
    .map((key) => defs[key])
    .filter(Boolean)
    .map((card) => ({
      ...card,
      value: typeof card.value === 'number' ? card.value.toLocaleString() : card.value,
    }))
}
