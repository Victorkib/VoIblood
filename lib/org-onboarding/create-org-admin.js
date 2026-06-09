/**
 * Create first org admin (Supabase + MongoDB) and send welcome email.
 */

import { createServerClient } from '@/lib/supabase'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { sendOrgAdminWelcomeEmail } from '@/lib/org-onboarding/emails'
import { createAccountSetupLink } from '@/lib/org-onboarding/account-setup'

export function generateSecurePassword() {
  const length = 14
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

/**
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.fullName
 * @param {string} params.organizationId
 * @param {string} [params.phone]
 * @param {string} [params.role]
 * @param {string} [params.invitedByUserId]
 * @param {boolean} [params.sendWelcomeEmail]
 */
export async function createOrganizationAdminUser({
  email,
  fullName,
  organizationId,
  phone = '',
  role = 'org_admin',
  invitedByUserId,
  sendWelcomeEmail = true,
}) {
  const normEmail = email.toLowerCase().trim()
  if (!normEmail || !fullName?.trim() || !organizationId) {
    throw new Error('Email, full name, and organization are required for admin setup')
  }

  const organization = await Organization.findById(organizationId)
  if (!organization) {
    throw new Error('Organization not found')
  }

  const existingUser = await User.findOne({ email: normEmail })
  if (existingUser) {
    if (existingUser.organizationId?.toString() === organizationId.toString()) {
      return {
        user: existingUser,
        created: false,
        credentials: null,
      }
    }
    throw new Error('A user with this email already belongs to another organization')
  }

  const supabase = createServerClient()
  const password = generateSecurePassword()

  const { data: supabaseData, error: supabaseError } = await supabase.auth.admin.createUser({
    email: normEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      role,
      organization_id: organizationId.toString(),
    },
    app_metadata: {
      role,
      organization_id: organizationId.toString(),
    },
  })

  if (supabaseError) {
    throw new Error(`Failed to create login account: ${supabaseError.message}`)
  }

  const mongoUser = await User.create({
    supabaseId: supabaseData.user.id,
    email: normEmail,
    fullName: fullName.trim(),
    role,
    organizationId: organization._id,
    organizationName: organization.name,
    phone: phone?.trim() || '',
    accountStatus: 'active',
    emailVerified: true,
    invitedBy: invitedByUserId,
    providers: [{ provider: 'email', providerId: supabaseData.user.id }],
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const loginUrl = `${appUrl}/auth/login`

  const { setupUrl, expiresAt } = await createAccountSetupLink({
    email: normEmail,
    userId: mongoUser._id,
    organizationId: organization._id,
    fullName: fullName.trim(),
    organizationName: organization.name,
  })

  if (sendWelcomeEmail) {
    try {
      await sendOrgAdminWelcomeEmail({
        to: normEmail,
        fullName: fullName.trim(),
        organizationName: organization.name,
        organizationType: organization.type,
        setupUrl,
        loginUrl,
      })
    } catch (emailErr) {
      console.warn('[createOrganizationAdminUser] Welcome email failed:', emailErr.message)
    }
  }

  return {
    user: mongoUser,
    created: true,
    credentials: {
      email: normEmail,
      setupUrl,
      setupExpiresAt: expiresAt,
    },
  }
}
