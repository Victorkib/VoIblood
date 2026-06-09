import Donor from '@/lib/models/Donor'
import DonorWallet from '@/lib/models/DonorWallet'
import GratitudeRedemption from '@/lib/models/GratitudeRedemption'
import PointTransaction from '@/lib/models/PointTransaction'

/**
 * Merge source wallet into target (same person, different identity keys).
 * Moves balance, donors, ledger rows; deletes source wallet.
 */
export async function mergeWalletsIntoTarget(targetId, sourceId) {
  if (!targetId || !sourceId || targetId.toString() === sourceId.toString()) {
    return DonorWallet.findById(targetId || sourceId)
  }

  const [target, source] = await Promise.all([
    DonorWallet.findById(targetId),
    DonorWallet.findById(sourceId),
  ])

  if (!target || !source) return target

  target.balance = (target.balance || 0) + (source.balance || 0)
  target.lifetimeEarned = (target.lifetimeEarned || 0) + (source.lifetimeEarned || 0)
  target.lifetimeRedeemed = (target.lifetimeRedeemed || 0) + (source.lifetimeRedeemed || 0)

  const targetLinked = new Set((target.linkedDonorIds || []).map((id) => id.toString()))
  for (const id of source.linkedDonorIds || []) {
    if (!targetLinked.has(id.toString())) {
      target.linkedDonorIds.push(id)
      targetLinked.add(id.toString())
    }
  }

  target.alternateIdentities = target.alternateIdentities || []
  const altHashes = new Set(target.alternateIdentities.map((a) => a.identityHash))

  for (const a of source.alternateIdentities || []) {
    if (!altHashes.has(a.identityHash)) {
      target.alternateIdentities.push(a)
      altHashes.add(a.identityHash)
    }
  }

  if (!altHashes.has(source.primaryIdentityHash)) {
    target.alternateIdentities.push({
      identityType: source.primaryIdentityType,
      identityHash: source.primaryIdentityHash,
      last4: source.primaryLast4,
    })
  }

  if (source.displayName && !target.displayName) {
    target.displayName = source.displayName
  }

  await PointTransaction.updateMany({ walletId: source._id }, { walletId: target._id })
  await GratitudeRedemption.updateMany({ walletId: source._id }, { walletId: target._id })
  await Donor.updateMany({ walletId: source._id }, { walletId: target._id })

  await target.save()
  await DonorWallet.deleteOne({ _id: source._id })

  return target
}
