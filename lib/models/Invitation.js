/**
 * Invitation Model - Simplified Version
 * No hooks, no middleware - just pure CRUD
 */

import mongoose from 'mongoose'

const invitationSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['org_admin', 'manager', 'staff', 'viewer'],
      required: true,
      default: 'staff',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['organization', 'super_admin'],
      default: 'organization',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    respondedAt: Date,
    userId: mongoose.Schema.Types.ObjectId,
    message: String,
    department: String,
    title: String,
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes
invitationSchema.index({ token: 1, status: 1 })
invitationSchema.index({ email: 1, status: 1 })
invitationSchema.index({ organizationId: 1, status: 1 })

// Virtual for days until expiry
invitationSchema.virtual('daysUntilExpiry').get(function () {
  const now = new Date()
  const diffTime = this.expiresAt - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Static method to create invitation
invitationSchema.statics.createInvitation = async function (data) {
  console.log('[Invitation] Creating invitation:', data)

  if (!data.email || !data.organizationId || !data.role) {
    throw new Error('Missing required fields')
  }

  const crypto = require('crypto')

  // Check for existing
  const existing = await this.findOne({
    email: data.email.toLowerCase(),
    organizationId: data.organizationId,
    status: 'pending',
  })

  if (existing) {
    throw new Error('Invitation already sent')
  }

  // Create directly using collection.insertOne (bypasses all hooks)
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const result = await this.collection.insertOne({
    token,
    expiresAt,
    email: data.email.toLowerCase(),
    organizationId: data.organizationId,
    role: data.role,
    invitedBy: data.invitedBy,
    type: data.type || 'organization',
    status: 'pending',
    message: data.message || null,
    department: data.department || null,
    title: data.title || null,
    accessCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log('[Invitation] Created:', result.insertedId)
  return this.findById(result.insertedId)
}

// Static method to find by token
invitationSchema.statics.findByToken = async function (token) {
  const invitation = await this.findOne({ token }).populate('organizationId', 'name type')
  if (!invitation) {
    throw new Error('Invitation not found')
  }
  return invitation
}

const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema)

export default Invitation
