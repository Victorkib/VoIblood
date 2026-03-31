/**
 * Authentication and Authorization Utilities
 * Handles role-based access control (RBAC)
 */

/**
 * Permission definitions by role
 */
export const rolePermissions = {
  admin: [
    'manage_users',
    'manage_donors',
    'manage_inventory',
    'manage_requests',
    'view_reports',
    'system_settings',
    'approve_requests',
    'create_donor',
    'edit_donor',
    'delete_donor',
    'view_dashboard',
  ],
  staff: [
    'manage_donors',
    'manage_inventory',
    'view_reports',
    'approve_requests',
    'create_donor',
    'edit_donor',
    'view_dashboard',
  ],
  hospital: [
    'create_requests',
    'view_own_requests',
    'view_dashboard',
  ],
}

/**
 * Check if user has permission
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false

  const userPermissions = rolePermissions[user.role] || []
  return userPermissions.includes(permission)
}

/**
 * Check if user has a specific role
 * @param {Object} user - User object with role
 * @param {string} requiredRole - Role to check
 * @returns {boolean}
 */
export function hasRole(user, requiredRole) {
  if (!user) return false
  return user.role === requiredRole
}

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object with role
 * @param {string[]} requiredRoles - Roles to check
 * @returns {boolean}
 */
export function hasAnyRole(user, requiredRoles) {
  if (!user) return false
  return requiredRoles.includes(user.role)
}

/**
 * Role hierarchy for access control
 * Higher number = more access
 */
export const roleHierarchy = {
  admin: 3,
  staff: 2,
  hospital: 1,
}

/**
 * Check if user has at least the specified role level
 * @param {Object} user - User object with role
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean}
 */
export function hasRoleAtLeast(user, requiredRole) {
  if (!user) return false
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}
