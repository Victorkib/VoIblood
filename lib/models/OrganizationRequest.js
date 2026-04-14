/**
 * Organization Request Model
 * Allows users to request to join organizations (job-seeking style)
 * 
 * Flow:
 * 1. User browses available organizations
 * 2. User submits request with profile/motivation
 * 3. Org admin receives notification
 * 4. Org admin reviews and approves/rejects
 * 5. If approved, user joins organization with specified role
 */

import mongoose from 'mongoose'

const REQUEST_STATUS = ['pending', 'pending_email_verification', 'approved', 'rejected', 'withdrawn', 'expired']
const REQUESTED_ROLES = ['org_admin', 'manager', 'staff', 'viewer']

const organizationRequestSchema = new mongoose.Schema(
  {
    // User making the request (null until email verified)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // User email (used to link request before user is created)
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Organization being requested to join (null for org creation requests)
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    // Role user is requesting (or 'any' if flexible)
    requestedRole: {
      type: String,
      enum: [...REQUESTED_ROLES, 'any'],
      default: 'staff',
    },

    // Request status
    status: {
      type: String,
      enum: REQUEST_STATUS,
      default: 'pending',
      index: true,
    },

    // Request type: 'join' or 'create_org'
    requestType: {
      type: String,
      enum: ['join', 'create_org'],
      default: 'join',
      index: true,
    },

    // User's motivation/cover letter
    motivation: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    // User's bio at time of request (snapshot)
    userBio: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // User's title at time of request (snapshot)
    userTitle: {
      type: String,
      trim: true,
    },

    // User's department preference
    preferredDepartment: {
      type: String,
      trim: true,
    },

    // Why user wants to join this org
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Relevant experience/skills
    experience: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Availability (full-time, part-time, volunteer)
    availability: {
      type: String,
      enum: ['full-time', 'part-time', 'volunteer', 'contract'],
      default: 'full-time',
    },

    // Attachments (CV, certificates, etc.) - Cloudinary URLs
    attachments: [{
      url: String,
      name: String,
      type: String, // 'cv', 'certificate', 'other'
      uploadedAt: Date,
    }],

    // Admin who reviewed the request
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Review timestamp
    reviewedAt: {
      type: Date,
    },

    // Admin notes (internal)
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Rejection reason (if rejected)
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Role assigned if approved (may differ from requested)
    assignedRole: {
      type: String,
      enum: REQUESTED_ROLES,
    },

    // Department assigned (if applicable)
    assignedDepartment: {
      type: String,
      trim: true,
    },

    // Expiry date for pending requests (auto-expire after 30 days)
    expiresAt: {
      type: Date,
      default: () => {
        const date = new Date()
        date.setDate(date.getDate() + 30) // 30 days from now
        return date
      },
    },

    // Notification sent to admins
    notificationSent: {
      type: Boolean,
      default: false,
    },

    // Reminder notifications sent
    remindersSent: {
      type: Number,
      default: 0,
    },

    // Last reminder sent at
    lastReminderAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for efficient queries
organizationRequestSchema.index({ userId: 1, status: 1 })
organizationRequestSchema.index({ organizationId: 1, status: 1 })
organizationRequestSchema.index({ status: 1, createdAt: -1 })
organizationRequestSchema.index({ expiresAt: 1 })
organizationRequestSchema.index({ userId: 1, organizationId: 1, status: 1 })
organizationRequestSchema.index({ userEmail: 1, status: 1 }) // For finding requests by email

// TTL index: auto-delete requests that are still pending email verification after 24 hours
organizationRequestSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, // 24 hours
    partialFilterExpression: { status: 'pending_email_verification' },
  }
)

// Virtual to check if request is expired
organizationRequestSchema.virtual('isExpired').get(function () {
  return this.status === 'pending' && new Date() > this.expiresAt
})

// Virtual to check if request is active
organizationRequestSchema.virtual('isActive').get(function () {
  return this.status === 'pending' && !this.isExpired
})

