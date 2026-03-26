/**
 * User Model Schema
 * Stores user profile information synced from Supabase Auth
 */

import mongoose from 'mongoose'

/**
 * User Role Enum
 * @type {('admin' | 'staff' | 'hospital')}
 */
const USER_ROLES = ['admin', 'staff', 'hospital']

const userSchema = new mongoose.Schema(
  {
    // Supabase Auth ID (primary identifier)
    supabaseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Email (from Supabase)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Full Name
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    // User Role
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'staff',
    },

    // Organization/Blood Bank Details
    organizationName: {
      type: String,
      trim: true,
    },

    organizationId: {
      type: String,
      trim: true,
    },

    // Phone Number
    phone: {
      type: String,
      trim: true,
    },

    // Avatar/Profile Image URL
    avatarUrl: {
      type: String,
    },

    // Email Verification Status
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Last Login Timestamp
    lastLoginAt: {
      type: Date,
    },

    // OAuth Providers Used
    providers: [{
      provider: String,
      providerId: String,
    }],

    // Preferences
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      expiryAlerts: {
        type: Boolean,
        default: true,
      },
      lowStockAlerts: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Index for efficient queries (email already has unique index from schema definition)
userSchema.index({ role: 1 })
userSchema.index({ organizationId: 1 })
userSchema.index({ createdAt: -1 })

// Virtual for user's initials (for avatar fallback)
userSchema.virtual('initials').get(function () {
  if (!this.fullName) return 'U'
  const names = this.fullName.split(' ')
  if (names.length === 1) return names[0].charAt(0).toUpperCase()
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
})

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLoginAt = new Date()
  return this.save()
}

// Static method to find or create user from Supabase auth
userSchema.statics.findOrCreateFromSupabase = async function (supabaseUser) {
  let user = await this.findOne({ supabaseId: supabaseUser.id })

  if (!user) {
    // Extract name from metadata or email
    const fullName = 
      supabaseUser.user_metadata?.full_name || 
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'User'

    user = await this.create({
      supabaseId: supabaseUser.id,
      email: supabaseUser.email,
      fullName: fullName,
      role: supabaseUser.user_metadata?.role || 'staff',
      organizationName: supabaseUser.user_metadata?.organization_name,
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      emailVerified: supabaseUser.email_confirmed_at ? true : false,
      providers: supabaseUser.app_metadata?.providers?.map(p => ({
        provider: p,
        providerId: supabaseUser.id,
      })) || [],
    })
  } else {
    // Update existing user info
    user.email = supabaseUser.email
    user.fullName = 
      supabaseUser.user_metadata?.full_name || 
      supabaseUser.user_metadata?.name ||
      user.fullName
    user.avatarUrl = supabaseUser.user_metadata?.avatar_url
    await user.save()
  }

  return user
}

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
