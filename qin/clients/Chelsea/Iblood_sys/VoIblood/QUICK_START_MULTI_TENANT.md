# iBlood Multi-Tenant Quick Start Guide

## 🚀 Immediate Actions (Do These First)

### Step 1: Setup Super Admin

```bash
# 1. Start dev server
npm run dev

# 2. In a new terminal, run setup:
curl -X POST http://localhost:3000/api/setup/admin

# Expected response:
{
  "success": true,
  "message": "Super admin setup complete",
  "data": {
    "user": {
      "email": "qinalexander56@gmail.com",
      "fullName": "Qin Alexander",
      "role": "super_admin"
    },
    "organization": {
      "name": "iBlood Platform Administration"
    }
  }
}
```

### Step 2: Create User in Supabase

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **Add User**
5. Email: `qinalexander56@gmail.com`
6. Password: Create a secure password
7. **DO NOT** set email confirmation (or confirm it immediately)

### Step 3: Login

1. Navigate to http://localhost:3000/auth/login
2. Email: `qinalexander56@gmail.com`
3. Password: (the one you just set)
4. You should now be logged in as super admin

---

## 📋 What You Can Do Now

### As Super Admin:

✅ View all organizations (once created)
✅ Create new organizations
✅ Assign users to organizations
✅ View platform-wide metrics
✅ Access any organization's data
✅ Manage system settings

---

## 🎯 Creating Your First Organization

**API Method (for now):**

```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=YOUR_SESSION_COOKIE" \
  -d '{
    "name": "City Blood Bank",
    "type": "blood_bank",
    "email": "info@citybloodbank.com",
    "phone": "+1-555-0123",
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "country": "United States"
  }'
```

**Note:** You'll need to copy the `auth-session` cookie from your browser after login.

---

## 👥 Inviting Users to Organization

**Once you have an organization:**

```bash
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=YOUR_SESSION_COOKIE" \
  -d '{
    "email": "user@example.com",
    "role": "staff",
    "department": "Laboratory",
    "title": "Lab Technician",
    "message": "Welcome to our team!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "email": "user@example.com",
    "role": "staff",
    "expiresAt": "2026-04-02T00:00:00.000Z"
  }
}
```

**Note:** Email sending not yet implemented. You'll need to manually give the invitation token to the user.

---

## 🔗 User Signup Flow

### With Invitation:

```
User receives invitation token
    ↓
Goes to /auth/signup?token=INVITE_TOKEN
    ↓
Fills signup form (email must match invitation)
    ↓
Account created with organization + role
    ↓
Auto-login → Dashboard
```

### Without Invitation:

```
User goes to /auth/signup
    ↓
Fills signup form
    ↓
Account created as "pending" (no org)
    ↓
Redirected to browse organizations
    ↓
Requests to join organization
    ↓
Org admin approves
    ↓
User can access dashboard
```

---

## 🛡️ Security Features Active

### ✅ Organization Isolation
- Users can ONLY see data from their organization
- Super admin can see everything
- Cross-org access blocked automatically

### ✅ Permission Enforcement
- Each role has specific permissions
- API calls check permissions
- Unauthorized actions blocked

### ✅ Session Management
- HTTP-only cookies (secure)
- Auto-expiry after 7 days
- Invalidated on org change

---

## 📁 Key Files to Know

```
lib/rbac.js                          # Role & permission definitions
lib/session.js                       # Session utilities
lib/middleware/organization-guard.js # Organization isolation
lib/models/User.js                   # User model (updated)
lib/models/Invitation.js             # Invitation system
lib/models/OrganizationRequest.js    # Org request system
app/api/setup/admin/route.js         # Super admin setup
app/api/auth/signup/route.js         # Updated signup
app/api/invitations/route.js         # Invitation management
app/api/organization-requests/route.js # Org requests
```

---

## 🐛 Troubleshooting

### "Super admin already exists"
- This is expected after first setup
- Login with the admin account instead
- To reset: Delete user from MongoDB and try again

### "Authentication required"
- Make sure you're logged in
- Check cookie is set in browser
- Session might have expired (re-login)

### "Organization access required"
- User hasn't been assigned to an organization yet
- As super admin, assign user to an org
- Or user can request to join an org

### "Insufficient permissions"
- User's role doesn't have the required permission
- Check role in User model
- Org admin can upgrade user's role

---

## 🎯 Next Development Steps

### 1. Build Super Admin Dashboard
Create: `app/dashboard/super-admin/page.jsx`
- List all organizations
- Create organization form
- List pending users
- Assign users to orgs

### 2. Build Organization Browse Page
Create: `app/dashboard/setup/browse/page.jsx`
- For pending users
- List available organizations
- Request to join button

### 3. Build User Management
Create: `app/dashboard/settings/team/page.jsx`
- List org members
- Invite users
- Change roles
- Remove users

### 4. Integrate Cloudinary
- Add file upload endpoint
- Add upload widget component
- Enable avatar uploads
- Enable org request attachments

### 5. Integrate Email Service
- Setup Google OAuth
- Setup Mailjet backup
- Create email templates
- Send invitations via email

---

## 📊 Testing Multi-Tenancy

### Test Case 1: Organization Isolation
```
1. Create Org A with User A (org_admin)
2. Create Org B with User B (org_admin)
3. Login as User A
4. Try to access Org B's donors → Should FAIL
5. Login as User B
6. Can access Org B's donors → Should WORK
```

### Test Case 2: Super Admin Access
```
1. Login as super admin
2. Access Org A's donors → Should WORK
3. Access Org B's donors → Should WORK
4. Create new org → Should WORK
```

### Test Case 3: Invitation Flow
```
1. Org admin sends invitation
2. User signs up with token
3. User auto-assigned to org
4. User can access org resources → Should WORK
```

### Test Case 4: Organization Request
```
1. User signs up without org
2. User requests to join org
3. Org admin approves
4. User can access org resources → Should WORK
```

---

## 💡 Pro Tips

1. **Use Postman/Insomnia** for API testing until dashboards are built
2. **Check MongoDB directly** to verify data (organizationId field)
3. **Use browser dev tools** to inspect cookies and session
4. **Log console outputs** to debug auth issues
5. **Test with multiple browsers** for multi-user scenarios

---

## 📞 Quick Reference Commands

```bash
# Check if super admin exists
curl http://localhost:3000/api/setup/admin

# Get current user session (from browser console)
document.cookie.split('; ').find(row => row.startsWith('auth-session'))

# Decode session cookie (browser console)
JSON.parse(decodeURIComponent(document.cookie.split('auth-session=')[1].split(';')[0]))

# View MongoDB data
mongosh
use iblood
db.users.find()
db.organizations.find()
db.invitations.find()
```

---

**Last Updated**: March 26, 2026
**Version**: 1.0.0 (Multi-Tenant Foundation)
**Status**: Ready for Testing
