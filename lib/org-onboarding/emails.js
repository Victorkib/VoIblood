import { sendEmail } from '@/lib/email-service'

/**
 * Welcome email when platform creates org + first admin.
 */
export async function sendOrgAdminWelcomeEmail(options) {
  const {
    to,
    fullName,
    organizationName,
    organizationType = 'blood_bank',
    setupUrl,
    loginUrl,
  } = options

  const typeLabel = String(organizationType).replace(/_/g, ' ')
  const subject = `Welcome to iBlood — activate your ${organizationName} admin account`

  const credentialBlock = setupUrl
    ? `
      <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1e40af;">One step to get started</p>
        <p style="margin:0;color:#374151;">Use the button below to set your password. Your email is already on file — you only choose a password, then you are in.</p>
        <p style="text-align:center;margin:20px 0 0;">
          <a href="${setupUrl}" style="display:inline-block;padding:14px 28px;background:#dc2626;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">Activate account &amp; set password</a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">This link expires in 7 days. If it stops working, ask your platform administrator to resend access.</p>
      </div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #0f172a; }
    .hero { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #fff; padding: 36px 28px; border-radius: 16px 16px 0 0; text-align: center; }
    .body { background: #fff; padding: 28px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(15,23,42,0.08); }
    .btn { display: inline-block; padding: 14px 28px; background: #dc2626; color: #fff !important; text-decoration: none; border-radius: 10px; font-weight: 700; margin-top: 8px; }
    .meta { background: #f1f5f9; border-radius: 10px; padding: 16px; margin: 16px 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="hero">
    <h1 style="margin:0;font-size:24px;">Your organization is live</h1>
    <p style="margin:10px 0 0;opacity:0.9;">iBlood — Kenya blood donation platform</p>
  </div>
  <div class="body">
    <p>Dear ${fullName},</p>
    <p><strong>${organizationName}</strong> (${typeLabel}) has been set up on iBlood. You are the organization administrator.</p>
    <div class="meta">
      <p style="margin:0;"><strong>What you can do:</strong></p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#334155;">
        <li>Manage donation drives and donors</li>
        <li>Track blood inventory</li>
        <li>Invite your team</li>
        ${organizationType === 'hospital' ? '<li>Configure Gratitude Points partner benefits (after enrollment)</li>' : ''}
      </ul>
    </div>
    ${credentialBlock}
    ${setupUrl ? '' : `<p style="text-align:center;margin-top:28px;"><a href="${loginUrl}" class="btn">Sign in to your dashboard</a></p>`}
    <p class="footer">Need help? Contact your platform administrator.<br/>iBlood — not payment for blood donation.</p>
  </div>
</body>
</html>`

  const text = `
Dear ${fullName},

${organizationName} is ready on iBlood. You are the organization admin.

${setupUrl ? `Activate your account: ${setupUrl}` : `Sign in: ${loginUrl}`}

iBlood System
`.trim()

  return sendEmail({ to, subject, html, text })
}

/**
 * Donor drive registration — profile link (no dashboard login).
 */
export async function sendDonorDriveRegistrationEmail(options) {
  const { to, donorName, driveName, profileUrl, organizationName } = options
  const subject = `You're registered — ${driveName || 'Blood donation drive'}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fef2f2;">
  <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #fecaca;">
    <h1 style="color:#b91c1c;margin:0 0 12px;font-size:22px;">Thank you for registering</h1>
    <p style="color:#374151;line-height:1.6;">Dear ${donorName},</p>
    <p style="color:#374151;line-height:1.6;">You're registered for <strong>${driveName || 'our blood drive'}</strong>${organizationName ? ` with ${organizationName}` : ''}.</p>
    <p style="color:#374151;line-height:1.6;">Bookmark your personal donor page — no password needed. After you donate, you can view thank-you <strong>Gratitude Points</strong> and partner hospitals here:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${profileUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Open my donor profile</a>
    </p>
    <p style="font-size:12px;color:#6b7280;">Gratitude Points are community thank-you benefits in Kenya. Not payment for blood. No cash value.</p>
  </div>
</body>
</html>`
  const text = `Dear ${donorName},\n\nYou're registered for ${driveName || 'a blood drive'}.\n\nYour donor profile: ${profileUrl}\n\niBlood`
  return sendEmail({ to, subject, html, text })
}
