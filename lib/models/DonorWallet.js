/**
 * Platform-wide donor wallet for Gratitude Points (Kenya).
 * One wallet per verified identity; redeemable at any Rewards Partner hospital.
 */

import mongoose from 'mongoose'

const alternateIdentitySchema = new mongoose.Schema(
  {
    identityType: {
      type: String,
      enum: ['national_id', 'email', 'phone'],
      required: true,
    },
    identityHash: {
      type: String,
      required: true,
    },
    last4: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const donorWalletSchema = new mongoose.Schema(
  {
    primaryIdentityType: {
      type: String,
      enum: ['national_id', 'email', 'phone'],
      required: true,
    },
    primaryIdentityHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    primaryLast4: {
      type: String,
      trim: true,
      default: '',
    },
    alternateIdentities: [alternateIdentitySchema],

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },

    linkedDonorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
      },
    ],

    displayName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
)

donorWalletSchema.index({ linkedDonorIds: 1 })
donorWalletSchema.index({ 'alternateIdentities.identityHash': 1 })

const DonorWallet =
  mongoose.models.DonorWallet || mongoose.model('DonorWallet', donorWalletSchema)

export default DonorWallet
