# Google OAuth Setup Guide

## 🎯 Quick Fix for Google OAuth Redirect Issue

### The Problem You Saw:
- Click "Sign in with Google"
- Redirected to Google account chooser
- After selecting account, redirected back to login page
- Never reached dashboard

### Root Cause:
The Google OAuth flow needs to be configured in **Supabase Dashboard**, not just in your app.

---

## ✅ Step-by-Step Fix

### Step 1: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - https://app.supabase.com
   - Select your project

2. **Go to Authentication → Providers**
   - Find "Google" in the list
   - Toggle it to **Enabled**

3. **Get Google Credentials** (if you don't have them):
   - Go to https://console.cloud.google.com/
   - Create/select a project
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     ```
   - Copy Client ID and Client Secret

4. **Enter Google Credentials in Supabase**:
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)
   - Click **Save**

---

### Step 2: Update Your App's Environment

In your `.env.local`:

```env
# Make sure this is set
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

That's it! You don't need `GOOGLE_CLIENT_ID` etc. anymore because Supabase handles Google OAuth now.

---

### Step 3: Test the Flow

1. **Go to login**: http://localhost:3000/auth/login

2. **Click "Sign in with Google"**
   - Should redirect to Google
   - URL will be: `https://accounts.google.com/...`

3. **Select your account**
   - Google will ask for permissions
   - Click "Continue" or "Allow"

4. **Redirects back to your app**
   - URL: `http://localhost:3000/auth/callback?code=xxx&type=xxx`
   - Shows "Completing authentication..." (1-2 seconds)
   - Then redirects to dashboard

5. **Verify you're logged in**:
   - Should see your email in dashboard
   - Check console: `fetch('/api/auth/session').then(r=>r.json()).then(console.log)`

---

## 🔍 Debugging

### Check Browser Console

Open DevTools (F12) → Console

You should see:
```
OAuth callback started {hash: "", search: "?code=...", path: "/auth/callback"}
Query params: {code: true, type: "xxx"}
Authorization code detected, verifying session...
Session verified for code flow
Redirecting to: /dashboard
```

### Check Network Tab

1. Request to `/api/auth/google/login` → 307 redirect to Google
2. Google OAuth flow
3. Back to `/auth/callback?code=...` → 307 redirect to `/dashboard`
4. Request to `/api/auth/session` → 200 with user data

### Common Issues

**"Invalid redirect_uri"**
- Make sure redirect URI in Google Cloud Console matches exactly
- For Supabase: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- For local dev: `http://localhost:3000/auth/callback`

**"Session not created"**
- Check Supabase has Google OAuth enabled
- Check Client ID and Secret are correct
- Try clearing browser cookies and cache

**Stuck on "Completing authentication..."**
- Open console and check for errors
- Should see "Session verified for code flow"
- If not, Supabase didn't create the session
- Check Supabase logs: Dashboard → Logs

---

## 🎯 How It Works Now

### Flow:
```
1. User clicks "Sign in with Google"
   ↓
2. App calls /api/auth/google/login
   ↓
3. Supabase generates OAuth URL
   ↓
4. Redirect to Google
   ↓
5. User selects account
   ↓
6. Google redirects to Supabase callback
   ↓
7. Supabase processes and redirects to /auth/callback
   ↓
8. Supabase client sets session in browser
   ↓
9. Callback page verifies session
   ↓
10. Redirect to dashboard
```

### What Changed:
- ✅ Uses Supabase's built-in Google OAuth
- ✅ No manual Google OAuth handling needed
- ✅ Supabase creates session automatically
- ✅ Callback page just verifies and redirects

---

## 📋 Checklist

Before testing, verify:

- [ ] Supabase project has Google OAuth enabled
- [ ] Google Client ID entered in Supabase
- [ ] Google Client Secret entered in Supabase
- [ ] Redirect URI in Google Cloud Console includes Supabase callback
- [ ] Redirect URI in Google Cloud Console includes localhost:3000
- [ ] `NEXT_PUBLIC_APP_URL` is set in `.env.local`
- [ ] Browser cookies are enabled
- [ ] No ad blockers blocking Google OAuth

---

## 🚀 Quick Test Command

After setting up Supabase Google OAuth:

```bash
# Clear any existing session
# (In browser console: document.cookie.split(';').forEach(c => document.cookie = c.split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC;')

# Then visit:
http://localhost:3000/auth/login

# Click Google button
# Select account
# Should redirect to dashboard
```

---

## ✅ Expected Behavior

**First-time Google login:**
1. Select Google account
2. Grant permissions
3. "Completing authentication..." (1-2 sec)
4. Dashboard loads
5. User created in MongoDB with role: pending
6. Can browse organizations

**Returning Google login:**
1. Select Google account (instant if already logged in)
2. "Completing authentication..." (brief)
3. Dashboard loads with user's data
4. Last login updated in MongoDB

---

**Last Updated:** March 26, 2026  
**Status:** ✅ Fixed - Use Supabase Google OAuth  
**Next:** Test with your Google account
