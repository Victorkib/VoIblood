# 🎮 DISCORD OAUTH INTEGRATION - COMPLETE GUIDE

**Date**: March 30, 2026  
**Status**: 📋 READY FOR IMPLEMENTATION

---

## 🔍 CURRENT STATE ANALYSIS

### **What's Already Working** ✅

**Discord OAuth** is **ALREADY IMPLEMENTED** in code! ✅

**Files that support Discord**:

1. **`app/api/auth/oauth/route.js`** ✅
```javascript
// Already handles Discord
const { data, error } = await supabase.auth.signInWithOAuth({
  provider, // 'discord' is supported!
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    scopes: provider === 'discord' ? 'identify email' : undefined,
  },
})
```

2. **`app/api/auth/callback/route.js`** ✅
```javascript
// Already handles Discord callback
// Creates/updates user from Discord OAuth
```

3. **`app/auth/login/page.jsx`** ✅
```javascript
// Already has Discord button
<Button onClick={() => handleOAuthLogin('discord')}>
  Discord
</Button>
```

4. **`app/auth/signup/page.jsx`** ✅
```javascript
// Already has Discord button
<Button onClick={() => handleOAuthLogin('discord')}>
  Discord
</Button>
```

5. **`lib/supabase.js`** ✅
```javascript
export const OAUTH_PROVIDERS = {
  google: 'google',
  github: 'github',
  discord: 'discord', // ← Already defined!
}
```

---

## 🎯 WHAT NEEDS TO BE DONE

### **External Configuration Required**:

#### **1. Discord Application Setup** (REQUIRED)
**Where**: Discord Developer Portal  
**URL**: https://discord.com/developers/applications

**Steps**:
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Fill in:
   - **Application name**: `iBlood System`
   - Click "Create"

4. Go to **OAuth2** section (left sidebar)

5. **Add Redirects**:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback (for production)
   ```
   Click "Save Changes"

6. **Copy credentials**:
   - **Client ID**: Copy from "Client ID" section
   - **Client Secret**: Click "Reset Secret" → Copy immediately!

7. **Enable In-App Authorization** (optional but recommended):
   - Toggle "Use In-App Authorization"
   - This allows Discord users to authorize without leaving Discord

---

#### **2. Supabase OAuth Configuration** (REQUIRED)
**Where**: Supabase Dashboard → Authentication → Providers

**Steps**:
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Discord** in the list
5. Toggle **Enable Discord OAuth**
6. Fill in:
   - **Client ID**: From Discord Developer Portal
   - **Client Secret**: From Discord Developer Portal
   - **Redirect URL**: Should auto-fill with `https://your-project.supabase.co/auth/v1/callback`
7. Click **Save**

---

#### **3. Environment Variables** (NOT NEEDED)

**No env vars needed!** Supabase handles Discord OAuth internally.

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Discord Developer Portal**

- [ ] **Create Discord Application**
  - [ ] Go to https://discord.com/developers/applications
  - [ ] Click "New Application"
  - [ ] Name it "iBlood System"
  - [ ] Click "Create"

- [ ] **Configure OAuth2**
  - [ ] Go to OAuth2 section
  - [ ] Add redirect: `http://localhost:3000/auth/callback`
  - [ ] Add redirect: `https://yourdomain.com/auth/callback`
  - [ ] Click "Save Changes"

- [ ] **Copy Credentials**
  - [ ] Copy Client ID
  - [ ] Reset and copy Client Secret
  - [ ] Store securely

---

### **Phase 2: Supabase Configuration**

- [ ] **Enable Discord OAuth**
  - [ ] Go to Supabase Dashboard
  - [ ] Authentication → Providers → Discord
  - [ ] Toggle "Enable Discord OAuth"
  - [ ] Enter Client ID
  - [ ] Enter Client Secret
  - [ ] Click "Save"

---

### **Phase 3: Testing**

- [ ] **Test Flow**
  - [ ] Go to http://localhost:3000/auth/login
  - [ ] Click "Discord" button
  - [ ] Should redirect to Discord authorization
  - [ ] Click "Authorize"
  - [ ] Should redirect to /dashboard
  - [ ] Check MongoDB for user creation

