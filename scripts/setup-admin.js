/**
 * Setup Default Admin User Script
 * Creates DEFAULT_ADMIN_EMAIL as default admin with organization
 */

// Load environment variables from .env.local
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=')
      if (key && values.length > 0) {
        process.env[key] = values.join('=')
      }
    }
  })
}

const mongoose = require('mongoose')

// Set up mongoose to handle ES modules
mongoose.set('strictQuery', false)

async function setupAdmin() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.DATABASE_URL
    if (!mongoUrl) {
      throw new Error('DATABASE_URL not found in environment variables')
    }

    await mongoose.connect(mongoUrl)
    console.log('✅ Connected to MongoDB')

    // Define schemas inline to avoid import issues
    const userSchema = new mongoose.Schema({
      supabaseId: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      fullName: { type: String, required: true },
      role: { type: String, default: 'staff' },
      organizationName: { type: String },
      organizationId: { type: mongoose.Schema.Types.ObjectId },
      emailVerified: { type: Boolean, default: false },
      providers: [{ type: mongoose.Schema.Types.Mixed }],
    }, { timestamps: true })

    const organizationSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      type: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      registrationNumber: { type: String },
      description: { type: String },
      isActive: { type: Boolean, default: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId },
    }, { timestamps: true })

    const User = mongoose.models.User || mongoose.model('User', userSchema)
    const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema)

    // Check if admin user already exists
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'qinalexander56@gmail.com'
    let adminUser = await User.findOne({ email: adminEmail })

    if (adminUser) {
      console.log('⚠️  Admin user already exists, updating role...')
      
      // Update to admin role if not already
      if (adminUser.role !== 'admin') {
        await User.findByIdAndUpdate(adminUser._id, { role: 'admin' })
        console.log('✅ Updated user role to admin')
      }
    } else {
      console.log('📝 Creating new admin user...')
      
      // Create admin user
      adminUser = await User.create({
        supabaseId: 'admin-manual-setup', // Temporary ID
        email: adminEmail,
        fullName: 'Qin Alexander',
        role: 'admin',
        organizationName: 'iBlood Admin Organization',
        emailVerified: true,
        providers: []
      })
      
      console.log('✅ Created admin user')
    }

    // Check if organization exists
    let organization = await Organization.findOne({ 
      $or: [
        { name: 'iBlood Admin Organization' },
        { email: adminEmail }
      ]
    })

    if (!organization) {
      console.log('📝 Creating admin organization...')
      
      // Create organization
      organization = await Organization.create({
        name: 'iBlood Admin Organization',
        type: 'blood_bank',
        email: adminEmail,
        phone: '+1-555-0100',
        address: 'Admin HQ',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        registrationNumber: 'IB-ADMIN-001',
        description: 'Default admin organization for iBlood system',
        isActive: true,
        createdBy: adminUser._id
      })
      
      console.log('✅ Created admin organization')
    }

    // Link admin user to organization
    await User.findByIdAndUpdate(adminUser._id, {
      organizationId: organization._id,
      organizationName: organization.name
    })

    console.log('✅ Linked admin user to organization')

    // Update organization's createdBy if needed
    if (!organization.createdBy) {
      await Organization.findByIdAndUpdate(organization._id, {
        createdBy: adminUser._id
      })
    }

    console.log('\n🎉 Admin setup complete!')
    console.log(`📧 Email: ${adminEmail}`)
    console.log(`👤 Role: admin`)
    console.log(`🏢 Organization: ${organization.name}`)
    console.log(`🆔 Organization ID: ${organization._id}`)
    console.log(`🆔 User ID: ${adminUser._id}`)

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the setup
setupAdmin()
