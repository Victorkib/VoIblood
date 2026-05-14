/**
 * Short opaque RSVP codes for SMS (avoids long JWT URLs).
 * Resolved server-side to donor + drive; same row reused per (donor, drive).
 */

import mongoose from 'mongoose'

const rsvpSmsLinkSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      maxlength: 32,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true,
    },
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationDrive',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
)

rsvpSmsLinkSchema.index({ donorId: 1, driveId: 1 }, { unique: true })

const RsvpSmsLink = mongoose.models.RsvpSmsLink || mongoose.model('RsvpSmsLink', rsvpSmsLinkSchema)

export default RsvpSmsLink
