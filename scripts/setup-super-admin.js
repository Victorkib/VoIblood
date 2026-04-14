/**
 * iBlood Super Admin Setup Script
 *
 * This script sets up DEFAULT_ADMIN_EMAIL as the platform super_admin
 *
 * Usage:
 *   node scripts/setup-super-admin.js
 *
 * Requirements:
 *   - MongoDB connection string in .env.local or provided as argument
 *   - mongoose installed (npm install mongoose)
 */

const mongoose = require('mongoose');

// Get MongoDB URI from environment or argument
const MONGODB_URI = process.argv[2] || process.env.DATABASE_URL || 'mongodb+srv://qinalexander56:Safaricom360@cluster0.fr14aej.mongodb.net/iblood_dev?retryWrites=true&w=majority&appName=Cluster0';

if (!MONGODB_URI) {
  console.error('❌ Error: MongoDB URI required');
  console.error('Usage: node scripts/setup-super-admin.js <mongodb-uri>');
  console.error('Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function setupSuperAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define schemas inline (no need for separate model files)
    const userSchema = new mongoose.Schema({
      supabaseId: String,
      email: String,
      fullName: String,
      role: {
        type: String,
        enum: ['super_admin', 'org_admin', 'manager', 'staff', 'viewer', 'pending'],
        default: 'pending',
      },
      accountStatus: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending_approval'],
        default: 'pending_approval',
      },
      organizationId: mongoose.Schema.Types.ObjectId,
      organizationName: String,
      emailVerified: Boolean,
      avatarUrl: String,
      providers: [{
        provider: String,
        providerId: String,
      }],
      lastLoginAt: Date,
    }, { timestamps: true });

    const organizationSchema = new mongoose.Schema({
      name: String,
      type: {
        type: String,
        enum: ['blood_bank', 'hospital', 'transfusion_center', 'ngo'],
      },
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      country: String,
      isActive: Boolean,
      accountStatus: String,
      isPremium: Boolean,
      subscriptionPlan: String,
      createdBy: mongoose.Schema.Types.ObjectId,
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);
    const Organization = mongoose.model('Organization', organizationSchema);

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'qinalexander56@gmail.com';

    // Find or update super admin
    console.log('\n📧 Setting up super admin:', adminEmail);
    
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log('✅ Found existing user');
      
      if (admin.role === 'super_admin') {
        console.log('ℹ️  User is already super_admin');
      } else {
        admin.role = 'super_admin';
        admin.accountStatus = 'active';
        await admin.save();
        console.log('✅ Updated user to SUPER_ADMIN');
        console.log('   Previous role:', admin.role);
      }
    } else {
      console.log('🆕 Creating new super_admin user');
      
      admin = await User.create({
        supabaseId: `admin_${Date.now()}`,
        email: adminEmail,
        fullName: 'Qin Alexander',
        role: 'super_admin',
        accountStatus: 'active',
        emailVerified: true,
        providers: [],
      });
      
      console.log('✅ Super admin user created');
    }

    // Find or create platform organization
    console.log('\n🏢 Setting up platform organization...');
    
    let org = await Organization.findOne({
      $or: [
        { name: 'iBlood Platform Administration' },
        { email: adminEmail }
      ]
    });

    if (org) {
      console.log('✅ Found existing organization:', org.name);
    } else {
      console.log('🆕 Creating platform organization');
      
      org = await Organization.create({
        name: 'iBlood Platform Administration',
        type: 'blood_bank',
        email: adminEmail,
        phone: '+1-555-0100',
        address: 'Platform Headquarters',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States',
        registrationNumber: 'IB-PLATFORM-001',
        description: 'Platform administration organization for iBlood system',
        isActive: true,
        accountStatus: 'active',
        isPremium: true,
        subscriptionPlan: 'enterprise',
        createdBy: admin._id,
      });
      
      console.log('✅ Platform organization created');
    }

    // Link admin to organization if not already
    if (!admin.organizationId) {
      admin.organizationId = org._id;
      admin.organizationName = org.name;
      await admin.save();
      console.log('✅ Linked admin to organization');
    } else {
      console.log('ℹ️  Admin already linked to organization');
    }

    // Update organization createdBy if needed
    if (!org.createdBy) {
      org.createdBy = admin._id;
      await org.save();
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ SUPER_ADMIN SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.fullName);
    console.log('🔐 Role:', admin.role);
    console.log('🏢 Organization:', org.name);
    console.log('📊 Organization ID:', org._id);
    console.log('='.repeat(50));
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Login with', admin.email);
    console.log('2. You now have SUPER_ADMIN access');
    console.log('3. Access: /dashboard/super-admin');
    console.log('4. Create organizations and manage users');
    console.log('='.repeat(50));

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run setup
setupSuperAdmin();
