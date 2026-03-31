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
