# iBlood Multi-Tenancy Implementation Guide

## 🎯 Implementation Status

**Phase 1: Core Multi-Tenancy Infrastructure** - ✅ **COMPLETE**

This document summarizes the comprehensive multi-tenant authentication and organization management system that has been implemented.

---

## 📋 What Has Been Implemented

### 1. **Consolidated RBAC System** (`lib/rbac.js`)

**New Role Structure:**
- `super_admin` - Platform-wide access, manages all organizations
- `org_admin` - Full access to their organization only
- `manager` - Department management within org
- `staff` - Operational tasks within org
- `viewer` - Read-only access within org
- `pending` - Awaiting organization assignment

**New Features:**
- Organization capabilities system (manage_donors, manage_inventory, request_blood, fulfill_requests)
- Organization type capabilities (blood_bank, hospital, transfusion_center, ngo)
- Enhanced permission checking with `canUserAccessFeature()`
- Organization capability validation with `hasOrgCapability()`

### 2. **Updated User Model** (`lib/models/User.js`)

**Key Changes:**
- Removed auto-organization creation on signup
- Added `accountStatus` field (active, inactive, suspended, pending_approval)
- Added `invitedBy` tracking
- Added `requestedOrganizationId` for job-seeking style requests
- Added `bio`, `title`, `department` fields for organization requests
- Default role is now `pending` until assigned to organization
- Virtual properties: `hasOrganization`, `isPending`
- Instance methods: `assignToOrganization()`, `removeFromOrganization()`, `requestToJoinOrganization()`

### 3. **Invitation System** (`lib/models/Invitation.js`)

**Features:**
- Token-based invitations (7-day expiry)
- Role assignment on invitation
- Department and title support
- Access tracking (count and timestamp)
- Status tracking (pending, accepted, declined, expired, cancelled)
- Auto-expiry handling
- Methods: `accept()`, `decline()`, `cancel()`, `regenerateToken()`
- Static methods: `createInvitation()`, `findByToken()`, `findPendingForEmail()`

**API Endpoints:**
- `POST /api/invitations` - Create invitation (org_admin+ only)
- `GET /api/invitations` - List invitations (based on user role)
- `POST /api/invitations/accept` - Accept invitation

### 4. **Organization Request System** (`lib/models/OrganizationRequest.js`)

**Job-Seeking Style Features:**
- Users can request to join organizations
- Motivation/cover letter support
- Role preference (or 'any')
- Department preference
- Availability type (full-time, part-time, volunteer, contract)
- Experience and skills documentation
- Attachment support (CV, certificates) via Cloudinary
- Admin review workflow (approve/reject)
- Auto-expiry after 30 days
- Reminder system for pending requests

**API Endpoints:**
- `POST /api/organization-requests` - Create request
- `GET /api/organization-requests` - List requests
- `POST /api/organization-requests/[id]/actions` - Approve/reject request

### 5. **Session Management** (`lib/session.js`)

**New Utilities:**
- `getCurrentUser(cookies)` - Get and validate user from session
- `getCurrentOrganization(user)` - Get user's organization
- `canAccessOrganization(user, organizationId)` - Check org access
- `getOrganizationFilter(user)` - Get MongoDB filter for org isolation
- `requireOrganizationAccess(user)` - Validate org access
- `createSessionCookie(user, session)` - Create session data
- `setSessionCookie(response, sessionData)` - Set cookie
- `clearSessionCookie()` - Clear cookie
- `updateSessionCookie(response, request, updates)` - Update existing session

### 6. **Organization Guard Middleware** (`lib/middleware/organization-guard.js`)

**Middleware Functions:**
- `withOrganizationGuard(handler, options)` - Main wrapper for org isolation
- `requireAuth()` - Basic authentication requirement
- `requireSuperAdmin(handler)` - Super admin only routes
- `requireOrgAdmin(handler)` - Org admin only routes

