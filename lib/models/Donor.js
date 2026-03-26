/**
 * Donor Model Schema
 * Stores donor profile information and donation history
 */

import mongoose from 'mongoose'

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const DONATION_STATUS = ['available', 'unavailable', 'deferred']

const donorSchema = new mongoose.Schema(
  {
    // Basic Information
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
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Blood Type
    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: true,
    },

    // Personal Details
    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    zipCode: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    // Medical Information
    weight: {
      type: Number, // in kg
      min: 0,
    },

    medicalConditions: [{
      type: String,
      trim: true,
    }],

    allergies: [{
      type: String,
      trim: true,
    }],

    medications: [{
      type: String,
      trim: true,
    }],

    // Donation History
    totalDonations: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastDonationDate: {
      type: Date,
    },

    nextAvailableDonationDate: {
      type: Date,
    },

    // Status
    donationStatus: {
      type: String,
      enum: DONATION_STATUS,
      default: 'available',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deferralReason: {
      type: String,
      trim: true,
    },

    deferralExpiryDate: {
      type: Date,
    },

    // Organization Reference
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    // Consent
    consentGiven: {
      type: Boolean,
      default: false,
    },

    consentDate: {
      type: Date,
    },

    // Emergency Contact
    emergencyContactName: {
      type: String,
      trim: true,
    },

    emergencyContactPhone: {
      type: String,
      trim: true,
    },

    emergencyContactRelation: {
      type: String,
      trim: true,
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
donorSchema.index({ email: 1, organizationId: 1 })
donorSchema.index({ phone: 1 })
donorSchema.index({ bloodType: 1, organizationId: 1 })
donorSchema.index({ lastDonationDate: -1 })
donorSchema.index({ donationStatus: 1 })
donorSchema.index({ createdAt: -1 })

// Virtual for donor's full name
donorSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for age calculation
donorSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null
  const today = new Date()
  let age = today.getFullYear() - this.dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - this.dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--
  }
  return age
})

// Virtual to check if eligible for donation
donorSchema.virtual('isEligibleForDonation').get(function () {
  const now = new Date()
  
  // Check status
  if (this.donationStatus !== 'available') return false
  
  // Check age (typically 18-65)
  if (this.age < 18 || this.age > 65) return false
  
  // Check weight (typically minimum 50kg)
  if (this.weight && this.weight < 50) return false
  
  // Check deferral expiry
  if (this.deferralExpiryDate && now < this.deferralExpiryDate) return false
  
  return true
})

// Instance method to record a donation
donorSchema.methods.recordDonation = async function () {
  this.totalDonations += 1
  this.lastDonationDate = new Date()
  // Set next available donation date (typically 56 days for whole blood)
  const nextDate = new Date(this.lastDonationDate)
  nextDate.setDate(nextDate.getDate() + 56)
  this.nextAvailableDonationDate = nextDate
  this.donationStatus = 'unavailable'
  return this.save()
}

// Instance method to defer donor
donorSchema.methods.deferDonor = async function (reason, daysDeferred = 90) {
  this.donationStatus = 'deferred'
  this.deferralReason = reason
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + daysDeferred)
  this.deferralExpiryDate = expiryDate
  return this.save()
}

// Instance method to reactivate donor
donorSchema.methods.reactivateDonor = async function () {
  if (this.deferralExpiryDate && new Date() > this.deferralExpiryDate) {
    this.donationStatus = 'available'
    this.deferralReason = null
    this.deferralExpiryDate = null
    return this.save()
  }
  throw new Error('Deferral period has not expired yet')
}

const Donor = mongoose.models.Donor || mongoose.model('Donor', donorSchema)

export default Donor
