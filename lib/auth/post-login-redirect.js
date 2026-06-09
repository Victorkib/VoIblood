/**
 * Where to send a user immediately after a successful login or account activation.
 */
export function getPostLoginRedirect(user) {
  if (!user) return '/auth/login'

  if (user.accountStatus === 'pending_approval') {
    return '/pending-approval'
  }

  if (user.role === 'super_admin') {
    return '/dashboard/super-admin'
  }

  return '/dashboard'
}

/**
 * Short label for the success screen CTA.
 */
export function getPostLoginRedirectLabel(user) {
  if (!user) return 'Continue'
  if (user.accountStatus === 'pending_approval') return 'View request status'
  if (user.role === 'super_admin') return 'Open platform admin'
  return 'Go to your dashboard'
}
