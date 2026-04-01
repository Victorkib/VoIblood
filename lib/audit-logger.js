/**
 * Audit Logger
 * Comprehensive audit logging for compliance and security
 * Tracks all critical operations on sensitive data
 */

import { connectDB } from './db'

/**
 * Audit log severity levels
 */
export const AUDIT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  // Donor operations
  DONOR_CREATE: 'donor.create',
  DONOR_UPDATE: 'donor.update',
  DONOR_DELETE: 'donor.delete',
  DONOR_VIEW: 'donor.view',

  // Inventory operations
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_DELETE: 'inventory.delete',
  INVENTORY_VIEW: 'inventory.view',

  // Request operations
  REQUEST_CREATE: 'request.create',
  REQUEST_UPDATE: 'request.update',
  REQUEST_APPROVE: 'request.approve',
  REQUEST_DENY: 'request.deny',
  REQUEST_VIEW: 'request.view',

  // Auth operations
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED: 'auth.failed',
  AUTH_OAUTH: 'auth.oauth',

  // User management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_PERMISSION_CHANGE: 'user.permission_change',

  // System operations
  SYSTEM_CONFIG_CHANGE: 'system.config_change',
  SYSTEM_BACKUP: 'system.backup',
}

/**
 * Log an audit event
 * @param {object} options - Audit log options
 * @param {string} options.action - Action type (from AUDIT_ACTIONS)
 * @param {string} options.userId - User who performed the action
 * @param {string} options.organizationId - Organization context
 * @param {string} options.resourceType - Type of resource (donor, inventory, request, etc)
 * @param {string} options.resourceId - ID of the resource
 * @param {string} options.severity - Severity level (from AUDIT_SEVERITY)
 * @param {object} options.changes - Object containing before/after changes
 * @param {string} options.description - Human-readable description
 * @param {string} options.ipAddress - IP address of the requester
 * @param {string} options.userAgent - User agent string
 * @returns {Promise<object>} Audit log document
 */
export async function logAuditEvent(options) {
  const {
    action,
    userId,
    organizationId,
    resourceType,
    resourceId,
    severity = AUDIT_SEVERITY.MEDIUM,
    changes = {},
    description,
    ipAddress,
    userAgent,
  } = options

  // Validate required fields
  if (!action || !userId || !organizationId) {
    console.error('[Audit] Missing required fields for audit log', options)
    return null
  }

  try {
    await connectDB()

    // Import model dynamically to avoid circular dependencies
    const { default: AuditLog } = await import('./models/AuditLog.js')

    const auditLog = await AuditLog.create({
      action,
      userId,
      organizationId,
      resourceType,
      resourceId,
      severity,
      changes,
      description: description || generateDescription(action, resourceType, changes),
      ipAddress,
      userAgent,
      timestamp: new Date(),
    })

    // Log critical operations to console
    if (severity === AUDIT_SEVERITY.CRITICAL || severity === AUDIT_SEVERITY.HIGH) {
      console.log(
        `[AUDIT] ${severity.toUpperCase()} - ${action} by ${userId} on ${resourceType}:${resourceId}`
      )
    }

    return auditLog
  } catch (error) {
    console.error('[Audit] Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main operation
    return null
  }
}

/**
 * Generate automatic description from action and changes
 * @param {string} action - Action type
 * @param {string} resourceType - Resource type
 * @param {object} changes - Changes object
 * @returns {string} Description
 */
function generateDescription(action, resourceType, changes) {
  const actionVerbs = {
    'create': 'Created',
    'update': 'Updated',
    'delete': 'Deleted',
    'view': 'Viewed',
    'approve': 'Approved',
    'deny': 'Denied',
    'login': 'Logged in',
    'logout': 'Logged out',
  }

  const verb = Object.entries(actionVerbs).find(([key]) => action.includes(key))?.[1] || 'Modified'
  const hasChanges = Object.keys(changes).length > 0

  if (hasChanges) {
    const changedFields = Object.keys(changes).join(', ')
    return `${verb} ${resourceType} - Changed fields: ${changedFields}`
  }

  return `${verb} ${resourceType}`
}

/**
 * Query audit logs with filtering
 * @param {object} filter - MongoDB filter
 * @param {object} options - Query options (limit, skip, sort)
 * @returns {Promise<array>} Audit logs
 */
export async function queryAuditLogs(filter = {}, options = {}) {
  const { limit = 50, skip = 0, sort = { timestamp: -1 } } = options

  try {
    await connectDB()
    const { default: AuditLog } = await import('./models/AuditLog.js')

    return await AuditLog.find(filter)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean()
  } catch (error) {
    console.error('[Audit] Failed to query audit logs:', error)
    return []
  }
}

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<array>} Audit logs for resource
 */
export async function getResourceAuditLog(resourceType, resourceId, organizationId) {
  return queryAuditLogs(
    { resourceType, resourceId, organizationId },
    { limit: 100, sort: { timestamp: -1 } }
  )
}

/**
 * Get audit logs for a specific user
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<array>} Audit logs for user
 */
export async function getUserAuditLog(userId, organizationId) {
  return queryAuditLogs(
    { userId, organizationId },
    { limit: 100, sort: { timestamp: -1 } }
  )
}

/**
 * Get all critical operations in a time period
 * @param {string} organizationId - Organization ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<array>} Critical operations
 */
export async function getCriticalOperations(organizationId, startDate, endDate) {
  return queryAuditLogs(
    {
      organizationId,
      severity: { $in: [AUDIT_SEVERITY.CRITICAL, AUDIT_SEVERITY.HIGH] },
      timestamp: { $gte: startDate, $lte: endDate },
    },
    { limit: 1000, sort: { timestamp: -1 } }
  )
}

/**
 * Generate audit report for compliance
 * @param {string} organizationId - Organization ID
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @returns {Promise<object>} Audit report
 */
export async function generateAuditReport(organizationId, startDate, endDate) {
  try {
    const logs = await queryAuditLogs(
      {
        organizationId,
        timestamp: { $gte: startDate, $lte: endDate },
      },
      { limit: 10000 }
    )

    const report = {
      organizationId,
      period: {
        start: startDate,
        end: endDate,
      },
      totalEvents: logs.length,
      eventsByAction: {},
      eventsBySeverity: {},
      eventsByUser: {},
      deletionEvents: [],
      dataModifications: [],
      criticalEvents: [],
      generatedAt: new Date(),
    }

    // Categorize events
    logs.forEach((log) => {
      // By action
      report.eventsByAction[log.action] = (report.eventsByAction[log.action] || 0) + 1

      // By severity
      report.eventsBySeverity[log.severity] = (report.eventsBySeverity[log.severity] || 0) + 1

      // By user
      report.eventsByUser[log.userId] = (report.eventsByUser[log.userId] || 0) + 1

      // Deletion events (important for compliance)
      if (log.action.includes('delete')) {
        report.deletionEvents.push(log)
      }

      // Data modifications
      if (log.action.includes('update') && Object.keys(log.changes).length > 0) {
        report.dataModifications.push(log)
      }

      // Critical events
      if (log.severity === AUDIT_SEVERITY.CRITICAL) {
        report.criticalEvents.push(log)
      }
    })

    return report
  } catch (error) {
    console.error('[Audit] Failed to generate audit report:', error)
    throw error
  }
}

/**
 * Extract audit info from request
 * @param {Request} req - HTTP request
 * @returns {object} Audit context
 */
export function getAuditContextFromRequest(req) {
  return {
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  }
}
