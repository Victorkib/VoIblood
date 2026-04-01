/**
 * User Model Schema
 * Stores user profile information synced from Supabase Auth
 * 
 * Multi-Tenant Architecture:
 * - Users can exist without an organization (pending state)
 * - Users join organizations via invitations or requests
 * - Each user belongs to exactly one organization (except super_admin)
 * - Super admins have platform-wide access
 */

import mongoose from 'mongoose'

/**
 * User Role Enum
 * @type {('super_admin' | 'org_admin' | 'manager' | 'staff' | 'viewer' | 'pending')}
 */
const USER_ROLES = ['super_admin', 'org_admin', 'manager', 'staff', 'viewer', 'pending']

/**
 * Account Status Enum
 * @type {('active' | 'inactive' | 'suspended' | 'pending_approval')}
 */
const ACCOUNT_STATUS = ['active', 'inactive', 'suspended', 'pending_approval']

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

    // User Role - defaults to pending until assigned to org
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'pending',
    },

    // Organization Reference
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    // Organization name (denormalized for quick access)
    organizationName: {
      type: String,
      trim: true,
    },

    // Phone Number
    phone: {
      type: String,
      trim: true,
    },

    // Avatar/Profile Image URL (Cloudinary)
    avatarUrl: {
      type: String,
    },

    // Account Status
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUS,
      default: 'pending_approval',
      index: true,
    },

    // Email Verification Status
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Is user active (soft delete support)
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

    // Invitation tracking
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Organization Request tracking (for job-seeking style requests)
    requestedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

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
      requestNotifications: {
        type: Boolean,
        default: true,
      },
    },

    // Bio/About (for organization request profile)
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Professional title/role description
    title: {
      type: String,
      trim: true,
    },

    // Department within organization
    department: {
      type: String,
      trim: true,
    },

    // Notes (admin only)
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for efficient queries
userSchema.index({ role: 1, organizationId: 1 })
userSchema.index({ organizationId: 1, accountStatus: 1 })
userSchema.index({ email: 1, accountStatus: 1 })
userSchema.index({ createdAt: -1 })
userSchema.index({ requestedOrganizationId: 1, accountStatus: 1 })

// Virtual for user's initials (for avatar fallback)
userSchema.virtual('initials').get(function () {
  if (!this.fullName) return 'U'
  const names = this.fullName.split(' ')
  if (names.length === 1) return names[0].charAt(0).toUpperCase()
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
})

// Virtual to check if user has organization access
userSchema.virtual('hasOrganization').get(function () {
  return !!this.organizationId && this.role !== 'pending'
})

// Virtual to check if user is pending approval
userSchema.virtual('isPending').get(function () {
  return this.role === 'pending' || this.accountStatus === 'pending_approval' || !this.organizationId
})

// Index for checking pending users
userSchema.index({ role: 'pending', accountStatus: 'pending_approval' })

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLoginAt = new Date()
  return this.save()
}

// Instance method to assign user to organization
userSchema.methods.assignToOrganization = async function (organizationId, role = 'staff') {
  const Organization = mongoose.model('Organization')
  const organization = await Organization.findById(organizationId)
  
  if (!organization) {
    throw new Error('Organization not found')
  }
  
  this.organizationId = organizationId
  this.organizationName = organization.name
  this.role = role
  this.accountStatus = 'active'
  this.requestedOrganizationId = undefined
  
  return this.save()
}

// Instance method to remove from organization
userSchema.methods.removeFromOrganization = async function () {
  this.organizationId = undefined
  this.organizationName = undefined
  this.role = 'pending'
  this.accountStatus = 'pending_approval'
  this.department = undefined
  this.title = undefined
  
  return this.save()
}

// Instance method to request to join organization
userSchema.methods.requestToJoinOrganization = async function (organizationId) {
  this.requestedOrganizationId = organizationId
  this.accountStatus = 'pending_approval'
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
      role: 'pending', // Default to pending until assigned
      organizationId: null,
      organizationName: null,
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

// Static method to find users by organization
userSchema.statics.findByOrganization = async function (organizationId, options = {}) {
  const { role, accountStatus = 'active', page = 1, limit = 20 } = options
  
  const query = { organizationId, isActive: true }
  if (role) query.role = role
  if (accountStatus) query.accountStatus = accountStatus
  
  const skip = (page - 1) * limit
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('invitedBy', 'fullName email')
}

// Static method to find pending users
userSchema.statics.findPendingUsers = async function () {
  return this.find({
    $or: [
      { role: 'pending' },
      { accountStatus: 'pending_approval' },
      { organizationId: null },
    ],
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .populate('requestedOrganizationId', 'name type')
}

// Static method to find super admins
userSchema.statics.findSuperAdmins = async function () {
  return this.find({ role: 'super_admin', isActive: true })
}

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