// Virtual to get days until expiry
organizationRequestSchema.virtual('daysUntilExpiry').get(function () {
  const now = new Date()
  const diffTime = this.expiresAt - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Virtual to get days since submission
organizationRequestSchema.virtual('daysSinceSubmission').get(function () {
  const now = new Date()
  const diffTime = now - this.createdAt
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Pre-save hook to auto-expire old requests
organizationRequestSchema.pre('save', function (next) {
  // Auto-expire if past expiry date
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired'
  }
  next()
})

// Instance method to approve request
organizationRequestSchema.methods.approve = async function (adminUser, assignedRole = null, assignedDepartment = null) {
  if (this.status !== 'pending') {
    throw new Error('Request is not pending')
  }

  if (this.isExpired) {
    throw new Error('Request has expired')
  }

  const User = mongoose.model('User')
  const user = await User.findById(this.userId)

  if (!user) {
    throw new Error('User not found')
  }

  // Assign user to organization
  const role = assignedRole || this.requestedRole || 'staff'
  await user.assignToOrganization(this.organizationId, role)
  user.department = assignedDepartment || this.preferredDepartment
  await user.save()

  // Update request
  this.status = 'approved'
  this.reviewedBy = adminUser._id
  this.reviewedAt = new Date()
  this.assignedRole = role
  this.assignedDepartment = assignedDepartment

  return this.save()
}

// Instance method to reject request
organizationRequestSchema.methods.reject = async function (adminUser, reason = '') {
  if (this.status !== 'pending') {
    throw new Error('Request is not pending')
  }

  this.status = 'rejected'
  this.reviewedBy = adminUser._id
  this.reviewedAt = new Date()
  this.rejectionReason = reason

  return this.save()
}

// Instance method to withdraw request
organizationRequestSchema.methods.withdraw = async function () {
  if (this.status !== 'pending') {
    throw new Error('Only pending requests can be withdrawn')
  }

  this.status = 'withdrawn'
  return this.save()
}

// Instance method to send reminder to admins
organizationRequestSchema.methods.sendReminder = async function () {
  // Only send reminder if request is at least 7 days old
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  if (this.createdAt > sevenDaysAgo) {
    throw new Error('Request is too recent for reminder')
  }

  this.remindersSent += 1
  this.lastReminderAt = new Date()
  return this.save()
}

// Static method to create request
organizationRequestSchema.statics.createRequest = async function (data) {
  const User = mongoose.model('User')
  
  // Check for existing pending request
  const existing = await this.findOne({
    userId: data.userId,
    organizationId: data.organizationId,
    status: 'pending',
  })

  if (existing) {
    throw new Error('You already have a pending request to this organization')
  }

  // Set expiry (30 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  return this.create({
    ...data,
    expiresAt,
  })
}

// Static method to find pending requests for organization
organizationRequestSchema.statics.findPendingForOrganization = async function (organizationId, options = {}) {
  const { page = 1, limit = 20 } = options
  
  const skip = (page - 1) * limit
  
  return this.find({ organizationId, status: 'pending' })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName email bio title avatarUrl')
}

// Static method to find requests by user
organizationRequestSchema.statics.findByUser = async function (userId, options = {}) {
  const { status, page = 1, limit = 20 } = options
  
  const query = { userId }
  if (status) query.status = status
  
  const skip = (page - 1) * limit
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('organizationId', 'name type city state')
}

// Static method to find requests by organization
organizationRequestSchema.statics.findByOrganization = async function (organizationId, options = {}) {
  const { status, page = 1, limit = 20 } = options
  
  const query = { organizationId }
  if (status) query.status = status
  
  const skip = (page - 1) * limit
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName email bio title avatarUrl')
    .populate('reviewedBy', 'fullName email')
}

// Static method to cleanup expired requests
organizationRequestSchema.statics.cleanupExpired = async function () {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    { status: 'expired' }
  )
  return result
}

// Static method to get statistics for organization
organizationRequestSchema.statics.getStatsForOrganization = async function (organizationId) {
  const stats = await this.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ])

  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    withdrawn: 0,
    expired: 0,
  }

  stats.forEach(stat => {
    result[stat._id] = stat.count
    result.total += stat.count
  })

  return result
}

const OrganizationRequest = mongoose.models.OrganizationRequest || mongoose.model('OrganizationRequest', organizationRequestSchema)

export default OrganizationRequest
