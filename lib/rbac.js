/**
 * Role-Based Access Control (RBAC) - iBlood System
 * Single source of truth for all role and permission checks
 * 
 * Architecture:
 * - SUPER_ADMIN: Platform-wide access, manages all organizations
 * - ORG_ADMIN: Organization-wide access, manages their org only
 * - MANAGER: Department management within org
 * - STAFF: Operational tasks within org
 * - VIEWER: Read-only access within org
 */

/**
 * User roles - iBlood Multi-Tenant System
 */
export const USER_ROLES = {
  /** Platform administrator - can access ALL organizations and system-wide features */
  SUPER_ADMIN: 'super_admin',
  
  /** Organization administrator - full access to their organization only */
  ORG_ADMIN: 'org_admin',
  
  /** Department manager - can manage specific departments/units */
  MANAGER: 'manager',
  
  /** Operational staff - can create and edit resources */
  STAFF: 'staff',
  
  /** Read-only user - can view but not modify */
  VIEWER: 'viewer',
  
  /** Pending user - awaiting organization assignment */
  PENDING: 'pending',
}

/**
 * Organization types and their capabilities
 */
export const ORGANIZATION_TYPES = {
  BLOOD_BANK: 'blood_bank',           // Can manage inventory, donors
  HOSPITAL: 'hospital',                // Can request blood, may have inventory
  TRANSFUSION_CENTER: 'transfusion_center', // Specialized transfusion
  NGO: 'ngo',                          // Blood donation drives only
}

/**
 * Organization capabilities (feature flags per org)
 */
export const ORG_CAPABILITIES = {
  MANAGE_DONORS: 'manage_donors',      // Can register and manage donors
  MANAGE_INVENTORY: 'manage_inventory', // Can store and manage blood units
  REQUEST_BLOOD: 'request_blood',      // Can submit blood requests
  FULFILL_REQUESTS: 'fulfill_requests', // Can approve/fulfill requests from others
}

/**
 * Default capabilities by organization type
 */
export const ORG_TYPE_CAPABILITIES = {
  [ORGANIZATION_TYPES.BLOOD_BANK]: [
    ORG_CAPABILITIES.MANAGE_DONORS,
    ORG_CAPABILITIES.MANAGE_INVENTORY,
    ORG_CAPABILITIES.FULFILL_REQUESTS,
  ],
  [ORGANIZATION_TYPES.HOSPITAL]: [
    ORG_CAPABILITIES.REQUEST_BLOOD,
    ORG_CAPABILITIES.MANAGE_INVENTORY, // Hospitals can have their own blood bank
  ],
  [ORGANIZATION_TYPES.TRANSFUSION_CENTER]: [
    ORG_CAPABILITIES.MANAGE_INVENTORY,
    ORG_CAPABILITIES.FULFILL_REQUESTS,
  ],
  [ORGANIZATION_TYPES.NGO]: [
    ORG_CAPABILITIES.MANAGE_DONORS,
  ],
}

/**
 * Permissions mapped by role
 * Defines what each role can do within their scope
 */
export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
    // System-wide permissions
    'system.admin',
    'system.view_all_orgs',
    'system.create_org',
    'system.manage_orgs',
    
    // All organization permissions (across all orgs)
    'donors.view',
    'donors.create',
    'donors.update',
    'donors.delete',
    'inventory.view',
    'inventory.create',
    'inventory.update',
    'inventory.delete',
    'inventory.transfer', // Transfer between orgs
    'requests.view',
    'requests.create',
    'requests.approve',
    'requests.deny',
    'requests.fulfill',
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'users.manage_permissions',
    'users.invite',
    'organization.settings',
    'organization.audit_logs',
    'organization.reports',
    'organization.members',
  ],

  [USER_ROLES.ORG_ADMIN]: [
    // Organization-wide permissions (their org only)
    'donors.view',
    'donors.create',
    'donors.update',
    'donors.delete',
    'inventory.view',
    'inventory.create',
    'inventory.update',
    'inventory.delete',
    'requests.view',
    'requests.create',
    'requests.approve',
    'requests.deny',
    'requests.fulfill',
    'users.view',
    'users.create',
    'users.update',
    'users.invite',
    'organization.settings',
    'organization.audit_logs',
    'organization.reports',
    'organization.members',
  ],

  [USER_ROLES.MANAGER]: [
    'donors.view',
    'donors.create',
    'donors.update',
    'inventory.view',
    'inventory.create',
    'inventory.update',
    'requests.view',
    'requests.create',
    'requests.approve',
    'organization.reports',
  ],

  [USER_ROLES.STAFF]: [
    'donors.view',
    'donors.create',
    'inventory.view',
    'inventory.create',
    'requests.view',
    'requests.create',
  ],

  [USER_ROLES.VIEWER]: [
    'donors.view',
    'inventory.view',
    'requests.view',
  ],

  [USER_ROLES.PENDING]: [
    // No permissions until assigned to org
  ],
}

/**
 * Check if a user has a specific permission
 * @param {string} userRole - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.includes(permission)
}

/**
 * Check if user can perform an action on a resource
 * @param {object} user - User object with role
 * @param {string} action - Action (view, create, update, delete)
 * @param {string} resourceType - Resource type (donors, inventory, requests, users)
 * @returns {boolean}
 */
