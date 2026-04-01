/**
 * POST /api/admin/organizations/[id]/enter
 * Super admin enters an organization to view/manage it
 * 
 * Sets viewing context in session
 * Super admin sees org as if they were org_admin
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Verify super_admin access
    const currentUser = await getCurrentUser(request.cookies)
    if (!currentUser || !isSuperAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const organization = await Organization.findById(id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create response with updated session
    const response = NextResponse.json({
      success: true,
      message: `Entered ${organization.name}`,
      data: {
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          type: organization.type,
        },
      },
    })

    // Set viewing context in cookie
    const sessionCookie = request.cookies.get('auth-session')
    if (sessionCookie?.value) {
      const session = JSON.parse(sessionCookie.value)
      const updatedSession = {
        ...session,
        viewingOrganizationId: organization._id.toString(),
        viewingOrganizationName: organization.name,
      }
      
      response.cookies.set({
        name: 'auth-session',
        value: JSON.stringify(updatedSession),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Enter organization error:', error)
    return NextResponse.json(
      { error: 'Failed to enter organization' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/organizations/[id]/enter
 * Super admin exits organization view
 * 
 * Clears viewing context from session
 * Returns to super_admin platform view
 */
export async function DELETE(request, { params }) {
  try {
    // Verify super_admin access (don't need DB connection)
    const currentUser = await getCurrentUser(request.cookies)
    if (!currentUser || !isSuperAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Exited organization view',
    })

    // Clear viewing context from cookie
    const sessionCookie = request.cookies.get('auth-session')
    if (sessionCookie?.value) {
      const session = JSON.parse(sessionCookie.value)
      const { viewingOrganizationId, viewingOrganizationName, ...rest } = session
      const updatedSession = rest
      
      response.cookies.set({
        name: 'auth-session',
        value: JSON.stringify(updatedSession),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Exit organization error:', error)
    return NextResponse.json(
      { error: 'Failed to exit organization' },
      { status: 500 }
    )
  }
}
