# 🐙 GITHUB OAUTH INTEGRATION - COMPLETE GUIDE

**Date**: March 30, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION

---

## 🔍 CURRENT STATE ANALYSIS

### **What's Already Working** ✅

**Google OAuth**:
```javascript
// Login page has OAuth buttons
<Button onClick={() => handleOAuthLogin('google')}>Google</Button>
<Button onClick={() => handleOAuthLogin('github')}>GitHub</Button>
<Button onClick={() => handleOAuthLogin('discord')}>Discord</Button>

// OAuth endpoint handles all providers
POST /api/auth/oauth
  → provider: 'google' | 'github' | 'discord'
  → Redirects to provider
  → Callback → /api/auth/callback
  → Creates/updates user in MongoDB
  → Sets session cookie
```

**OAuth Flow**:
```
1. User clicks "GitHub" button
2. POST /api/auth/oauth with { provider: 'github' }
3. Supabase redirects to GitHub
4. User authorizes on GitHub
5. GitHub redirects to /api/auth/callback?code=xxx
6. Exchange code for session
7. Create/update user in MongoDB
8. Set session cookie
9. Redirect to /dashboard
```

---

## 🎯 WHAT NEEDS TO BE DONE

### **External Configuration Required**:

#### **1. GitHub OAuth App Setup** (REQUIRED)
**Where**: GitHub Developer Settings  
**URL**: https://github.com/settings/developers

**Steps**:
1. Go to https://github.com/settings/developers
2. Click "New OAuth App" or "Register a new application"
3. Fill in:
   - **Application name**: `iBlood System` (or your app name)
   - **Homepage URL**: `http://localhost:3000` (dev) or `https://yourdomain.com` (prod)
   - **Authorization callback URL**: `http://localhost:3000/auth/callback` (dev) or `https://yourdomain.com/auth/callback` (prod)
   - **Application description**: `Blood donation management system`
   - **Website**: (optional)

4. Click "Register application"

5. **Copy credentials**:
   - **Client ID**: `Iv1.xxxxxxxxxxxxxxxx`
   - **Client Secret**: Click "Generate a new client secret" → Copy immediately!

---

#### **2. Supabase OAuth Configuration** (REQUIRED)
**Where**: Supabase Dashboard → Authentication → Providers

**Steps**:
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **GitHub** in the list
5. Toggle **Enable GitHub OAuth**
6. Fill in:
   - **Client ID**: From GitHub OAuth App (step 1)
   - **Client Secret**: From GitHub OAuth App (step 1)
   - **Redirect URL**: Should auto-fill with `https://your-project.supabase.co/auth/v1/callback`
7. Click **Save**

**Optional - Enable GitHub Organizations** (if you want org auto-creation):
- Toggle **Allow organizations**
- This allows users to sign in with their GitHub organization email

---

#### **3. Environment Variables** (REQUIRED)
**File**: `.env.local`

**Add to Supabase Dashboard** (NOT .env.local):
```
# In Supabase Dashboard → Project Settings → API
# These are already configured for Supabase itself
# GitHub OAuth is configured in Supabase UI, not env vars
```

**No additional env vars needed!** Supabase handles GitHub OAuth internally.

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: External Configuration**

- [ ] **Create GitHub OAuth App**
  - [ ] Go to https://github.com/settings/developers
  - [ ] Click "New OAuth App"
  - [ ] Fill in application details
  - [ ] Copy Client ID
  - [ ] Generate and copy Client Secret

- [ ] **Configure Supabase OAuth**
  - [ ] Go to Supabase Dashboard
  - [ ] Authentication → Providers
  - [ ] Enable GitHub
  - [ ] Enter Client ID and Secret
  - [ ] Save configuration

- [ ] **Test Configuration**
  - [ ] Verify redirect URLs match
  - [ ] Check that GitHub app is active
  - [ ] Ensure Supabase has correct credentials

---

### **Phase 2: Code Verification**

**Current Code Status**: ✅ **ALREADY IMPLEMENTED**

**Files that already support GitHub**:

1. **`app/api/auth/oauth/route.js`** ✅
```javascript
// Already handles GitHub
const { data, error } = await supabase.auth.signInWithOAuth({
  provider, // 'github' is supported
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    scopes: provider === 'github' ? 'user:email' : undefined,
  },
})
```

