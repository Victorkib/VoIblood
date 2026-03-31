# iBlood Role System & Super Admin Setup

## 🎯 ORIGINAL PLAN (Before Auth Issues)

### **Role Hierarchy:**

```
┌─────────────────────────────────────────┐
│         SUPER_ADMIN (Platform)           │
│  - qinalexander56@gmail.com             │
│  - Controls EVERYTHING                   │
│  - Manages all organizations             │
│  - Separate super admin dashboard        │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ ORG_ADMIN  │ │  MANAGER   │ │   STAFF    │
│ (Org A)    │ │ (Dept A1)  │ │ (Operational)│
│ - Full org │ │ - Dept mgmt│ │ - Create   │
│   access   │ │ - Approve  │ │ - Edit     │
│            │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘
```

---

## 📊 ROLE DEFINITIONS

### **1. SUPER_ADMIN** (Platform-Wide)
**Who:** You (qinalexander56@gmail.com)

**Powers:**
- ✅ Create/delete organizations
- ✅ Access ALL organizations' data
- ✅ Manage ALL users (any org)
- ✅ View platform-wide analytics
- ✅ Assign org admins
- ✅ Suspend organizations
- ✅ System-wide settings

**Dashboard:** `/dashboard/super-admin` (separate from org dashboard)

---

### **2. ORG_ADMIN** (Organization-Wide)
**Who:** Head of blood bank/hospital

**Powers:**
- ✅ Manage their organization only
- ✅ Invite users to org
- ✅ Assign roles (staff, manager)
- ✅ View org analytics
- ✅ Manage org settings
- ✅ Approve/reject requests

**Dashboard:** `/dashboard` (org dashboard)

---

### **3. MANAGER** (Department-Wide)
**Who:** Department head

**Powers:**
- ✅ Manage department users
- ✅ Approve requests
- ✅ View department reports
- ✅ Create/edit resources

**Dashboard:** `/dashboard` with limited access

---

### **4. STAFF** (Operational)
**Who:** Regular users

**Powers:**
- ✅ Create donors
- ✅ Record blood collections
- ✅ View resources
- ❌ Cannot approve/delete

---

### **5. VIEWER** (Read-Only)
**Who:** Observers, auditors

**Powers:**
- ✅ View only
- ❌ Cannot create/edit/delete

---

### **6. PENDING** (No Org Yet)
**Who:** New signup, waiting for assignment

**Powers:**
- ❌ No access to org resources
- ✅ Can browse organizations
- ✅ Can request to join org

---

## 🎯 WHAT WE BUILT (Before Auth Issues)

### **✅ Completed:**
1. ✅ RBAC system (`lib/rbac.js`)
2. ✅ User model with roles
3. ✅ Organization model
4. ✅ Invitation system
5. ✅ Organization request system
6. ✅ Session management
7. ✅ Organization guard middleware
8. ✅ Multi-tenant isolation

### **⏳ Pending:**
1. ⏳ Super admin dashboard UI
2. ⏳ Organization management UI
3. ⏳ User management UI
4. ⏳ Invitation UI
5. ⏳ Cloudinary integration
6. ⏳ Email service

---

## 🔧 SUPER ADMIN SETUP SCRIPT

Run this to make `qinalexander56@gmail.com` a super_admin:

### **Option 1: Via API (Recommended)**

```bash
# Make sure you're logged in as qinalexander56@gmail.com
# Then run this in terminal:

curl -X POST http://localhost:3000/api/setup/admin \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=$(node -e "console.log(require('fs').readFileSync('/dev/stdin', 'utf8').match(/auth-session=([^;]+)/)?.[1])" <<< "$(cat ~/.cookies.txt)")"

# Or use browser console:
fetch('/api/setup/admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
})
.then(r => r.json())
.then(data => {
  console.log('✅ Setup Result:', data);
  if (data.success) {
    alert('🎉 You are now SUPER_ADMIN! Refresh the page.');
    location.reload();
  }
})
```

### **Option 2: Direct MongoDB Update**