---

## 🎯 STEP-BY-STEP IMPLEMENTATION

### **STEP 1: Create Discord Application**

1. **Go to Discord Developer Portal**:
   ```
   https://discord.com/developers/applications
   ```

2. **Click "New Application"**:
   ```
   Top right → "New Application" button
   ```

3. **Fill Application Details**:
   ```
   Name: iBlood System
   Click "Create"
   ```

4. **Navigate to OAuth2**:
   ```
   Left sidebar → OAuth2
   ```

5. **Add Redirect URIs**:
   ```
   Click "Add Redirect"
   Enter: http://localhost:3000/auth/callback
   Click "Save Changes"
   
   Click "Add Redirect" again
   Enter: https://yourdomain.com/auth/callback
   Click "Save Changes"
   ```

6. **Copy Client ID**:
   ```
   Under "Client ID" section
   Click copy icon
   Client ID: 1234567890123456789
   ```

7. **Generate Client Secret**:
   ```
   Under "Client Secret" section
   Click "Reset Secret"
   Confirm action
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
   Authentication → Providers → Discord
   ```

3. **Enable Discord**:
   ```
   Toggle "Enable Discord OAuth"
   ```

4. **Enter Credentials**:
   ```
   Client ID: 1234567890123456789 (from Discord)
   Client Secret: abc123def456... (from Discord)
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

3. **Click Discord Button**:
   ```
   Should redirect to Discord
   URL: https://discord.com/oauth2/authorize?...
   ```

4. **Authorize Application**:
   ```
   Click "Authorize"
   Complete CAPTCHA if prompted
   ```

5. **Verify Redirect**:
   ```
   Should redirect to: http://localhost:3000/auth/callback?code=...
   Then to: http://localhost:3000/dashboard
   ```

6. **Check User Created**:
   ```javascript
   // MongoDB
   db.users.findOne({ email: "your-discord-email@example.com" })
   // Should show user with Discord provider
   ```

---

## 🎮 DISCORD OAUTH SCOPES

**Default Scopes**:
```
identify - Get user's Discord ID and username
email - Get user's email address
```

**What we request**:
```javascript
scopes: 'identify email'
```

**What we get**:
- ✅ Discord ID
- ✅ Username (e.g., username#1234)
- ✅ Email address
- ✅ Avatar URL
- ✅ Verified email status
- ✅ Discord flags (bot, system, etc.)

---

## 🎨 DISCORD-SPECIFIC FEATURES

### **1. Discord Username Display**

**What it does**: Shows Discord username in profile

**Already supported**:
```javascript
// app/api/auth/callback/route.js
mongoUser.fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || // Discord username
                     user.email?.split('@')[0] || 
                     'User'
```

**To display**:
```javascript
// In UI
<p>{user.fullName}</p>
// Will show: "username" or "username#1234"
```

---

### **2. Discord Avatar**

**What it does**: Uses Discord avatar as profile picture

**Already supported**:
```javascript
// app/api/auth/callback/route.js
mongoUser.avatarUrl = user.user_metadata?.avatar_url
```

**Discord Avatar URL Format**:
```
https://cdn.discordapp.com/avatars/{user_id}/{avatar_id}.png
```

**To display**:
```javascript
// In UI
<img src={user.avatarUrl} alt="Profile" />
```

---

### **3. Discord Server Integration** (OPTIONAL)

**What it does**: Allow users to join Discord server after signup

**Implementation** (future enhancement):
```javascript
// After successful login
POST /api/discord/join-server
  → Add user to Discord server
  → Assign role based on iBlood role
```

**Requirements**:
- Discord Bot Token
- Server ID
- Bot with "Manage Server" permissions

---

## 🐛 TROUBLESHOOTING

### **Issue: "Invalid redirect_uri"**

**Cause**: Callback URL mismatch

**Solution**:
```
1. Check Discord Developer Portal
   OAuth2 → Redirects
   Must include: http://localhost:3000/auth/callback

2. Check Supabase OAuth settings
   Discord → Redirect URL
   Must match exactly

