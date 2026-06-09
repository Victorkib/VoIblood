/**
 * Hospital-defined gratitude benefits (points only, no monetary value).
 */

import mongoose from 'mongoose'
import { CATALOG_CATEGORIES } from '@/lib/gratitude-points/constants'

const redemptionCatalogItemSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: CATALOG_CATEGORIES,
      default: 'other',
    },
    pointCost: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    maxRedemptionsPerDonor: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
)

redemptionCatalogItemSchema.index({ organizationId: 1, isActive: 1, sortOrder: 1 })

const RedemptionCatalogItem =
  mongoose.models.RedemptionCatalogItem ||
  mongoose.model('RedemptionCatalogItem', redemptionCatalogItemSchema)

export default RedemptionCatalogItem
