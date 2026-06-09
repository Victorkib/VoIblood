/**
 * GET /api/requests/[id] - Get single request details
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'
import Organization from '@/lib/models/Organization'
import { getCurrentUser, canAccessOrganization } from '@/lib/session'
import { hasOrgCapability, ORG_CAPABILITIES, isSuperAdmin } from '@/lib/rbac'

export async function GET(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const bloodRequest = await Request.findById(resolvedParams.id)
      .populate('sourceOrganizationId', 'name type city')
      .populate('requestingOrganizationId', 'name type city')
      .populate('approvedBy', 'fullName email')
      .populate('createdBy', 'fullName email')

    if (!bloodRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    const sourceOrgId = bloodRequest.sourceOrganizationId?._id?.toString() || bloodRequest.sourceOrganizationId?.toString()
    const requestingOrgId = bloodRequest.requestingOrganizationId?._id?.toString() || bloodRequest.requestingOrganizationId?.toString()
    const canAccess =
      isSuperAdmin(user.role) ||
      canAccessOrganization(user, sourceOrgId) ||
      canAccessOrganization(user, requestingOrgId)
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const requesterOrg =
      bloodRequest.requestingOrganizationId?.type
        ? bloodRequest.requestingOrganizationId
        : await Organization.findById(requestingOrgId).lean()
    const sourceOrg =
      bloodRequest.sourceOrganizationId?.type
        ? bloodRequest.sourceOrganizationId
        : await Organization.findById(sourceOrgId).lean()

    return NextResponse.json({
      success: true,
      data: {
        ...bloodRequest.toObject(),
        requestingOrganizationName:
          bloodRequest.requestingOrganizationId?.name ||
          bloodRequest.requestingOrganizationName,
        sourceOrganizationName:
          bloodRequest.sourceOrganizationId?.name ||
          bloodRequest.sourceOrganizationName,
        canActAsRequester:
          isSuperAdmin(user.role) ||
          (requestingOrgId ? canAccessOrganization(user, requestingOrgId) : false),
        canActAsSupplier:
          isSuperAdmin(user.role) ||
          (sourceOrgId ? canAccessOrganization(user, sourceOrgId) : false),
        requesterCapability: hasOrgCapability(
          requesterOrg,
          ORG_CAPABILITIES.REQUEST_BLOOD
        ),
        supplierCapability: hasOrgCapability(
          sourceOrg,
          ORG_CAPABILITIES.FULFILL_REQUESTS
        ),
      },
    })
  } catch (error) {
    console.error('GET /api/requests/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    )
  }
}
