/**
 * Audit Log Model
 * Records all critical operations for compliance and security auditing
 */

import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    // Action information
    action: {
      type: String,
      required: true,
      enum: [
        'donor.create',
        'donor.update',
        'donor.delete',
        'donor.view',
        'inventory.create',
        'inventory.update',
        'inventory.delete',
        'inventory.view',
        'request.create',
        'request.update',
        'request.approve',
        'request.deny',
        'request.view',
        'auth.login',
        'auth.logout',
        'auth.failed',
        'auth.oauth',
        'user.create',
        'user.update',
        'user.delete',
        'user.permission_change',
        'system.config_change',
        'system.backup',
      ],
      index: true,
    },

    // User who performed the action
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Organization context
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Resource information
    resourceType: {
      type: String,
      enum: ['donor', 'inventory', 'request', 'user', 'organization', 'system'],
    },

    resourceId: {
      type: String,
      index: true,
    },

    // Severity level
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },

    // Changes made (before/after)
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Human-readable description
    description: {
      type: String,
    },

    // Request context
    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Whether this event has been reviewed/acted upon
    reviewed: {
      type: Boolean,
      default: false,
    },

    // Notes from review
    reviewNotes: {
      type: String,
    },

    // Reviewer ID
    reviewedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  }
)

// Compound index for common queries
auditLogSchema.index({ organizationId: 1, timestamp: -1 })
auditLogSchema.index({ organizationId: 1, action: 1, timestamp: -1 })
auditLogSchema.index({ organizationId: 1, severity: 1, timestamp: -1 })
auditLogSchema.index({ userId: 1, organizationId: 1, timestamp: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1, organizationId: 1 })

// TTL index - keep audit logs for 2 years (730 days)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 })

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)
