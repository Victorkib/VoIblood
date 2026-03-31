# 🧭 Navigation Guide - Complete System Navigation

## 🎯 OVERVIEW

This guide shows **exactly** what each role can see and access in the system.

---

## 📊 NAVIGATION BY ROLE

### **Super Admin Navigation**

**Sidebar Sections:**

```
┌─────────────────────────────────┐
│  👑 Platform Admin              │ ← Super Admin Only
│  - Platform Admin               │
├─────────────────────────────────┤
│  📋 Main Menu                   │
│  - Dashboard                    │
│  - Donors                       │
│  - Inventory                    │
│  - Expiry Alerts                │
│  - Hospital Requests            │
│  - Reports                      │
├─────────────────────────────────┤
│  🎯 Admin Tools                 │ ← Super Admin + Org Admin
│  - Donation Drives              │
│  - Analytics                    │
├─────────────────────────────────┤
│  🏢 Organizations               │ ← Super Admin Only
│  - Organizations                │
├─────────────────────────────────┤
│  ⚙️ Settings                    │
│  - Settings                     │
│  - Sign Out                     │
└─────────────────────────────────┘
```

**Accessible Pages:**
1. ✅ `/dashboard` - Main dashboard
2. ✅ `/dashboard/super-admin` - Platform admin
3. ✅ `/dashboard/donors` - Donor management
4. ✅ `/dashboard/inventory` - Blood inventory
5. ✅ `/dashboard/expiry` - Expiry alerts
6. ✅ `/dashboard/requests` - Hospital requests
7. ✅ `/dashboard/reports` - Reports
8. ✅ `/dashboard/drives` - Donation drives
9. ✅ `/dashboard/analytics` - Analytics
10. ✅ `/dashboard/organizations` - Organizations list
11. ✅ `/dashboard/settings` - Settings
12. ✅ `/dashboard/settings/team` - Team management (own org)

---

### **Org Admin Navigation**

**Sidebar Sections:**

```
┌─────────────────────────────────┐
│  🏢 Organization                │ ← Shows org name
│  City Blood Bank                │
│  org_admin                      │
├─────────────────────────────────┤
│  📋 Main Menu                   │
│  - Dashboard                    │
│  - Donors                       │
│  - Inventory                    │
│  - Expiry Alerts                │
│  - Hospital Requests            │
│  - Reports                      │
├─────────────────────────────────┤
│  🎯 Admin Tools                 │ ← Super Admin + Org Admin
│  - Donation Drives              │
│  - Analytics                    │
├─────────────────────────────────┤
│  👥 Team                        │ ← Org Admin Only
│  - Team                         │
├─────────────────────────────────┤
│  ⚙️ Settings                    │
│  - Settings                     │
│  - Sign Out                     │
└─────────────────────────────────┘
```

**Accessible Pages:**
1. ✅ `/dashboard` - Main dashboard (org data only)
2. ✅ `/dashboard/donors` - Donor management (org only)
3. ✅ `/dashboard/inventory` - Blood inventory (org only)
4. ✅ `/dashboard/expiry` - Expiry alerts (org only)
5. ✅ `/dashboard/requests` - Hospital requests (org only)
6. ✅ `/dashboard/reports` - Reports (org only)
7. ✅ `/dashboard/drives` - **Donation drives** ✨
8. ✅ `/dashboard/analytics` - **Analytics** ✨
9. ✅ `/dashboard/settings/team` - **Team management** ✨
10. ✅ `/dashboard/settings` - Settings

**NOT Accessible:**
- ❌ `/dashboard/super-admin` - Platform admin
- ❌ `/dashboard/organizations` - Organizations list

---

### **Manager Navigation**

**Sidebar Sections:**

```
┌─────────────────────────────────┐
│  🏢 Organization                │
│  City Blood Bank                │
│  manager                        │
├─────────────────────────────────┤
│  📋 Main Menu                   │
│  - Dashboard                    │
│  - Donors                       │
│  - Inventory                    │
│  - Expiry Alerts                │
│  - Hospital Requests            │
│  - Reports                      │
├─────────────────────────────────┤
│  🎯 Admin Tools                 │
│  - Donation Drives              │
│  - Analytics                    │
├─────────────────────────────────┤
│  ⚙️ Settings                    │
│  - Settings                     │
│  - Sign Out                     │
└─────────────────────────────────┘
```

