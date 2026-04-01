/**
 * Rate Limiting Utility
 * Prevents abuse of OTP endpoints
 * Uses in-memory storage with automatic cleanup
 */

// In-memory rate limit store
const rateLimitStore = new Map()

/**
 * Check and update rate limit
 * @param {string} key - Unique identifier (phone, email, or IP)
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Get or create request history for this key
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [])
  }
  
  const requests = rateLimitStore.get(key)
  
  // Remove old requests outside the window
  const validRequests = requests.filter(time => time > windowStart)
  
  // Check if rate limit exceeded
  if (validRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...validRequests)
    const resetAt = oldestRequest + windowMs
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    }
  }
  
  // Add current request
  validRequests.push(now)
  rateLimitStore.set(key, validRequests)
  
  const resetAt = now + windowMs
  
  return {
    allowed: true,
    remaining: maxRequests - validRequests.length,
    resetAt,
    retryAfter: 0,
  }
}

/**
 * Get current rate limit status without incrementing
 * @param {string} key - Unique identifier
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - { remaining: number, resetAt: number }
 */
export function getRateLimitStatus(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitStore.has(key)) {
    return {
      remaining: maxRequests,
      resetAt: now + windowMs,
    }
  }
  
  const requests = rateLimitStore.get(key)
  const validRequests = requests.filter(time => time > windowStart)
  
  return {
    remaining: Math.max(0, maxRequests - validRequests.length),
    resetAt: now + windowMs,
  }
}

/**
 * Reset rate limit for a specific key
 * @param {string} key - Unique identifier
 */
export function resetRateLimit(key) {
  rateLimitStore.delete(key)
}

/**
 * Cleanup old entries from rate limit store
 * Run periodically to prevent memory leaks
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  const maxAge = 3600000 // 1 hour
  
  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(time => time > now - maxAge)
    
    if (validRequests.length === 0) {
      rateLimitStore.delete(key)
    } else {
      rateLimitStore.set(key, validRequests)
    }
  }
}

// Auto-cleanup every 15 minutes
if (typeof global !== 'undefined' && !global.rateLimitCleanupInterval) {
  global.rateLimitCleanupInterval = setInterval(cleanupRateLimitStore, 15 * 60 * 1000)
}

export default {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  cleanupRateLimitStore,
}
