/**
 * GET /api/settings/user - Get current user settings
 * PUT /api/settings/user - Update current user settings
 *
 * Uses cookie-based authentication (auth-session cookie)
 * Only allows updating: fullName (email and organization are read-only)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { getCurrentUser } from '@/lib/session'

export async function GET(request) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('[API] Get user settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    await connectDB()

    const currentUser = await getCurrentUser(request.cookies)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fullName } = body

    // Validate fullName
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Only allow updating fullName (email and organization are read-only)
    const user = await User.findByIdAndUpdate(
      currentUser._id,
      {
        fullName: fullName.trim(),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select('-__v')

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User settings updated successfully',
      data: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        organizationName: user.organizationName,
        accountStatus: user.accountStatus,
      },
    })
  } catch (error) {
    console.error('[API] Update user settings error:', error)
    return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 })
  }
}
