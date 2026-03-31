/**
 * Donor Model - Clean Version
 * Stores blood donor information
 * NO hooks, NO async static methods - just pure schema
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

    // Drive Association
    driveToken: {
      type: String,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ['registered', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
      default: 'registered',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Donor Token (for profile access)
    donorToken: {
      type: String,
      unique: true,
      index: true,
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

// Virtual for fullName
donorSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Static method to get donors by drive token (simple query, no async)
donorSchema.statics.findByDriveToken = function (driveToken) {
  return this.find({ driveToken }).sort({ createdAt: -1 })
}

// Static method to count donors by drive token
donorSchema.statics.countByDriveToken = function (driveToken) {
  return this.countDocuments({ driveToken })
}

const Donor = mongoose.models.Donor || mongoose.model('Donor', donorSchema)

export default Donor
