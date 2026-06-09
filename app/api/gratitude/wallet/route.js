/**
 * GET /api/gratitude/wallet?donorToken= — donor balance and recent ledger.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import PointTransaction from '@/lib/models/PointTransaction'
import { REDEMPTION_DISCLAIMER, GRATITUDE_POINTS_PER_DONATION } from '@/lib/gratitude-points/constants'
import { findWalletForDonor } from '@/lib/gratitude-points/wallet-service'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const donorToken = searchParams.get('donorToken')?.trim()

    if (!donorToken) {
      return NextResponse.json({ error: 'donorToken is required' }, { status: 400 })
    }

    const donor = await Donor.findOne({ donorToken }).lean()
    if (!donor) {
      return NextResponse.json({ error: 'Donor not found' }, { status: 404 })
    }

    const wallet = await findWalletForDonor(donor)

    if (!wallet) {
      return NextResponse.json({
        success: true,
        data: {
          balance: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
          pointsPerDonation: GRATITUDE_POINTS_PER_DONATION,
          transactions: [],
          disclaimer: REDEMPTION_DISCLAIMER,
        },
      })
    }

    const transactions = await PointTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        lifetimeEarned: wallet.lifetimeEarned,
        lifetimeRedeemed: wallet.lifetimeRedeemed,
        pointsPerDonation: GRATITUDE_POINTS_PER_DONATION,
        primaryLast4: wallet.primaryLast4,
        primaryIdentityType: wallet.primaryIdentityType,
        transactions: transactions.map((t) => ({
          id: t._id.toString(),
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          description: t.description,
          createdAt: t.createdAt,
        })),
        disclaimer: REDEMPTION_DISCLAIMER,
      },
    })
  } catch (error) {
    console.error('GET /api/gratitude/wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to load wallet', details: error.message },
      { status: 500 }
    )
  }
}
