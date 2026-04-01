/**
 * Script to update existing drives with registration URLs
 * Run this ONCE to fix existing drives in database
 * 
 * Usage: node scripts/update-drive-urls.js
 */

const mongoose = require('mongoose')

// MongoDB connection
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb+srv://<username>:<password>@cluster0.fr14aej.mongodb.net/iblood?retryWrites=true&w=majority&appName=Cluster0'

// Drive schema (simplified for script)
const driveSchema = new mongoose.Schema({
  name: String,
  registrationToken: String,
  registrationUrl: String,
  status: String,
  isActive: Boolean,
  organizationId: mongoose.Schema.Types.ObjectId,
})

const DonationDrive = mongoose.models.DonationDrive || mongoose.model('DonationDrive', driveSchema)

async function updateDriveUrls() {
  try {
    console.log('[Script] Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('[Script] Connected successfully')

    // Find all drives without registrationUrl
    const drivesWithoutUrl = await DonationDrive.find({
      $or: [
        { registrationUrl: { $exists: false } },
        { registrationUrl: null },
        { registrationUrl: '' },
      ],
    })

    console.log(`[Script] Found ${drivesWithoutUrl.length} drives without registration URL`)

    if (drivesWithoutUrl.length === 0) {
      console.log('[Script] All drives already have registration URLs!')
      await mongoose.disconnect()
      return
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const crypto = require('crypto')

    let updated = 0
    let errors = 0

    for (const drive of drivesWithoutUrl) {
      try {
        // Generate token if not exists
        if (!drive.registrationToken) {
          drive.registrationToken = crypto.randomBytes(16).toString('hex')
          console.log(`[Script] Generated token for: ${drive.name}`)
        }

        // Generate registration URL
        drive.registrationUrl = `${appUrl}/register/${drive.registrationToken}`

        // Set status and isActive if not set
        if (!drive.status) {
          drive.status = 'draft'
        }
        if (drive.isActive === undefined) {
          drive.isActive = true
        }

        await drive.save()
        updated++
        console.log(`[Script] Updated: ${drive.name} → ${drive.registrationUrl}`)
      } catch (err) {
        errors++
        console.error(`[Script] Error updating ${drive.name}:`, err.message)
      }
    }

    console.log('\n[Script] === SUMMARY ===')
    console.log(`[Script] Total drives found: ${drivesWithoutUrl.length}`)
    console.log(`[Script] Updated: ${updated}`)
    console.log(`[Script] Errors: ${errors}`)
    console.log('[Script] Done!')

    await mongoose.disconnect()
  } catch (error) {
    console.error('[Script] Fatal error:', error.message)
    process.exit(1)
  }
}

// Run script
updateDriveUrls()
