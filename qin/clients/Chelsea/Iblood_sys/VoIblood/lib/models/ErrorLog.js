/**
 * Error Log Model Schema
 * Tracks system errors for monitoring and debugging
 */

import mongoose from 'mongoose'

const ERROR_LEVELS = ['error', 'warning', 'info', 'debug']
const ERROR_CATEGORIES = ['auth', 'api', 'database', 'validation', 'system']

const errorLogSchema = new mongoose.Schema(
  {
    // Error Details
    level: {
      type: String,
      enum: ERROR_LEVELS,
      required: true,
      index: true,
    },
    
    category: {
      type: String,
      enum: ERROR_CATEGORIES,
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    stack: {
      type: String,
      trim: true,
    },

    // Request Context
    url: {
      type: String,
      trim: true,
    },

    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },

    userAgent: {
      type: String,
      trim: true,
    },

    ip: {
      type: String,
      trim: true,
    },

    // User Context
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // System Context
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    resolvedAt: {
      type: Date,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for efficient queries
errorLogSchema.index({ level: 1, timestamp: -1 })
errorLogSchema.index({ category: 1, timestamp: -1 })
errorLogSchema.index({ userId: 1, timestamp: -1 })
errorLogSchema.index({ organizationId: 1, timestamp: -1 })
errorLogSchema.index({ resolved: 1, timestamp: -1 })

// Static method to log errors
errorLogSchema.statics.logError = async function(errorData) {
  try {
    return await this.create({
      level: errorData.level || 'error',
      category: errorData.category || 'system',
      message: errorData.message,
      stack: errorData.stack,
      url: errorData.url,
      method: errorData.method,
      userAgent: errorData.userAgent,
      ip: errorData.ip,
      userId: errorData.userId,
      organizationId: errorData.organizationId,
      metadata: errorData.metadata || {},
    })
  } catch (err) {
    console.error('Failed to log error:', err)
  }
}

// Static method to get error statistics
errorLogSchema.statics.getStats = async function(filters = {}) {
  const match = { ...filters }
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ])
}

// Static method to get recent errors
errorLogSchema.statics.getRecent = async function(limit = 100, filters = {}) {
  const match = { ...filters }
  
  return await this.find(match)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'fullName email')
    .populate('organizationId', 'name')
}

const ErrorLog = mongoose.models.ErrorLog || mongoose.model('ErrorLog', errorLogSchema)

export default ErrorLog
