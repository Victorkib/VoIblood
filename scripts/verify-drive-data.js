/**
 * Script to verify and fix drive registration data
 * Run this to check if drives have proper tokens and URLs
 * 
 * Usage: node scripts/verify-drive-data.js
 */

const mongoose = require('mongoose')

// MongoDB connection
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb+srv://username:password@cluster.mongodb.net/iblood_dev'

// Drive schema (simplified for script)
const driveSchema = new mongoose.Schema({
  name: String,
  registrationToken: String,
  registrationUrl: String,
  status: String,
  isActive: Boolean,
  organizationId: mongoose.Schema.Types.ObjectId,
  date: Date,
  location: String,
})

const DonationDrive = mongoose.models.DonationDrive || mongoose.model('DonationDrive', driveSchema)

async function verifyDriveData() {
  try {
    console.log('[Script] Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('[Script] Connected successfully\n')

    // Get all drives
    const allDrives = await DonationDrive.find({})
    console.log(`[Script] Total drives in database: ${allDrives.length}\n`)

    // Categorize drives
    const withToken = allDrives.filter(d => d.registrationToken)
    const withoutToken = allDrives.filter(d => !d.registrationToken)
    const withUrl = allDrives.filter(d => d.registrationUrl)
    const withoutUrl = allDrives.filter(d => !d.registrationUrl)
    const activeDrives = allDrives.filter(d => d.status === 'active' && d.isActive)

    console.log('[Script] === DRIVE STATUS ===')
    console.log(`[Script] Drives with token: ${withToken.length}`)
    console.log(`[Script] Drives without token: ${withoutToken.length}`)
    console.log(`[Script] Drives with URL: ${withUrl.length}`)
    console.log(`[Script] Drives without URL: ${withoutUrl.length}`)
    console.log(`[Script] Active drives: ${activeDrives.length}\n`)

    if (withoutToken.length > 0 || withoutUrl.length > 0) {
      console.log('[Script] === DRIVES NEEDING FIX ===')
      
      const crypto = require('crypto')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      let updated = 0

      for (const drive of withoutToken) {
        try {
          // Generate token
          drive.registrationToken = crypto.randomBytes(16).toString('hex')
          
          // Generate URL
          drive.registrationUrl = `${appUrl}/register/${drive.registrationToken}`
          
          // Set defaults
          if (!drive.status) drive.status = 'draft'
          if (drive.isActive === undefined) drive.isActive = true
          
          await drive.save()
          updated++
          
          console.log(`[Script] ✅ Fixed: ${drive.name}`)
          console.log(`[Script]    Token: ${drive.registrationToken}`)
          console.log(`[Script]    URL: ${drive.registrationUrl}\n`)
        } catch (err) {
          console.error(`[Script] ❌ Error fixing ${drive.name}:`, err.message)
        }
      }

      console.log('[Script] === SUMMARY ===')
      console.log(`[Script] Drives fixed: ${updated}`)
      console.log(`[Script] All drives now have tokens and URLs!\n`)
    } else {
      console.log('[Script] ✅ All drives have proper tokens and URLs!\n')
    }

    // Show all active drives with their URLs
    console.log('[Script] === ACTIVE DRIVES WITH URLS ===')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    for (const drive of activeDrives) {
      if (drive.registrationUrl) {
        console.log(`[Script] ${drive.name}`)
        console.log(`[Script]    Date: ${new Date(drive.date).toLocaleDateString()}`)
        console.log(`[Script]    Location: ${drive.location}`)
        console.log(`[Script]    URL: ${drive.registrationUrl}\n`)
      }
    }

    console.log('[Script] === TEST URLS ===')
    console.log('[Script] Copy any URL above and test in browser:')
    console.log(`[Script] Example: ${appUrl}/register/test`)
    console.log('[Script] Should show drive landing page (not "Invalid Link")\n')

    await mongoose.disconnect()
    console.log('[Script] Done!')
  } catch (error) {
    console.error('[Script] Fatal error:', error.message)
    process.exit(1)
  }
}

// Run script
verifyDriveData()
