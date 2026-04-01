/**
 * Auth Rate Limiter
 * Prevents brute force attacks on authentication endpoints
 * 
 * Usage:
 * import { checkAuthRateLimit } from '@/lib/auth-rate-limiter'
 * 
 * const rateLimit = checkAuthRateLimit(identifier, limit, windowMs)
 * if (!rateLimit.allowed) {
 *   return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
 * }
 */

const authRateLimits = new Map()

/**
 * Check rate limit for authentication attempts
 * @param {string} identifier - Email, IP, or other identifier
 * @param {number} limit - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - { allowed, remaining, resetAt, retryAfter }
 */
export function checkAuthRateLimit(identifier, limit = 5, windowMs = 600000) {
  const now = Date.now()
  const key = `auth:${identifier.toLowerCase().trim()}`
  
  if (!authRateLimits.has(key)) {
    authRateLimits.set(key, [])
  }
  
  const attempts = authRateLimits.get(key).filter(time => time > now - windowMs)
  
  if (attempts.length >= limit) {
    const oldestAttempt = Math.min(...attempts)
    const resetAt = oldestAttempt + windowMs
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    }
  }
  
  // Add current attempt
  attempts.push(now)
  authRateLimits.set(key, attempts)
  
  const resetAt = now + windowMs
  
  return {
    allowed: true,
    remaining: limit - attempts.length,
    resetAt,
    retryAfter: 0,
  }
}

/**
 * Get current rate limit status without incrementing
 * @param {string} identifier - Email, IP, or other identifier
 * @param {number} limit - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - { remaining, resetAt }
 */
export function getAuthRateLimitStatus(identifier, limit = 5, windowMs = 600000) {
  const now = Date.now()
  const key = `auth:${identifier.toLowerCase().trim()}`
  
  if (!authRateLimits.has(key)) {
    return {
      remaining: limit,
      resetAt: now + windowMs,
    }
  }
  
  const attempts = authRateLimits.get(key).filter(time => time > now - windowMs)
  
  return {
    remaining: Math.max(0, limit - attempts.length),
    resetAt: now + windowMs,
  }
}

/**
 * Reset rate limit for a specific identifier
 * @param {string} identifier - Email, IP, or other identifier
 */
export function resetAuthRateLimit(identifier) {
  const key = `auth:${identifier.toLowerCase().trim()}`
  authRateLimits.delete(key)
}

/**
 * Cleanup old entries from rate limit store
 * Run periodically to prevent memory leaks
 */
export function cleanupAuthRateLimits() {
  const now = Date.now()
  const maxAge = 3600000 // 1 hour
  
  for (const [key, attempts] of authRateLimits.entries()) {
    const validAttempts = attempts.filter(time => time > now - maxAge)
    
    if (validAttempts.length === 0) {
      authRateLimits.delete(key)
    } else {
      authRateLimits.set(key, validAttempts)
    }
  }
}

// Auto-cleanup every 15 minutes
if (typeof global !== 'undefined' && !global.authRateLimitCleanupInterval) {
  global.authRateLimitCleanupInterval = setInterval(cleanupAuthRateLimits, 15 * 60 * 1000)
}

export default {
  checkAuthRateLimit,
  getAuthRateLimitStatus,
  resetAuthRateLimit,
  cleanupAuthRateLimits,
}
