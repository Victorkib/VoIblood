/**
 * Email Service
 * Handles email notifications using Mailjet as primary provider
 * Supports Google OAuth for user authentication
 */

/**
 * Email templates for various notifications
 */
const EMAIL_TEMPLATES = {
  errorAlert: {
    subject: '[ALERT] Blood Bank System Error',
    templateId: 'error-alert',
  },
  donorRegistration: {
    subject: 'Welcome to iBlood - Donor Registration Confirmation',
    templateId: 'donor-registration',
  },
  bloodRequestCreated: {
    subject: 'New Blood Request Created',
    templateId: 'blood-request-created',
  },
  bloodRequestFulfilled: {
    subject: 'Blood Request Fulfilled',
    templateId: 'blood-request-fulfilled',
  },
  inventoryLowWarning: {
    subject: 'Blood Inventory Low Warning',
    templateId: 'inventory-low-warning',
  },
  bloodExpiryAlert: {
    subject: 'Blood Unit Expiry Alert',
    templateId: 'blood-expiry-alert',
  },
  requestDenied: {
    subject: 'Blood Request Status Update',
    templateId: 'request-denied',
  },
}

/**
 * Send email using Mailjet
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.templateKey - Template key from EMAIL_TEMPLATES
 * @param {object} options.variables - Template variables
 * @param {string} options.organizationId - Organization context
 * @returns {Promise<object>} Send result
 */
export async function sendEmail({ to, templateKey, variables = {}, organizationId }) {
  // Check if Mailjet is configured
  const mailjetApiKey = process.env.MAILJET_API_KEY
  const mailjetSecretKey = process.env.MAILJET_SECRET_KEY

  if (!mailjetApiKey || !mailjetSecretKey) {
    console.warn(
      'Mailjet not configured. Email sending disabled. ' +
      'Set MAILJET_API_KEY and MAILJET_SECRET_KEY environment variables.'
    )
    return {
      success: false,
      error: 'Email service not configured',
      message: 'Mailjet credentials are missing',
    }
  }

  const template = EMAIL_TEMPLATES[templateKey]
  if (!template) {
    console.error(`Email template not found: ${templateKey}`)
    return {
      success: false,
      error: 'Template not found',
    }
  }

  try {
    // Prepare email payload
    const payload = {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@iblood.app',
            Name: 'iBlood System',
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: template.subject,
          Variables: {
            organizationId,
            timestamp: new Date().toISOString(),
            ...variables,
          },
          TemplateID: template.templateId,
          TemplateLanguage: true,
        },
      ],
    }

    // Call Mailjet API
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${mailjetApiKey}:${mailjetSecretKey}`).toString('base64')}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Mailjet API error:', result)
      return {
        success: false,
        error: 'Mailjet API error',
        details: result,
      }
    }

    return {
      success: true,
      messageId: result.Messages?.[0]?.ID,
      status: result.Messages?.[0]?.Status,
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Send error alert email to admin
 * @param {object} errorLog - Error log object
 * @param {string} organizationId - Organization ID
 */
export async function sendErrorAlert(errorLog, organizationId) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@iblood.app',
    templateKey: 'errorAlert',
    variables: {
      errorMessage: errorLog.message,
      severity: errorLog.severity,
      url: errorLog.url,
      timestamp: errorLog.timestamp,
      action: errorLog.action,
    },
    organizationId,
  })
}

/**
 * Send donor registration confirmation
 * @param {object} donor - Donor object
 * @param {string} organizationId - Organization ID
 */
export async function sendDonorRegistrationEmail(donor, organizationId) {
  return sendEmail({
    to: donor.email,
    templateKey: 'donorRegistration',
    variables: {
      donorName: `${donor.firstName} ${donor.lastName}`,
      bloodType: donor.bloodType,
      registrationDate: new Date().toLocaleDateString(),
    },
    organizationId,
  })
}

/**
 * Send blood request created notification
 * @param {object} request - Request object
 * @param {string} organizationId - Organization ID
 */
export async function sendBloodRequestNotification(request, organizationId) {
  const bloodTypes = request.bloodRequirements
    .map((r) => `${r.quantity} units of ${r.bloodType}`)
    .join(', ')

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@iblood.app',
    templateKey: 'bloodRequestCreated',
    variables: {
      requestId: request._id || request.id,
      organizationName: request.requestingOrganizationName,
      patientName: request.patientName,
      bloodRequirements: bloodTypes,
      urgency: request.urgency,
      medicalCondition: request.medicalCondition,
    },
    organizationId,
  })
}

/**
 * Send inventory low warning
 * @param {object} bloodType - Blood type with low inventory
 * @param {number} count - Current count
 * @param {string} organizationId - Organization ID
 */
export async function sendInventoryLowWarning(bloodType, count, organizationId) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@iblood.app',
    templateKey: 'inventoryLowWarning',
    variables: {
      bloodType,
      currentCount: count,
      threshold: process.env.INVENTORY_LOW_THRESHOLD || '5',
      urgency: count <= 2 ? 'CRITICAL' : 'WARNING',
    },
    organizationId,
  })
}

/**
 * Send blood expiry alert
 * @param {object} bloodUnit - Blood unit about to expire
 * @param {string} organizationId - Organization ID
 */
export async function sendBloodExpiryAlert(bloodUnit, organizationId) {
  const daysUntilExpiry = Math.ceil(
    (new Date(bloodUnit.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  )

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@iblood.app',
    templateKey: 'bloodExpiryAlert',
    variables: {
      unitId: bloodUnit._id || bloodUnit.id,
      bloodType: bloodUnit.bloodType,
      expiryDate: new Date(bloodUnit.expiryDate).toLocaleDateString(),
      daysRemaining: daysUntilExpiry,
      component: bloodUnit.component || 'Whole Blood',
    },
    organizationId,
  })
}

/**
 * Send request fulfillment notification
 * @param {object} request - Request object
 * @param {string} organizationId - Organization ID
 */
export async function sendRequestFulfilledNotification(request, organizationId) {
  return sendEmail({
    to: request.requestingOrganizationEmail || process.env.ADMIN_EMAIL,
    templateKey: 'bloodRequestFulfilled',
    variables: {
      requestId: request._id || request.id,
      organizationName: request.requestingOrganizationName,
      patientName: request.patientName,
      fulfilledDate: new Date().toLocaleDateString(),
    },
    organizationId,
  })
}

/**
 * Send request denied notification
 * @param {object} request - Request object
 * @param {string} reason - Reason for denial
 * @param {string} organizationId - Organization ID
 */
export async function sendRequestDeniedNotification(request, reason, organizationId) {
  return sendEmail({
    to: request.requestingOrganizationEmail || process.env.ADMIN_EMAIL,
    templateKey: 'requestDenied',
    variables: {
      requestId: request._id || request.id,
      organizationName: request.requestingOrganizationName,
      reason,
      denialDate: new Date().toLocaleDateString(),
    },
    organizationId,
  })
}

/**
 * Batch send emails
 * @param {array} emails - Array of email options
 */
export async function sendBatchEmails(emails) {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  )

  return {
    total: emails.length,
    successful: results.filter((r) => r.status === 'fulfilled' && r.value.success).length,
    failed: results.filter((r) => r.status === 'rejected' || !r.value.success).length,
    results,
  }
}

/**
 * Get email service status
 * @returns {object} Service status
 */
export function getEmailServiceStatus() {
  const configured = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY)
  return {
    provider: 'Mailjet',
    configured,
    fromEmail: process.env.MAILJET_FROM_EMAIL || 'noreply@iblood.app',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@iblood.app',
  }
}
