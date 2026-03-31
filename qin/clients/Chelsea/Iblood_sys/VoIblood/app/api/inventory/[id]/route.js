/**
 * GET /api/inventory/[id] - Get a specific blood unit
 * PUT /api/inventory/[id] - Update a blood unit
 * DELETE /api/inventory/[id] - Delete a blood unit
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BloodInventory from '@/lib/models/BloodInventory'

/**
 * GET /api/inventory/[id]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    const unit = await BloodInventory.findById(params.id)
      .populate('donorId', 'firstName lastName email phone')

    if (!unit) {
      return NextResponse.json(
        { error: 'Blood unit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: unit,
    })
  } catch (error) {
    console.error('GET /api/inventory/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blood unit', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/inventory/[id]
 * Update blood unit information
 */
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const body = await request.json()
    const { id } = params

    const unit = await BloodInventory.findById(id)

    if (!unit) {
      return NextResponse.json(
        { error: 'Blood unit not found' },
        { status: 404 }
      )
    }

    // Update allowed fields
    const allowedFields = [
      'testedFor',
      'storageLocation',
      'temperature',
      'qualityNotes',
      'hematocritLevel',
      'plateletCount',
      'notes',
    ]

    allowedFields.forEach(field => {
      if (field in body) {
        unit[field] = body[field]
      }
    })

    const updatedUnit = await unit.save()

    return NextResponse.json({
      success: true,
      message: 'Blood unit updated successfully',
      data: updatedUnit,
    })
  } catch (error) {
    console.error('PUT /api/inventory/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update blood unit', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/inventory/[id]
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const unit = await BloodInventory.findByIdAndDelete(params.id)

    if (!unit) {
      return NextResponse.json(
        { error: 'Blood unit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Blood unit deleted successfully',
      data: unit,
    })
  } catch (error) {
    console.error('DELETE /api/inventory/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete blood unit', details: error.message },
      { status: 500 }
    )
  }
}
