/**
 * Email Service
 * Handles email sending with Gmail (primary) and Mailjet (fallback)
 *
 * Configuration:
 * - Gmail: Uses nodemailer with Gmail App Password
 * - Mailjet: Uses node-mailjet API as fallback
 */

import nodemailer from 'nodemailer'

/**
 * Create Gmail transporter
 */
function createGmailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

/**
 * Send email via Mailjet (fallback)
 */
async function sendViaMailjet(options) {
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
    throw new Error('Mailjet credentials not configured')
  }

  // Dynamic import for node-mailjet
  let Mailjet
  try {
    const mailjetModule = await import('node-mailjet')
    Mailjet = mailjetModule.default || mailjetModule
  } catch (error) {
    // If dynamic import fails, try require
    try {
      Mailjet = require('node-mailjet')
    } catch (requireError) {
      throw new Error('node-mailjet package not available')
    }
  }

  const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
  )

  const request = mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: options.from || process.env.GMAIL_USER,
          Name: options.fromName || 'iBlood System',
        },
        To: [
          {
            Email: options.to,
          },
        ],
        Subject: options.subject,
        TextPart: options.text,
        HTMLPart: options.html || options.text,
      },
    ],
  })

  return request
}

/**
 * Send email with Gmail primary, Mailjet fallback
 */
export async function sendEmail(options) {
  const { to, subject, text, html, from, fromName } = options

  if (!to || !subject || !text) {
    throw new Error('Missing required email fields: to, subject, text')
  }

  const emailOptions = {
    from: from || process.env.GMAIL_USER,
    fromName: fromName || 'iBlood System',
    to,
    subject,
    text,
    html: html || text,
  }

  // Try Gmail first
  try {
    const transporter = createGmailTransporter()
    if (transporter) {
      const result = await transporter.sendMail({
        from: `"${emailOptions.fromName}" <${emailOptions.from}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      })

      console.log('[Email] Sent via Gmail:', result.messageId)
      return {
        success: true,
        provider: 'gmail',
        messageId: result.messageId,
      }
    }
  } catch (error) {
    console.error('[Email] Gmail send error:', error.message)
  }

  // Fallback to Mailjet
  try {
    const result = await sendViaMailjet(emailOptions)
    console.log('[Email] Sent via Mailjet:', result.body)
    return {
      success: true,
      provider: 'mailjet',
      messageId: result.body.Messages[0].To[0].MessageID,
    }
  } catch (error) {
    console.error('[Email] Mailjet send error:', error.message)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(options) {
  const { email, inviterName, role, token, expiresAt, organizationName } = options

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const invitationUrl = `${appUrl}/auth/signup?token=${token}`

  const roleDisplay = {
    org_admin: 'Organization Admin',
    manager: 'Manager',
    staff: 'Staff',
    viewer: 'Viewer',
  }[role] || role

  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to iBlood System</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #C23030 0%, #8B0000 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #C23030; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 12px; color: #6b7280; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">🩸 You've been invited!</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p><strong>${inviterName || 'Someone'}</strong> has invited you to join <strong>${organizationName || 'iBlood System'}</strong> as a <strong>${roleDisplay}</strong>.</p>
        
        <h2 style="color: #1f2937;">What's next?</h2>
        <p>Click the button below to accept the invitation and create your account:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" class="button">Accept Invitation</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationUrl}" style="color: #C23030; word-break: break-all;">${invitationUrl}</a>
        </p>
        
        <div class="warning">
          <p style="margin: 0; font-size: 14px;">
            <strong>⏰ Important:</strong> This invitation expires on <strong>${expiresDate}</strong>. Please accept it before then.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="margin: 10px 0 0 0;">
            This is an automated message from iBlood Blood Donation System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
You've been invited to iBlood System!

${inviterName || 'Someone'} has invited you to join ${organizationName || 'iBlood System'} as a ${roleDisplay}.

To accept this invitation, click the link below or copy it into your browser:
${invitationUrl}

Important: This invitation expires on ${expiresDate}. Please accept it before then.

If you didn't expect this invitation, you can safely ignore this email.

This is an automated message from iBlood Blood Donation System.
  `.trim()

  return sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName || 'iBlood System'} as ${roleDisplay}`,
    text,
    html,
  })
}

/**
 * Send OTP via email
 */
export async function sendOTPViaEmail(email, otp) {
  const subject = 'Your Blood Donation OTP Code'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #C23030 0%, #8B0000 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp { background: #fff3cd; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #C23030; }
        .footer { background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 12px; color: #6b7280; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">🩸 Your OTP Code</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>Thank you for registering to donate blood! Your One-Time Password (OTP) is:</p>

        <div class="otp">
          <div class="otp-code">${otp}</div>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Valid for 5 minutes</p>
        </div>

        <p>Please enter this code to complete your registration.</p>

        <div class="footer">
          <p style="margin: 0;">
            If you didn't request this code, you can safely ignore this email.
          </p>
          <p style="margin: 10px 0 0 0;">
            This is an automated message from iBlood Blood Donation System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Your Blood Donation OTP Code

Thank you for registering to donate blood! Your One-Time Password (OTP) is:

${otp}

This OTP is valid for 5 minutes.

Please enter this code to complete your registration.

If you didn't request this code, you can safely ignore this email.

This is an automated message from iBlood Blood Donation System.
  `.trim()

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  })
}

/**
 * Get email service status
 */
export function getEmailServiceStatus() {
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  const hasMailjet = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY)
  
  return {
    configured: hasGmail || hasMailjet,
    primary: hasGmail ? 'gmail' : hasMailjet ? 'mailjet' : 'none',
    gmail: hasGmail,
    mailjet: hasMailjet,
  }
}

