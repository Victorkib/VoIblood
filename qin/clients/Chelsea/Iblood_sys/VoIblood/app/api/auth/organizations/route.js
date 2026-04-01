/**
 * GET /api/auth/organizations
 * Search for organizations during signup
 * 
 * Returns active organizations matching search query
 * If no search query, returns all public organizations
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const showAll = searchParams.get('all') === 'true'

    await connectDB()

    let query = { isActive: true }

    // If search query provided, search by name or city
    if (search && search.length >= 2) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ]
    } else if (!showAll) {
      // If no search and not showing all, return empty
      return NextResponse.json({
        organizations: [],
        message: 'Enter at least 2 characters to search, or click "Show all organizations"',
      })
    }

    // Get organizations
    const organizations = await Organization.find(query)
      .select('name city address phone email isPublic')
      .limit(limit)
      .sort({ name: 1 })
      .lean()

    // Filter to only public organizations if no search
    const filteredOrgs = search || showAll
      ? organizations
      : organizations.filter(org => org.isPublic !== false)

    return NextResponse.json({
      organizations: filteredOrgs.map(org => ({
        id: org._id.toString(),
        name: org.name,
        city: org.city,
        address: org.address,
        phone: org.phone,
        email: org.email,
        isPublic: org.isPublic !== false,
      })),
      hasMore: organizations.length === limit,
    })
  } catch (error) {
    console.error('GET /api/auth/organizations error:', error)
    return NextResponse.json(
      { error: 'Failed to search organizations' },
      { status: 500 }
    )
  }
}
