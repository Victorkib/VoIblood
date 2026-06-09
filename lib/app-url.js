/**
 * Resolve the public app base URL for links (registration, RSVP, emails).
 * Prefers NEXT_PUBLIC_APP_URL; falls back to deploy host headers when env is localhost.
 */

function stripTrailingSlash(url) {
  return String(url || '').replace(/\/$/, '')
}

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1/i.test(url)
}

function envAppUrl() {
  const direct = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL
  if (direct) return stripTrailingSlash(direct)

  if (process.env.URL) {
    return stripTrailingSlash(process.env.URL)
  }

  if (process.env.VERCEL_URL) {
    return stripTrailingSlash(`https://${process.env.VERCEL_URL}`)
  }

  return ''
}

function resolveUrlFromRequest(request) {
  if (!request?.headers) return ''

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host')

  if (!host) return ''

  const proto =
    request.headers.get('x-forwarded-proto') ||
    (isLocalhostUrl(host) ? 'http' : 'https')

  return stripTrailingSlash(`${proto}://${host}`)
}

/**
 * @param {import('next/server').NextRequest | Request | null} [request]
 */
export function getAppUrl(request = null) {
  const fromEnv = envAppUrl()

  if (fromEnv && !isLocalhostUrl(fromEnv)) {
    return fromEnv
  }

  const fromRequest = resolveUrlFromRequest(request)
  if (fromRequest && !isLocalhostUrl(fromRequest)) {
    return fromRequest
  }

  if (fromEnv) return fromEnv
  if (fromRequest) return fromRequest

  return 'http://localhost:3000'
}

/**
 * @param {string | null | undefined} registrationToken
 * @param {import('next/server').NextRequest | Request | null} [request]
 */
export function buildRegistrationUrl(registrationToken, request = null) {
  if (!registrationToken) return ''
  return `${getAppUrl(request)}/register/${registrationToken}`
}

/**
 * Always derive the live registration URL from token + current app URL.
 * @param {{ registrationToken?: string, registrationUrl?: string } | null | undefined} drive
 * @param {import('next/server').NextRequest | Request | null} [request]
 */
export function resolveRegistrationUrl(drive, request = null) {
  if (!drive) return ''
  if (drive.registrationToken) {
    return buildRegistrationUrl(drive.registrationToken, request)
  }
  return drive.registrationUrl || ''
}