**Features:**
- Automatic organization ID extraction from request
- Session validation
- Organization access checking
- Super admin bypass support
- Automatic MongoDB organization filter injection

### 7. **Updated Signup Flow** (`app/api/auth/signup/route.js`)

**New Flow:**
1. **With Invite Token:**
   - User receives invitation email with token
   - User signs up with token
   - Token validated and auto-accepts
   - User assigned to organization with specified role
   - Account status set to 'active'

2. **Without Invite:**
   - User signs up normally
   - Created with role='pending', accountStatus='pending_approval'
   - No organization assigned
   - Redirected to browse organizations or request to join

### 8. **Updated Setup Admin Endpoint** (`app/api/setup/admin/route.js`)

**Changes:**
- Creates `super_admin` role (not just 'admin')
- Creates "iBlood Platform Administration" organization
- Prevents multiple super admins (one-time setup)
- Added GET endpoint to check setup status
- Warning message about creating user in Supabase

### 9. **Updated Donors API** (`app/api/donors/route.js`)

**Enhancements:**
- Auto-detects organization from user session
- Validates user has donor management permissions
- Checks organization has donor management capability
- Super admins can access all organizations
- Regular users restricted to their organization only

---

## 🏗️ Architecture Overview

### **Multi-Tenant Data Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                     User Authentication                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Sign Up    │  │    Login     │  │   OAuth      │       │
│  │  (no org)    │  │  (with org)  │  │  (with org)  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          User State: pending + no org                │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Browse Orgs │  │ Accept Invite│  │ Request Join │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          User State: active + org assigned           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Organization Isolation                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Request with Organization Guard Middleware       │   │
│  │  1. Validate user session                             │   │
│  │  2. Extract organization ID from request              │   │
│  │  3. Check user can access organization                │   │
│  │  4. Inject organization filter into query             │   │
│  │  5. Execute handler with context                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MongoDB Query with Organization Filter               │   │
│  │  Super Admin: {} (no filter)                          │   │
│  │  Regular User: { organizationId: user.organizationId }│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### **User Journey**

```
Option A: Invitation Flow
─────────────────────────
1. Org Admin sends invitation → /api/invitations
2. System emails token to user
3. User clicks link → /auth/signup?token=xxx
4. User creates account with token
5. Invitation auto-accepted
6. User assigned to org with role
7. Login → Dashboard

Option B: Organization Request Flow
────────────────────────────────────
1. User signs up → pending state
2. User browses organizations → /dashboard/setup/browse
3. User requests to join org → /api/organization-requests
4. Org admin receives notification
5. Org admin reviews and approves
6. User assigned to org with role
7. User notified → Login → Dashboard

Option C: Super Admin Assignment
─────────────────────────────────
1. User signs up → pending state
2. Super admin sees pending users → /dashboard/super-admin/pending
3. Super admin assigns user to org
4. User notified → Login → Dashboard
```

---

## 🚀 How to Use the System

### **1. Initial Setup (One-Time)**

```bash
# Start the dev server
npm run dev

# Run super admin setup ONCE
curl -X POST http://localhost:3000/api/setup/admin

# Response will include:
# - Super admin user created
# - Platform organization created
# - IMPORTANT: Create this user in Supabase Auth with same email
```

**Next Steps:**
1. Go to Supabase Dashboard → Authentication → Users
2. Add user: `qinalexander56@gmail.com` with secure password
3. Login with credentials at `/auth/login`
4. Access super admin dashboard

### **2. Creating Organizations (Super Admin)**

```javascript
// Super admin dashboard will have:
// - Create Organization form
// - List all organizations
// - Assign users to organizations
```

### **3. Inviting Users (Org Admin)**

```javascript
// From organization settings:
POST /api/invitations
{
  "email": "user@example.com",
  "role": "staff",
  "department": "Laboratory",
  "title": "Lab Technician",
  "message": "Welcome to our team!"
}

// System sends email with invitation link
// User clicks link and signs up
// User auto-assigned to organization
```

