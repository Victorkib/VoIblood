/**
 * Completed gratitude benefit redemption at a partner hospital.
 */

import mongoose from 'mongoose'
import { VERIFICATION_METHODS } from '@/lib/gratitude-points/constants'

const gratitudeRedemptionSchema = new mongoose.Schema(
  {
    referenceCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorWallet',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
    },
    hospitalOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    catalogItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RedemptionCatalogItem',
      required: true,
    },
    catalogItemTitle: {
      type: String,
      required: true,
      trim: true,
    },
    pointsSpent: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['completed', 'voided'],
      default: 'completed',
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: VERIFICATION_METHODS,
      required: true,
    },
    verifiedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donorDisplayName: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    voidedAt: Date,
    voidedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    voidReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
)

gratitudeRedemptionSchema.index({ hospitalOrganizationId: 1, createdAt: -1 })

const GratitudeRedemption =
  mongoose.models.GratitudeRedemption ||
  mongoose.model('GratitudeRedemption', gratitudeRedemptionSchema)

export default GratitudeRedemption
