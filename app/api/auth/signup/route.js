/**
 * POST /api/auth/signup
 * Handle user registration with multi-tenant support
 *
 * Signup flows:
 * 1. With invite token - Auto-assign to org with specified role
 * 2. Join existing org - Create pending request, org admin approval required
 * 3. Create new org - Store intent, user verifies email, then request is created in callback
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Invitation from '@/lib/models/Invitation'
import Organization from '@/lib/models/Organization'
import JoinRequest from '@/lib/models/JoinRequest'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import { sendRequestReceivedEmail } from '@/lib/org-request-emails'
import { sendEmail } from '@/lib/email-service'

export async function POST(request) {
  try {
    const {
      email,
      password,
      fullName,
      inviteToken,
      bio,
      title,
      orgSelection = 'create', // 'create' | 'join' | 'invite'
      selectedOrg,
      requestMessage,
      requestedRole,
      // New fields for org creation requests
      orgName,
      orgType,
      orgDescription,
      orgMotivation,
      orgPhone,
      orgAddress,
      orgCity,
      orgState,
      orgCountry,
    } = await request.json()

    // Sanitize and validate inputs
    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedFullName = fullName.trim()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validation
    if (!sanitizedEmail || !password || !sanitizedFullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: sanitizedEmail })
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient()

    // Sign up with Supabase - USE SANITIZED VALUES
    // This sends the confirmation email automatically
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        data: {
          full_name: sanitizedFullName,
          // Store signup intent in Supabase user metadata for callback
          signup_intent: {
            orgSelection,
            selectedOrg,
            requestMessage,
            requestedRole,
            orgName: orgName || `${sanitizedFullName}'s Organization`,
            orgType,
            orgDescription,
            orgMotivation,
            orgPhone,
            orgAddress,
            orgCity,
            orgState,
            orgCountry,
            bio,
            title,
          }
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      }
    })

    if (error) {
      console.error('Supabase signup error:', error)
      
      // Provide user-friendly error messages
      let errorMessage = 'Registration failed. Please try again.'
      
      if (error.message?.includes('email')) {
        errorMessage = 'Please enter a valid email address'
      } else if (error.message?.includes('password')) {
        errorMessage = error.message
      } else if (error.message?.includes('already registered')) {
        errorMessage = 'An account with this email already exists'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const { user: supabaseUser, session } = data

    // If user is creating an organization, create OrganizationRequest IMMEDIATELY
    // Status is 'pending_email_verification' - changes to 'pending' after email verified
    // Super admin only sees 'pending' requests (not unverified ones)
    if (orgSelection === 'create' && supabaseUser) {
      const finalOrgType = orgType || 'blood_bank'
      
      // Set expiry (30 days from now) - explicitly set required field
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)
      
      const orgRequest = await OrganizationRequest.create({
        // userId omitted - will be set when user is created in MongoDB (callback/session)
        // organizationId omitted - no org exists yet for create_org requests
        requestedRole: 'org_admin',
        motivation: orgMotivation || `Request to create ${orgName}`,
        userBio: bio || '',
        userTitle: title || '',
        preferredDepartment: '',
        reason: `Request to create new organization: ${orgName}`,
        experience: '',
        availability: 'full-time',
        requestedOrgName: orgName || `${sanitizedFullName}'s Organization`,
        requestedOrgType: finalOrgType,
        requestedOrgDescription: orgDescription || '',
        requestedOrgPhone: (orgPhone || '').trim(),
        requestedOrgAddress: (orgAddress || '').trim(),
        requestedOrgCity: (orgCity || 'Nairobi').trim(),
        requestedOrgState: (orgState || 'Nairobi County').trim(),
        requestedOrgCountry: (orgCountry || 'Kenya').trim(),
        requestType: 'create_org',
        status: 'pending_email_verification', // Changes to 'pending' after email verified
        userEmail: sanitizedEmail, // Store email so we can find it later
        expiresAt, // Explicitly set required field
      })
      console.log('[Signup] OrganizationRequest created (pending email verification) for:', orgName)

      // Backup notification using our existing email pipeline.
      // This does NOT verify the user in Supabase; it helps users recover when
      // provider verification emails are delayed or blocked.
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const safeOrgName = orgRequest.requestedOrgName || 'your organization'
        await sendEmail({
          to: sanitizedEmail,
          subject: `iBlood signup received - verify email to continue (${safeOrgName})`,
          text: [
            `Hello ${sanitizedFullName},`,
            '',
            `We received your organization signup request for "${safeOrgName}".`,
            'To continue, you must verify your email via the Supabase confirmation link.',
            '',
            'If the confirmation email does not arrive:',
            '1) Check spam/junk/promotions',
            '2) Wait 2-3 minutes',
            `3) Use resend on ${appUrl}/auth/signup or ${appUrl}/auth/login`,
            '',
            'Important: Super admins can only approve after your email is verified.',
            '',
            'iBlood Platform',
          ].join('\n'),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
              <h2 style="margin-bottom:8px">Signup received</h2>
              <p>Hello <strong>${sanitizedFullName}</strong>,</p>
              <p>We received your organization signup request for <strong>${safeOrgName}</strong>.</p>
              <p><strong>Next step:</strong> verify your email using the Supabase confirmation link.</p>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin:14px 0">
                <p style="margin:0 0 6px 0"><strong>If confirmation email does not arrive:</strong></p>
                <ol style="margin:0;padding-left:18px">
                  <li>Check spam/junk/promotions</li>
                  <li>Wait 2-3 minutes</li>
                  <li>Use resend from signup/login</li>
                </ol>
              </div>
              <p style="font-size:13px;color:#475569">Super admins can only review and approve after verification is complete.</p>
            </div>
          `,
        })
      } catch (backupErr) {
        console.warn('[Signup] Backup notification email failed:', backupErr.message)
      }
    }

    // Return success - user will be created in callback/session after email verification
    const response = NextResponse.json({
      success: true,
      message: 'Check your email to confirm your account',
      requiresEmailConfirmation: true,
      email: sanitizedEmail,
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
