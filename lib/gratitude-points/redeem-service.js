import crypto from 'crypto'
import Donor from '@/lib/models/Donor'
import DonorWallet from '@/lib/models/DonorWallet'
import GratitudeRedemption from '@/lib/models/GratitudeRedemption'
import Organization from '@/lib/models/Organization'
import PointTransaction from '@/lib/models/PointTransaction'
import RedemptionCatalogItem from '@/lib/models/RedemptionCatalogItem'
import { REDEMPTION_DISCLAIMER } from '@/lib/gratitude-points/constants'
import { isRewardsPartnerHospital } from '@/lib/gratitude-points/hospital-access'
import { hashIdentity } from '@/lib/gratitude-points/identity'
import {
  attachNationalIdToDonor,
  findWalletByIdentity,
  findWalletForDonor,
} from '@/lib/gratitude-points/wallet-service'

function generateReferenceCode() {
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `GR-${Date.now().toString(36).toUpperCase().slice(-4)}${suffix}`
}

/**
 * Staff lookup before redemption.
 */
export async function lookupDonorForRedemption({
  donorToken,
  nationalId,
  phone,
  hospitalOrganizationId,
}) {
  const hospital = await Organization.findById(hospitalOrganizationId).lean()
  if (!isRewardsPartnerHospital(hospital)) {
    throw new Error('This hospital is not an active Gratitude Points partner')
  }

  let wallet = null
  let donor = null
  let verificationHint = ''

  if (nationalId) {
    wallet = await findWalletByIdentity('national_id', nationalId)
    verificationHint = 'national_id'
    if (!wallet) {
      const idHash = hashIdentity('national_id', nationalId)
      const donorById = idHash ? await Donor.findOne({ nationalIdHash: idHash }).lean() : null
      if (donorById) {
        donor = donorById
        wallet = await findWalletForDonor(donorById)
      }
    }
    if (wallet?.linkedDonorIds?.length && !donor) {
      donor = await Donor.findById(wallet.linkedDonorIds[0]).lean()
    }
  } else if (donorToken) {
    donor = await Donor.findOne({ donorToken }).lean()
    if (donor) wallet = await findWalletForDonor(donor)
    verificationHint = donor ? 'donor_token' : ''
  } else if (phone) {
    wallet = await findWalletByIdentity('phone', phone)
    verificationHint = 'phone_requires_in_person'
    if (wallet?.linkedDonorIds?.length) {
      donor = await Donor.findById(wallet.linkedDonorIds[0]).lean()
    }
  }

  if (!wallet) {
    return { found: false, verificationHint }
  }

  return {
    found: true,
    verificationHint,
    wallet: {
      id: wallet._id.toString(),
      balance: wallet.balance,
      lifetimeEarned: wallet.lifetimeEarned,
      displayName: wallet.displayName,
      primaryLast4: wallet.primaryLast4,
      primaryIdentityType: wallet.primaryIdentityType,
    },
    donor: donor
      ? {
          id: donor._id.toString(),
          fullName: `${donor.firstName} ${donor.lastName}`,
          bloodType: donor.bloodType,
          donorToken: donor.donorToken,
        }
      : null,
    disclaimer: REDEMPTION_DISCLAIMER,
  }
}

/**
 * Complete redemption (in-person verification required for phone-only).
 */
export async function redeemGratitudePoints({
  hospitalOrganizationId,
  catalogItemId,
  walletId,
  donorId,
  verifiedByUserId,
  verificationMethod,
  nationalId,
  notes = '',
}) {
  if (!['national_id', 'phone_in_person'].includes(verificationMethod)) {
    throw new Error('Invalid verification method')
  }

  if (verificationMethod === 'phone_in_person' && !nationalId) {
    throw new Error('National ID must be verified in person before phone-based redemption')
  }

  const hospital = await Organization.findById(hospitalOrganizationId)
  if (!isRewardsPartnerHospital(hospital)) {
    throw new Error('Hospital cannot redeem gratitude points')
  }

  const item = await RedemptionCatalogItem.findOne({
    _id: catalogItemId,
    organizationId: hospitalOrganizationId,
    isActive: true,
  })
  if (!item) {
    throw new Error('Catalog item not found or inactive')
  }

  let wallet = await DonorWallet.findById(walletId)
  if (!wallet) {
    throw new Error('Wallet not found')
  }

  if (nationalId) {
    const donor =
      (donorId && (await Donor.findById(donorId))) ||
      (wallet.linkedDonorIds?.length
        ? await Donor.findById(wallet.linkedDonorIds[0])
        : null)
    if (donor) {
      wallet = await attachNationalIdToDonor(donor, nationalId)
    }
  }

  if (item.maxRedemptionsPerDonor > 0 && donorId) {
    const count = await GratitudeRedemption.countDocuments({
      walletId: wallet._id,
      catalogItemId: item._id,
      status: 'completed',
      donorId,
    })
    if (count >= item.maxRedemptionsPerDonor) {
      throw new Error('Donor has reached the limit for this benefit')
    }
  }

  const deducted = await DonorWallet.findOneAndUpdate(
    { _id: wallet._id, balance: { $gte: item.pointCost } },
    {
      $inc: {
        balance: -item.pointCost,
        lifetimeRedeemed: item.pointCost,
      },
    },
    { new: true }
  )

  if (!deducted) {
    throw new Error('Insufficient gratitude points')
  }

  const newBalance = deducted.balance
  wallet = deducted

  const referenceCode = generateReferenceCode()

  let redemption
  try {
    redemption = await GratitudeRedemption.create({
      referenceCode,
      walletId: wallet._id,
      donorId: donorId || undefined,
      hospitalOrganizationId,
      catalogItemId: item._id,
      catalogItemTitle: item.title,
      pointsSpent: item.pointCost,
      status: 'completed',
      verificationMethod,
      verifiedByUserId,
      donorDisplayName: wallet.displayName,
      notes,
    })

    await PointTransaction.create({
      walletId: wallet._id,
      type: 'redeem',
      amount: -item.pointCost,
      balanceAfter: newBalance,
      idempotencyKey: `redeem:${redemption._id}`,
      referenceType: 'redemption',
      referenceId: redemption._id.toString(),
      redeemingOrganizationId: hospitalOrganizationId,
      description: `Redeemed: ${item.title} at ${hospital.name}`,
      metadata: { referenceCode, catalogItemId: item._id.toString() },
      createdByUserId: verifiedByUserId,
    })
  } catch (err) {
    await DonorWallet.findByIdAndUpdate(wallet._id, {
      $inc: { balance: item.pointCost, lifetimeRedeemed: -item.pointCost },
    })
    throw err
  }

  return {
    referenceCode,
    pointsSpent: item.pointCost,
    balance: newBalance,
    catalogItemTitle: item.title,
    disclaimer: REDEMPTION_DISCLAIMER,
    redemptionId: redemption._id.toString(),
  }
}
