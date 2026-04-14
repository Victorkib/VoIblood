/**
 * GET /api/requests/[id] - Get single request details
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'
import { getCurrentUser } from '@/lib/session'

export async function GET(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const bloodRequest = await Request.findById(resolvedParams.id)

    if (!bloodRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: bloodRequest,
    })
  } catch (error) {
    console.error('GET /api/requests/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    )
  }
}
