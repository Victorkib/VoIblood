/**
 * GET /api/requests/[id] - Get a specific request
 * PUT /api/requests/[id] - Update a request
 * DELETE /api/requests/[id] - Delete a request
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'

/**
 * GET /api/requests/[id]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    const req = await Request.findById(params.id)
      .populate('approvedBy', 'fullName email')
      .populate('createdBy', 'fullName email')
      .populate('allocatedUnits', 'unitId bloodType status expiryDate')

    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: req,
    })
  } catch (error) {
    console.error('GET /api/requests/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/requests/[id]
 * Update request information
 */
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const body = await request.json()
    const { id } = params

    const req = await Request.findById(id)

    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Update allowed fields
    const allowedFields = [
      'contactPerson',
      'contactPhone',
      'contactEmail',
      'patientAge',
      'patientGender',
      'patientId',
      'surgeryType',
      'urgency',
      'requiredTime',
      'deliveryMethod',
      'deliveryAddress',
      'deliveryContactPerson',
      'deliveryContactPhone',
      'notes',
      'internalNotes',
    ]

    allowedFields.forEach(field => {
      if (field in body) {
        req[field] = body[field]
      }
    })

    req.updatedBy = body.userId
    req.lastActivityDate = new Date()
    const updatedRequest = await req.save()

    return NextResponse.json({
      success: true,
      message: 'Request updated successfully',
      data: updatedRequest,
    })
  } catch (error) {
    console.error('PUT /api/requests/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update request', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/requests/[id]
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const req = await Request.findByIdAndDelete(params.id)

    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Request deleted successfully',
      data: req,
    })
  } catch (error) {
    console.error('DELETE /api/requests/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete request', details: error.message },
      { status: 500 }
    )
  }
}
