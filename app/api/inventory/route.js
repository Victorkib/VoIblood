/**
 * GET /api/inventory - List blood units with filtering
 * POST /api/inventory - Record a new blood collection
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BloodInventory from '@/lib/models/BloodInventory'
import Organization from '@/lib/models/Organization'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'

/**
 * POST /api/inventory
 * Body:
 * - donorName (required)
 * - bloodType (required)
 * - volume (required)
 * - collectionDate (required)
 * - collectionMethod (required)
 * - testResults (required)
 * - organizationId (required)
 */
export async function POST(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'create')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const bloodType = searchParams.get('bloodType')
    const status = searchParams.get('status')
    const component = searchParams.get('component')
    const expiryRange = searchParams.get('expiryDaysRange')
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
    if (status) query.status = status
    if (component) query.component = component

    // Handle expiry range filtering
    if (expiryRange) {
      const now = new Date()
      let expiryQuery = {}

      switch (expiryRange) {
        case 'expired':
          expiryQuery = { $lt: now }
          break
        case 'critical':
          const criticalDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          expiryQuery = { $gte: now, $lte: criticalDate }
          break
        case 'warning':
          const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          expiryQuery = { $gt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), $lte: warningDate }
          break
        case 'good':
          const goodDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          expiryQuery = { $gt: goodDate }
          break
      }

      if (Object.keys(expiryQuery).length > 0) {
        query.expiryDate = expiryQuery
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { unitId: searchRegex },
        { donorName: searchRegex },
      ]
    }

    const skip = (page - 1) * limit

    const inventory = await BloodInventory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await BloodInventory.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: inventory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/inventory error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory
 * Record a new blood collection
 */
export async function POST(request) {
  try {
    await connectDB()

    const body = await request.json()
    const {
      organizationId,
      unitId,
      bloodType,
      collectionDate,
      expiryDate,
      donorId,
      volume = 450,
    } = body

    // Validate required fields
    if (!organizationId || !unitId || !bloodType || !collectionDate || !expiryDate) {
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

    // Check if unit ID already exists
    const existingUnit = await BloodInventory.findOne({ unitId, organizationId })
    if (existingUnit) {
      return NextResponse.json(
        { error: 'Unit ID already exists' },
        { status: 409 }
      )
    }

    // Create inventory record
    const inventory = await BloodInventory.create({
      ...body,
      organizationId,
      status: 'available',
    })

    // Update organization stock levels
    const totalUnits = await BloodInventory.countDocuments({
      organizationId,
      status: 'available',
    })
    organization.totalBloodUnitsInStock = totalUnits
    await organization.save()

    return NextResponse.json(
      {
        success: true,
        message: 'Blood unit recorded successfully',
        data: inventory,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/inventory error:', error)
    return NextResponse.json(
      { error: 'Failed to record blood unit', details: error.message },
      { status: 500 }
    )
  }
}
