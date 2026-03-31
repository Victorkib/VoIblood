# Super Admin Setup - Complete Guide

## 🎯 THREE WAYS TO SETUP SUPER ADMIN

Choose the method that works best for you!

---

## ✨ METHOD 1: Web Interface (EASIEST - RECOMMENDED)

### Steps:

1. **Login normally**
   - Go to http://localhost:3000/auth/login
   - Login with `qinalexander56@gmail.com`

2. **Open the setup page**
   - Go to http://localhost:3000/setup-super-admin.html
   - Page will automatically check if you're logged in

3. **Click "Upgrade to Super Admin"**
   - Wait for processing
   - See success message
   - Page auto-refreshes

4. **Done!** ✅ You're now super_admin

### Why This Method is Best:
- ✅ Visual interface with status updates
- ✅ Automatic authentication check
- ✅ Clear error messages
- ✅ One-click upgrade
- ✅ Auto-refresh after success

---

## 🖥️ METHOD 2: Browser Console (QUICK)

### Steps:

1. **Login normally**
   - http://localhost:3000/auth/login
   - Email: `qinalexander56@gmail.com`

2. **Open browser DevTools** (F12)

3. **Go to Console tab**

4. **Paste this code:**
```javascript
fetch('/api/setup/admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
})
.then(r => r.json())
.then(data => {
  console.log('✅ Result:', data);
  if (data.success) {
    alert('🎉 Success! Refreshing...');
    location.reload();
  } else {
    alert('❌ Error: ' + (data.error || 'Unknown error'));
  }
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error occurred. Check console.');
});
```

5. **Press Enter**

6. **Done!** ✅ Refresh page to see super_admin access

---

## 🔧 METHOD 3: API Direct (ADVANCED)

### Steps:

1. **Login in browser**

2. **Copy session cookie:**
   - Open DevTools (F12)
   - Application → Cookies → `auth-session`
   - Copy the value

3. **Run curl command:**
```bash
curl -X POST http://localhost:3000/api/setup/admin \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=YOUR_COOKIE_VALUE_HERE"
```

4. **Done!** ✅ Logout and login again

---

## 📊 WHAT HAPPENS DURING UPGRADE

### The system:

1. ✅ Reads your current session
2. ✅ Verifies your email is `qinalexander56@gmail.com`
3. ✅ Updates your role to `super_admin`
4. ✅ Sets account status to `active`
5. ✅ Creates platform administration organization
6. ✅ Links you to the organization
7. ✅ You keep your existing password!

### Your user record changes:
```javascript
// Before:
{
  email: 'qinalexander56@gmail.com',
  role: 'staff',  // or whatever it was
  organizationId: null
}

// After:
{
  email: 'qinalexander56@gmail.com',
  role: 'super_admin',  // ← Upgraded!
  accountStatus: 'active',
  organizationId: ObjectId("..."),
  organizationName: 'iBlood Platform Administration'
}
```

---

## ✅ VERIFICATION

### Method 1: Check in Browser
```javascript
// Open console and run:
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log('Your role:', data.user?.role))
// Should print: super_admin
```

### Method 2: Check in MongoDB
```javascript
// In MongoDB Compass or mongosh:
db.users.findOne({ email: 'qinalexander56@gmail.com' })
// Should show role: 'super_admin'
```

### Method 3: Check via API
```bash
curl http://localhost:3000/api/setup/admin
# Should show setup: true with your details
```

---

## 🎯 WHAT YOU CAN DO AS SUPER_ADMIN

### Organizations:
- ✅ Create new organizations
- ✅ View all organizations across platform
- ✅ Manage organization settings
- ✅ Suspend or delete organizations

### Users:
- ✅ View all users across platform
- ✅ Assign users to organizations
- ✅ Change user roles
- ✅ Remove users from organizations
- ✅ Approve organization requests

