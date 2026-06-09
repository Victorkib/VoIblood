/**
 * One-time token for new org admins to set their password (no Supabase email).
 */

import mongoose from 'mongoose'
import crypto from 'crypto'

const accountSetupTokenSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    fullName: { type: String, trim: true, default: '' },
    organizationName: { type: String, trim: true, default: '' },
    purpose: {
      type: String,
      enum: ['org_admin_setup'],
      default: 'org_admin_setup',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
  },
  { timestamps: true }
)

accountSetupTokenSchema.statics.createForUser = async function ({
  email,
  userId,
  organizationId,
  fullName,
  organizationName,
  expiresInDays = 7,
}) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  await this.updateMany(
    { email: email.toLowerCase(), used: false, purpose: 'org_admin_setup' },
    { $set: { used: true, usedAt: new Date() } }
  )

  return this.create({
    token,
    email: email.toLowerCase(),
    userId,
    organizationId,
    fullName,
    organizationName,
    expiresAt,
  })
}

accountSetupTokenSchema.statics.findValid = async function (token) {
  const doc = await this.findOne({ token, used: false })
  if (!doc) {
    return { valid: false, error: 'This setup link is invalid or has already been used.' }
  }
  if (new Date() > doc.expiresAt) {
    return { valid: false, error: 'This setup link has expired. Ask your platform admin to resend one.' }
  }
  return { valid: true, doc }
}

accountSetupTokenSchema.methods.markUsed = async function () {
  this.used = true
  this.usedAt = new Date()
  return this.save()
}

const AccountSetupToken =
  mongoose.models.AccountSetupToken ||
  mongoose.model('AccountSetupToken', accountSetupTokenSchema)

export default AccountSetupToken
