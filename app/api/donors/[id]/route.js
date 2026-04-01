/**
 * GET /api/donors/[id] - Get a specific donor
 * PUT /api/donors/[id] - Update a donor
 * DELETE /api/donors/[id] - Delete a donor
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'

/**
 * GET /api/donors/[id]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    const donor = await Donor.findById(params.id)

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: donor,
    })
  } catch (error) {
    console.error('GET /api/donors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donor', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/donors/[id]
 * Update donor information
 */
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const body = await request.json()
    const { id } = params

    const donor = await Donor.findById(id)

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    // Update allowed fields
    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'bloodType',
      'dateOfBirth',
      'gender',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'weight',
      'medicalConditions',
      'allergies',
      'medications',
      'notes',
      'consentGiven',
      'consentDate',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelation',
    ]

    allowedFields.forEach(field => {
      if (field in body) {
        donor[field] = body[field]
      }
    })

    const updatedDonor = await donor.save()

    return NextResponse.json({
      success: true,
      message: 'Donor updated successfully',
      data: updatedDonor,
    })
  } catch (error) {
    console.error('PUT /api/donors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update donor', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/donors/[id]
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const donor = await Donor.findByIdAndDelete(params.id)

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Donor deleted successfully',
      data: donor,
    })
  } catch (error) {
    console.error('DELETE /api/donors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete donor', details: error.message },
      { status: 500 }
    )
  }
}
