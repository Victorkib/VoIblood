/**
 * DriveParticipant — one row per donor per drive (RSVP / registration / check-in lifecycle).
 * Donor remains the long-lived identity; this model holds per-drive state.
 */

import mongoose from 'mongoose'

const driveParticipantSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationDrive',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true,
    },
    /** How this row was created */
    source: {
      type: String,
      enum: ['public', 'outreach', 'walk_in', 'admin'],
      required: true,
      default: 'public',
      index: true,
    },
    /**
     * Per-drive lifecycle (admin + RSVP).
     * `declined` = outreach RSVP "cannot attend" (donor row is not set to declined).
     */
    status: {
      type: String,
      enum: [
        'registered',
        'confirmed',
        'declined',
        'checked_in',
        'completed',
        'no_show',
        'cancelled',
      ],
      default: 'registered',
      index: true,
    },
    /**
     * donor = donating blood at this drive
     * supporter = sharing / advocacy only (not in collection queue)
     */
    participantRole: {
      type: String,
      enum: ['donor', 'supporter'],
      default: 'donor',
      index: true,
    },
    /** Planned collection type when participantRole is donor */
    intendedDonationComponent: {
      type: String,
      enum: ['whole_blood', 'platelets', 'plasma'],
      default: 'whole_blood',
    },
    /** Staff notes for this drive only */
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

driveParticipantSchema.index({ driveId: 1, donorId: 1 }, { unique: true })

const DriveParticipant =
  mongoose.models.DriveParticipant || mongoose.model('DriveParticipant', driveParticipantSchema)

export default DriveParticipant
