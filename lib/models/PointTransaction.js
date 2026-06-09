/**
 * Immutable ledger for Gratitude Points.
 */

import mongoose from 'mongoose'

const pointTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorWallet',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'adjust', 'expire'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    referenceType: {
      type: String,
      enum: ['donation', 'redemption', 'manual'],
      required: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    earningOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    redeemingOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

pointTransactionSchema.index({ walletId: 1, createdAt: -1 })

const PointTransaction =
  mongoose.models.PointTransaction ||
  mongoose.model('PointTransaction', pointTransactionSchema)

export default PointTransaction
