# Access Token Fix for OAuth User Creation

## 🐛 The REAL Problem

**Symptom:**
```
Supabase session found, syncing to MongoDB...
MongoDB sync returned null - this should not happen!
```

**Root Cause:**
The `/api/auth/session` endpoint was calling `supabase.auth.getUser()` **WITHOUT passing the access token**.

```javascript
// WRONG - No access token!
const supabase = createServerClient()
const { data: { user: supabaseUser } } = await supabase.auth.getUser()
// Returns error: "User not found" or null
```

**Why it failed:**
- Server-side Supabase client doesn't have browser cookies
- Without access token, Supabase doesn't know WHICH user to fetch
- Returns `null` or error
- MongoDB user creation fails

---

## ✅ The Fix

**Pass the access token from session cookie:**

```javascript
// RIGHT - Pass access token!
const supabase = createServerClient(session.token)  // ← Access token here!
const { data: { user: supabaseUser } } = await supabase.auth.getUser()
// Now Supabase knows which user and returns full user data
```

---

## 🔧 How It Works Now

### **Session Cookie Structure:**
```javascript
{
  user: {
    id: "...",
    supabaseId: "ee0261a6-4d55-4c6e-979c-fa64e9c81e2e",
    email: "qinalexander56@gmail.com",
    // ...
  },
  token: "eyJhbGciOiJIUzI1NiIs...",  // ← Access token!
  expiresAt: "2026-03-27T..."
}
```

### **Flow:**
```
1. OAuth login → Supabase sets session cookie
   ↓
2. Callback page calls /api/auth/session
   ↓
3. Endpoint reads cookie → gets access token
   ↓
4. Creates Supabase client WITH access token
   ↓
5. Calls supabase.auth.getUser() ← Works now!
   ↓
6. Gets full Supabase user data
   ↓
7. Creates MongoDB user
   ↓
8. Returns user data
   ↓
9. Redirect to dashboard ✅
```

---

## 📊 Before vs After

### **Before (WRONG):**
```javascript
const supabase = createServerClient()  // ← No token!
const { data: { user: supabaseUser } } = await supabase.auth.getUser()
// supabaseUser = null ❌
```

**Console:**
```
User not in MongoDB, fetching from Supabase...
Supabase user not found: Invalid token
MongoDB sync returned null ❌
```

### **After (RIGHT):**
```javascript
const supabase = createServerClient(session.token)  // ← Has token!
const { data: { user: supabaseUser } } = await supabase.auth.getUser()
// supabaseUser = { id, email, user_metadata, ... } ✅
```

**Console:**
```
User not in MongoDB, fetching from Supabase...
Creating MongoDB user from Supabase: qinalexander56@gmail.com
MongoDB user created successfully ✅
MongoDB sync result: {user: {...}} ✅
```

---

## ✅ Files Changed

**`app/api/auth/session/route.js`**
- Line 55: Changed from `createServerClient()` to `createServerClient(session.token)`
- Now passes access token to Supabase client
- User creation now works!

---

## 🧪 Testing

### **Check Console Logs:**

**Before fix:**
```
GET /api/auth/session 200
MongoDB sync returned null ❌
```

**After fix:**
```
GET /api/auth/session 200
User not in MongoDB, fetching from Supabase...
Creating MongoDB user from Supabase: your-email@gmail.com
MongoDB user created successfully ✅
MongoDB sync result: {user: {email: "your-email@gmail.com", ...}} ✅
Redirect to /dashboard ✅
```

### **Check MongoDB:**

```javascript
// Should now show user:
db.users.findOne({ email: 'qinalexander56@gmail.com' })

{
  _id: ObjectId("..."),
  supabaseId: "ee0261a6-4d55-4c6e-979c-fa64e9c81e2e",
  email: "qinalexander56@gmail.com",
  fullName: "Alexander Qin",
  role: "pending",
  accountStatus: "active",
  emailVerified: true,
  avatarUrl: "https://lh3.googleusercontent.com/...",
  providers: [{ provider: "google", providerId: "110496473517024470749" }],
  lastLoginAt: ISODate("2026-03-27T16:57:21.089Z")
}
```

---

## 🎯 Key Insight

**Server-side Supabase client is stateless!**

Unlike browser client which:
- ✅ Automatically reads cookies
- ✅ Automatically includes tokens
- ✅ Maintains session state

Server client:
- ❌ No cookies
- ❌ No automatic tokens
- ❌ Stateless

**Solution:** Explicitly pass access token to `createServerClient(token)`

---

## 🎉 Result

OAuth users now:
1. ✅ Login via Google
2. ✅ Get session cookie with access token
3. ✅ Call /api/auth/session
4. ✅ Access token passed to Supabase
5. ✅ Supabase returns user data
6. ✅ MongoDB user created
7. ✅ Redirect to dashboard

**All working!** 🚀

---

**Last Updated:** March 27, 2026  
**Issue:** Access token not passed to Supabase  
**Status:** ✅ Fixed - Token now passed correctly  
**Impact:** OAuth user creation now works perfectly
