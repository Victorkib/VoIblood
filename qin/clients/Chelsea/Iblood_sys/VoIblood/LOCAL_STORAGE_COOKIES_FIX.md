# Local Storage vs Cookies Fix - OAuth Session Sync

## 🐛 THE REAL PROBLEM

**Supabase stores session in LOCAL STORAGE**
**Our API reads from COOKIES**

They don't talk to each other!

---

## 📊 What Was Happening

### **Browser Storage:**
```
Local Storage (Supabase):
{
  access_token: "eyJhbGci...",
  user: { id: "ee0261a6...", email: "qinalexander56@gmail.com" }
}

Cookies:
{
  // EMPTY! ❌
}
```

### **API Call:**
```javascript
// /api/auth/session tries to read from cookies
const sessionCookie = request.cookies.get('auth-session')
// Returns undefined - cookie doesn't exist!

return NextResponse.json({ user: null })  // ❌ FAILS
```

---

## ✅ THE FIX

**Bridge Local Storage → Cookies**

### **1. New Endpoint: `/api/auth/set-cookie`**
```javascript
// Client sends cookie value
await fetch('/api/auth/set-cookie', {
  method: 'POST',
  body: JSON.stringify({ cookieValue })
})

// Server sets HTTP-only cookie
response.cookies.set({
  name: 'auth-session',
  value: cookieValue,
  httpOnly: true,
})
```

### **2. Updated Callback Page**
```javascript
// Get Supabase session from Local Storage
const { data: { session } } = await supabase.auth.getSession()

// Create cookie value
const cookieValue = JSON.stringify({
  user: {
    supabaseId: session.user.id,
    email: session.user.email,
  },
  token: session.access_token,  // ← From Local Storage!
  expiresAt: session.expires_at,
})

// Set cookie via API
await fetch('/api/auth/set-cookie', {
  method: 'POST',
  body: JSON.stringify({ cookieValue }),
})

// NOW /api/auth/session works!
const sessionData = await fetch('/api/auth/session')
```

---

## 🎯 How It Works Now

```
1. Google OAuth → Supabase
   ↓
2. Supabase stores in Local Storage ✅
   ↓
3. Callback page reads from Local Storage ✅
   ↓
4. Creates cookie value from Supabase session ✅
   ↓
5. Calls /api/auth/set-cookie ✅
   ↓
6. Server sets HTTP-only cookie ✅
   ↓
7. Calls /api/auth/session ✅
   ↓
8. Server reads from cookie ✅
   ↓
9. Creates MongoDB user ✅
   ↓
10. Redirect to dashboard ✅
```

---

## 📁 Files Changed

### **1. New File: `app/api/auth/set-cookie/route.js`**
```javascript
export async function POST(request) {
  const { cookieValue } = await request.json()
  
  const response = NextResponse.json({ success: true })
  
  response.cookies.set({
    name: 'auth-session',
    value: cookieValue,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  })
  
  return response
}
```

### **2. Updated: `app/auth/callback/page.jsx`**
```javascript
// Get session from Supabase (Local Storage)
const { data: { session } } = await supabase.auth.getSession()

// Set cookie
await fetch('/api/auth/set-cookie', {
  method: 'POST',
  body: JSON.stringify({ cookieValue }),
})

// Sync to MongoDB
const sessionData = await fetch('/api/auth/session')
```

---

## 🧪 Testing

### **Before Fix:**
```
Console:
Supabase session found, syncing to MongoDB...
GET /api/auth/session
MongoDB sync returned null ❌

Cookies:
// Empty!
```

### **After Fix:**
```
Console:
Supabase session found, syncing to MongoDB...
Setting auth-session cookie...
POST /api/auth/set-cookie → 200 ✅
GET /api/auth/session → 200 ✅
MongoDB sync result: {user: {...}} ✅
MongoDB user synced successfully ✅

Cookies:
auth-session: {"user":{...},"token":"..."} ✅
```

---

## 🎯 Key Insight

**Supabase Auth ≠ Our Session Cookie**

- **Supabase**: Stores in Local Storage (browser accessible)
- **Our API**: Reads from cookies (server accessible)
- **Bridge**: `/api/auth/set-cookie` endpoint

**Why can't we just read Local Storage in API?**
- Local Storage is browser-only
- Server-side code (API routes) can't access it
- Need to explicitly copy data from Local Storage → Cookie

---

## ✅ Result

Now OAuth flow works perfectly:
1. ✅ Supabase session in Local Storage
2. ✅ Cookie set from Local Storage data
3. ✅ API can read cookie
4. ✅ MongoDB user created
5. ✅ User logged in successfully

**No more "MongoDB sync returned null" errors!** 🎉

---

**Last Updated:** March 27, 2026  
**Issue:** Supabase Local Storage not synced to cookies  
**Status:** ✅ Fixed - Bridge endpoint created  
**Impact:** OAuth authentication now works end-to-end
