/**
 * SMS Service - Multi-Provider Fallback
 * 
 * Primary: Twilio
 * Backup: Africa's Talking
 * 
 * Setup Africa's Talking:
 * 1. Sign up at https://account.africastalking.com/
 * 2. Get API Key from dashboard
 * 3. Add to .env.local:
 *    - AFRICASTALKING_API_KEY
 *    - AFRICASTALKING_USERNAME
 *    - AFRICASTALKING_SENDER_ID
 * 
 * Metrics Tracking:
 * - All SMS attempts are tracked in-memory
 * - Viewable at /dashboard/sms-metrics (super_admin & org_admin only)
 */

import africastalking from 'africastalking'

// ============================================
// SMS METRICS TRACKING
// ============================================

const smsMetrics = {
  attempts: [],
  stats: {
    twilio: { success: 0, failure: 0, lastAttempt: null, lastError: null },
    africastalking: { success: 0, failure: 0, lastAttempt: null, lastError: null },
    total: { success: 0, failure: 0 }
  }
}

/**
 * Track SMS attempt for metrics
 */
function trackSMS(provider, success, details = {}) {
  const attempt = {
    id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    provider,
    success,
    phone: details.phone || 'unknown',
    timestamp: new Date().toISOString(),
    error: details.error || null,
    messageId: details.messageId || null,
    responseTime: details.responseTime || 0
  }

  // Store attempt (keep last 1000)
  smsMetrics.attempts.unshift(attempt)
  if (smsMetrics.attempts.length > 1000) {
    smsMetrics.attempts = smsMetrics.attempts.slice(0, 1000)
  }

  // Update stats
  if (smsMetrics.stats[provider]) {
    if (success) {
      smsMetrics.stats[provider].success++
    } else {
      smsMetrics.stats[provider].failure++
      smsMetrics.stats[provider].lastError = details.error || 'Unknown error'
    }
    smsMetrics.stats[provider].lastAttempt = new Date().toISOString()
  }

  // Update total stats
  if (success) {
    smsMetrics.stats.total.success++
  } else {
    smsMetrics.stats.total.failure++
  }
}

/**
 * Get SMS metrics and statistics
 */
export function getSMSMetrics() {
  return {
    stats: smsMetrics.stats,
    recentAttempts: smsMetrics.attempts.slice(0, 100), // Last 100 attempts
    providers: {
      twilio: isTwilioConfigured(),
      africastalking: isAfricasTalkingConfigured()
    }
  }
}

/**
 * Reset SMS metrics (for testing or admin action)
 */
export function resetSMSMetrics() {
  smsMetrics.attempts = []
  smsMetrics.stats = {
    twilio: { success: 0, failure: 0, lastAttempt: null, lastError: null },
    africastalking: { success: 0, failure: 0, lastAttempt: null, lastError: null },
    total: { success: 0, failure: 0 }
  }
}

// ============================================
// AFRICA'S TALKING SMS SERVICE
// ============================================

/**
 * Initialize Africa's Talking client
 */
function getAfricasTalkingClient() {
  const apiKey = process.env.AFRICASTALKING_API_KEY
  const username = process.env.AFRICASTALKING_USERNAME

  if (!apiKey || !username) {
    throw new Error('Africa\'s Talking credentials not configured')
  }

  return africastalking({
    apiKey,
    username
  })
}

