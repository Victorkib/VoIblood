/**
 * Rate Limiter
 * Simple in-memory rate limiting for API routes
 * Tracks requests per user/IP and enforces rate limits
 */

const requestMap = new Map()

/**
 * Rate limit configuration by endpoint
 */
export const RATE_LIMITS = {
  default: { limit: 100, window: 60 * 1000 }, // 100 requests per minute
  auth: { limit: 5, window: 60 * 1000 }, // 5 auth attempts per minute
  create: { limit: 30, window: 60 * 1000 }, // 30 creates per minute
  update: { limit: 50, window: 60 * 1000 }, // 50 updates per minute
  delete: { limit: 20, window: 60 * 1000 }, // 20 deletes per minute
  report: { limit: 10, window: 60 * 1000 }, // 10 error reports per minute
}

/**
 * Check if a request should be rate limited
 * @param {string} identifier - User ID or IP address
 * @param {string} endpoint - Endpoint type (default, auth, create, etc)
 * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(identifier, endpoint = 'default') {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default
  const key = `${identifier}:${endpoint}`
  const now = Date.now()

  let record = requestMap.get(key)

  // Initialize or reset if window expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.window,
    }
  }

  record.count++
  requestMap.set(key, record)

  const allowed = record.count <= config.limit
  const remaining = Math.max(0, config.limit - record.count)
  const resetTime = record.resetTime

  return {
    allowed,
    remaining,
    resetTime,
    limit: config.limit,
  }
}

/**
 * Middleware for Express/Next.js API routes
 * Use in API route handlers to enforce rate limiting
 * @param {Request} req - HTTP request
 * @param {string} endpoint - Endpoint type
 * @returns {object} { allowed: boolean, ...rateLimitInfo }
 */
export function getRateLimitInfo(req, endpoint = 'default') {
  const identifier = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown'
  return checkRateLimit(identifier, endpoint)
}

/**
 * Create error response for rate limited requests
 * @param {object} rateLimitInfo - Result from checkRateLimit
 * @returns {object} JSON error response
 */
export function createRateLimitError(rateLimitInfo) {
  return {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000),
    limit: rateLimitInfo.limit,
    remaining: rateLimitInfo.remaining,
  }
}

/**
 * Clean up old entries to prevent memory leak
 * Call this periodically (e.g., every 10 minutes)
 */
export function cleanupRateLimitMap() {
  const now = Date.now()
  let removed = 0

  for (const [key, record] of requestMap.entries()) {
    if (now > record.resetTime + 60000) { // Keep records for 1 minute after reset
      requestMap.delete(key)
      removed++
    }
  }

  if (removed > 0) {
    console.log(`[v0] Rate limiter: cleaned up ${removed} old entries`)
  }
}

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitMap, 10 * 60 * 1000)
}
