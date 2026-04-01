/**
 * Join Request Model
 * Tracks requests from users to join organizations
 */

import mongoose from 'mongoose'

const joinRequestSchema = new mongoose.Schema({
  // User requesting to join
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Organization they want to join
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  
  // Status of the request
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  
  // Role requested by user
  requestedRole: {
    type: String,
    enum: ['viewer', 'staff', 'manager', 'org_admin'],
    default: 'viewer',
  },
  
  // Role assigned by admin (if approved)
  assignedRole: {
    type: String,
    enum: ['viewer', 'staff', 'manager', 'org_admin'],
  },
  
  // Message from user (optional)
  message: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  
  // Admin who reviewed (if reviewed)
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Review notes from admin
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  
  // Timestamps
  reviewedAt: {
    type: Date,
  },
}, {
  timestamps: true,
})

// Compound index for efficient queries
joinRequestSchema.index({ userId: 1, status: 1 })
joinRequestSchema.index({ organizationId: 1, status: 1 })

// Static method: Create join request
joinRequestSchema.statics.createRequest = async function(userId, organizationId, requestedRole, message) {
  // Check if request already exists
  const existing = await this.findOne({
    userId,
    organizationId,
    status: 'pending',
  })
  
  if (existing) {
    throw new Error('You already have a pending request for this organization')
  }
  
  return this.create({
    userId,
    organizationId,
    requestedRole,
    message,
  })
}

// Static method: Get pending requests for org
joinRequestSchema.statics.getPendingForOrg = function(organizationId) {
  return this.find({
    organizationId,
    status: 'pending',
  })
    .populate('userId', 'fullName email title')
    .sort({ createdAt: -1 })
}

// Static method: Approve request
joinRequestSchema.statics.approveRequest = async function(requestId, assignedRole, reviewedBy, reviewNotes) {
  const request = await this.findById(requestId)
  
  if (!request) {
    throw new Error('Request not found')
  }
  
  if (request.status !== 'pending') {
    throw new Error('Request is not pending')
  }
  
  request.status = 'approved'
  request.assignedRole = assignedRole
  request.reviewedBy = reviewedBy
  request.reviewNotes = reviewNotes
  request.reviewedAt = new Date()
  
  await request.save()
  
  return request
}

// Static method: Reject request
joinRequestSchema.statics.rejectRequest = async function(requestId, reviewedBy, reviewNotes) {
  const request = await this.findById(requestId)
  
  if (!request) {
    throw new Error('Request not found')
  }
  
  if (request.status !== 'pending') {
    throw new Error('Request is not pending')
  }
  
  request.status = 'rejected'
  request.reviewedBy = reviewedBy
  request.reviewNotes = reviewNotes
  request.reviewedAt = new Date()
  
  await request.save()
  
  return request
}

const JoinRequest = mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema)

export default JoinRequest
