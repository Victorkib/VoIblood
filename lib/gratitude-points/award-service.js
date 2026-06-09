import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import DonorWallet from '@/lib/models/DonorWallet'
import PointTransaction from '@/lib/models/PointTransaction'
import {
  EARN_ELIGIBILITY_STATUSES,
  GRATITUDE_POINTS_PER_DONATION,
} from '@/lib/gratitude-points/constants'
import { canIssueGratitudePoints } from '@/lib/gratitude-points/hospital-access'
import { getOrCreateWalletForDonor } from '@/lib/gratitude-points/wallet-service'

/**
 * Award gratitude points after a verified donation (idempotent per unitId).
 */
export async function awardGratitudePointsForDonation({
  donor,
  unitId,
  organizationId,
  eligibilityStatus = 'pending',
  driveName = '',
}) {
  if (!donor || !unitId || !organizationId) {
    return { awarded: false, reason: 'missing_params' }
  }

  if (!EARN_ELIGIBILITY_STATUSES.includes(eligibilityStatus)) {
    return {
      awarded: false,
      reason: 'not_eligible',
      eligibilityStatus,
      hint: 'Set eligibility to "Eligible for future donation" when recording the donation to award thank-you points.',
    }
  }

  await connectDB()

  const org = await Organization.findById(organizationId).lean()
  if (!org || !canIssueGratitudePoints(org)) {
    return {
      awarded: false,
      reason: 'org_cannot_issue',
      hint: 'Only blood banks, NGOs, and transfusion centers issue gratitude points (not hospitals).',
    }
  }

  const idempotencyKey = `earn:unit:${unitId}`
  const existing = await PointTransaction.findOne({ idempotencyKey }).lean()
  if (existing) {
    return { awarded: false, reason: 'already_awarded', transactionId: existing._id.toString() }
  }

  const wallet = await getOrCreateWalletForDonor(donor)
  const amount = GRATITUDE_POINTS_PER_DONATION

  let tx
  try {
    tx = await PointTransaction.create({
      walletId: wallet._id,
      type: 'earn',
      amount,
      balanceAfter: (wallet.balance || 0) + amount,
      idempotencyKey,
      referenceType: 'donation',
      referenceId: unitId,
      earningOrganizationId: organizationId,
      description: driveName
        ? `Thank-you points for donating at ${driveName}`
        : 'Thank-you points for blood donation',
      metadata: {
        donorId: donor._id?.toString?.() || donor._id,
        eligibilityStatus,
      },
    })
  } catch (err) {
    if (err.code === 11000) {
      return { awarded: false, reason: 'already_awarded' }
    }
    throw err
  }

  const updated = await DonorWallet.findByIdAndUpdate(
    wallet._id,
    {
      $inc: { balance: amount, lifetimeEarned: amount },
      $set: {
        displayName:
          wallet.displayName || `${donor.firstName || ''} ${donor.lastName || ''}`.trim(),
      },
    },
    { new: true }
  )

  if (updated) {
    await PointTransaction.updateOne({ _id: tx._id }, { balanceAfter: updated.balance })
  }

  return {
    awarded: true,
    points: amount,
    balance: updated?.balance ?? (wallet.balance || 0) + amount,
    walletId: wallet._id.toString(),
    transactionId: tx._id.toString(),
  }
}
