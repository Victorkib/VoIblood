/**
 * Request Model Schema
 * Tracks blood requests from hospitals and request fulfillment
 */

import mongoose from 'mongoose'

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const REQUEST_STATUS = ['pending', 'approved', 'rejected', 'partially_fulfilled', 'fulfilled', 'cancelled']
const BLOOD_COMPONENTS = ['whole_blood', 'rbc', 'plasma', 'platelets', 'cryo']
const URGENCY_LEVELS = ['routine', 'urgent', 'emergency']

const requestSchema = new mongoose.Schema(
  {
    // Request ID and Basic Info
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Requesting Hospital/Organization
    requestingOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    requestingOrganizationName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Request Details
    bloodRequirements: [{
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
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      unitMeasure: {
        type: String,
        enum: ['units', 'ml'],
        default: 'units',
      },
      requested: {
        type: Number,
        default: 0,
      },
      fulfilled: {
        type: Number,
        default: 0,
      },
      remaining: {
        type: Number,
      },
    }],

    // Patient Information
    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    patientAge: {
      type: Number,
      min: 0,
    },

    patientGender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },

    patientId: {
      type: String,
      trim: true,
    },

    // Medical Details
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },

    surgeryType: {
      type: String,
      trim: true,
    },

    // Urgency and Timing
    urgency: {
      type: String,
      enum: URGENCY_LEVELS,
      default: 'routine',
    },

    requiredDate: {
      type: Date,
      required: true,
    },

    requiredTime: {
      type: String,
      trim: true,
    },

    // Status and Workflow
    status: {
      type: String,
      enum: REQUEST_STATUS,
      default: 'pending',
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvalDate: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    // Fulfillment Details
    allocatedUnits: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodInventory',
    }],

    fulfilledDate: {
      type: Date,
    },

    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'delivery',
    },

    deliveryAddress: {
      type: String,
      trim: true,
    },

    deliveryContactPerson: {
      type: String,
      trim: true,
    },

    deliveryContactPhone: {
      type: String,
      trim: true,
    },

    deliveredDate: {
      type: Date,
    },

    deliveredBy: {
      type: String,
      trim: true,
    },

    // Source Organization
    sourceOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    // Notes and Comments
    notes: {
      type: String,
      trim: true,
    },

    internalNotes: {
      type: String,
      trim: true,
    },

    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for efficient queries
requestSchema.index({ requestId: 1 })
requestSchema.index({ status: 1, sourceOrganizationId: 1 })
requestSchema.index({ requiredDate: 1, status: 1 })
requestSchema.index({ urgency: 1, status: 1 })
requestSchema.index({ requestingOrganizationId: 1 })
requestSchema.index({ sourceOrganizationId: 1 })
requestSchema.index({ createdAt: -1 })

// Virtual to calculate total units needed
requestSchema.virtual('totalUnitsNeeded').get(function () {
  return this.bloodRequirements.reduce((sum, req) => sum + req.quantity, 0)
})

// Virtual to calculate total units fulfilled
requestSchema.virtual('totalUnitsFulfilled').get(function () {
  return this.bloodRequirements.reduce((sum, req) => sum + req.fulfilled, 0)
})

// Virtual to calculate remaining units
requestSchema.virtual('totalUnitsRemaining').get(function () {
  return this.totalUnitsNeeded - this.totalUnitsFulfilled
})

// Virtual to get fulfillment percentage
requestSchema.virtual('fulfillmentPercentage').get(function () {
  if (this.totalUnitsNeeded === 0) return 0
  return Math.round((this.totalUnitsFulfilled / this.totalUnitsNeeded) * 100)
})

// Virtual to check if overdue
requestSchema.virtual('isOverdue').get(function () {
  return new Date() > new Date(this.requiredDate) && this.status !== 'fulfilled'
})

// Instance method to approve request
requestSchema.methods.approve = async function (userId) {
  this.status = 'approved'
  this.approvedBy = userId
  this.approvalDate = new Date()
  this.lastActivityDate = new Date()
  return this.save()
}

// Instance method to reject request
requestSchema.methods.reject = async function (userId, reason) {
  this.status = 'rejected'
  this.rejectionReason = reason
  this.lastActivityDate = new Date()
  return this.save()
}

// Instance method to allocate units
requestSchema.methods.allocateUnits = async function (unitIds) {
  this.allocatedUnits = unitIds
  if (unitIds.length === this.bloodRequirements.reduce((sum, req) => sum + req.quantity, 0)) {
    this.status = 'approved'
  } else if (unitIds.length > 0) {
    this.status = 'partially_fulfilled'
  }
  this.lastActivityDate = new Date()
  return this.save()
}

// Instance method to mark as fulfilled
requestSchema.methods.markFulfilled = async function () {
  if (this.allocatedUnits.length === 0) {
    throw new Error('No units allocated for this request')
  }
  this.status = 'fulfilled'
  this.fulfilledDate = new Date()
  this.lastActivityDate = new Date()
  return this.save()
}

// Instance method to mark as delivered
requestSchema.methods.markDelivered = async function (deliveredBy) {
  if (this.status !== 'fulfilled') {
    throw new Error('Request must be fulfilled before marking as delivered')
  }
  this.deliveredDate = new Date()
  this.deliveredBy = deliveredBy
  this.lastActivityDate = new Date()
  return this.save()
}

// Instance method to cancel request
requestSchema.methods.cancel = async function (reason = '') {
  if (['fulfilled', 'delivered'].includes(this.status)) {
    throw new Error('Cannot cancel a fulfilled or delivered request')
  }
  this.status = 'cancelled'
  this.notes = reason ? `Cancelled: ${reason}` : 'Cancelled'
  this.lastActivityDate = new Date()
  return this.save()
}

const Request = mongoose.models.Request || mongoose.model('Request', requestSchema)

export default Request