/**
 * Send blood request notification email
 */
export async function sendBloodRequestNotification(options) {
  const { to, requestDetails, hospitalName, urgency } = options
  
  const subject = `🩸 ${urgency || 'Urgent'} Blood Request - ${hospitalName}`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #C23030 0%, #8B0000 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; }
        .content { padding: 20px; background: #f9f9f9; margin-top: 20px; border-radius: 10px; }
        .urgent { background: #fee; border-left: 4px solid #c00; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🩸 Blood Request Notification</h1>
      </div>
      <div class="content">
        <p>A new blood request has been submitted:</p>
        ${requestDetails}
        <div class="urgent">
          <strong>Urgency Level:</strong> ${urgency || 'Standard'}
        </div>
        <p>Please review and take appropriate action.</p>
      </div>
      <div class="footer">
        <p>iBlood Blood Donation System</p>
      </div>
    </body>
    </html>
  `
  
  return sendEmail({ to, subject, html, text: subject })
}

/**
 * Send donor registration confirmation email
 */
export async function sendDonorRegistrationEmail(options) {
  const { to, donorName, driveName, appointmentDate } = options
  
  const subject = 'Registration Confirmed - Blood Donation Drive'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #C23030 0%, #8B0000 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; }
        .content { padding: 20px; background: #f9f9f9; margin-top: 20px; border-radius: 10px; }
        .button { display: inline-block; background: #C23030; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Registration Confirmed!</h1>
      </div>
      <div class="content">
        <p>Dear ${donorName || 'Donor'},</p>
        <p>Your registration for <strong>${driveName || 'Blood Donation Drive'}</strong> has been confirmed!</p>
        ${appointmentDate ? `<p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</p>` : ''}
        <p>Thank you for being a hero and helping save lives!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donor/profile" class="button">View Your Profile</a>
      </div>
      <div class="footer">
        <p>iBlood Blood Donation System</p>
      </div>
    </body>
    </html>
  `
  
  return sendEmail({ to, subject, html, text: subject })
}

/**
 * Send error alert email to admins
 */
export async function sendErrorAlert(options) {
  const { to, errorTitle, errorMessage, severity, timestamp } = options
  
  const subject = `🚨 Error Alert: ${errorTitle || 'System Error'}`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; }
        .content { padding: 20px; background: #fef2f2; margin-top: 20px; border-radius: 10px; border-left: 4px solid #dc2626; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
        .severity-high { background: #dc2626; color: white; }
        .severity-medium { background: #f59e0b; color: white; }
        .severity-low { background: #6b7280; color: white; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚨 System Error Alert</h1>
      </div>
      <div class="content">
        <h2>${errorTitle || 'Unknown Error'}</h2>
        <span class="severity severity-${severity || 'medium'}">${severity || 'Medium'} Severity</span>
        <p><strong>Time:</strong> ${timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}</p>
        <p><strong>Details:</strong></p>
        <pre style="background: #fff; padding: 15px; border-radius: 5px; overflow-x: auto;">${errorMessage || 'No details available'}</pre>
        <p>Please investigate and resolve this issue promptly.</p>
      </div>
      <div class="footer">
        <p>iBlood Monitoring System</p>
      </div>
    </body>
    </html>
  `

  return sendEmail({ to, subject, html, text: subject })
}

/**
 * Send donor status notification email (confirmation, check-in, etc.)
 */
export async function sendDonorStatusEmail(options) {
  const {
    to,
    donorName,
    subject,
    status,
    driveName,
    driveDate,
    driveTime,
    driveLocation,
    driveAddress,
    additionalInfo,
  } = options

  let statusIcon = '✅'
  let statusColor = '#16a34a'
  let statusMessage = 'You are confirmed for the donation drive!'

  if (status === 'checked_in') {
    statusIcon = '👋'
    statusColor = '#9333ea'
    statusMessage = 'Thanks for checking in!'
  } else if (status === 'completed') {
    statusIcon = '🎉'
    statusColor = '#dc2626'
    statusMessage = 'Thank you for your generous donation!'
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin: 15px 0; }
        .drive-info { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .drive-info p { margin: 8px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${statusIcon} ${driveName}</h1>
      </div>
      <div class="content">
        <p>Dear ${donorName},</p>
        <div class="status-badge">${statusMessage}</div>
        <div class="drive-info">
          <p><strong>📅 Date:</strong> ${driveDate}</p>
          <p><strong>🕐 Time:</strong> ${driveTime}</p>
          <p><strong>📍 Location:</strong> ${driveLocation}</p>
          ${driveAddress ? `<p><strong>🏠 Address:</strong> ${driveAddress}</p>` : ''}
        </div>
        ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
        <p>Thank you for being a hero! Your donation saves lives.</p>
      </div>
      <div class="footer">
        <p>iBlood Blood Bank Management System</p>
      </div>
    </body>
    </html>
  `

  const text = `
    ${statusIcon} Donation Drive Confirmation
    
    Dear ${donorName},
    
    ${statusMessage}
    
    Drive: ${driveName}
    Date: ${driveDate}
    Time: ${driveTime}
    Location: ${driveLocation}
    ${driveAddress ? `Address: ${driveAddress}` : ''}
    ${additionalInfo ? `\n${additionalInfo}` : ''}
    
    Thank you for being a hero! Your donation saves lives.
    
    iBlood System
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Send thank you email after donation completion
 */
export async function sendDonorThankYouEmail(options) {
  const {
    to,
    donorName,
    subject,
    driveName,
    driveDate,
    totalDonations,
    nextEligibleDate,
    impactMessage,
  } = options

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .hero-badge { display: inline-block; padding: 12px 24px; background: #fef2f2; color: #dc2626; border-radius: 20px; font-weight: bold; margin: 15px 0; font-size: 18px; }
        .stats { display: flex; justify-content: space-around; margin: 30px 0; }
        .stat { text-align: center; padding: 15px; background: #fef2f2; border-radius: 8px; flex: 1; margin: 0 10px; }
        .stat-number { font-size: 32px; font-weight: bold; color: #dc2626; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        .next-date { background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 THANK YOU HERO! 🎉</h1>
      </div>
      <div class="content">
        <p>Dear ${donorName},</p>
        <div class="hero-badge">🩸 You Are A True Hero!</div>
        <p style="font-size: 16px; text-align: center; margin: 25px 0;">${impactMessage}</p>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-number">${totalDonations || 1}</div>
            <div class="stat-label">Total Donations</div>
          </div>
          <div class="stat">
            <div class="stat-number">${(totalDonations || 1) * 3}</div>
            <div class="stat-label">Lives Saved</div>
          </div>
        </div>

        <div class="next-date">
          <p style="margin: 0; color: #92400e; font-size: 14px;">📅 Your Next Eligible Donation Date</p>
          <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #dc2626;">${nextEligibleDate}</p>
        </div>

        <p style="text-align: center; margin-top: 25px;">We look forward to seeing you again! Your continued donations make a huge difference.</p>
      </div>
      <div class="footer">
        <p>iBlood Blood Bank Management System</p>
        <p>Thank you for being part of the solution!</p>
      </div>
    </body>
    </html>
  `

  const text = `
    🎉 THANK YOU HERO! 🎉
    
    Dear ${donorName},
    
    ${impactMessage}
    
    Total Donations: ${totalDonations || 1}
    Lives Saved: ${(totalDonations || 1) * 3}
    
    Your Next Eligible Donation Date: ${nextEligibleDate}
    
    We look forward to seeing you again! Your continued donations make a huge difference.
    
    iBlood System
  `

  return sendEmail({ to, subject, html, text })
}

/**
 * Send post-donation blood work update email to donor
 */
export async function sendPostDonationHealthEmail(options) {
  const {
    to,
    donorName,
    subject,
    driveName,
    donationDate,
    nextEligibleDate,
    bloodWorkStatus = 'pending',
    bloodWorkFindings = '',
    recommendations = '',
    unitId = '',
  } = options

  const statusConfig = {
    eligible: {
      label: 'Eligible for Future Donation',
      color: '#15803d',
      icon: '✅',
    },
    temporarily_deferred: {
      label: 'Temporarily Deferred',
      color: '#b45309',
      icon: '⏸️',
    },
    ineligible: {
      label: 'Needs Follow-Up',
      color: '#b91c1c',
      icon: '⚠️',
    },
    pending: {
      label: 'Results Pending Review',
      color: '#6b7280',
      icon: '🧪',
    },
  }

  const status = statusConfig[bloodWorkStatus] || statusConfig.pending
  const safeSubject = subject || `Your Donation Health Update - ${driveName || 'iBlood'}`
  const safeFindings = bloodWorkFindings || 'No abnormal findings were recorded during this donation cycle.'
  const safeRecommendations = recommendations || 'Keep hydrated, maintain a healthy diet, and reach out to the donation center if you have concerns.'
  const safeDonationDate = donationDate ? new Date(donationDate).toLocaleDateString() : new Date().toLocaleDateString()

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background: #f9fafb; color: #111827; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #fff; padding: 32px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fff; padding: 28px; border-radius: 0 0 12px 12px; }
        .status { background: ${status.color}; color: #fff; display: inline-block; padding: 10px 16px; border-radius: 999px; font-weight: bold; margin: 10px 0 18px 0; }
        .card { background: #f3f4f6; border-radius: 10px; padding: 16px; margin: 14px 0; }
        .muted { color: #6b7280; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">🩸 Thank You, Hero</h1>
        <p style="margin: 10px 0 0 0;">Your donation helps save lives.</p>
      </div>
      <div class="content">
        <p>Dear ${donorName},</p>
        <p>Thank you for donating blood${driveName ? ` at <strong>${driveName}</strong>` : ''} on <strong>${safeDonationDate}</strong>.</p>

        <div class="status">${status.icon} ${status.label}</div>

        <div class="card">
          <p><strong>Blood Work Findings:</strong></p>
          <p>${safeFindings}</p>
        </div>

        <div class="card">
          <p><strong>Recommendations:</strong></p>
          <p>${safeRecommendations}</p>
        </div>

        ${nextEligibleDate ? `<p><strong>Next Eligible Donation Date:</strong> ${nextEligibleDate}</p>` : ''}
        ${unitId ? `<p class="muted">Reference Unit ID: ${unitId}</p>` : ''}

        <p style="margin-top: 20px;">Thank you again for being a hero in your community.</p>
        <p class="muted">This is an automated message from iBlood Blood Bank Management System.</p>
      </div>
    </body>
    </html>
  `

  const text = `
Thank you for your blood donation.

Donor: ${donorName}
Drive: ${driveName || 'iBlood Drive'}
Donation Date: ${safeDonationDate}
Status: ${status.label}

Blood Work Findings:
${safeFindings}

Recommendations:
${safeRecommendations}

${nextEligibleDate ? `Next Eligible Donation Date: ${nextEligibleDate}` : ''}
${unitId ? `Reference Unit ID: ${unitId}` : ''}
  `.trim()

  return sendEmail({ to, subject: safeSubject, html, text })
}

function escapeHtmlForEmail(value) {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDriveWhenLine(driveDate, driveTime) {
  if (!driveDate) return 'See drive details in the link below'
  const d = new Date(driveDate)
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return driveTime ? `${dateStr} · ${driveTime}` : dateStr
}

const OUTREACH_EMAIL_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background: #f9fafb; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 24px 16px 40px; }
  .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #fff; padding: 28px 22px; text-align: center; border-radius: 12px 12px 0 0; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
  .header p { margin: 10px 0 0; font-size: 14px; opacity: 0.95; }
  .content { background: #ffffff; padding: 26px 22px 28px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .greeting { font-size: 16px; margin: 0 0 16px; }
  .meta { background: #fef2f2; border-radius: 10px; padding: 16px 18px; margin: 18px 0; border-left: 4px solid #dc2626; }
  .meta-row { margin: 6px 0; font-size: 14px; }
  .meta-label { color: #991b1b; font-weight: 700; display: inline-block; min-width: 4.5rem; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; margin: 8px 0 14px; }
  .badge-ok { background: #dcfce7; color: #166534; }
  .badge-wait { background: #fef3c7; color: #92400e; }
  .badge-hold { background: #fee2e2; color: #7f1d1d; }
  .cta-wrap { text-align: center; margin: 22px 0 8px; }
  .cta { display: inline-block; background: #dc2626; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
  .secondary { text-align: center; margin: 18px 0 0; font-size: 14px; }
  .secondary a { color: #b91c1c; font-weight: 600; }
  ul.steps { margin: 12px 0 0; padding-left: 20px; color: #374151; font-size: 14px; }
  ul.steps li { margin: 8px 0; }
  .disclaimer { font-size: 12px; color: #6b7280; margin-top: 22px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px; }
`

/**
 * Eligible donor — rich HTML + plain text + compact SMS (SMS mirrors email facts, not duplicate salutation).
 * @param {object} options
 * @param {string} [options.rsvpSmsUrl] Short `/r/{code}` URL for SMS; email still uses full `rsvpUrl`.
 * @returns {{ subject: string, text: string, smsBody: string, html: string }}
 */
export function buildDriveActivationEligibleOutreachContent(options) {
  const {
    donorName,
    donorFirstName,
    driveName,
    driveDate,
    driveTime,
    location,
    city,
    registrationUrl,
    rsvpUrl,
    rsvpSmsUrl,
    whatsappGroupLink,
    organizationName,
  } = options

  const first = (donorFirstName || (donorName || '').split(' ')[0] || 'there').trim()
  const when = formatDriveWhenLine(driveDate, driveTime)
  const where = `${location || 'TBD'}${city ? `, ${city}` : ''}`
  const orgLine = organizationName ? ` with ${organizationName}` : ''
  const primaryLink = rsvpUrl || registrationUrl
  const smsTapLink = rsvpSmsUrl || primaryLink

  const subject = `You're eligible to donate — ${driveName}`

  const text = [
    `Hello ${first},`,
    '',
    `We're organizing a blood drive${orgLine}: "${driveName}".`,
    '',
    `When: ${when}`,
    `Where: ${where}`,
    '',
    rsvpUrl
      ? "You're already in our donor program — please confirm for this drive (no new registration needed):"
      : "You're eligible to donate now. Please reserve your spot:",
    primaryLink,
    ...(rsvpUrl && registrationUrl && registrationUrl !== rsvpUrl
      ? ['', `Share this public link with first-time donors: ${registrationUrl}`]
      : []),
    ...(whatsappGroupLink ? ['', `WhatsApp (updates): ${whatsappGroupLink}`] : []),
    '',
    'Every donation can save up to three lives. Thank you for answering the call.',
    '',
    '— iBlood Blood Bank Management',
  ]
    .filter((line) => line !== undefined && line !== null)
    .join('\n')

  const shortWhen = driveDate
    ? new Date(driveDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'soon'
  const driveTitle = (driveName || 'our blood drive').trim()
  let smsBody = [
    `Hi ${first},`,
    `You're eligible to donate at ${driveTitle} (${shortWhen}).`,
    `Tap to confirm your spot (no new signup): ${smsTapLink}`,
    '— iBlood',
  ].join(' ')
  if (whatsappGroupLink && smsBody.length + whatsappGroupLink.length + 12 < 1500) {
    smsBody = `${smsBody} Updates: ${whatsappGroupLink}`
  }
  smsBody = smsBody.slice(0, 1500)

  const ctaLabel = rsvpUrl ? 'Confirm for this drive' : 'Reserve my spot'
  const secondaryBlock =
    rsvpUrl && registrationUrl && registrationUrl !== rsvpUrl
      ? `<p class="secondary">Know someone new to donating? <a href="${escapeHtmlForEmail(registrationUrl)}">Public registration link</a></p>`
      : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlForEmail(subject)}</title>
  <style>${OUTREACH_EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Give blood. Save lives.</h1>
      <p>New drive — we need you in the chair if you're eligible.</p>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${escapeHtmlForEmail(first)}</strong>,</p>
      <span class="badge badge-ok">Eligible to donate now</span>
      <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
        We're organizing <strong>${escapeHtmlForEmail(driveName)}</strong>${organizationName ? ` with <strong>${escapeHtmlForEmail(organizationName)}</strong>` : ''}.
        Patients depend on donors like you — please take a minute to ${rsvpUrl ? 'confirm your spot' : 'reserve a slot'}.
      </p>
      <div class="meta">
        <div class="meta-row"><span class="meta-label">When</span> ${escapeHtmlForEmail(when)}</div>
        <div class="meta-row"><span class="meta-label">Where</span> ${escapeHtmlForEmail(where)}</div>
      </div>
      <div class="cta-wrap">
        <a class="cta" href="${escapeHtmlForEmail(primaryLink)}">${escapeHtmlForEmail(ctaLabel)}</a>
      </div>
      ${secondaryBlock}
      ${whatsappGroupLink ? `<p class="secondary">Updates &amp; reminders: <a href="${escapeHtmlForEmail(whatsappGroupLink)}">Join WhatsApp group</a></p>` : ''}
      <p class="disclaimer">
        Sent because your blood program just activated this drive. If you received this by mistake, contact your donation center.
      </p>
      <p class="footer">iBlood Blood Bank Management System</p>
    </div>
  </div>
</body>
</html>`

  return { subject, text, smsBody, html }
}

export async function sendDriveActivationEligibleOutreachEmail(options) {
  const { to } = options
  const { subject, text, html } = buildDriveActivationEligibleOutreachContent(options)
  return sendEmail({ to, subject, text, html })
}

/**
 * Supporter / not-yet-eligible — rich HTML + plain text.
 */
export function buildDriveActivationSupporterOutreachContent(options) {
  const {
    donorName,
    donorFirstName,
    driveName,
    driveDate,
    driveTime,
    location,
    city,
    registrationUrl,
    whatsappGroupLink,
    organizationName,
    supporterHeadline,
    supporterSubhead,
    supporterBullets = [],
    nextEligibleDisplay,
    medicalDisclaimer,
    reasonCode,
  } = options

  const first = (donorFirstName || (donorName || '').split(' ')[0] || 'there').trim()
  const when = formatDriveWhenLine(driveDate, driveTime)
  const where = `${location || 'TBD'}${city ? `, ${city}` : ''}`
  const orgLine = organizationName ? ` with ${organizationName}` : ''

  const subject = `You can still help — ${driveName}`

  const bulletsText = supporterBullets.map((b) => `• ${b}`).join('\n')
  const text = [
    `Hello ${first},`,
    '',
    supporterHeadline || 'We need your help even if you cannot donate yet.',
    '',
    supporterSubhead || '',
    '',
    nextEligibleDisplay ? `Next eligible whole-blood date on file: ${nextEligibleDisplay}` : '',
    '',
    `Drive: "${driveName}"${orgLine}`,
    `When: ${when}`,
    `Where: ${where}`,
    '',
    'How you can help right now:',
    bulletsText,
    '',
    'Registration link to share:',
    registrationUrl,
    ...(whatsappGroupLink ? ['', `WhatsApp: ${whatsappGroupLink}`] : []),
    '',
    medicalDisclaimer || '',
    '',
    '— iBlood Blood Bank Management',
  ]
    .filter((line) => line !== undefined && line !== null)
    .join('\n')

  const bulletsHtml = supporterBullets
    .map((b) => `<li>${escapeHtmlForEmail(b)}</li>`)
    .join('')

  const statusBadgeLabel =
    reasonCode === 'record_cancelled' ? 'Donor profile on hold' : 'Not eligible to donate yet'
  const statusBadgeClass = reasonCode === 'record_cancelled' ? 'badge-hold' : 'badge-wait'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlForEmail(subject)}</title>
  <style>${OUTREACH_EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Every hero wears a different cape</h1>
      <p>Not donating today? You can still fill this drive.</p>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${escapeHtmlForEmail(first)}</strong>,</p>
      <span class="badge ${statusBadgeClass}">${escapeHtmlForEmail(statusBadgeLabel)}</span>
      <h2 style="margin: 12px 0 10px; font-size: 18px; color: #991b1b;">${escapeHtmlForEmail(supporterHeadline || 'Help us without rolling up your sleeve')}</h2>
      <p style="margin: 0 0 14px; font-size: 15px; color: #374151;">${escapeHtmlForEmail(supporterSubhead || '')}</p>
      ${
        nextEligibleDisplay
          ? `<div class="meta"><div class="meta-row"><span class="meta-label">Status</span> Next eligible whole-blood date: <strong>${escapeHtmlForEmail(nextEligibleDisplay)}</strong></div><div class="meta-row" style="margin-top:10px;font-size:13px;color:#6b7280;">This date follows standard recovery spacing to protect donors and patients.</div></div>`
          : `<div class="meta"><div class="meta-row"><span class="meta-label">Status</span> Please review your donor record with the center before scheduling.</div></div>`
      }
      <p style="margin: 16px 0 8px; font-weight: 700; color: #111827;">Drive details</p>
      <div class="meta" style="border-left-color:#f59e0b;background:#fffbeb;">
        <div class="meta-row"><span class="meta-label">Drive</span> ${escapeHtmlForEmail(driveName)}${organizationName ? ` · ${escapeHtmlForEmail(organizationName)}` : ''}</div>
        <div class="meta-row"><span class="meta-label">When</span> ${escapeHtmlForEmail(when)}</div>
        <div class="meta-row"><span class="meta-label">Where</span> ${escapeHtmlForEmail(where)}</div>
      </div>
      <p style="margin: 18px 0 6px; font-weight: 700; color: #111827;">How you can help today</p>
      <ul class="steps">${bulletsHtml}</ul>
      <div class="cta-wrap">
        <a class="cta" href="${escapeHtmlForEmail(registrationUrl)}">Copy &amp; share registration link</a>
      </div>
      ${whatsappGroupLink ? `<p class="secondary">Share the WhatsApp group: <a href="${escapeHtmlForEmail(whatsappGroupLink)}">Open group link</a></p>` : ''}
      <p class="disclaimer">${escapeHtmlForEmail(medicalDisclaimer || '')}</p>
      <p class="footer">iBlood Blood Bank Management System</p>
    </div>
  </div>
</body>
</html>`

  return { subject, text, html }
}

export async function sendDriveActivationSupporterOutreachEmail(options) {
  const { to } = options
  const { subject, text, html } = buildDriveActivationSupporterOutreachContent(options)
  return sendEmail({ to, subject, text, html })
}

/**
 * Short SMS for not-yet-eligible donors (share link + reason in one line).
 */
export function buildDriveActivationSupporterSmsBody(options) {
  const {
    donorFirstName,
    driveName,
    registrationUrl,
    whatsappGroupLink,
    nextEligibleDisplay,
    reasonCode,
  } = options

  const first = (donorFirstName || 'Friend').trim()
  let reason = 'Not eligible to donate yet'
  if (reasonCode === 'record_cancelled') reason = 'Donor profile on hold'
  if (nextEligibleDisplay) reason = `Next eligible ${nextEligibleDisplay}`

  const parts = [
    `${first}, we need help filling "${driveName}". ${reason} — please share: ${registrationUrl}`,
  ]
  if (whatsappGroupLink) parts.push(`WA: ${whatsappGroupLink}`)
  parts.push('— iBlood')
  return parts.join(' ').slice(0, 1500)
}

/**
 * Welcome email when staff creates a donor from the quick-add flow (real email required).
 */
export async function sendDonorAdminQuickWelcomeEmail(options) {
  const { to, donorName, donorToken, organizationName } = options
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const profileUrl = `${appUrl}/donor/${donorToken}`
  const subject = `You're on our donor list${organizationName ? ` — ${organizationName}` : ''}`
  const text = `
Hi ${donorName},

Your details were added to our blood donor records${organizationName ? ` at ${organizationName}` : ''}.

View or update your donor profile any time:
${profileUrl}

Thank you for supporting patients in need.
— iBlood
  `.trim()
  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
    <p>Dear ${donorName},</p>
    <p>Your details were added to our blood donor records${organizationName ? ` at <strong>${organizationName}</strong>` : ''}.</p>
    <p><a href="${profileUrl}">Open your donor profile</a></p>
    <p style="color:#6b7280;font-size:12px;">— iBlood</p>
    </body></html>`
  return sendEmail({ to, subject, text, html })
}
