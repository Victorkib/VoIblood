/**
 * Role-Based Access Control (RBAC)
 * Manages user roles, permissions, and access control
 */

/**
 * User roles
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  VIEWER: 'viewer',
}

/**
 * Permissions mapped by role
 * Defines what each role can do
 */
export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
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
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'users.manage_permissions',
    'organization.settings',
    'organization.audit_logs',
    'organization.reports',
    'system.admin',
  ],

  [USER_ROLES.ADMIN]: [
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
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'organization.settings',
    'organization.audit_logs',
    'organization.reports',
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
 * Check if user is an admin (super_admin or admin)
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isAdmin(role) {
  return [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(role)
}

/**
 * Check if user is organization owner (super_admin)
 * @param {string} role - User role
 * @returns {boolean}
 */
export function isSuperAdmin(role) {
  return role === USER_ROLES.SUPER_ADMIN
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
 * Create RBAC middleware for Next.js API routes
 * @param {array} requiredPermissions - Required permissions
 * @returns {function} Middleware function
 */
export function requirePermission(...requiredPermissions) {
  return (handler) => {
    return async (request) => {
      try {
        // Get user from request context
        // In a real app, this would come from session/JWT
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
 * @returns {array} Array of organization IDs
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
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS = {
  [USER_ROLES.SUPER_ADMIN]: 'Full system access, manage everything',
  [USER_ROLES.ADMIN]: 'Manage organization, users, and all resources',
  [USER_ROLES.MANAGER]: 'Manage resources, approve requests',
  [USER_ROLES.STAFF]: 'Create and view resources',
  [USER_ROLES.VIEWER]: 'View-only access',
}

/**
 * Permission descriptions
 */
export const PERMISSION_DESCRIPTIONS = {
  'donors.view': 'View donors',
  'donors.create': 'Register new donors',
  'donors.update': 'Edit donor information',
  'donors.delete': 'Delete donors',
  'inventory.view': 'View blood inventory',
  'inventory.create': 'Record new blood collection',
  'inventory.update': 'Update inventory records',
  'inventory.delete': 'Delete inventory records',
  'requests.view': 'View blood requests',
  'requests.create': 'Create blood requests',
  'requests.approve': 'Approve blood requests',
  'requests.deny': 'Deny blood requests',
  'users.view': 'View users',
  'users.create': 'Add new users',
  'users.update': 'Edit user information',
  'users.delete': 'Delete users',
  'users.manage_permissions': 'Change user roles and permissions',
  'organization.settings': 'Manage organization settings',
  'organization.audit_logs': 'View audit logs',
  'organization.reports': 'Generate reports',
  'system.admin': 'System administration',
}
