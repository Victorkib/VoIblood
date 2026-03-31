/**
 * GET /api/admin/drives - List donation drives
 * POST /api/admin/drives - Create donation drive
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'

/**
 * GET /api/admin/drives
 * List all donation drives for organization
 */
export async function GET(request) {
  try {
    await connectDB()

    // Verify authentication
    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only org_admin and super_admin can view drives
    if (!isSuperAdmin(user.role) && !isOrgAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build query
    const query = {}
    
    // Super admin can see all, org_admin sees only their org
    if (!isSuperAdmin(user.role)) {
      query.organizationId = user.organizationId
    }

    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [drives, total] = await Promise.all([
      DonationDrive.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('organizationId', 'name')
        .lean(),
      DonationDrive.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: drives.map(drive => ({
        id: drive._id.toString(),
        name: drive.name,
        description: drive.description,
        date: drive.date,
        startTime: drive.startTime,
        endTime: drive.endTime,
        location: drive.location,
        city: drive.city,
        targetDonors: drive.targetDonors,
        whatsappGroupLink: drive.whatsappGroupLink,
        registrationToken: drive.registrationToken,
        registrationUrl: drive.registrationUrl,
        isActive: drive.isActive,
        status: drive.status,
        stats: drive.stats,
        createdAt: drive.createdAt,
        isUpcoming: drive.date > new Date(),
        isRegistrationOpen: drive.isActive && drive.status === 'active' && (!drive.registrationDeadline || new Date() < drive.registrationDeadline),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/drives error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donation drives' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/drives
 * Create new donation drive
 */
export async function POST(request) {
  try {
    await connectDB()

    // Verify authentication
    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only org_admin and super_admin can create drives
    if (!isSuperAdmin(user.role) && !isOrgAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      date,
      startTime,
      endTime,
      location,
      address,
      city,
      targetDonors,
      whatsappGroupLink,
      registrationDeadline,
      requireAppointment,
      allowWalkIns,
    } = body

    // Validation
    if (!name || !date || !location) {
      return NextResponse.json(
        { error: 'Name, date, and location are required' },
        { status: 400 }
      )
    }

    // Generate registration token
    const registrationToken = await DonationDrive.generateRegistrationToken()
    const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register/${registrationToken}`

    // Determine organization ID
    let organizationId = user.organizationId
    if (isSuperAdmin(user.role) && body.organizationId) {
      organizationId = body.organizationId
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Create drive
    const drive = await DonationDrive.create({
      organizationId,
      name,
      description: description || '',
      date: new Date(date),
      startTime: startTime || '',
      endTime: endTime || '',
      location,
      address: address || '',
      city: city || '',
      targetDonors: targetDonors || 50,
      whatsappGroupLink: whatsappGroupLink || '',
      registrationToken,
      registrationUrl,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      requireAppointment: requireAppointment || false,
      allowWalkIns: allowWalkIns !== false,
      createdBy: user._id,
      status: 'draft', // Starts as draft
      isActive: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Donation drive created successfully',
      data: {
        id: drive._id.toString(),
        name: drive.name,
        description: drive.description,
        date: drive.date,
        startTime: drive.startTime,
        endTime: drive.endTime,
        location: drive.location,
        city: drive.city,
        targetDonors: drive.targetDonors,
        whatsappGroupLink: drive.whatsappGroupLink,
        registrationToken: drive.registrationToken,
        registrationUrl: drive.registrationUrl,
        isActive: drive.isActive,
        status: drive.status,
        stats: {
          registrations: 0,
          clicks: 0,
          confirmed: 0,
          completed: 0,
        },
        createdAt: drive.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/drives error:', error)
    return NextResponse.json(
      { error: 'Failed to create donation drive: ' + error.message },
      { status: 500 }
    )
  }
}
