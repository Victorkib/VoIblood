/**
 * Organization Request Email Notifications
 * 
 * Handles email communication for:
 * - Request received confirmation (to user)
 * - Request approved notification (to user)
 * - Request rejected notification (to user)
 * - New request notification (to admin)
 */

import { sendEmail } from '@/lib/email-service'

/**
 * Send confirmation email to user when their request is received
 */
export async function sendRequestReceivedEmail(options) {
  const { to, fullName, requestType, orgName, requestedRole } = options

  const subject = requestType === 'create_org'
    ? `✅ Organization Creation Request Received - ${orgName}`
    : `✅ Join Request Received - ${orgName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .info-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .next-steps { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Request Received</h1>
      </div>
      <div class="content">
        <p>Dear ${fullName},</p>
        <div class="info-box">
          <p style="margin: 0; color: #92400e; font-weight: bold;">Your request has been successfully submitted!</p>
        </div>

        ${requestType === 'create_org' ? `
          <p>We have received your request to create the organization <strong>"${orgName}"</strong>.</p>
          <p>Our platform administrators will review your request and make a decision within <strong>24-48 hours</strong>.</p>
        ` : `
          <p>We have received your request to join <strong>"${orgName}"</strong> with the role of <strong>${requestedRole}</strong>.</p>
          <p>The organization's admin will review your request and make a decision within <strong>1-3 business days</strong>.</p>
        `}

        <div class="next-steps">
          <h3 style="margin-top: 0; color: #0369a1;">What Happens Next?</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Your request is assigned to the appropriate reviewer</li>
            <li>The reviewer will assess your request based on provided information</li>
            <li>You will receive an email with the decision (approved or rejected)</li>
            <li>If approved, you will gain immediate access to your dashboard</li>
          </ol>
        </div>

        <p style="text-align: center; margin-top: 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pending-approval" class="button">Check Your Request Status</a>
        </p>

        <p>If you have any questions, please contact us at <strong>support@iblood.com</strong>.</p>
      </div>
      <div class="footer">
        <p>iBlood Blood Bank Management System</p>
        <p>This is an automated message. Please do not reply directly.</p>
      </div>
    </body>
    </html>
  `

  const text = `
    Request Received
    
    Dear ${fullName},
    
    Your request has been successfully submitted!
    
    ${requestType === 'create_org'
      ? `We have received your request to create the organization "${orgName}". Our platform administrators will review your request within 24-48 hours.`
      : `We have received your request to join "${orgName}" with the role of ${requestedRole}. The organization's admin will review your request within 1-3 business days.`}
    
    What Happens Next?
    1. Your request is assigned to the appropriate reviewer
    2. The reviewer will assess your request
    3. You will receive an email with the decision
    4. If approved, you will gain immediate access to your dashboard
    
    Check your status at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pending-approval
    
    iBlood System
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Send notification email to user when their request is approved
 */
export async function sendRequestApprovedEmail(options) {
  const { to, fullName, requestType, orgName, assignedRole } = options

  const subject = requestType === 'create_org'
    ? `🎉 Congratulations! Your Organization Has Been Approved - ${orgName}`
    : `🎉 Welcome to ${orgName}!`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .celebration { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #16a34a; }
        .info-box { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Congratulations! 🎉</h1>
      </div>
      <div class="content">
        <p>Dear ${fullName},</p>
        <div class="celebration">
          <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">Your request has been APPROVED!</p>
        </div>

        ${requestType === 'create_org' ? `
          <p>We are excited to inform you that your organization <strong>"${orgName}"</strong> has been successfully created and approved!</p>
          <div class="info-box">
            <p style="margin: 0;"><strong>Organization:</strong> ${orgName}</p>
            <p style="margin: 5px 0 0 0;"><strong>Your Role:</strong> Organization Admin</p>
          </div>
          <p>As the organization admin, you now have full access to:</p>
          <ul>
            <li>Manage donation drives</li>
            <li>Manage team members</li>
            <li>Track donors and inventory</li>
            <li>Generate reports and analytics</li>
          </ul>
        ` : `
          <p>Welcome to <strong>"${orgName}"</strong>! Your request to join the organization has been approved.</p>
          <div class="info-box">
            <p style="margin: 0;"><strong>Organization:</strong> ${orgName}</p>
            <p style="margin: 5px 0 0 0;"><strong>Your Role:</strong> ${assignedRole}</p>
          </div>
          <p>You now have access to the organization's dashboard and can begin contributing immediately.</p>
        `}

        <p style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Your Dashboard</a>
        </p>

        <p style="margin-top: 25px;">If you need any assistance getting started, check out our help center or contact our support team.</p>
      </div>
      <div class="footer">
        <p>iBlood Blood Bank Management System</p>
        <p>Welcome aboard! 🎉</p>
      </div>
    </body>
    </html>
  `

  const text = `
    Congratulations! Your Request Has Been Approved!
    
    Dear ${fullName},
    
    ${requestType === 'create_org'
      ? `Your organization "${orgName}" has been successfully created and approved! Your Role: Organization Admin`
      : `Welcome to "${orgName}"! Your request to join has been approved. Your Role: ${assignedRole}`}
    
    Go to your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard
    
    iBlood System - Welcome aboard!
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Send notification email to user when their request is rejected
 */
export async function sendRequestRejectedEmail(options) {
  const { to, fullName, requestType, orgName, rejectionReason } = options

  const subject = requestType === 'create_org'
    ? `Update on Your Organization Creation Request - ${orgName}`
    : `Update on Your Join Request - ${orgName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .info-box { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .reason-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #64748b; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Request Update</h1>
      </div>
      <div class="content">
        <p>Dear ${fullName},</p>
        <div class="info-box">
          <p style="margin: 0; color: #991b1b; font-weight: bold;">
            ${requestType === 'create_org'
              ? 'We regret to inform you that your organization creation request has not been approved at this time.'
              : 'We regret to inform you that your request to join the organization has not been approved at this time.'}
          </p>
        </div>

        ${orgName ? `<p><strong>Request Details:</strong> ${orgName}</p>` : ''}

        ${rejectionReason ? `
          <div class="reason-box">
            <p style="margin: 0; font-weight: bold;">Reason for Rejection:</p>
            <p style="margin: 10px 0 0 0;">${rejectionReason}</p>
          </div>
        ` : ''}

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">What Can You Do?</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Review the reason provided above</li>
            <li>You may submit a new request with additional information</li>
            <li>Contact our support team if you have questions</li>
          </ul>
        </div>

        <p style="text-align: center; margin-top: 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup" class="button">Submit a New Request</a>
        </p>

        <p>If you believe this decision was made in error or have questions, please contact us at <strong>support@iblood.com</strong>.</p>
      </div>
      <div class="footer">
        <p>iBlood Blood Bank Management System</p>
        <p>We appreciate your interest in joining our platform.</p>
      </div>
    </body>
    </html>
  `

  const text = `
    Request Update
    
    Dear ${fullName},
    
    ${requestType === 'create_org'
      ? 'We regret to inform you that your organization creation request has not been approved at this time.'
      : 'We regret to inform you that your request to join the organization has not been approved at this time.'}
    
    ${rejectionReason ? `Reason: ${rejectionReason}` : ''}
    
    What Can You Do?
    - Review the reason provided
    - You may submit a new request with additional information
    - Contact our support team if you have questions
    
    Submit a new request: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup
    
    iBlood System
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Send notification to super admin when new org creation request is received
 */
export async function sendNewOrgRequestNotification(options) {
  const { to, userName, orgName, orgType, requestId } = options

  const subject = `📋 New Organization Creation Request - ${orgName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .info-box { background: #f5f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
        .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 New Organization Request</h1>
      </div>
      <div class="content">
        <p>A new organization creation request has been submitted and requires your review.</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>Applicant:</strong> ${userName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Organization:</strong> ${orgName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Type:</strong> ${orgType.replace('_', ' ')}</p>
        </div>

        <p>Please review this request at your earliest convenience. Requests should typically be reviewed within 24-48 hours.</p>

        <p style="text-align: center; margin-top: 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/super-admin/org-requests" class="button">Review Request</a>
        </p>
      </div>
      <div class="footer">
        <p>iBlood Platform Administration</p>
      </div>
    </body>
    </html>
  `

  const text = `
    New Organization Request
    
    A new organization creation request has been submitted:
    
    Applicant: ${userName}
    Organization: ${orgName}
    Type: ${orgType}
    
    Review at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/super-admin/org-requests
    
    iBlood System
  `

  return sendEmail({ to, subject, html, text })
}
