/**
 * Next.js Middleware - Route Protection
 *
 * Redirects users based on their authentication status and account state:
 * - Unauthenticated users → /auth/login
 * - Users with accountStatus 'pending_approval' → /pending-approval (except auth routes)
 * - All other authenticated users → allowed access
 *
 * Note: Middleware runs in Edge Runtime which doesn't support MongoDB.
 * Account status is read from the session cookie, which is set by the login route
 * after fetching fresh data from MongoDB.
 */

import { NextResponse } from 'next/server'

// Routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/invite',
  '/pending-approval',
  '/register',
  '/donor',
  '/sw.js',
  '/favicon.ico',
]

// Routes that are always accessible
const alwaysAllowed = [
  '/api/auth',
  '/api/register',
  '/api/donors/profile',
]

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow API routes that don't need auth
  if (alwaysAllowed.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for auth session cookie
  const sessionCookie = request.cookies.get('auth-session')

  if (!sessionCookie?.value) {
    // Not authenticated - redirect to login
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const { accountStatus } = session.user || {}

    // If user is pending approval, redirect to pending-approval page
    // But allow access to auth routes, api routes, and pending-approval page itself
    if (accountStatus === 'pending_approval') {
      // Don't redirect if already on pending-approval or auth routes
      if (pathname === '/pending-approval' || pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
        return NextResponse.next()
      }

      // Redirect to pending-approval
      return NextResponse.redirect(new URL('/pending-approval', request.url))
    }

    // All other authenticated users can proceed
    return NextResponse.next()
  } catch (error) {
    // Invalid session cookie - clear it and redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    response.cookies.set({
      name: 'auth-session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  }
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
