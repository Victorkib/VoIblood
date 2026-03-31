# Email Service Setup Guide - Google OAuth + Mailjet

## 🎯 CONFIGURATION OVERVIEW

**Primary:** Google OAuth (Gmail)  
**Backup:** Mailjet  
**Auto-Fallback:** If primary fails, automatically uses backup

---

## 📋 STEP 1: GOOGLE OAUTH SETUP (PRIMARY)

### **1.1 Create Google Cloud Project**

1. Go to https://console.cloud.google.com/
2. Click "Select a Project" → "New Project"
3. Name: `iBlood System`
4. Click "Create"

### **1.2 Enable Gmail API**

1. In Google Cloud Console
2. Go to "APIs & Services" → "Library"
3. Search for "Gmail API"
4. Click "Enable"

### **1.3 Create OAuth Credentials**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth Client ID"
3. Application type: **Web application**
4. Name: `iBlood Email Service`
5. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/callback/google
   https://yourdomain.com/auth/callback/google
   ```
6. Click "Create"
7. **Download JSON** or copy:
   - Client ID
   - Client Secret

### **1.4 Get OAuth Refresh Token**

**Option A: Use Google OAuth Playground (Easiest)**

1. Go to https://developers.google.com/oauthplayground/
2. Click gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter:
   - OAuth Client ID: (from step 1.3)
   - OAuth Client Secret: (from step 1.3)
4. Close settings
5. In "Step 1", search for "Gmail API v1"
6. Select: `https://www.googleapis.com/auth/gmail.send`
7. Click "Authorize APIs"
8. Sign in with your Google account
9. Grant permissions
10. In "Step 2", click "Exchange authorization code for tokens"
11. Copy the **Refresh Token**

**Option B: Run OAuth Flow in App**

1. Implement OAuth route in your app
2. User authorizes
3. Store refresh token from response

### **1.5 Add to .env.local**

```env
# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google
GOOGLE_REFRESH_TOKEN=1//0abc123def456...

# Email From
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=iBlood System
```

---

## 📋 STEP 2: MAILJET SETUP (BACKUP)

### **2.1 Create Mailjet Account**

1. Go to https://app.mailjet.com/
2. Sign up for free account
3. Verify your email

### **2.2 Verify Sender Email**

1. Go to "Sender Addresses & Domains"
2. Click "Add Sender Address"
3. Enter email: `noreply@yourdomain.com` or your verified email
4. Check email for verification link
5. Click verification link

### **2.3 Get API Keys**

1. Go to "Account Settings" → "API Keys"
2. Click "Create API Key"
3. Name: `iBlood System`
4. Copy:
   - API Key (v3.1)
   - Secret Key (v3.1)

### **2.4 Add to .env.local**

```env
# Mailjet
MAILJET_API_KEY=abc123def456ghi789
MAILJET_SECRET_KEY=jkl012mno345pqr678
MAILJET_FROM_EMAIL=verified-email@yourdomain.com
MAILJET_FROM_NAME=iBlood System
```

---

## 📋 STEP 3: CONFIGURE EMAIL SERVICE PREFERENCES

### **Add to .env.local:**

```env
# Email Service Preference
EMAIL_SERVICE_PRIMARY=google
EMAIL_SERVICE_BACKUP=mailjet
```

**Options:**
- `EMAIL_SERVICE_PRIMARY=google` - Use Google OAuth first
- `EMAIL_SERVICE_PRIMARY=mailjet` - Use Mailjet first
- Auto-fallback if primary fails

---

## 📋 STEP 4: TEST EMAIL SERVICE

### **Test Script:**

Create `test-email.js`:

