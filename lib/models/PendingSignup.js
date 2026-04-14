/**
 * Pending Signup Model
 * Temporarily stores signup intent during email verification flow
 * This ensures we can retrieve org creation details in the callback
 * regardless of cookies or Supabase metadata behavior
 */

import mongoose from 'mongoose'

const pendingSignupSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
    },
    supabaseId: {
      type: String,
      required: true,
      index: true,
    },
    // Signup intent data
    orgSelection: {
      type: String,
      enum: ['create', 'join', 'invite'],
      default: 'create',
    },
    selectedOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    requestMessage: String,
    requestedRole: String,
    orgName: String,
    orgType: {
      type: String,
      enum: ['blood_bank', 'hospital', 'transfusion_center', 'ngo'],
    },
    orgDescription: String,
    orgMotivation: String,
    bio: String,
    title: String,
    inviteToken: String,
  },
  {
    timestamps: true,
    // Auto-delete after 7 days (TTL index)
    expires: 60 * 60 * 24 * 7,
  }
)

// TTL index on createdAt to auto-expire old records
pendingSignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 })

const PendingSignup = mongoose.models.PendingSignup || mongoose.model('PendingSignup', pendingSignupSchema)

export default PendingSignup
