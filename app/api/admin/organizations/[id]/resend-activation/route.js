/**
 * POST /api/admin/organizations/[id]/resend-activation
 * Super admin: new account setup link + single iBlood activation email.
 *
 * Body: { userId?: string, sendEmail?: boolean }
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'
import { resendOrganizationActivation } from '@/lib/org-onboarding/account-setup'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { id: organizationId } = await params
    const body = await request.json().catch(() => ({}))
    const { userId, sendEmail = true } = body

    const result = await resendOrganizationActivation({
      organizationId,
      userId: userId || undefined,
      sendEmail: sendEmail !== false,
    })

    return NextResponse.json({
      success: true,
      message: result.emailSent
        ? `Activation email sent to ${result.email}`
        : `Setup link generated for ${result.email}`,
      data: {
        email: result.email,
        fullName: result.fullName,
        userId: result.userId,
        setupUrl: result.setupUrl,
        setupExpiresAt: result.setupExpiresAt,
        emailSent: result.emailSent,
      },
    })
  } catch (error) {
    console.error('[resend-activation]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend activation' },
      { status: 400 }
    )
  }
}