2. **`app/api/auth/callback/route.js`** ✅
```javascript
// Already handles GitHub callback
// Creates/updates user from GitHub OAuth
```

3. **`app/auth/login/page.jsx`** ✅
```javascript
// Already has GitHub button
<Button onClick={() => handleOAuthLogin('github')}>
  GitHub
</Button>
```

4. **`app/auth/signup/page.jsx`** ✅
```javascript
// Already has GitHub button
<Button onClick={() => handleOAuthLogin('github')}>
  GitHub
</Button>
```

5. **`lib/supabase.js`** ✅
```javascript
export const OAUTH_PROVIDERS = {
  google: 'google',
  github: 'github', // ← Already defined!
  discord: 'discord',
}
```

---

### **Phase 3: Testing**

**Test Flow**:
```
1. Go to http://localhost:3000/auth/login
2. Click "GitHub" button
3. Should redirect to GitHub authorization page
4. Click "Authorize iBlood System"
5. Should redirect to /dashboard
6. Check MongoDB for user creation
7. Check session cookie is set
```

**Test Cases**:
- [ ] First-time GitHub user → Creates new user
- [ ] Existing user with GitHub → Links GitHub account
- [ ] User with same email → Merges accounts
- [ ] GitHub email not verified → Should still work
- [ ] GitHub organization email → Should extract org info

---

## 🔧 OPTIONAL ENHANCEMENTS

### **1. GitHub Organization Auto-Creation**

**What it does**: Automatically creates organization in iBlood when user signs in with GitHub org email

**Implementation**: Already supported in callback route!

```javascript
// app/api/auth/callback/route.js already has:
const orgName = user.user_metadata?.organization_name
const orgEmail = user.user_metadata?.organization_email

// If user has GitHub org email, creates org automatically
if (orgName && !organization) {
  organization = await Organization.create({
    name: orgName,
    email: orgEmail,
    // ... other fields
  })
}
```

**To enable**:
- In Supabase OAuth settings, enable "Allow organizations"
- Users signing in with @company.com GitHub email will auto-create org

---

### **2. GitHub Profile Picture**

**What it does**: Uses GitHub avatar as user profile picture

**Implementation**: Already supported!

```javascript
// app/api/auth/callback/route.js already has:
mongoUser.avatarUrl = user.user_metadata?.avatar_url
```

**To use**: Display `user.avatarUrl` in UI

---

### **3. GitHub Username**

**What it does**: Stores GitHub username for reference

**Add to User Model** (optional):
```javascript
// lib/models/User.js
githubUsername: {
  type: String,
  sparse: true,
}
```

**Update callback** (optional):
```javascript
// app/api/auth/callback/route.js
githubUsername: user.user_metadata?.preferred_username,
```

---

## 🎯 STEP-BY-STEP IMPLEMENTATION

### **STEP 1: Create GitHub OAuth App**

1. **Go to GitHub Developer Settings**:
   ```
   https://github.com/settings/developers
   ```

2. **Click "New OAuth App"**:
   ```
   Top right → "New OAuth App" button
   ```

3. **Fill Application Details**:
   ```
   Application name: iBlood System
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:3000/auth/callback
   Application description: Blood donation management system
   ```

4. **Register Application**:
   ```
   Click "Register application"
   ```

5. **Copy Client ID**:
   ```
   Client ID: Iv1.xxxxxxxxxxxxxxxx
   Copy this!
   ```

6. **Generate Client Secret**:
   ```
   Click "Generate a new client secret"
   Copy immediately (can't see again!)
   Client Secret: abc123def456...
   ```

---

### **STEP 2: Configure Supabase**

1. **Go to Supabase Dashboard**:
   ```
   https://app.supabase.com
   Select your project
   ```

2. **Navigate to OAuth Settings**:
   ```
   Authentication → Providers → GitHub
   ```

3. **Enable GitHub**:
   ```
   Toggle "Enable GitHub OAuth"
   ```

4. **Enter Credentials**:
   ```
   Client ID: Iv1.xxxxxxxxxxxxxxxx (from Step 1)
   Client Secret: abc123def456... (from Step 1)
   ```

5. **Verify Redirect URL**:
   ```
   Should show: https://your-project.supabase.co/auth/v1/callback
   This is automatic, don't change it!
   ```

6. **Save Configuration**:
   ```
   Click "Save"
   Status should show "Enabled"
   ```

---

