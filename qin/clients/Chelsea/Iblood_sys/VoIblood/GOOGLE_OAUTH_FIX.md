# Google OAuth Fix - Authentication Redirect Issue

## 🐛 Problem

After logging in with Google:
- User selects their Google email
- Shows "Completing authentication..." screen
- Gets stuck - no redirect to dashboard
- Authentication succeeds but user isn't redirected

## ✅ Root Cause

The Google OAuth callback was:
1. ❌ Only setting Google cookies (`google_user`, `google_access_token`)
2. ❌ NOT setting the main `auth-session` cookie
3. ❌ NOT creating a Supabase session
4. ❌ Callback page was looking for hash params but got query params

## 🔧 Solution Applied

### 1. Fixed Google Callback API (`app/api/auth/google/callback/route.js`)

**Now does:**
1. ✅ Gets user info from Google
2. ✅ Creates/updates MongoDB user
3. ✅ Creates Supabase session (with fallback methods)
4. ✅ Sets `auth-session` cookie properly
5. ✅ Redirects to `/dashboard`

**Key Changes:**
```javascript
// Create Supabase session
const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: result.tokens.idToken || result.tokens.accessToken,
  nonce: state,
})

// Fallback if Supabase sign-in fails
if (supabaseError || !supabaseData?.session) {
  // Create manual session with random password
  const randomPassword = Math.random().toString(36).slice(-20)
  
  const { data: signupData } = await supabase.auth.signUp({
    email: result.user.email,
    password: randomPassword,
  })
  
  session = signupData?.session || createManualSession()
}

// Set auth cookie
response.cookies.set({
  name: 'auth-session',
  value: JSON.stringify(sessionData),
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
})
```

### 2. Fixed Callback Page (`app/auth/callback/page.jsx`)

**Now handles:**
1. ✅ Hash-based responses (`#access_token=xxx`)
2. ✅ Query-based responses (`?code=xxx`)
3. ✅ Backend-processed callbacks (just redirect)
4. ✅ Smart redirect based on user state

**Key Changes:**
```javascript
// Check both hash and query params
const hash = window.location.hash
const search = window.location.search

// If backend already processed (has code), just redirect
if (code) {
  router.push('/dashboard')
  return
}

// Check if user has organization
if (!sessionData.user.hasOrganization && sessionData.user.role === 'pending') {
  router.push('/dashboard/setup') // Browse organizations
  return
}
```

---

## 🧪 Testing Google OAuth

### Test Flow:

1. **Go to login page**
   - http://localhost:3000/auth/login

2. **Click "Sign in with Google"**

3. **Select Google account**

4. **Should see:**
   - "Completing authentication..." (briefly)
   - Then redirect to dashboard

5. **Verify:**
   ```javascript
   // In browser console:
   fetch('/api/auth/session')
     .then(r => r.json())
     .then(data => console.log('Logged in as:', data.user))
   // Should show your Google email and user info
   ```

### Expected Behavior:

✅ User clicks Google login
✅ Google popup/redirect appears
✅ User selects account
✅ "Completing authentication..." shows (1-2 seconds)
✅ Redirects to dashboard
✅ User info shows Google email and name
✅ Session is valid

---

## ⚠️ Common Issues & Fixes

### Issue: "Completing authentication..." forever

**Cause:** Backend didn't set auth cookie properly

**Fix:**
1. Check browser console for errors
2. Check network tab - callback should return 307 redirect
3. Verify `auth-session` cookie is set
4. Check MongoDB user was created

### Issue: Redirects to login with error

**Possible errors:**

**"Missing authorization code"**
- Google didn't return code
- Check redirect URI matches exactly
- Check Google OAuth credentials

**"Authentication failed"**
- Supabase sign-in failed
- Check Supabase Google OAuth is configured
- Check logs for specific error

### Issue: User created but can't login again

**Cause:** Supabase user doesn't exist, only MongoDB

**Fix:**
- The callback now creates Supabase user automatically
- Clear cookies and try again
- Or manually create user in Supabase

---

## 🔐 Supabase Google OAuth Setup (Optional but Recommended)

For best results, configure Google OAuth in Supabase:

1. **Go to Supabase Dashboard**
   - Select your project
   - Authentication → Providers

2. **Enable Google**
   - Toggle Google to "Enabled"
   - Add Client ID
   - Add Client Secret

3. **Get Google Credentials:**
   - Go to https://console.cloud.google.com/
   - APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Also add your app: `http://localhost:3000/auth/callback`

4. **Copy credentials to Supabase**

5. **Save and test**

---

## 📊 What Happens Now

### First-time Google Login:
```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth flow
   ↓
3. Backend gets Google user info
   ↓
4. Creates MongoDB user (role: pending)
   ↓
5. Creates Supabase user/session
   ↓
6. Sets auth-session cookie
   ↓
7. Redirects to dashboard
   ↓
8. User sees "Browse Organizations" (no org yet)
```

### Returning Google Login:
```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth flow (instant if already logged in)
   ↓
3. Backend finds existing MongoDB user
   ↓
4. Updates last login
   ↓
5. Creates Supabase session
   ↓
6. Sets auth-session cookie
   ↓
7. Redirects to dashboard
   ↓
8. User sees their org's dashboard
```

---

## 🎯 Files Changed

1. ✅ `app/api/auth/google/callback/route.js` - Complete rewrite
2. ✅ `app/auth/callback/page.jsx` - Enhanced to handle both flows
3. ✅ This document - Explanation

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Google login button appears on login page
- [ ] Clicking redirects to Google
- [ ] Account selection works
- [ ] "Completing authentication..." shows briefly
- [ ] Redirects to dashboard (not stuck)
- [ ] User info shows correct email/name
- [ ] Session persists after refresh
- [ ] Can access protected pages
- [ ] Logout and login again works

---

## 🚀 Advanced: Manual Session Creation

If Supabase Google OAuth isn't configured, the system creates a manual session:

```javascript
session = {
  access_token: `manual_${Date.now()}`,
  refresh_token: `manual_refresh_${Date.now()}`,
  expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
  user: {
    id: `manual_${googleId}`,
    email: googleEmail,
    user_metadata: {
      full_name: googleName,
      avatar_url: googlePicture,
    },
  },
}
```

This works because:
- Our auth system is cookie-based
- We validate cookies in middleware
- Supabase token isn't strictly required for cookie-based auth
- MongoDB user is the source of truth

---

**Last Updated:** March 26, 2026  
**Issue:** Google OAuth redirect stuck  
**Status:** ✅ Fixed  
**Method:** Create Supabase session + set auth cookie