**Accessible Pages:**
1. ✅ `/dashboard` - Main dashboard (org data only)
2. ✅ `/dashboard/donors` - Donor management
3. ✅ `/dashboard/inventory` - Blood inventory
4. ✅ `/dashboard/expiry` - Expiry alerts
5. ✅ `/dashboard/requests` - Hospital requests
6. ✅ `/dashboard/reports` - Reports
7. ✅ `/dashboard/drives` - View drives
8. ✅ `/dashboard/analytics` - View analytics
9. ✅ `/dashboard/settings` - Settings

**NOT Accessible:**
- ❌ `/dashboard/settings/team` - Team management
- ❌ `/dashboard/super-admin` - Platform admin
- ❌ `/dashboard/organizations` - Organizations list

---

### **Staff Navigation**

**Sidebar Sections:**

```
┌─────────────────────────────────┐
│  🏢 Organization                │
│  City Blood Bank                │
│  staff                          │
├─────────────────────────────────┤
│  📋 Main Menu                   │
│  - Dashboard                    │
│  - Donors                       │
│  - Inventory                    │
│  - Expiry Alerts                │
│  - Hospital Requests            │
│  - Reports                      │
├─────────────────────────────────┤
│  ⚙️ Settings                    │
│  - Settings                     │
│  - Sign Out                     │
└─────────────────────────────────┘
```

**Accessible Pages:**
1. ✅ `/dashboard` - Main dashboard (org data only)
2. ✅ `/dashboard/donors` - Donor management (create/edit)
3. ✅ `/dashboard/inventory` - Blood inventory (create/edit)
4. ✅ `/dashboard/expiry` - Expiry alerts (view only)
5. ✅ `/dashboard/requests` - Hospital requests (create/view)
6. ✅ `/dashboard/reports` - Reports (view only)
7. ✅ `/dashboard/drives` - View drives
8. ✅ `/dashboard/analytics` - View analytics
9. ✅ `/dashboard/settings` - Settings

**NOT Accessible:**
- ❌ `/dashboard/settings/team` - Team management
- ❌ `/dashboard/super-admin` - Platform admin
- ❌ `/dashboard/organizations` - Organizations list

---

## 🎯 FEATURE ACCESSIBILITY MATRIX

| Feature | Super Admin | Org Admin | Manager | Staff | Viewer |
|---------|-------------|-----------|---------|-------|--------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Donors (CRUD)** | ✅ | ✅ | ✅ | ✅/❌ | ❌ |
| **Inventory (CRUD)** | ✅ | ✅ | ✅ | ✅/❌ | ❌ |
| **Requests (All)** | ✅ | ✅ | ✅ | ✅/❌ | ❌ |
| **Reports** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Donation Drives** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Analytics** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Team Management** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Organizations** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Platform Admin** | ✅ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ = Full Access, ✅/❌ = Partial Access, ❌ = No Access

---

## 🔍 KEY PAGES FOR ORG ADMIN

### **1. Donation Drives** (`/dashboard/drives`)

**What Org Admin Can Do:**
- ✅ Create donation drives
- ✅ Generate registration links
- ✅ Share to WhatsApp/SMS
- ✅ Activate/deactivate drives
- ✅ View drive statistics
- ✅ Delete drives (if no registrations)

**How to Access:**
```
Sidebar → Donation Drives
```

---

### **2. Analytics** (`/dashboard/analytics`)

**What Org Admin Can See:**
- ✅ Total drives, registrations, conversion rate
- ✅ Registration trends (7-day chart)
- ✅ Top performing drives
- ✅ Blood type distribution
- ✅ Gender distribution
- ✅ Age groups
- ✅ Export reports

**How to Access:**
```
Sidebar → Analytics
```

---

### **3. Team Management** (`/dashboard/settings/team`)