### **4. Requesting to Join (Regular User)**

```javascript
// After signup without invite:
POST /api/organization-requests
{
  "organizationId": "org-id-here",
  "requestedRole": "staff",
  "motivation": "I want to contribute to...",
  "preferredDepartment": "Blood Collection",
  "reason": "Passionate about saving lives",
  "experience": "2 years as phlebotomist",
  "availability": "full-time"
}

// Org admin reviews and approves
// User notified and assigned
```

---

## 📁 New Files Created

### **Models**
- `lib/models/Invitation.js` - Invitation system
- `lib/models/OrganizationRequest.js` - Organization request system
- `lib/models/User.js` - Updated with multi-tenant support

### **Libraries**
- `lib/rbac.js` - Consolidated RBAC system
- `lib/session.js` - Session management utilities
- `lib/middleware/organization-guard.js` - Organization isolation middleware

### **API Routes**
- `app/api/invitations/route.js` - Create/list invitations
- `app/api/invitations/accept/route.js` - Accept invitation
- `app/api/organization-requests/route.js` - Create/list requests
- `app/api/organization-requests/[id]/actions/route.js` - Approve/reject
- `app/api/auth/signup/route.js` - Updated signup flow
- `app/api/setup/admin/route.js` - Updated super admin setup
- `app/api/donors/route.js` - Updated with org guard

---

## 🔒 Security Features

### **Organization Isolation**
- Every API call validates user's organization access
- MongoDB queries automatically filtered by organization
- Super admins can access all, regular users restricted to their org
- Cross-org access attempts logged and blocked

### **Permission Enforcement**
- Role-based permission checks on every mutation
- Organization capability validation
- Audit logging for all critical actions

### **Session Security**
- HTTP-only cookies
- Secure flag in production
- SameSite=lax CSRF protection
- Automatic expiry handling
- Session invalidation on org change

---

## ⚠️ IMPORTANT NOTES

### **For Super Admin Setup**
1. Run `/api/setup/admin` POST endpoint ONCE
2. Create the user in Supabase Auth manually
3. Login to access super admin dashboard
4. Endpoint will reject subsequent calls (prevents multiple super admins)

### **For Email Service**
- Invitation emails NOT yet implemented (marked as TODO)
- Need to integrate Google OAuth + Mailjet as discussed
- Temporary workaround: Show invitation link in UI

### **For Organization Capabilities**
- Blood banks: manage_donors, manage_inventory, fulfill_requests
- Hospitals: request_blood, manage_inventory (if they have blood bank)
- Transfusion centers: manage_inventory, fulfill_requests
- NGOs: manage_donors only

### **For Pending Users**
- Users without organization see limited dashboard
- Can browse organizations
- Can request to join organizations
- Cannot access donors, inventory, etc.

---

## 🎯 Next Steps (Remaining Tasks)

### **Priority 1: Super Admin Dashboard**
Create `/app/dashboard/super-admin/` with:
- Platform metrics (total orgs, users, pending requests)
- Organization list with actions (edit, suspend, delete)
- Pending users list with assign actions
- Pending organization requests across all orgs
- Create organization form
- System-wide audit log viewer

### **Priority 2: User Management APIs**
Create `/app/api/users/` endpoints:
- `GET /api/users` - List users in org (org_admin+)
- `PUT /api/users/:id/role` - Update user role (org_admin+)
- `PUT /api/users/:id/department` - Update department
- `DELETE /api/users/:id` - Remove user from org (org_admin+)
- `POST /api/users/:id/reactivate` - Reactivate user
- `GET /api/users/pending` - List pending users (org_admin+)

### **Priority 3: Cloudinary Integration**
- Create `app/api/uploads/upload/route.js`
- Create reusable upload widget component
- Add file upload to organization request (CV, certificates)
- Add avatar upload to user profile
- Add organization logo upload

