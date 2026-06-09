import Donor from '@/lib/models/Donor'
import DonorWallet from '@/lib/models/DonorWallet'
import { hashIdentity, last4ForDisplay } from '@/lib/gratitude-points/identity'
import { mergeWalletsIntoTarget } from '@/lib/gratitude-points/wallet-merge'
import { normalizeDonorEmail } from '@/lib/donor-dedupe'
import { normalizePhoneDigits } from '@/lib/donor-dedupe'

/**
 * Resolve wallet by identity hash (primary or alternate).
 */
export async function findWalletByIdentity(type, rawValue) {
  const hash = hashIdentity(type, rawValue)
  if (!hash) return null

  let wallet = await DonorWallet.findOne({ primaryIdentityHash: hash })
  if (wallet) return wallet

  wallet = await DonorWallet.findOne({ 'alternateIdentities.identityHash': hash })
  return wallet
}

/**
 * Find wallet linked to donor record.
 */
export async function findWalletForDonor(donor) {
  if (!donor) return null
  if (donor.walletId) {
    const w = await DonorWallet.findById(donor.walletId)
    if (w) return w
  }
  if (donor._id) {
    const w = await DonorWallet.findOne({ linkedDonorIds: donor._id })
    if (w) return w
  }
  return null
}

/**
 * Pick strongest identity: national ID on donor metadata > email > phone.
 */
export function resolveDonorIdentityFields(donor) {
  if (donor.nationalIdHash && donor.nationalIdLast4) {
    return {
      type: 'national_id',
      hash: donor.nationalIdHash,
      last4: donor.nationalIdLast4,
      fromStoredHash: true,
    }
  }
  const email = normalizeDonorEmail(donor.email)
  if (email) {
    return {
      type: 'email',
      hash: hashIdentity('email', email),
      last4: last4ForDisplay('email', email),
      fromStoredHash: false,
    }
  }
  const phone = normalizePhoneDigits(donor.phone)
  if (phone.length >= 7) {
    return {
      type: 'phone',
      hash: hashIdentity('phone', phone),
      last4: last4ForDisplay('phone', phone),
      fromStoredHash: false,
    }
  }
  return null
}

/**
 * Get or create platform wallet for donor; link donor row.
 */
export async function getOrCreateWalletForDonor(donorDoc) {
  const donor = donorDoc.toObject ? donorDoc.toObject() : donorDoc
  const donorId = donor._id

  let wallet = await findWalletForDonor(donor)
  if (wallet) {
    await linkDonorToWallet(wallet, donorId)
    return wallet
  }

  const identity = resolveDonorIdentityFields(donor)
  if (!identity?.hash) {
    throw new Error('Donor has no identity for gratitude wallet (email or phone required)')
  }

  wallet = await DonorWallet.findOne({ primaryIdentityHash: identity.hash })
  if (!wallet) {
    try {
      wallet = await DonorWallet.create({
        primaryIdentityType: identity.type,
        primaryIdentityHash: identity.hash,
        primaryLast4: identity.last4,
        displayName: `${donor.firstName || ''} ${donor.lastName || ''}`.trim(),
        linkedDonorIds: [donorId],
        balance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      })
    } catch (err) {
      if (err.code === 11000) {
        wallet = await DonorWallet.findOne({ primaryIdentityHash: identity.hash })
      } else {
        throw err
      }
    }
  }

  await linkDonorToWallet(wallet, donorId)
  return wallet
}

export async function linkDonorToWallet(wallet, donorId) {
  const id = donorId.toString()
  const linked = (wallet.linkedDonorIds || []).map((x) => x.toString())
  if (!linked.includes(id)) {
    wallet.linkedDonorIds.push(donorId)
    await wallet.save()
  }
  await Donor.updateOne({ _id: donorId }, { $set: { walletId: wallet._id } })
}

/**
 * Register national ID on donor + merge into wallet (staff verification flow).
 */
export async function attachNationalIdToDonor(donor, nationalIdRaw) {
  const hash = hashIdentity('national_id', nationalIdRaw)
  const last4 = last4ForDisplay('national_id', nationalIdRaw)
  if (!hash) throw new Error('Invalid national ID')

  let wallet = await findWalletByIdentity('national_id', nationalIdRaw)
  const donorWallet = await findWalletForDonor(donor)

  if (wallet && donorWallet && wallet._id.toString() !== donorWallet._id.toString()) {
    wallet = await mergeWalletsIntoTarget(wallet._id, donorWallet._id)
  }

  if (!wallet) {
    const existing = donorWallet || (await findWalletForDonor(donor))
    if (existing) {
      const oldHash = existing.primaryIdentityHash
      const oldType = existing.primaryIdentityType
      const oldLast4 = existing.primaryLast4

      if (oldHash !== hash) {
        existing.alternateIdentities = existing.alternateIdentities || []
        const dup = existing.alternateIdentities.some((a) => a.identityHash === oldHash)
        if (!dup) {
          existing.alternateIdentities.push({
            identityType: oldType,
            identityHash: oldHash,
            last4: oldLast4,
          })
        }
        existing.primaryIdentityType = 'national_id'
        existing.primaryIdentityHash = hash
        existing.primaryLast4 = last4
        await existing.save()
      }
      wallet = existing
    } else {
      wallet = await DonorWallet.create({
        primaryIdentityType: 'national_id',
        primaryIdentityHash: hash,
        primaryLast4: last4,
        displayName: `${donor.firstName} ${donor.lastName}`.trim(),
        linkedDonorIds: [donor._id],
        balance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      })
    }
  }

  await Donor.updateOne(
    { _id: donor._id },
    {
      $set: {
        walletId: wallet._id,
        nationalIdHash: hash,
        nationalIdLast4: last4,
      },
    }
  )

  await linkDonorToWallet(wallet, donor._id)
  return wallet
}