```javascript
const { sendEmail, sendInvitationEmail } = require('./lib/email-service')

async function test() {
  console.log('Testing email service...')
  
  // Test 1: Send test email
  const result1 = await sendEmail({
    to: 'test@example.com',
    subject: 'Test Email',
    html: '<h1>Test</h1><p>This is a test email</p>',
    text: 'Test email',
  })
  
  console.log('Test 1:', result1)
  
  // Test 2: Send invitation email
  const result2 = await sendInvitationEmail({
    email: 'newuser@example.com',
    invitationLink: 'http://localhost:3000/auth/signup?token=test123',
    organizationName: 'Test Org',
    role: 'staff',
    senderName: 'Admin',
  })
  
  console.log('Test 2:', result2)
}

test().catch(console.error)
```

### **Run Test:**

```bash
node test-email.js
```

**Expected Output:**
```
Testing email service...
Sending email via Google OAuth...
Test 1: { success: true, service: 'google', messageId: '...' }
Sending email via Google OAuth...
Test 2: { success: true, service: 'google', messageId: '...' }
```

---

## 🔧 TROUBLESHOOTING

### **Issue: "Google OAuth refresh token not configured"**

**Solution:**
- Check `GOOGLE_REFRESH_TOKEN` in .env.local
- Make sure it starts with `1//`
- Re-generate if expired

### **Issue: "Mailjet API error"**

**Solution:**
- Verify API keys are correct
- Check sender email is verified in Mailjet
- Check account has available credits (free tier has 200/day)

### **Issue: "All email services are unavailable"**

**Solution:**
- Check both services are configured
- Check .env.local is loaded
- Restart dev server

---

## 📊 EMAIL TEMPLATES AVAILABLE

### **1. Invitation Email**
- Sent when super_admin invites user
- Includes invitation link
- Shows organization name and role
- Expires in 7 days

**Function:** `sendInvitationEmail(invitationData)`

### **2. Welcome Email**
- Sent when user account created with credentials
- Includes login credentials
- Shows temporary password
- Welcome message

**Function:** `sendWelcomeEmail(userData)`

### **3. Custom Email**
- Send any custom email
- HTML and text versions
- Auto-fallback between services

**Function:** `sendEmail(options)`

---

## 🎯 USAGE IN YOUR APP

### **Example: Send Invitation After Creating**

```javascript
// In /api/admin/users/invite/route.js
import { sendInvitationEmail } from '@/lib/email-service'

// After creating invitation
await sendInvitationEmail({
  email: invitation.email,
  invitationLink: invitationLink,
  organizationName: organization.name,
  role: invitation.role,
  senderName: currentUser.fullName,
})
```

### **Example: Send Welcome After Creating User**

```javascript
// In /api/admin/users/create/route.js
import { sendWelcomeEmail } from '@/lib/email-service'

// After creating user
await sendWelcomeEmail({
  email: mongoUser.email,
  fullName: mongoUser.fullName,
  organizationName: organizationName,
  credentials: {
    email: email,
    temporaryPassword: password,
  },
})
```

---

## ✅ COMPLETE .env.local EXAMPLE

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MongoDB
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/iblood

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Email - Google OAuth (Primary)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google
GOOGLE_REFRESH_TOKEN=1//0abc123def456
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=iBlood System

# Email - Mailjet (Backup)
MAILJET_API_KEY=abc123def456
MAILJET_SECRET_KEY=jkl012mno345
MAILJET_FROM_EMAIL=verified@yourdomain.com
MAILJET_FROM_NAME=iBlood System

# Preferences
EMAIL_SERVICE_PRIMARY=google
EMAIL_SERVICE_BACKUP=mailjet

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset
```

---

## 🚀 NEXT STEPS

1. ✅ Set up Google OAuth (follow steps above)
2. ✅ Set up Mailjet account
3. ✅ Add all variables to .env.local
4. ✅ Test with test-email.js
5. ✅ Integrate with invitation system
6. ✅ Integrate with user creation

**Once configured, emails will send automatically when:**
- Creating users with credentials
- Sending invitations
- Any other email triggers you add

---

**Ready to proceed with multi-tenant implementation after email setup!** 🚀
