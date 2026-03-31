/**
 * Verification Token Model
 * Stores tokens issued after successful OTP verification
 * Used to maintain verification state across requests
 */

import mongoose from 'mongoose'

const verificationTokenSchema = new mongoose.Schema({
  // The verification token
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Contact information
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  
  // Token expiry
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // MongoDB auto-delete
  },
  
  // When token was created
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  // Whether token has been used for registration
  used: {
    type: Boolean,
    default: false,
  },
  
  // When token was used
  usedAt: {
    type: Date,
  },
})

// Static method: Create verification token
verificationTokenSchema.statics.createToken = async function(phone, email, expiresAt) {
  const crypto = require('crypto')
  const token = crypto.randomBytes(32).toString('hex')
  
  return this.create({
    token,
    phone,
    email,
    expiresAt: new Date(expiresAt),
  })
}

// Static method: Validate token
verificationTokenSchema.statics.validateToken = async function(token) {
  const tokenDoc = await this.findOne({ token, used: false })
  
  if (!tokenDoc) {
    return { success: false, error: 'Invalid or used token' }
  }
  
  if (new Date() > tokenDoc.expiresAt) {
    await this.deleteOne({ _id: tokenDoc._id })
    return { success: false, error: 'Token expired' }
  }
  
  return {
    success: true,
    phone: tokenDoc.phone,
    email: tokenDoc.email,
    _id: tokenDoc._id,
  }
}

// Static method: Mark token as used
verificationTokenSchema.statics.useToken = async function(token) {
  return this.findOneAndUpdate(
    { token },
    { 
      used: true, 
      usedAt: new Date() 
    }
  )
}

// Static method: Delete token
verificationTokenSchema.statics.deleteToken = async function(token) {
  return this.deleteOne({ token })
}

const VerificationToken = mongoose.models.VerificationToken || 
  mongoose.model('VerificationToken', verificationTokenSchema)

export default VerificationToken
