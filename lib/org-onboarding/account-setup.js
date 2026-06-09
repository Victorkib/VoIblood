import AccountSetupToken from '@/lib/models/AccountSetupToken'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { createServerClient } from '@/lib/supabase'
import { sendOrgAdminWelcomeEmail } from '@/lib/org-onboarding/emails'

/**
 * Create a one-time setup link for a new org admin (iBlood email only — no Supabase mail).
 */
export async function createAccountSetupLink({
  email,
  userId,
  organizationId,
  fullName,
  organizationName,
}) {
  const doc = await AccountSetupToken.createForUser({
    email,
    userId,
    organizationId,
    fullName,
    organizationName,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const setupUrl = `${appUrl}/auth/setup-account?token=${doc.token}`

  return {
    token: doc.token,
    setupUrl,
    expiresAt: doc.expiresAt,
  }
}

/**
 * Validate setup token for the setup page.
 */
export async function validateAccountSetupToken(token) {
  const result = await AccountSetupToken.findValid(token)
  if (!result.valid) {
    return { valid: false, error: result.error }
  }

  const { doc } = result
  return {
    valid: true,
    email: doc.email,
    fullName: doc.fullName,
    organizationName: doc.organizationName,
    expiresAt: doc.expiresAt,
  }
}

/**
 * Set password via admin API and mark token used.
 */
export async function completeAccountSetup({ token, password }) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  const result = await AccountSetupToken.findValid(token)
  if (!result.valid) {
    throw new Error(result.error)
  }

  const { doc } = result
  const mongoUser = await User.findById(doc.userId)
  if (!mongoUser) {
    throw new Error('User account not found')
  }

  const supabase = createServerClient()
  const { error } = await supabase.auth.admin.updateUserById(mongoUser.supabaseId, {
    password,
  })

  if (error) {
    throw new Error(`Failed to set password: ${error.message}`)
  }

  await doc.markUsed()

  return {
    email: mongoUser.email,
    userId: mongoUser._id.toString(),
  }
}

/**
 * Issue a fresh setup link and send the single iBlood activation email.
 */
export async function resendOrganizationActivation({
  organizationId,
  userId,
  sendEmail = true,
}) {
  const organization = await Organization.findById(organizationId)
  if (!organization) {
    throw new Error('Organization not found')
  }

  let mongoUser
  if (userId) {
    mongoUser = await User.findById(userId)
    if (!mongoUser || mongoUser.organizationId?.toString() !== organizationId.toString()) {
      throw new Error('User is not a member of this organization')
    }
  } else {
    mongoUser = await User.findOne({
      organizationId,
      role: 'org_admin',
    }).sort({ createdAt: 1 })
    if (!mongoUser) {
      throw new Error('No organization admin found for this organization')
    }
  }

  if (!mongoUser.supabaseId) {
    throw new Error('This user has no login account. Create them via Users or the org wizard first.')
  }

  const { setupUrl, expiresAt } = await createAccountSetupLink({
    email: mongoUser.email,
    userId: mongoUser._id,
    organizationId: organization._id,
    fullName: mongoUser.fullName,
    organizationName: organization.name,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const loginUrl = `${appUrl}/auth/login`

  if (sendEmail) {
    await sendOrgAdminWelcomeEmail({
      to: mongoUser.email,
      fullName: mongoUser.fullName,
      organizationName: organization.name,
      organizationType: organization.type,
      setupUrl,
      loginUrl,
    })
  }

  return {
    email: mongoUser.email,
    fullName: mongoUser.fullName,
    userId: mongoUser._id.toString(),
    setupUrl,
    setupExpiresAt: expiresAt,
    emailSent: sendEmail,
  }
}
