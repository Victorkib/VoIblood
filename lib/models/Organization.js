/**
 * Organization Model Schema
 * Stores blood bank and hospital organization information
 */

import mongoose from 'mongoose'

const ORGANIZATION_TYPES = ['blood_bank', 'hospital', 'transfusion_center', 'ngo']

const organizationSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ORGANIZATION_TYPES,
      required: true,
    },

    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Contact Information
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

    alternatePhone: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    // Address
    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    zipCode: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      default: 'India',
      trim: true,
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },

    // Organization Details
    directorName: {
      type: String,
      trim: true,
    },

    directorPhone: {
      type: String,
      trim: true,
    },

    accreditationNumber: {
      type: String,
      trim: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
    },

    licenseExpiryDate: {
      type: Date,
    },

    // Blood Bank Specific
    bloodBankCapacity: {
      type: Number, // total units capacity
      min: 0,
    },

    bloodBankSection: {
      donor: {
        type: Boolean,
        default: false,
      },
      laboratory: {
        type: Boolean,
        default: false,
      },
      bloodbank: {
        type: Boolean,
        default: false,
      },
      apheresis: {
        type: Boolean,
        default: false,
      },
      transfusion: {
        type: Boolean,
        default: false,
      },
    },

    // Hospital Specific
    bedCapacity: {
      type: Number,
      min: 0,
    },

    specialties: [{
      type: String,
      trim: true,
    }],

    // Operational Hours
    operatingHours: {
      monday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      tuesday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      wednesday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      thursday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      friday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      saturday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      sunday: {
        open: String,
        close: String,
        isClosed: Boolean,
      },
      emergencyAvailable: {
        type: Boolean,
        default: true,
      },
    },

    // Status and Account
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending_verification'],
      default: 'pending_verification',
    },

    // Subscription/Integration
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free',
    },

    subscriptionExpiryDate: {
      type: Date,
    },

    // Inventory Settings (for blood banks)
    minimumStockLevels: {
      'O+': { type: Number, default: 10 },
      'O-': { type: Number, default: 10 },
      'A+': { type: Number, default: 5 },
      'A-': { type: Number, default: 5 },
      'B+': { type: Number, default: 5 },
      'B-': { type: Number, default: 5 },
      'AB+': { type: Number, default: 3 },
      'AB-': { type: Number, default: 3 },
    },

    // Preferred Partner Organizations
    partnerOrganizations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    }],

    // Contact Persons
    contactPersons: [{
      name: {
        type: String,
        trim: true,
      },
      title: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      isPrimary: {
        type: Boolean,
        default: false,
      },
    }],

    // Documents
    logo: {
      type: String,
      trim: true,
    },

    certifications: [{
      name: {
        type: String,
        trim: true,
      },
      expiryDate: {
        type: Date,
      },
    }],

    // Statistics (denormalized for performance)
    totalDonorsRegistered: {
      type: Number,
      default: 0,
    },

    totalBloodUnitsInStock: {
      type: Number,
      default: 0,
    },

    totalRequestsFulfilled: {
      type: Number,
      default: 0,
    },

    // Preferences
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
      lowStockAlerts: {
        type: Boolean,
        default: true,
      },
      expiryAlerts: {
        type: Boolean,
        default: true,
      },
      requestNotifications: {
        type: Boolean,
        default: true,
      },
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
organizationSchema.index({ type: 1, isActive: 1 })
organizationSchema.index({ city: 1, type: 1 })
organizationSchema.index({ accountStatus: 1 })
organizationSchema.index({ createdAt: -1 })
organizationSchema.index({ 'contactPersons.email': 1 })

// Virtual to check if license is valid
organizationSchema.virtual('isLicenseValid').get(function () {
  if (!this.licenseExpiryDate) return null
  return new Date() < this.licenseExpiryDate
})

// Virtual to get days until license expiry
organizationSchema.virtual('daysUntilLicenseExpiry').get(function () {
  if (!this.licenseExpiryDate) return null
  const diffTime = this.licenseExpiryDate - new Date()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// Virtual to check if subscription is valid
organizationSchema.virtual('isSubscriptionValid').get(function () {
  if (!this.subscriptionExpiryDate) return null
  return new Date() < this.subscriptionExpiryDate
})

// Virtual to get complete address
organizationSchema.virtual('fullAddress').get(function () {
  return `${this.address}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`
})

// Instance method to update stock levels
organizationSchema.methods.updateStockLevels = async function (inventoryStats) {
  this.totalBloodUnitsInStock = inventoryStats.totalUnits
  return this.save()
}

// Instance method to get operating hours for a day
organizationSchema.methods.getOperatingHours = function (day) {
  const dayLower = day.toLowerCase()
  return this.operatingHours[dayLower]
}

// Instance method to check if currently open
organizationSchema.methods.isCurrentlyOpen = function () {
  const now = new Date()
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()]
  
  const hours = this.operatingHours[dayOfWeek]
  if (!hours || hours.isClosed) return this.operatingHours.emergencyAvailable || false
  
  if (!hours.open || !hours.close) return this.operatingHours.emergencyAvailable || false
  
  const [openHour, openMin] = hours.open.split(':').map(Number)
  const [closeHour, closeMin] = hours.close.split(':').map(Number)
  
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes()
  const openTimeInMinutes = openHour * 60 + openMin
  const closeTimeInMinutes = closeHour * 60 + closeMin
  
  return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes
}

// Instance method to add partner organization
organizationSchema.methods.addPartner = async function (partnerId) {
  if (!this.partnerOrganizations.includes(partnerId)) {
    this.partnerOrganizations.push(partnerId)
    return this.save()
  }
  return this
}

// Instance method to remove partner organization
organizationSchema.methods.removePartner = async function (partnerId) {
  this.partnerOrganizations = this.partnerOrganizations.filter(
    id => id.toString() !== partnerId.toString()
  )
  return this.save()
}

const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema)

export default Organization