```javascript
// In MongoDB Compass or mongosh:

db.users.updateOne(
  { email: "qinalexander56@gmail.com" },
  { 
    $set: { 
      role: "super_admin",
      accountStatus: "active"
    } 
  }
)

// Verify:
db.users.findOne({ email: "qinalexander56@gmail.com" })
// Should show: role: "super_admin"
```

### **Option 3: Create Script File**

Create `scripts/setup-super-admin.js`:

```javascript
/**
 * Setup Super Admin Script
 * Run with: node scripts/setup-super-admin.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb+srv://...';

async function setupSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get User model
    const User = mongoose.model('User');

    // Find or create super admin
    let admin = await User.findOne({ email: 'qinalexander56@gmail.com' });

    if (admin) {
      // Update to super_admin
      admin.role = 'super_admin';
      admin.accountStatus = 'active';
      await admin.save();
      console.log('✅ Updated existing user to SUPER_ADMIN');
    } else {
      // Create new super_admin
      admin = await User.create({
        email: 'qinalexander56@gmail.com',
        fullName: 'Qin Alexander',
        role: 'super_admin',
        accountStatus: 'active',
        emailVerified: true,
        supabaseId: `admin_${Date.now()}`,
      });
      console.log('✅ Created new SUPER_ADMIN user');
    }

    // Create platform organization
    const Organization = mongoose.model('Organization');
    let org = await Organization.findOne({ 
      email: 'qinalexander56@gmail.com' 
    });

    if (!org) {
      org = await Organization.create({
        name: 'iBlood Platform Administration',
        type: 'blood_bank',
        email: 'qinalexander56@gmail.com',
        phone: '+1-555-0100',
        address: 'Platform Headquarters',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        isActive: true,
        accountStatus: 'active',
        isPremium: true,
        subscriptionPlan: 'enterprise',
        createdBy: admin._id,
      });
      console.log('✅ Created platform organization');
    }

    // Link admin to organization
    admin.organizationId = org._id;
    admin.organizationName = org.name;
    await admin.save();

    console.log('✅ SUPER_ADMIN setup complete!');
    console.log('📧 Email:', admin.email);
    console.log('🏢 Organization:', org.name);
    console.log('🔐 Role:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupSuperAdmin();
```

Run it:
```bash
node scripts/setup-super-admin.js
```

---

## 🎯 NEXT STEPS

### **Immediate:**
1. ✅ Run super admin setup script
2. ✅ Verify role in MongoDB
3. ✅ Refresh browser
4. ✅ Access super admin features

### **Short Term:**
1. Build super admin dashboard (`/dashboard/super-admin`)
2. Create organization management UI
3. Build user management UI
4. Implement invitation system UI

### **Long Term:**
1. Analytics dashboard
2. Platform-wide reporting
3. Audit log viewer
4. System settings

---

## 📊 SUPER ADMIN CAPABILITIES

Once setup, you can:

### **Organizations:**
- ✅ Create new organizations
- ✅ View all organizations
- ✅ Edit organization details
- ✅ Suspend/delete organizations
- ✅ Assign organization admins

### **Users:**
- ✅ View all users (across all orgs)
- ✅ Assign users to organizations
- ✅ Change user roles
- ✅ Remove users
- ✅ View pending users

### **Data Access:**
- ✅ Access any organization's donors
- ✅ Access any organization's inventory
- ✅ Access any organization's requests
- ✅ View platform-wide reports

### **System:**
- ✅ View audit logs
- ✅ Manage system settings
- ✅ Configure platform features
- ✅ Override restrictions

---

## 🧪 VERIFICATION

After running setup script:

### **Check in MongoDB:**
```javascript
db.users.findOne({ email: "qinalexander56@gmail.com" })

// Should show:
{
  _id: ObjectId("..."),
  email: "qinalexander56@gmail.com",
  fullName: "Alexander Qin",
  role: "super_admin",  // ← This!
  accountStatus: "active",
  organizationId: ObjectId("..."),
  organizationName: "iBlood Platform Administration"
}
```

### **Check in Browser:**
```javascript
// In console:
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log('Role:', data.user?.role))
// Should print: super_admin
```

### **Check Dashboard:**
- Should see super admin options
- Can access `/dashboard/super-admin`
- Can view all organizations

---

**Ready to proceed? Run the setup script and you'll have full super_admin access!** 🚀