3. Check NEXT_PUBLIC_APP_URL in .env.local
   Must be: http://localhost:3000
```

---

### **Issue: "OAuth App not configured"**

**Cause**: Supabase doesn't have Discord credentials

**Solution**:
```
1. Go to Supabase Dashboard
2. Authentication → Providers → Discord
3. Ensure Client ID and Secret are entered
4. Click Save
5. Wait 1-2 minutes for propagation
```

---

### **Issue: "Discord button not showing"**

**Cause**: Button might be commented or hidden

**Solution**:
```javascript
// Check app/auth/login/page.jsx
// Should have:
<Button onClick={() => handleOAuthLogin('discord')}>
  Discord
</Button>

// If missing, add it back
```

---

### **Issue: "User already exists with this email"**

**Cause**: User signed up with email first, now trying Discord

**Solution**: **ALREADY HANDLED!** ✅
```javascript
// app/api/auth/callback/route.js
const existingEmailUser = await User.findOne({ email: user.email })

if (existingEmailUser) {
  // Link Discord account to existing user
  existingEmailUser.supabaseId = user.id
  existingEmailUser.providers.push({
    provider: 'discord',
    providerId: user.id,
  })
  await existingEmailUser.save()
}
```

---

## 🎯 PRODUCTION DEPLOYMENT

### **Update Discord Application**

**For Production**:
```
1. Go to Discord Developer Portal
2. OAuth2 → Add Redirect
3. Enter: https://yourdomain.com/auth/callback
4. Save Changes
```

### **Update Supabase OAuth**

**For Production**:
```
1. Supabase already configured (same credentials)
2. Just ensure production URL is allowed in Discord
3. Test with production domain
```

---

## ✅ ALL THREE OAUTH PROVIDERS STATUS

| Provider | Code Status | External Config | Ready? |
|----------|-------------|-----------------|--------|
| **Google** | ✅ Implemented | ✅ Already configured | ✅ WORKING |
| **GitHub** | ✅ Implemented | ⏳ Needs GitHub config | ⏳ Ready to enable |
| **Discord** | ✅ Implemented | ⏳ Needs Discord config | ⏳ Ready to enable |

---

## 📊 COMPARISON OF ALL THREE

### **Google OAuth**
```
✅ Already working
✅ Configured in Supabase
✅ Users can sign in
```

### **GitHub OAuth**
```
✅ Code implemented
⏳ Needs GitHub OAuth App
⏳ Needs Supabase config
→ Ready to enable (20 min setup)
```

### **Discord OAuth**
```
✅ Code implemented
⏳ Needs Discord Application
⏳ Needs Supabase config
→ Ready to enable (20 min setup)
```

---

## 🎯 QUICK SETUP SUMMARY

### **For GitHub** (from previous guide):
1. https://github.com/settings/developers → New OAuth App
2. Copy Client ID & Secret
3. Supabase → Auth → Providers → GitHub → Enable
4. Test

### **For Discord** (this guide):
1. https://discord.com/developers/applications → New Application
2. OAuth2 → Add Redirect → Copy Client ID & Secret
3. Supabase → Auth → Providers → Discord → Enable
4. Test

---

## 🎉 CONCLUSION

**Discord OAuth is 95% complete!**

**Only external configuration needed**:
1. Discord Application registration
2. Supabase OAuth configuration

**All code is ready** - just need to enable it in Discord and Supabase!

---

## 📝 COMPLETE SETUP CHECKLIST

### **Google OAuth** ✅
- [x] Code implemented
- [x] Supabase configured
- [x] Working in production

### **GitHub OAuth** ⏳
- [x] Code implemented
- [ ] GitHub OAuth App created
- [ ] Supabase configured
- [ ] Tested

### **Discord OAuth** ⏳
- [x] Code implemented
- [ ] Discord Application created
- [ ] Supabase configured
- [ ] Tested

---

**Ready to configure both GitHub and Discord?** 🚀

**Total time for both**: ~40 minutes (20 min each)

**All code is 100% ready - just external configuration needed!** ✨
