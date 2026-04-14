/**
 * GET /api/donors/profile/[token] - Get donor profile by donorToken
 *
 * Public endpoint - no authentication required
 * Uses donorToken (stored in localStorage after registration)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'

/**
 * GET /api/donors/profile/[token]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    // Unwrap params Promise (Next.js 15+ requirement)
    const resolvedParams = await params
    const { token } = resolvedParams

    if (!token) {
      return NextResponse.json(
        { error: 'Donor token required' },
        { status: 400 }
      )
    }

    // Find donor by donorToken
    const donor = await Donor.findOne({ donorToken: token }).lean()

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor profile not found. Please check your donor ID.' },
        { status: 404 }
      )
    }

    // Calculate donor stats
    const totalDonations = donor.donationHistory?.length || 0
    const lastDonationDate = donor.lastDonationDate || null
    
    // Calculate next eligible date (56 days = 8 weeks between donations)
    let nextEligibleDate = null
    if (lastDonationDate) {
      const lastDonation = new Date(lastDonationDate)
      nextEligibleDate = new Date(lastDonation)
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 56)
    }

    // Format donor data for response
    const donorData = {
      id: donor._id.toString(),
      donorToken: donor.donorToken,
      firstName: donor.firstName,
      lastName: donor.lastName,
      fullName: `${donor.firstName} ${donor.lastName}`,
      email: donor.email,
      phone: donor.phone,
      bloodType: donor.bloodType,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender,
      weight: donor.weight,
      hasDonatedBefore: donor.hasDonatedBefore,
      lastDonationDate: donor.lastDonationDate,
      medicalConditions: donor.medicalConditions,
      medications: donor.medications,
      totalDonations,
      nextEligibleDate,
      isVerified: donor.isVerified,
      status: donor.status,
      registeredAt: donor.createdAt,
      driveId: donor.driveId?.toString(),
      organizationId: donor.organizationId?.toString(),
    }

    return NextResponse.json({
      success: true,
      data: donorData,
    })
  } catch (error) {
    console.error('GET /api/donors/profile/[token] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donor profile', details: error.message },
      { status: 500 }
    )
  }
}