/**
 * Send SMS via Africa's Talking
 * @param {string} phone - Phone number (with country code)
 * @param {string} message - SMS message
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
export async function sendSMSViaAfricasTalking(phone, message) {
  const startTime = Date.now()

  try {
    const formattedPhone = formatPhoneNumber(phone)

    console.log('[Africa\'s Talking] Sending SMS to:', formattedPhone)

    if (!process.env.AFRICASTALKING_API_KEY || !process.env.AFRICASTALKING_USERNAME) {
      throw new Error('Africa\'s Talking credentials not configured')
    }

    if (!process.env.AFRICASTALKING_SENDER_ID) {
      throw new Error('Africa\'s Talking sender ID not configured. Please add AFRICASTALKING_SENDER_ID to .env.local')
    }

    const at = getAfricasTalkingClient()
    const sms = at.SMS

    const result = await sms.send({
      to: formattedPhone,
      message: message,
      from: process.env.AFRICASTALKING_SENDER_ID
    })

    console.log('[Africa\'s Talking] SMS sent successfully:', result)

    // Check if the response indicates success
    const isSuccess = result.SMSMessageData && 
                     result.SMSMessageData.Recipients && 
                     result.SMSMessageData.Recipients[0] && 
                     result.SMSMessageData.Recipients[0].status === 'Success'

    if (isSuccess) {
      const messageId = result.SMSMessageData.Recipients[0].messageId
      const responseTime = Date.now() - startTime

      trackSMS('africastalking', true, {
        phone: formattedPhone,
        messageId,
        responseTime
      })

      return {
        success: true,
        messageId: messageId,
        provider: 'africastalking'
      }
    } else {
      const errorReason = result.SMSMessageData.Recipients[0]?.reason || 'Unknown error'
      throw new Error(errorReason)
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error.message || 'Failed to send SMS via Africa\'s Talking'

    console.error('[Africa\'s Talking] SMS error:', errorMessage)

    trackSMS('africastalking', false, {
      phone: phone,
      error: errorMessage,
      responseTime
    })

    return {
      success: false,
      error: errorMessage,
      provider: 'africastalking'
    }
  }
}

/**
 * Check if Africa's Talking is configured
 * @returns {boolean}
 */
export function isAfricasTalkingConfigured() {
  return !!(
    process.env.AFRICASTALKING_API_KEY &&
    process.env.AFRICASTALKING_USERNAME &&
    process.env.AFRICASTALKING_SENDER_ID
  )
}

/**
 * Get Africa's Talking configuration status
 * @returns {object}
 */
export function getAfricasTalkingStatus() {
  return {
    configured: isAfricasTalkingConfigured(),
    senderId: process.env.AFRICASTALKING_SENDER_ID || 'Not configured',
    username: process.env.AFRICASTALKING_USERNAME || 'Not configured',
    apiKey: process.env.AFRICASTALKING_API_KEY ? 'Configured' : 'Not configured'
  }
}

// ============================================
// TWILIO SMS SERVICE (Existing)
// ============================================

// Initialize Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }

  const twilio = require('twilio')
  return twilio(accountSid, authToken)
}

/**
 * Send SMS via Twilio
 * @param {string} phone - Phone number (with country code)
 * @param {string} message - SMS message
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
export async function sendSMSTwilio(phone, message) {
  const startTime = Date.now()

  try {
    const formattedPhone = formatPhoneNumber(phone)

    console.log('[Twilio] Sending SMS to:', formattedPhone)

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured')
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio phone number not configured. Please add TWILIO_PHONE_NUMBER to .env.local')
    }

    const twilio = require('twilio')
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    })

    console.log('[Twilio] SMS sent successfully:', result.sid)

    const responseTime = Date.now() - startTime

    trackSMS('twilio', true, {
      phone: formattedPhone,
      messageId: result.sid,
      responseTime
    })

    return {
      success: true,
      messageId: result.sid,
      provider: 'twilio'
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error.message || 'Failed to send SMS via Twilio'

    console.error('[Twilio] SMS error:', errorMessage)

    // Check for specific Twilio errors
    if (error.code === 21219 || error.message.includes('not a Twilio phone number')) {
      console.error('[Twilio] CONFIGURATION ERROR: The TWILIO_PHONE_NUMBER is not a valid Twilio number.')
      console.error('[Twilio] SOLUTION: You need to purchase a Twilio phone number or use a trial number.')
      console.error('[Twilio] Go to: https://console.twilio.com/us1/develop/phone-numbers/trial')
    }

    if (error.code === 21608 || error.message.includes('country mismatch')) {
      console.error('[Twilio] CONFIGURATION ERROR: Twilio trial numbers can only send to verified numbers.')
      console.error('[Twilio] SOLUTION: Verify the recipient number in Twilio console or upgrade to paid plan.')
      console.error('[Twilio] Go to: https://console.twilio.com/us1/verify')
    }

    trackSMS('twilio', false, {
      phone: phone,
      error: errorMessage,
      responseTime
    })

    return {
      success: false,
      error: errorMessage,
      provider: 'twilio'
    }
  }
}

// ============================================
// UNIFIED SMS INTERFACE (Fallback Chain)
// ============================================

/**
 * Send SMS with automatic fallback from Twilio → Africa's Talking
 * @param {string} phone - Phone number (with country code)
 * @param {string} message - SMS message
 * @returns {Promise<{success: boolean, error?: string, provider?: string, messageId?: string}>}
 */
