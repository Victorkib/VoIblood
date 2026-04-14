/**
 * Donor Model - Complete Version
 * Stores blood donor information with full lifecycle tracking
 * 
 * Status Flow:
 * registered → confirmed → checked_in → completed
 *              ↓            ↓
 *           cancelled   no_show
 */

import mongoose from 'mongoose'

const donorSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Medical Information
    bloodType: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    weight: {
      type: Number,
      min: 30,
      max: 200,
    },

    // Donation History
    hasDonatedBefore: {
      type: Boolean,
      default: false,
    },
    lastDonationDate: {
      type: Date,
    },
    totalDonations: {
      type: Number,
      default: 0,
      min: 0,
    },
    donationHistory: [{
      date: { type: Date, required: true },
      driveId: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationDrive' },
      driveName: { type: String },
      volume: { type: Number, default: 450 }, // ml
      bloodType: { type: String },
      unitId: { type: String }, // Links to BloodInventory
      notes: { type: String, trim: true },
    }],
    medicalConditions: {
      type: String,
      trim: true,
      default: '',
    },
    medications: {
      type: String,
      trim: true,
      default: '',
    },

    // Consent
    consentGiven: {
      type: Boolean,
      required: true,
      default: true,
    },

    // Drive & Organization Association
    driveToken: {
      type: String,
      index: true,
    },
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationDrive',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ['registered', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
      default: 'registered',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Notes (added by admin)
    notes: {
      type: String,
      trim: true,
      default: '',
    },

    // Donor Token (for profile access)
    donorToken: {
      type: String,
      unique: true,
      index: true,
    },

    // Next eligible donation date (auto-calculated)
    nextEligibleDate: {
      type: Date,
    },

    // Registration type
    registrationType: {
      type: String,
      enum: ['online', 'walk_in'],
      default: 'online',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for efficient queries
donorSchema.index({ email: 1, phone: 1 })
donorSchema.index({ driveToken: 1, status: 1 })
donorSchema.index({ bloodType: 1 })
donorSchema.index({ organizationId: 1, status: 1 })
donorSchema.index({ organizationId: 1, createdAt: -1 })

// Virtual for fullName
donorSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Record a donation for this donor
 * Updates donation history, stats, and next eligible date
 */
donorSchema.methods.recordDonation = async function(options = {}) {
  const {
    driveId,
    driveName,
    volume = 450,
    unitId,
    notes = '',
  } = options

  const today = new Date()
  
  // Calculate next eligible date (56 days = 8 weeks)
  const nextEligible = new Date(today)
  nextEligible.setDate(nextEligible.getDate() + 56)

  // Add to donation history
  this.donationHistory.push({
    date: today,
    driveId,
    driveName,
    volume,
    bloodType: this.bloodType,
    unitId,
    notes,
  })

  // Update donor fields
  this.lastDonationDate = today
  this.totalDonations = (this.totalDonations || 0) + 1
  this.status = 'completed'
  this.nextEligibleDate = nextEligible

  return this.save()
}

/**
 * Mark donor as deferred (temporarily ineligible)
 */
donorSchema.methods.deferDonor = async function(reason = '') {
  this.status = 'cancelled'
  if (reason) {
    this.notes = this.notes 
      ? `${this.notes}\n[Deferred: ${reason}]`
      : `[Deferred: ${reason}]`
  }
  return this.save()
}

/**
 * Reactivate a deferred/cancelled donor
 */
donorSchema.methods.reactivateDonor = async function() {
  this.status = 'registered'
  return this.save()
}

/**
 * Mark donor as no-show
 */
donorSchema.methods.markNoShow = async function() {
  this.status = 'no_show'
  return this.save()
}

/**
 * Calculate next eligible donation date
 */
donorSchema.methods.calculateNextEligibleDate = function(lastDonationDate = null) {
  const donationDate = lastDonationDate || this.lastDonationDate
  if (!donationDate) return null
  
  const nextEligible = new Date(donationDate)
  nextEligible.setDate(nextEligible.getDate() + 56)
  return nextEligible
}

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get donors by drive token
 */
donorSchema.statics.findByDriveToken = function(driveToken) {
  return this.find({ driveToken }).sort({ createdAt: -1 })
}

/**
 * Count donors by drive token
 */
donorSchema.statics.countByDriveToken = function(driveToken) {
  return this.countDocuments({ driveToken })
}

/**
 * Get donors by organization and status
 */
donorSchema.statics.findByOrganization = function(organizationId, status = null) {
  const query = { organizationId }
  if (status) query.status = status
  return this.find(query).sort({ createdAt: -1 })
}

/**
 * Get eligible donors (registered or confirmed, not checked_in or completed)
 */
donorSchema.statics.findEligibleDonors = function(organizationId) {
  return this.find({
    organizationId,
    status: { $in: ['registered', 'confirmed'] },
  }).sort({ createdAt: -1 })
}

/**
 * Get donors eligible for next donation
 */
donorSchema.statics.findReadyForDonation = function(organizationId) {
  const today = new Date()
  return this.find({
    organizationId,
    nextEligibleDate: { $lte: today },
    status: { $in: ['registered', 'confirmed'] },
  }).sort({ nextEligibleDate: 1 })
}

const Donor = mongoose.models.Donor || mongoose.model('Donor', donorSchema)

export default Donor
