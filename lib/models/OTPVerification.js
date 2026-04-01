/**
 * OTP Verification Model
 * Stores OTP codes for donor registration verification
 */

import mongoose from 'mongoose'

const otpVerificationSchema = new mongoose.Schema({
  // Key used to look up OTP (phone or email)
  key: {
    type: String,
    required: true,
    index: true,
  },
  
  // The actual OTP code
  otp: {
    type: String,
    required: true,
  },
  
  // Contact information
  phone: {
    type: String,
    sparse: true,
  },
  email: {
    type: String,
    sparse: true,
  },
  
  // Expiry timestamp
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // MongoDB will auto-delete expired documents
  },
  
  // When OTP was created
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes in seconds (backup expiry)
  },
  
  // Attempt tracking
  attempts: {
    type: Number,
    default: 0,
  },
  
  // Whether this OTP has been verified
  verified: {
    type: Boolean,
    default: false,
  },
})

// Compound index for efficient lookups
otpVerificationSchema.index({ key: 1, verified: 1 })

// Static method: Create new OTP
otpVerificationSchema.statics.createOTP = async function(key, otp, phone, email, expiresAt) {
  // Delete any existing OTP for this key first
  await this.deleteOne({ key })
  
  return this.create({
    key,
    otp,
    phone,
    email,
    expiresAt: new Date(expiresAt),
  })
}

// Static method: Verify OTP
otpVerificationSchema.statics.verifyOTP = async function(key, otp) {
  const otpDoc = await this.findOne({ key, otp, verified: false })
  
  if (!otpDoc) {
    return { success: false, error: 'OTP not found or already used' }
  }
  
  if (new Date() > otpDoc.expiresAt) {
    await this.deleteOne({ _id: otpDoc._id })
    return { success: false, error: 'OTP expired' }
  }
  
  // Mark as verified
  otpDoc.verified = true
  await otpDoc.save()
  
  return {
    success: true,
    phone: otpDoc.phone,
    email: otpDoc.email,
  }
}

// Static method: Get OTP (for debugging)
otpVerificationSchema.statics.getOTP = async function(key) {
  return this.findOne({ key, verified: false })
}

// Static method: Delete OTP
otpVerificationSchema.statics.deleteOTP = async function(key) {
  return this.deleteOne({ key })
}

// Static method: Clean up expired OTPs
otpVerificationSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } })
}

const OTPVerification = mongoose.models.OTPVerification || 
  mongoose.model('OTPVerification', otpVerificationSchema)

export default OTPVerification
