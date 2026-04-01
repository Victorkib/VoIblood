/**
 * Blood Inventory Model Schema
 * Tracks individual blood units and their status
 */

import mongoose from 'mongoose'

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const INVENTORY_STATUS = ['available', 'reserved', 'used', 'expired', 'discarded']
const BLOOD_COMPONENTS = ['whole_blood', 'rbc', 'plasma', 'platelets', 'cryo']

const bloodInventorySchema = new mongoose.Schema(
  {
    // Blood Unit Information
    unitId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: true,
    },

    component: {
      type: String,
      enum: BLOOD_COMPONENTS,
      default: 'whole_blood',
    },

    volume: {
      type: Number, // in ml
      default: 450,
      required: true,
      min: 0,
    },

    // Donor Information
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
    },

    donorName: {
      type: String,
      trim: true,
    },

    // Collection Information
    collectionDate: {
      type: Date,
      required: true,
    },

    collectionFacility: {
      type: String,
      trim: true,
    },

    technician: {
      type: String,
      trim: true,
    },

    // Testing Information
    testedFor: {
      hiv: {
        type: Boolean,
        default: false,
      },
      hepatitisB: {
        type: Boolean,
        default: false,
      },
      hepatitisC: {
        type: Boolean,
        default: false,
      },
      syphilis: {
        type: Boolean,
        default: false,
      },
      malaria: {
        type: Boolean,
        default: false,
      },
      covid19: {
        type: Boolean,
        default: false,
      },
      testDate: {
        type: Date,
      },
      testResults: {
        type: String,
        enum: ['negative', 'positive', 'pending'],
        default: 'pending',
      },
    },

    // Expiry Information
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Storage Information
    storageLocation: {
      type: String,
      trim: true,
    },

    temperature: {
      type: Number, // in Celsius
      min: -40,
      max: 10,
    },

    // Status and History
    status: {
      type: String,
      enum: INVENTORY_STATUS,
      default: 'available',
      index: true,
    },

    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
    },

    usedDate: {
      type: Date,
    },

    usedAt: {
      type: String,
      trim: true,
    },

    discardedDate: {
      type: Date,
    },

    discardReason: {
      type: String,
      enum: ['expired', 'contaminated', 'damage', 'testing_failed', 'other'],
    },

    // Organization Reference
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    // Quality Attributes
    qualityNotes: {
      type: String,
      trim: true,
    },

    hematocritLevel: {
      type: Number, // percentage
      min: 0,
      max: 100,
    },

    plateletCount: {
      type: Number, // x 10^9/L
    },

    // Notes
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for efficient queries
bloodInventorySchema.index({ bloodType: 1, organizationId: 1, status: 1 })
bloodInventorySchema.index({ expiryDate: 1, status: 1 })
bloodInventorySchema.index({ collectionDate: -1 })
bloodInventorySchema.index({ donorId: 1 })
bloodInventorySchema.index({ createdAt: -1 })

// Virtual to check if expired
bloodInventorySchema.virtual('isExpired').get(function () {
  return new Date() > this.expiryDate
})

// Virtual to get days until expiry
bloodInventorySchema.virtual('daysUntilExpiry').get(function () {
  const now = new Date()
  const diffTime = this.expiryDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Virtual to get expiry status
bloodInventorySchema.virtual('expiryStatus').get(function () {
  const daysLeft = this.daysUntilExpiry
  
  if (daysLeft < 0) return 'expired'
  if (daysLeft === 0) return 'expires-today'
  if (daysLeft <= 3) return 'critical'
  if (daysLeft <= 7) return 'warning'
  return 'good'
})

// Instance method to reserve unit
bloodInventorySchema.methods.reserve = async function (requestId) {
  if (this.status !== 'available') {
    throw new Error('Unit is not available for reservation')
  }
  if (this.isExpired) {
    throw new Error('Unit is expired')
  }
  this.status = 'reserved'
  this.reservedBy = requestId
  return this.save()
}

// Instance method to mark as used
bloodInventorySchema.methods.markAsUsed = async function (facility) {
  if (this.status !== 'reserved') {
    throw new Error('Unit must be reserved before marking as used')
  }
  this.status = 'used'
  this.usedDate = new Date()
  this.usedAt = facility
  return this.save()
}

// Instance method to discard unit
bloodInventorySchema.methods.discard = async function (reason, notes = '') {
  this.status = 'discarded'
  this.discardedDate = new Date()
  this.discardReason = reason
  if (notes) this.notes = notes
  return this.save()
}

const BloodInventory = mongoose.models.BloodInventory || mongoose.model('BloodInventory', bloodInventorySchema)

export default BloodInventory
