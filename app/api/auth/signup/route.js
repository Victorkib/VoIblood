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
import PendingSignup from '@/lib/models/PendingSignup'
import { sendRequestReceivedEmail } from '@/lib/org-request-emails'

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

    // Save signup intent to MongoDB so callback can retrieve it reliably
    // This works regardless of cookies or Supabase metadata behavior
    await PendingSignup.findOneAndUpdate(
      { email: sanitizedEmail },
      {
        supabaseId: '', // Will be updated after Supabase signup
        orgSelection,
        selectedOrg,
        requestMessage,
        requestedRole,
        orgName: orgName || `${sanitizedFullName}'s Organization`,
        orgType,
        orgDescription,
        orgMotivation,
        bio,
        title,
        inviteToken,
      },
      { upsert: true, returnDocument: 'after' }
    )
    console.log('[Signup] Saved signup intent to PendingSignup for:', sanitizedEmail)

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

    // Update PendingSignup with the Supabase ID
    await PendingSignup.findOneAndUpdate(
      { email: sanitizedEmail },
      { supabaseId: supabaseUser.id }
    )

    // Store signup intent in a cookie so callback can read it
    // This is more reliable than Supabase user_metadata for server-side callbacks
    const response = NextResponse.json({
      success: true,
      message: 'Check your email to confirm your account',
      requiresEmailConfirmation: true,
      email: sanitizedEmail,
      signupIntent: {
        orgSelection,
        selectedOrg,
        requestMessage,
        requestedRole,
        orgName: orgName || `${sanitizedFullName}'s Organization`,
        orgType,
        orgDescription,
        orgMotivation,
        bio,
        title,
      }
    })

    // Set signup intent cookie for callback to read
    response.cookies.set({
      name: 'signup-intent',
      value: JSON.stringify({
        orgSelection,
        selectedOrg,
        requestMessage,
        requestedRole,
        orgName: orgName || `${sanitizedFullName}'s Organization`,
        orgType,
        orgDescription,
        orgMotivation,
        bio,
        title,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
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