export async function sendSMS(phone, message) {
  // Check if SMS is globally enabled
  if (process.env.SMS_ENABLED === 'false') {
    console.log('[SMS] SMS is globally disabled, skipping')
    return {
      success: false,
      error: 'SMS is globally disabled'
    }
  }

  // Try Twilio first
  if (isTwilioConfigured()) {
    console.log('[SMS] Attempting Twilio (primary provider)')
    const twilioResult = await sendSMSTwilio(phone, message)

    if (twilioResult.success) {
      return twilioResult
    }

    console.log('[SMS] Twilio failed, falling back to Africa\'s Talking:', twilioResult.error)
  }

  // Try Africa's Talking as backup
  if (isAfricasTalkingConfigured()) {
    console.log('[SMS] Attempting Africa\'s Talking (backup provider)')
    const atResult = await sendSMSViaAfricasTalking(phone, message)

    if (atResult.success) {
      return atResult
    }

    console.log('[SMS] Africa\'s Talking also failed:', atResult.error)
  }

  // Both providers failed or not configured
  if (!isTwilioConfigured() && !isAfricasTalkingConfigured()) {
    return {
      success: false,
      error: 'No SMS providers configured (Twilio and Africa\'s Talking)'
    }
  }

  return {
    success: false,
    error: 'All SMS providers failed'
  }
}

/**
 * Send OTP via SMS with fallback chain
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, error?: string, provider?: string}>}
 */
export async function sendOTPViaSMS(phone, otp) {
  const message = `Your blood donation OTP is: ${otp}\n\nValid for 5 minutes.\n\nThank you for registering to donate blood!`

  return await sendSMS(phone, message)
}

/**
 * Send arbitrary SMS message with fallback chain (NOT OTP-related)
 * @param {string} phone - Phone number
 * @param {string} message - Custom message
 * @returns {Promise<{success: boolean, error?: string, provider?: string}>}
 */
export async function sendStatusSMS(phone, message) {
  return await sendSMS(phone, message)
}

// ============================================
// PHONE FORMATTING UTILITY
// ============================================

/**
 * Format phone number for SMS providers
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number with country code
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '+10000000000' // Default for testing

  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  console.log('[SMS] Original phone:', phone, 'Cleaned:', cleaned)

  // If already has country code, use it
  if (cleaned.startsWith('+')) {
    console.log('[SMS] Formatted phone (international):', cleaned)
    return cleaned
  }

  // Remove leading 0 if present (common in many countries)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1)
  }

  // Detect country based on phone number length and pattern
  // Kenyan numbers: 9 digits after removing 0, start with 7, 1, or 2
  if (cleaned.length === 9 && /^[712]/.test(cleaned)) {
    // Kenya: +254
    cleaned = '+254' + cleaned
  }
  // US/Canada: 10 digits
  else if (cleaned.length === 10) {
    cleaned = '+1' + cleaned
  }
  // US with leading 1: 11 digits
  else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = '+' + cleaned
  }
  // UK: 10-11 digits after removing 0
  else if (cleaned.length >= 10 && cleaned.length <= 11) {
    cleaned = '+44' + cleaned
  }
  // Default fallback for testing
  else if (cleaned.length === 7) {
    // Local 7-digit number (for testing)
    cleaned = '+1000' + cleaned
  } else if (cleaned.length < 9) {
    // Too short, add +1 and pad for testing
    cleaned = '+1000000' + cleaned
  }
  // If it's already a valid international number format, leave it
  else {
    // Assume it's already correct, just add +
    cleaned = '+' + cleaned
  }

  console.log('[SMS] Formatted phone:', cleaned)

  return cleaned
}

// ============================================
// CONFIGURATION STATUS
// ============================================

/**
 * Check if Twilio is configured
 * @returns {boolean}
 */
export function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}

/**
 * Get Twilio configuration status
 * @returns {object}
 */
export function getTwilioStatus() {
  return {
    configured: isTwilioConfigured(),
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
    accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not configured'
  }
}

/**
 * Get overall SMS service status
 * @returns {object}
 */
export function getSMSStatus() {
  return {
    smsEnabled: process.env.SMS_ENABLED !== 'false',
    twilio: getTwilioStatus(),
    africastalking: getAfricasTalkingStatus()
  }
}
