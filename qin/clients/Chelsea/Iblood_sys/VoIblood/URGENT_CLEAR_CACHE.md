# 🚨 URGENT: CLEAR WEBPACK CACHE - STALE CODE ERROR

## 🐛 THE REAL PROBLEM

**Error shows line 177 in Donor.js**
**But Donor.js only has 136 lines!**

**This means:** Webpack is using CACHED/STALE code from old Donor model

---

## ✅ IMMEDIATE FIX - CLEAR CACHE

### **Step 1: Stop Dev Server**
```bash
# Press Ctrl+C
```

### **Step 2: Delete .next Folder**
```bash
# Windows (PowerShell):
Remove-Item -Recurse -Force .next

# Windows (CMD):
rmdir /s /q .next

# Or manually:
# Navigate to project folder
# Delete the .next folder
```

### **Step 3: Clear npm Cache (Optional)**
```bash
npm cache clean --force
```

### **Step 4: Restart Dev Server**
```bash
npm run dev
```

### **Step 5: Test Registration**
```
1. Go to registration page
2. Fill form
3. Verify OTP
4. Click "Register"
5. Should work NOW!
```

---

## 🔧 ALSO: Fix API to Match Clean Model

The clean Donor model doesn't have `driveId` or `organizationId` fields. Update the API:

**In `app/api/register/route.js`:**

Remove these lines from Donor.create():
```javascript
// REMOVE THESE:
driveId: drive._id,
organizationId: drive.organizationId,
```

**Keep only:**
```javascript
const donor = await Donor.create({
  firstName,
  lastName,
  email: email.toLowerCase(),
  phone,
  bloodType,
  dateOfBirth: birthDate,
  gender,
  weight: weight ? parseFloat(weight) : null,
  hasDonatedBefore,
  lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
  medicalConditions: medicalConditions || '',
  medications: medications || '',
  consentGiven,
  driveToken,  // ← This is enough to link to drive
  isVerified: true,
  status: 'registered',
})
```

---

## 🎯 WHY THIS HAPPENS

**Webpack Dev Cache:**
- Stores compiled code in `.next/dev/cache`
- Doesn't always detect model changes
- Continues using old compiled version
- Shows errors from old code (line 177)

**Solution:**
- Delete `.next` folder
- Forces webpack to recompile everything
- Uses fresh Donor model code

---

## ✅ AFTER CLEARING CACHE

**Expected Console Output:**
```
[Register API] Creating donor with driveToken: a6da030ba2fc838c5891878926c9aca9
[Register API] Drive ID: new ObjectId('69ca3e6a05a638e754b93c24')
[Register API] Donor created successfully: new ObjectId('...')
POST /api/register 201 in XXXms
```

**NO "next is not a function" error!**

---

**CLEAR CACHE NOW AND TEST!** 🚀