### **Priority 4: Email Service**
- Setup Google OAuth for Gmail sending
- Setup Mailjet as backup
- Create email templates:
  - Invitation email
  - Organization request notification
  - Request approved/rejected notification
  - Welcome email
- Integrate with invitation and request flows

### **Priority 5: Frontend Updates**
- Update signup page to support invite token
- Create organization browse page for pending users
- Create organization request page
- Update login redirect logic (pending users → browse orgs)
- Add organization switcher (for future multi-org support)
- Update user profile to show org info

### **Priority 6: Update Remaining APIs**
Apply organization guard to:
- `/api/inventory/*`
- `/api/requests/*`
- `/api/reports/*`
- `/api/organizations/*`

---

## 🧪 Testing Checklist

### **Super Admin Flow**
- [ ] Run setup endpoint
- [ ] Create user in Supabase
- [ ] Login as super admin
- [ ] Access super admin dashboard
- [ ] Create new organization
- [ ] View all organizations
- [ ] View pending users
- [ ] Assign user to organization

### **Invitation Flow**
- [ ] Org admin sends invitation
- [ ] Receive invitation email (when implemented)
- [ ] Click invitation link
- [ ] Sign up with token
- [ ] Auto-assigned to organization
- [ ] Access dashboard with correct permissions

### **Organization Request Flow**
- [ ] User signs up without invite
- [ ] Browse available organizations
- [ ] Submit request to join
- [ ] Org admin receives notification
- [ ] Org admin approves request
- [ ] User assigned to organization
- [ ] User can access dashboard

### **Organization Isolation**
- [ ] User from Org A cannot access Org B's donors
- [ ] User from Org A cannot access Org B's inventory
- [ ] Super admin can access all organizations
- [ ] Organization filter applied to all queries
- [ ] Cross-org access attempts logged

### **Permission Enforcement**
- [ ] Viewer role cannot create/edit/delete
- [ ] Staff can create but not approve requests
- [ ] Manager can approve requests
- [ ] Org admin can manage users
- [ ] Permission denied errors shown correctly

---

## 📊 Database Migration

**No migration needed** - New models will auto-create indexes on first use.

**Existing Data:**
- Existing users will need role updated if they were 'admin' → change to 'org_admin' or 'super_admin'
- Existing organizations will work with new capability system automatically

**Manual Migration Script (if needed):**
```javascript
// Update old 'admin' role to 'org_admin'
db.users.updateMany(
  { role: 'admin' },
  { $set: { role: 'org_admin' } }
)

// Set default accountStatus for existing users
db.users.updateMany(
  { accountStatus: { $exists: false } },
  { $set: { accountStatus: 'active' } }
)
```

---

## 🎓 Key Concepts

### **Organization Capabilities**
Not all organizations can do everything. Capabilities are determined by organization type:
- **Blood Bank**: Can manage donors, store blood, fulfill requests
- **Hospital**: Can request blood, may store blood (if they have blood bank)
- **Transfusion Center**: Can store and fulfill
- **NGO**: Can only manage donors (recruitment drives)

### **Role Hierarchy**
```
super_admin (platform-wide)
  └─ org_admin (organization-wide)
      └─ manager (department-wide)
          └─ staff (operational)
              └─ viewer (read-only)
```

### **User States**
```
pending → awaiting org assignment
  ├─→ active (assigned to org)
  ├─→ suspended (temporarily blocked)
  └─→ inactive (soft deleted)
```

---

## 📞 Support

For questions or issues with the multi-tenant implementation:
1. Check this guide first
2. Review model files for schema details
3. Check middleware for auth flow
4. Review RBAC for permission structure

---

**Implementation Date**: March 26, 2026
**Status**: Phase 1 Complete - Core Infrastructure Ready
**Next Phase**: Super Admin Dashboard & User Management
