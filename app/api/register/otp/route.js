/**
 * DEPRECATED - This file has been replaced by separate endpoints:
 * - POST /api/register/otp/send (app/api/register/otp/send/route.js)
 * - POST /api/register/otp/verify (app/api/register/otp/verify/route.js)
 * 
 * This file is kept only as a reference and should NOT be used.
 * The duplicate route was causing OTP verification failures.
 */

export async function POST() {
  return Response.json(
    { error: 'This endpoint is deprecated. Use /api/register/otp/send or /api/register/otp/verify instead.' },
    { status: 410 }
  )
}
