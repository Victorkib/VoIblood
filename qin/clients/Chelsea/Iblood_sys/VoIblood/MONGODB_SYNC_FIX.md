# MongoDB Sync Fix for Google OAuth

## 🐛 Problem

After Google OAuth login:
- ✅ User created in Supabase
- ✅ Supabase session valid
- ❌ User NOT in MongoDB
- ❌ `/api/auth/session` returns `null`
- ❌ Redirected back to login

## ✅ Root Cause

The session endpoint only looked for existing MongoDB users. It didn't create MongoDB users for Supabase users who logged in via Google OAuth.

## 🔧 Solution

### 1. Updated Session Endpoint (`app/api/auth/session/route.js`)

**Now auto-creates MongoDB users:**
```javascript
// Find user in MongoDB
let user = await User.findOne({ supabaseId: session.user.supabaseId })

// If not found, check Supabase and create
if (!user) {
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  // Create MongoDB user from Supabase data
  user = await User.create({
    supabaseId: supabaseUser.id,
    email: supabaseUser.email,
    fullName: supabaseUser.user_metadata?.full_name,
    role: 'pending',
    accountStatus: 'active',
    emailVerified: supabaseUser.email_confirmed_at ? true : false,
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
    providers: supabaseUser.identities?.map(i => ({
      provider: i.provider,
      providerId: i.id,
    })),
  })
}
```

### 2. Updated Callback Page (`app/auth/callback/page.jsx`)

**Now syncs to MongoDB after OAuth:**
```javascript
// After Supabase processes OAuth
const sessionRes = await fetch('/api/auth/session')
const sessionData = await sessionRes.json()

if (sessionData.user) {
  console.log('MongoDB user synced:', sessionData.user.email)
}
```

## 🎯 How It Works Now

### First Google Login:
```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth flow
   ↓
3. Supabase creates user
   ↓
4. Callback page calls /api/auth/session
   ↓
5. Session endpoint finds Supabase user
   ↓
6. Creates MongoDB user automatically
   ↓
7. Returns user data
   ↓
8. Redirects to dashboard
```

### Returning Google Login:
```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth flow
   ↓
3. Supabase finds existing user
   ↓
4. Callback page calls /api/auth/session
   ↓
5. Session endpoint finds MongoDB user
   ↓
6. Returns user data
   ↓
7. Redirects to dashboard
```

## 🧪 Testing

### Check Console Logs:

After Google OAuth, you should see:
```
OAuth callback started {hash: "", search: "?code=...", path: "/auth/callback"}
Query params: {code: true, type: "xxx"}
Authorization code detected, verifying session...
Session verified for code flow
Syncing to MongoDB...
MongoDB sync result: {user: {email: "qinalexander56@gmail.com", ...}}
MongoDB user synced: qinalexander56@gmail.com
Redirecting to: /dashboard
```

### Check MongoDB:

```javascript
// In MongoDB Compass or mongosh:
db.users.findOne({ email: 'qinalexander56@gmail.com' })

// Should show:
{
  _id: ObjectId("..."),
  supabaseId: "ee0261a6-4d55-4c6e-979c-fa64e9c81e2e",
  email: "qinalexander56@gmail.com",
  fullName: "Alexander Qin",
  role: "pending",
  accountStatus: "active",
  emailVerified: true,
  avatarUrl: "https://lh3.googleusercontent.com/...",
  providers: [{ provider: "google", providerId: "11096473517024470749" }],
  lastLoginAt: ISODate("2026-03-26T14:11:07.064Z")
}
```

### Check Session API:

```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log('Session user:', data.user))

// Should show:
{
  user: {
    id: "...",
    email: "qinalexander56@gmail.com",
    fullName: "Alexander Qin",
    role: "pending",
    hasOrganization: false
  }
}
```

## ✅ What's Fixed

- ✅ Supabase users without MongoDB records are auto-created
- ✅ Google OAuth users sync to MongoDB automatically
- ✅ Session endpoint creates missing MongoDB users
- ✅ Callback page triggers MongoDB sync
- ✅ User data includes all Supabase metadata (avatar, providers, etc.)
- ✅ Role defaults to 'pending' until assigned to organization

## 🎯 Next Steps for User

After Google OAuth login, the user will:
1. See "Completing authentication..." (2-3 seconds)
2. Be redirected to dashboard
3. See "Browse Organizations" (since role is 'pending')
4. Can request to join organizations
5. Or wait for super_admin to assign them

## 📊 User States

**New Google OAuth User:**
- Supabase: ✅ Created
- MongoDB: ✅ Auto-created
- Role: `pending`
- Account Status: `active`
- Organization: `null`
- Can Do: Browse orgs, request to join

**After Org Assignment:**
- Role: `staff` / `manager` / `org_admin`
- Organization: Assigned
- Can Do: Access org resources based on role

---

**Last Updated:** March 26, 2026  
**Issue:** MongoDB user missing after Google OAuth  
**Status:** ✅ Fixed - Auto-sync from Supabase
