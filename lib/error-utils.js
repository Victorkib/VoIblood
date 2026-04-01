/**
 * Error handling utilities
 * Centralized error handling, logging, and reporting
 */

export class AppError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = options.name || 'AppError'
    this.statusCode = options.statusCode || 500
    this.code = options.code || 'INTERNAL_ERROR'
    this.context = options.context || {}
    this.userMessage = options.userMessage || 'An unexpected error occurred'
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Report error to backend and monitoring
 */
export async function reportError(error, context = {}) {
  const errorData = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    ...context,
  }

  try {
    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    })
  } catch (err) {
    console.error('Failed to report error:', err)
  }
}

/**
 * Handle API error responses
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status
    const data = error.response.data

    switch (status) {
      case 400:
        return {
          message: data?.error || 'Invalid request',
          code: 'BAD_REQUEST',
          userMessage: 'Please check your input and try again',
        }
      case 401:
        return {
          message: data?.error || 'Unauthorized',
          code: 'UNAUTHORIZED',
          userMessage: 'Your session has expired. Please login again.',
        }
      case 403:
        return {
          message: data?.error || 'Forbidden',
          code: 'FORBIDDEN',
          userMessage: 'You do not have permission to perform this action',
        }
      case 404:
        return {
          message: data?.error || 'Not found',
          code: 'NOT_FOUND',
          userMessage: 'The resource you requested was not found',
        }
      case 409:
        return {
          message: data?.error || 'Conflict',
          code: 'CONFLICT',
          userMessage: 'This resource already exists',
        }
      case 429:
        return {
          message: data?.error || 'Too many requests',
          code: 'RATE_LIMIT',
          userMessage: 'You are making too many requests. Please try again later.',
        }
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: data?.error || 'Server error',
          code: 'SERVER_ERROR',
          userMessage: 'The server encountered an error. Please try again later.',
        }
      default:
        return {
          message: data?.error || defaultMessage,
          code: 'UNKNOWN_ERROR',
          userMessage: defaultMessage,
        }
    }
  } else if (error.request) {
    // Request was made but no response
    return {
      message: 'No response from server',
      code: 'NO_RESPONSE',
      userMessage: 'Cannot reach the server. Please check your internet connection.',
    }
  } else {
    // Error in request setup
    return {
      message: error.message || defaultMessage,
      code: 'REQUEST_ERROR',
      userMessage: defaultMessage,
    }
  }
}

/**
 * Validate required fields in object
 */
export function validateRequired(obj, fields) {
  const errors = {}
  
  fields.forEach((field) => {
    if (!obj[field] || (typeof obj[field] === 'string' && !obj[field].trim())) {
      errors[field] = `${field} is required`
    }
  })
  
  return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .slice(0, 1000) // Limit length
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  options = {}
) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options

  let lastError
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on certain errors
      if (error.statusCode === 401 || error.statusCode === 403) {
        throw error
      }
      
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * backoffMultiplier, maxDelay)
      }
    }
  }

  throw lastError
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyMessage(error) {
  if (typeof error === 'string') return error
  if (error?.userMessage) return error.userMessage
  if (error?.message) return error.message
  return 'An unexpected error occurred'
}
