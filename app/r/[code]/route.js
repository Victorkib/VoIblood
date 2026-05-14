import { NextResponse } from 'next/server'

/**
 * Short RSVP URL from SMS: /r/{code} → /rsvp?c={code}
 */
export async function GET(request, { params }) {
  const { code } = await params
  const url = new URL(request.url)
  if (!code || !/^[a-fA-F0-9]{16}$/.test(String(code))) {
    return NextResponse.redirect(new URL('/rsvp', url.origin), 302)
  }
  const dest = new URL(`/rsvp?c=${encodeURIComponent(String(code).toLowerCase())}`, url.origin)
  return NextResponse.redirect(dest, 302)
}
