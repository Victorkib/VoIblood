/**
 * Twilio SMS Service
 * Primary OTP delivery method
 * 
 * Setup:
 * 1. Sign up at https://www.twilio.com/try-twilio
 * 2. Get credentials from dashboard
 * 3. Add to .env.local:
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_PHONE_NUMBER
 */

import twilio from 'twilio'

// Initialize Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }

  return twilio(accountSid, authToken)
}

/**
 * Send SMS via Twilio
 * @param {string} phone - Phone number (with country code)
 * @param {string} message - SMS message
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendSMS(phone, message) {
  try {
    // Validate phone number format
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

    return {
      success: true,
      messageId: result.sid,
    }
  } catch (error) {
    console.error('[Twilio] SMS error:', error.message)

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

    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Format phone number for Twilio
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number with country code
 */
function formatPhoneNumber(phone) {
  if (!phone) return '+10000000000' // Default for testing
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  console.log('[Twilio] Original phone:', phone, 'Cleaned:', cleaned)
  
  // If already has country code, use it
  if (cleaned.startsWith('+')) {
    console.log('[Twilio] Formatted phone (international):', cleaned)
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
  
  console.log('[Twilio] Formatted phone:', cleaned)
  
  return cleaned
}

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendOTPViaSMS(phone, otp) {
  const message = `Your blood donation OTP is: ${otp}\n\nValid for 5 minutes.\n\nThank you for registering to donate blood!`

  return await sendSMS(phone, message)
}

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
    accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not configured',
  }
}
