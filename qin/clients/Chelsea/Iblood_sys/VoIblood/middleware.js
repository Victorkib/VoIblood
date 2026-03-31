import { NextResponse } from 'next/server'

/**
 * Middleware for protecting routes
 * Runs on every request before it reaches the page
 * 
 * Note: We only validate the session cookie format and expiry.
 * Full user validation happens in the API routes.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Get the auth session cookie
  const sessionCookie = request.cookies.get('auth-session')
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/register',  // ← Volunteer registration (public, no login required)
    '/donor',  // ← Donor profile (public, no login required)
    '/api/auth',
    '/api/register',  // ← Registration APIs (public, no login required)
  ]
  
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )
  
  // If it's a public path, allow the request
  if (isPublicPath) {
    return NextResponse.next()
  }
  
  // If no session cookie, redirect to login
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  try {
    const session = JSON.parse(sessionCookie.value)
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      const response = NextResponse.redirect(
        new URL('/auth/login?error=session_expired', request.url)
      )
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
    
    // Session is valid, allow the request
    // Full user validation happens in API routes and protected components
    return NextResponse.next()
  } catch (error) {
    // Invalid session format, redirect to login
    const response = NextResponse.redirect(
      new URL('/auth/login?error=invalid_session', request.url)
    )
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

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