### Data Access:
- ✅ Access any organization's data
- ✅ View donors from all orgs
- ✅ View inventory from all orgs
- ✅ View all requests
- ✅ View platform-wide reports

### System:
- ✅ View audit logs
- ✅ Manage system settings
- ✅ Configure platform features
- ✅ Override restrictions

---

## ⚠️ TROUBLESHOOTING

### Problem: "Not Logged In"

**Solution:**
1. Make sure you're logged in
2. Don't wait too long (session expires)
3. Try logging in again immediately before running upgrade

### Problem: "Wrong Email"

**Solution:**
- You must be logged in as `qinalexander56@gmail.com`
- Logout and login with correct email
- Only this email can be upgraded to super_admin

### Problem: "Already super admin"

**Solution:**
- Nothing to do! You're already upgraded.
- Just refresh the page
- You should have full access now

### Problem: Nothing happens when clicking button

**Solution:**
1. Open browser console (F12)
2. Check for errors
3. Make sure you're on http://localhost:3000
4. Try clearing browser cache
5. Try in incognito/private mode

### Problem: Session expired

**Solution:**
- Session expires after 7 days of inactivity
- Just login again
- Then immediately run upgrade

---

## 🔐 SECURITY NOTES

### Who can become super_admin?
- Only `qinalexander56@gmail.com`
- Hardcoded for security
- Cannot be changed without code modification

### Can I change the email?
Yes, edit `app/api/setup/admin/route.js`:
```javascript
const adminEmail = 'your-email@example.com' // Change this
```

### Should I disable this after setup?
Recommended! After you have super_admin:
1. Delete or comment out the setup endpoint
2. Or add IP whitelist
3. Or require additional authentication

### Is my password safe?
- ✅ Yes, password never changes during upgrade
- ✅ Your existing Supabase password remains
- ✅ No password is stored in MongoDB
- ✅ All authentication still via Supabase

---

## 📋 POST-SETUP CHECKLIST

After becoming super_admin:

- [ ] Change your password (if using default)
- [ ] Create your first organization
- [ ] Invite team members
- [ ] Configure organization settings
- [ ] Test accessing different features
- [ ] Review audit logs
- [ ] Setup email notifications (when available)
- [ ] Document your super_admin credentials securely

---

## 🎓 QUICK REFERENCE

### URLs:
- Login: http://localhost:3000/auth/login
- Setup Page: http://localhost:3000/setup-super-admin.html
- Dashboard: http://localhost:3000/dashboard

### API Endpoints:
- Setup: `POST /api/setup/admin`
- Check Status: `GET /api/setup/admin`
- Session: `GET /api/auth/session`
- Login: `POST /api/auth/login`

### MongoDB Queries:
```javascript
// Find super_admin
db.users.findOne({ role: 'super_admin' })

// Find by email
db.users.findOne({ email: 'qinalexander56@gmail.com' })

// Count users by role
db.users.aggregate([
  { $group: { _id: '$role', count: { $sum: 1 } } }
])
```

---

## 🚀 RECOMMENDED FLOW

**For First-Time Setup:**
1. Use Method 1 (Web Interface)
2. Verify in MongoDB
3. Test super_admin features
4. Document credentials

**For Re-setup (if needed):**
1. Use Method 2 (Browser Console)
2. Quick and efficient
3. No need to navigate to setup page

**For Automation:**
1. Use Method 3 (API Direct)
2. Can script it
3. Good for CI/CD

---

## 📞 NEED HELP?

### Check these first:
1. Are you logged in?
2. Is your email correct?
3. Is your session valid?
4. Check browser console for errors

### Still stuck?
1. Try a different browser
2. Clear cookies and cache
3. Try incognito/private mode
4. Check MongoDB is running
5. Verify Supabase connection

---

**Last Updated:** March 26, 2026  
**Version:** 2.0.0 (Patch Mode)  
**Recommended Method:** ✨ Method 1 (Web Interface)
