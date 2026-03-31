import { useAuth } from '@/components/auth/auth-provider'
import { hasPermission, hasRole, hasAnyRole } from '@/lib/auth'

/**
 * Hook to check user permissions
 * @returns {Object}
 */
export function usePermission() {
  const { user } = useAuth()

  return {
    can: (permission) => hasPermission(user, permission),
    hasRole: (role) => hasRole(user, role),
    hasAnyRole: (roles) => hasAnyRole(user, roles),
    isAdmin: () => user?.role === 'admin',
    isStaff: () => user?.role === 'staff',
    isHospital: () => user?.role === 'hospital',
  }
}