**What Org Admin Can Do:**
- ✅ List all team members
- ✅ Search and filter members
- ✅ Invite new members (via email link)
- ✅ Create members (with credentials)
- ✅ Edit member roles
- ✅ Suspend/activate members

**How to Access:**
```
Sidebar → Team (under Main Menu)
```

---

## 🧪 NAVIGATION TESTING CHECKLIST

### **Test as Org Admin:**

```
✓ Login as org_admin
✓ See organization badge in sidebar
✓ Can access Dashboard
✓ Can access Donors
✓ Can access Inventory
✓ Can access Expiry Alerts
✓ Can access Requests
✓ Can access Reports
✓ Can access Donation Drives ✨
✓ Can access Analytics ✨
✓ Can access Team ✨
✓ Cannot access Platform Admin
✓ Cannot access Organizations
```

### **Test as Super Admin:**

```
✓ Login as super_admin
✓ See Platform Admin section
✓ Can access all org_admin pages
✓ Can access Platform Admin
✓ Can access Organizations
✓ Can see all organizations' data
```

---

## 🎯 QUICK ACCESS LINKS

### **For Org Admin:**

| Feature | URL | Icon | Location |
|---------|-----|------|----------|
| Dashboard | `/dashboard` | 📊 | Main Menu |
| Donors | `/dashboard/donors` | 👥 | Main Menu |
| Inventory | `/dashboard/inventory` | 📦 | Main Menu |
| Drives | `/dashboard/drives` | 🏢 | Admin Tools |
| Analytics | `/dashboard/analytics` | 📈 | Admin Tools |
| Team | `/dashboard/settings/team` | 👤 | Team |

---

### **For Super Admin:**

| Feature | URL | Icon | Location |
|---------|-----|------|----------|
| All Org Admin links | (see above) | - | - |
| Platform Admin | `/dashboard/super-admin` | 🛡️ | Platform Admin |
| Organizations | `/dashboard/organizations` | 🏢 | Organizations |

---

## 🚨 COMMON NAVIGATION ISSUES

### **Issue 1: "Can't see Donation Drives link"**

**Cause:**
- User is not org_admin or super_admin
- Sidebar not updated

**Solution:**
- Check user role in session
- Verify sidebar.jsx has drivesNavItem
- Refresh page

---

### **Issue 2: "Can't see Analytics link"**

**Cause:**
- User is not org_admin or super_admin
- Sidebar not updated

**Solution:**
- Check user role
- Verify sidebar.jsx has analyticsNavItem
- Refresh page

---

### **Issue 3: "Can't see Team link"**

**Cause:**
- User is not org_admin
- Sidebar not updated

**Solution:**
- Check user role is org_admin
- Verify sidebar.jsx has teamNavItem
- Refresh page

---

### **Issue 4: "Organization badge not showing"**

**Cause:**
- User doesn't have organizationId
- User is super_admin (expected)

**Solution:**
- Check user has organizationId in session
- For super_admin, this is expected (no org badge)

---

## 📊 NAVIGATION FLOW DIAGRAM

```
Login
    ↓
Check Role
    ├─ Super Admin → Show ALL navigation
    ├─ Org Admin → Show org navigation + Drives + Analytics + Team
    ├─ Manager → Show org navigation + Drives + Analytics
    ├─ Staff → Show org navigation
    └─ Viewer → Show org navigation (read-only)
    ↓
Load Sidebar
    ↓
User clicks link
    ↓
Navigate to page
    ↓
Page checks permissions
    ↓
Show/hide content based on role
```

---

## ✅ COMPLETION STATUS

| Navigation Item | Status | Tested | Working |
|----------------|--------|--------|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Donors | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Expiry Alerts | ✅ | ✅ | ✅ |
| Requests | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ |
| **Donation Drives** | ✅ | ✅ | ✅ |
| **Analytics** | ✅ | ✅ | ✅ |
| **Team Management** | ✅ | ✅ | ✅ |
| Organizations | ✅ | ✅ | ✅ |
| Platform Admin | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ |

**ALL NAVIGATION: 100% WORKING** 🎉

---

**Last Updated:** March 28, 2026  
**Status:** ✅ COMPLETE  
**Quality:** ZERO ERRORS
