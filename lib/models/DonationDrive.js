/**
 * DonationDrive Model
 * Manages blood donation drives and campaigns
 */

import mongoose from 'mongoose'

const donationDriveSchema = new mongoose.Schema(
  {
    // Organization
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Drive Information
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Date & Location
    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      trim: true,
    },

    endTime: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    // Goals
    targetDonors: {
      type: Number,
      default: 50,
      min: 1,
    },

    // WhatsApp Integration
    whatsappGroupLink: {
      type: String,
      trim: true,
    },

    // Registration
    registrationToken: {
      type: String,
      unique: true,
      index: true,
    },

    registrationUrl: {
      type: String,
    },

    registrationDeadline: {
      type: Date,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },

    // Statistics
    stats: {
      clicks: {
        type: Number,
        default: 0,
      },
      registrations: {
        type: Number,
        default: 0,
      },
      confirmed: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
    },

    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Additional Settings
    requireAppointment: {
      type: Boolean,
      default: false,
    },

    allowWalkIns: {
      type: Boolean,
      default: true,
    },

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
donationDriveSchema.index({ organizationId: 1, status: 1 })
donationDriveSchema.index({ date: 1 })
donationDriveSchema.index({ registrationToken: 1 })

// Virtual to check if drive is upcoming
donationDriveSchema.virtual('isUpcoming').get(function () {
  return this.date > new Date() && this.isActive
})

// Virtual to check if registration is open
donationDriveSchema.virtual('isRegistrationOpen').get(function () {
  if (!this.isActive || this.status !== 'active') return false
  if (this.registrationDeadline && new Date() > this.registrationDeadline) return false
  return true
})

// Static method to generate unique registration token
donationDriveSchema.statics.generateRegistrationToken = async function () {
  const crypto = require('crypto')
  let token = crypto.randomBytes(16).toString('hex')
  
  // Ensure uniqueness
  let exists = await this.findOne({ registrationToken: token })
  while (exists) {
    token = crypto.randomBytes(16).toString('hex')
    exists = await this.findOne({ registrationToken: token })
  }
  
  return token
}

// Instance method to increment click count
donationDriveSchema.methods.incrementClicks = async function () {
  this.stats.clicks += 1
  return this.save()
}

// Instance method to increment registration count
donationDriveSchema.methods.incrementRegistrations = async function () {
  this.stats.registrations += 1
  return this.save()
}

// Instance method to activate drive
donationDriveSchema.methods.activate = async function () {
  if (!this.registrationToken) {
    this.registrationToken = await this.constructor.generateRegistrationToken()
  }
  this.status = 'active'
  this.isActive = true
  return this.save()
}

// Instance method to deactivate drive
donationDriveSchema.methods.deactivate = async function () {
  this.status = 'completed'
  this.isActive = false
  return this.save()
}

const DonationDrive = mongoose.models.DonationDrive || mongoose.model('DonationDrive', donationDriveSchema)

export default DonationDrive
