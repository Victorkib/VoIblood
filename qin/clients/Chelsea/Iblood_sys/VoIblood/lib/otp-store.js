/**
 * Shared OTP Store
 * In-memory OTP storage (use Redis/Database in production)
 * 
 * This is shared between send and verify endpoints
 */

// In-memory OTP store
const otpStore = new Map()

/**
 * Store OTP
 * @param {string} key - Phone or email
 * @param {Object} data - OTP data
 */
export function setOTP(key, data) {
  otpStore.set(key, {
    ...data,
    createdAt: Date.now(),
  })
  console.log('[OTP Store] Stored OTP for:', key)
}

/**
 * Get OTP
 * @param {string} key - Phone or email
 * @returns {Object|undefined} OTP data
 */
export function getOTP(key) {
  const otpData = otpStore.get(key)
  
  // Check if OTP exists and hasn't expired
  if (!otpData) {
    return undefined
  }
  
  // Check expiry (5 minutes)
  if (Date.now() > otpData.expiresAt) {
    console.log('[OTP Store] OTP expired for:', key)
    otpStore.delete(key)
    return undefined
  }
  
  return otpData
}

/**
 * Delete OTP
 * @param {string} key - Phone or email
 */
export function deleteOTP(key) {
  console.log('[OTP Store] Deleting OTP for:', key)
  otpStore.delete(key)
}

/**
 * Clear all OTPs (for testing)
 */
export function clearAll() {
  otpStore.clear()
}

/**
 * Debug function to list all stored OTPs
 */
export function listAllOTPs() {
  const now = Date.now()
  const otps = Array.from(otpStore.entries()).map(([key, data]) => ({
    key,
    otp: data.otp,
    expiresAt: new Date(data.expiresAt),
    expired: now > data.expiresAt,
    timeLeft: Math.max(0, data.expiresAt - now)
  }))
  return otps
}

export default otpStore
