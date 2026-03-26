/**
 * GET /api/donors - List all donors with filtering and pagination
 * POST /api/donors - Create a new donor
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import Organization from '@/lib/models/Organization'

/**
 * GET /api/donors
 * Query parameters:
 * - organizationId (required)
 * - bloodType (optional)
 * - status (optional)
 * - search (optional) - searches firstName, lastName, email, phone
 * - page (optional, default: 1)
 * - limit (optional, default: 10)
 */
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const bloodType = searchParams.get('bloodType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Build query
    const query = { organizationId }

    if (bloodType) query.bloodType = bloodType
    if (status) query.donationStatus = status

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]
    }

    // Calculate skip
    const skip = (page - 1) * limit

    // Execute query with pagination
    const donors = await Donor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await Donor.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: donors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/donors error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donors', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/donors
 * Create a new donor
 */
export async function POST(request) {
  try {
    await connectDB()

    const body = await request.json()
    const { organizationId, firstName, lastName, email, phone, bloodType, dateOfBirth, gender } = body

    // Validate required fields
    if (!organizationId || !firstName || !lastName || !email || !phone || !bloodType || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if donor already exists
    const existingDonor = await Donor.findOne({ email, organizationId })
    if (existingDonor) {
      return NextResponse.json(
        { error: 'Donor with this email already exists in this organization' },
        { status: 409 }
      )
    }

    // Create donor
    const donor = await Donor.create({
      ...body,
      organizationId,
    })

    // Update organization stats
    organization.totalDonorsRegistered = (organization.totalDonorsRegistered || 0) + 1
    await organization.save()

    return NextResponse.json(
      {
        success: true,
        message: 'Donor created successfully',
        data: donor,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/donors error:', error)
    return NextResponse.json(
      { error: 'Failed to create donor', details: error.message },
      { status: 500 }
    )
  }
}