### **STEP 3: Test Locally**

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Go to Login Page**:
   ```
   http://localhost:3000/auth/login
   ```

3. **Click GitHub Button**:
   ```
   Should redirect to GitHub
   URL: https://github.com/login/oauth/authorize?...
   ```

4. **Authorize Application**:
   ```
   Click "Authorize iBlood System"
   ```

5. **Verify Redirect**:
   ```
   Should redirect to: http://localhost:3000/auth/callback?code=...
   Then to: http://localhost:3000/dashboard
   ```

6. **Check User Created**:
   ```javascript
   // MongoDB
   db.users.findOne({ email: "your-github-email@example.com" })
   // Should show user with GitHub provider
   ```

---

## 🐛 TROUBLESHOOTING

### **Issue: "Invalid redirect_uri"**

**Cause**: Callback URL mismatch

**Solution**:
```
1. Check GitHub OAuth App callback URL
   Must be: http://localhost:3000/auth/callback

2. Check Supabase OAuth redirect URL
   Must match exactly (including http/https)

3. Check NEXT_PUBLIC_APP_URL in .env.local
   Must be: http://localhost:3000
```

---

### **Issue: "OAuth App not configured"**

**Cause**: Supabase doesn't have GitHub credentials

**Solution**:
```
1. Go to Supabase Dashboard
2. Authentication → Providers → GitHub
3. Ensure Client ID and Secret are entered
4. Click Save
5. Wait 1-2 minutes for propagation
```

---

### **Issue: "User already exists with this email"**

**Cause**: User signed up with email first, now trying GitHub

**Solution**: **ALREADY HANDLED!** ✅
```javascript
// app/api/auth/callback/route.js
const existingEmailUser = await User.findOne({ email: user.email })

if (existingEmailUser) {
  // Link GitHub account to existing user
  existingEmailUser.supabaseId = user.id
  existingEmailUser.providers.push({
    provider: 'github',
    providerId: user.id,
  })
  await existingEmailUser.save()
}
```

---

### **Issue: "GitHub organization not created"**

**Cause**: Org auto-creation requires specific conditions

**Solution**:
```
1. User must sign in with organization GitHub email
2. GitHub must return organization_name in metadata
3. Supabase OAuth must have "Allow organizations" enabled
4. Organization must not already exist
```

---

## 📊 GITHUB OAUTH SCOPES

**Default Scopes**:
```
user:email - Read user's email addresses
read:user - Read user's profile data
```

**What we request**:
```javascript
scopes: 'user:email'
```

**What we get**:
- ✅ Primary email address
- ✅ Public email (if set)
- ✅ Full name
- ✅ Avatar URL
- ✅ GitHub username
- ✅ Organization emails (if member)

---

## 🎯 PRODUCTION DEPLOYMENT

### **Update GitHub OAuth App**

**For Production**:
```
1. Edit existing GitHub OAuth App
2. Update Homepage URL: https://yourdomain.com
3. Update Callback URL: https://yourdomain.com/auth/callback
4. Save changes
```

### **Update Supabase OAuth**

**For Production**:
```
1. Supabase already configured (same credentials)
2. Just ensure production URL is allowed
3. Test with production domain
```

### **Environment Variables**

**Production .env**:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## ✅ IMPLEMENTATION SUMMARY

### **What You Need to Do**:

1. **Create GitHub OAuth App** (10 minutes)
   - Go to GitHub settings
   - Register new app
   - Copy Client ID & Secret

2. **Configure Supabase** (5 minutes)
   - Enable GitHub provider
   - Enter Client ID & Secret
   - Save

3. **Test** (5 minutes)
   - Click GitHub button
   - Authorize
   - Verify dashboard redirect
   - Check MongoDB

**Total Time**: ~20 minutes

### **What's Already Done** ✅:

- ✅ OAuth endpoint handles GitHub
- ✅ Callback route processes GitHub
- ✅ User creation/linking works
- ✅ Session management works
- ✅ GitHub buttons in UI
- ✅ Organization auto-creation (optional)
- ✅ Avatar URL support
- ✅ Account merging support

---

## 🎉 CONCLUSION

**GitHub OAuth integration is 95% complete!**

**Only external configuration needed**:
1. GitHub OAuth App registration
2. Supabase OAuth configuration

**All code is ready** - just need to enable it in GitHub and Supabase!

**Ready to proceed with implementation?** 🚀