export function canPerformAction(user, action, resourceType) {
  if (!user || !user.role) {
    return false
  }

  const permission = `${resourceType}.${action}`
  return hasPermission(user.role, permission)
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {array} Array of permissions
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if user is an admin (super_admin or org_admin)
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isAdmin(role) {
  return [USER_ROLES.SUPER_ADMIN, USER_ROLES.ORG_ADMIN].includes(role)
}

/**
 * Check if user is super admin
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isSuperAdmin(role) {
  return role === USER_ROLES.SUPER_ADMIN
}

/**
 * Check if user is org admin
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isOrgAdmin(role) {
  return role === USER_ROLES.ORG_ADMIN
}

/**
 * Check if user has admin-level access (super_admin or org_admin)
 * @param {object} user - User object
 * @returns {boolean}
 */
export function hasAdminAccess(user) {
  if (!user || !user.role) return false
  return [USER_ROLES.SUPER_ADMIN, USER_ROLES.ORG_ADMIN].includes(user.role)
}

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.values(USER_ROLES).includes(role)
}

/**
 * Check if user is pending (not yet assigned to organization)
 * @param {object} user - User object
 * @returns {boolean}
 */
export function isPending(user) {
  return user?.role === USER_ROLES.PENDING || !user?.organizationId
}

/**
 * Create RBAC middleware for Next.js API routes
 * @param {array} requiredPermissions - Required permissions
 * @returns {function} Middleware function
 */
export function requirePermission(...requiredPermissions) {
  return (handler) => {
    return async (request) => {
      try {
        // Get user from request context
        const user = request.user || request.context?.user

        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized - user not found' }),
            { status: 401 }
          )
        }

        // Check if user has all required permissions
        const hasAllPermissions = requiredPermissions.every((permission) =>
          hasPermission(user.role, permission)
        )

        if (!hasAllPermissions) {
          return new Response(
            JSON.stringify({
              error: 'Forbidden - insufficient permissions',
              required: requiredPermissions,
              userRole: user.role,
            }),
            { status: 403 }
          )
        }

        // User has permission, call handler
        return handler(request)
      } catch (error) {
        console.error('RBAC middleware error:', error)
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Check access to resource based on organization
 * Ensures user can only access resources from their organization
 * @param {object} user - User object
 * @param {string} resourceOrganizationId - Organization ID of resource
 * @returns {boolean}
 */
export function canAccessResource(user, resourceOrganizationId) {
  // Super admins can access anything
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return true
  }

  // Other users can only access resources from their organization
  return user.organizationId === resourceOrganizationId
}

/**
 * Get accessible organizations for a user
 * @param {object} user - User object
 * @returns {array} Array of organization IDs or ['*'] for super admin
 */
export function getAccessibleOrganizations(user) {
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    // Return special marker for super admin (has access to all)
    return ['*']
  }

  // Regular users have access to their organization only
  return user.organizationId ? [user.organizationId] : []
}

/**
 * Check if organization has specific capability
 * @param {object} organization - Organization object
 * @param {string} capability - Capability to check
 * @returns {boolean}
 */
export function hasOrgCapability(organization, capability) {
  if (!organization) return false
  
  // If org has explicit capabilities array, use it
  if (organization.capabilities && Array.isArray(organization.capabilities)) {
    return organization.capabilities.includes(capability)
  }
  
  // Otherwise, use default capabilities by type
  const defaultCaps = ORG_TYPE_CAPABILITIES[organization.type] || []
  return defaultCaps.includes(capability)
}

/**
 * Check if user can access organization feature
 * @param {object} user - User object
 * @param {object} organization - Organization object
 * @param {string} capability - Capability to check
 * @returns {boolean}
 */
export function canUserAccessFeature(user, organization, capability) {
  // Super admin can access everything
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return true
  }
  
  // Check if user has permission
  if (!hasPermission(user.role, capability)) {
    return false
  }
  
  // Check if organization has capability
  if (organization && !hasOrgCapability(organization, capability)) {
    return false
  }
  
  return true
}

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS = {
  [USER_ROLES.SUPER_ADMIN]: 'Platform Administrator - Full system access across all organizations',
  [USER_ROLES.ORG_ADMIN]: 'Organization Administrator - Full access to your organization',
  [USER_ROLES.MANAGER]: 'Department Manager - Manage teams and approve requests',
  [USER_ROLES.STAFF]: 'Staff Member - Create and manage resources',
  [USER_ROLES.VIEWER]: 'Viewer - Read-only access',
  [USER_ROLES.PENDING]: 'Pending - Awaiting organization assignment',
}

/**
 * Permission descriptions
 */
export const PERMISSION_DESCRIPTIONS = {
  'system.admin': 'System administration',
  'system.view_all_orgs': 'View all organizations',
  'system.create_org': 'Create new organizations',
  'system.manage_orgs': 'Manage organization settings',
  'donors.view': 'View donors',
  'donors.create': 'Register new donors',
  'donors.update': 'Edit donor information',
  'donors.delete': 'Delete donors',
  'inventory.view': 'View blood inventory',
  'inventory.create': 'Record new blood collection',
  'inventory.update': 'Update inventory records',
  'inventory.delete': 'Delete inventory records',
  'inventory.transfer': 'Transfer blood units between organizations',
  'requests.view': 'View blood requests',
  'requests.create': 'Create blood requests',
  'requests.approve': 'Approve blood requests',
  'requests.deny': 'Deny blood requests',
  'requests.fulfill': 'Fulfill blood requests',
  'users.view': 'View users',
  'users.create': 'Add new users',
  'users.update': 'Edit user information',
  'users.delete': 'Remove users from organization',
  'users.manage_permissions': 'Change user roles and permissions',
  'users.invite': 'Send invitations to users',
  'organization.settings': 'Manage organization settings',
  'organization.audit_logs': 'View audit logs',
  'organization.reports': 'Generate reports',
  'organization.members': 'Manage organization members',
}
