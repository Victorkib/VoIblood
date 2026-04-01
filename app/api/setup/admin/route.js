/**
 * Setup Default Super Admin API
 *
 * TWO MODES OF OPERATION:
 *
 * Mode 1: POST with authenticated user (PATCH MODE - RECOMMENDED)
 * - Login normally with DEFAULT_ADMIN_EMAIL
 * - Call this endpoint
 * - Your existing user gets upgraded to super_admin
 * - No manual Supabase steps needed!
 *
 * Mode 2: POST without authentication (LEGACY MODE)
 * - Creates super admin from scratch
 * - Requires Supabase to be configured
 * - Use only if Mode 1 fails
 *
 * AFTER RUNNING:
 * - You have super_admin access immediately
 * - Can create organizations and manage users
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'

/**
 * POST /api/setup/admin
 * Upgrades current user to super_admin OR creates new super admin
 */
export async function POST(request) {
  try {
    await connectDB()

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'qinalexander56@gmail.com'

    // MODE 1: Try to upgrade logged-in user (PATCH MODE)
    const currentUser = await getCurrentUser(request.cookies)
    
    if (currentUser) {
      console.log('Mode 1: Upgrading authenticated user to super_admin')
      
      // Check if user's email matches
      if (currentUser.email !== adminEmail) {
        return NextResponse.json(
          { 
            error: 'Only qinalexander56@gmail.com can be setup as super admin',
            yourEmail: currentUser.email,
          },
          { status: 403 }
        )
      }

      // Check if already super admin
      if (currentUser.role === 'super_admin') {
        return NextResponse.json(
          { 
            success: true,
            message: 'You are already a super admin!',
            data: {
              user: currentUser,
            }
          }
        )
      }

      // Upgrade user to super_admin
      await User.findByIdAndUpdate(currentUser._id, {
        role: 'super_admin',
        accountStatus: 'active',
        emailVerified: true,
      })

      // Get updated user
      const updatedUser = await User.findById(currentUser._id)

      // Create or link to platform organization
      let organization = await Organization.findOne({
        $or: [
          { name: 'iBlood Platform Administration' },
          { email: adminEmail }
        ]
      })

      if (!organization) {
        organization = await Organization.create({
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
          createdBy: updatedUser._id
        })
      }

      // Link user to organization if not already
      if (!updatedUser.organizationId) {
        await User.findByIdAndUpdate(updatedUser._id, {
          organizationId: organization._id,
          organizationName: organization.name
        })
      }

      // Update organization's createdBy if needed
      if (!organization.createdBy) {
        await Organization.findByIdAndUpdate(organization._id, {
          createdBy: updatedUser._id
        })
      }

      // Get final updated user
      const finalUser = await User.findById(updatedUser._id)

      return NextResponse.json({
        success: true,
        message: 'Successfully upgraded to super_admin!',
        mode: 'patch',
        data: {
          user: {
            id: finalUser._id.toString(),
            email: finalUser.email,
            fullName: finalUser.fullName,
            role: finalUser.role,
            organizationId: finalUser.organizationId?.toString(),
            organizationName: finalUser.organizationName,
          },
          organization: {
            id: organization._id.toString(),
            name: organization.name,
            type: organization.type,
          }
        },
        instructions: [
          '✅ You are now a super_admin!',
          '✅ Refresh the page to see your new permissions',
          '✅ You can now create organizations and manage users',
        ]
      })
    }

    // MODE 2: No authenticated user - check if MongoDB user exists
    console.log('Mode 2: Checking for existing MongoDB user')
    
    let adminUser = await User.findOne({ email: adminEmail })

    if (adminUser) {
      // Upgrade existing MongoDB user
      console.log('Found existing MongoDB user, upgrading...')
      
      if (adminUser.role !== 'super_admin') {
        await User.findByIdAndUpdate(adminUser._id, {
          role: 'super_admin',
          accountStatus: 'active',
        })
      }

      // Create/link organization (same as above)
      let organization = await Organization.findOne({
        $or: [
          { name: 'iBlood Platform Administration' },
          { email: adminEmail }
        ]
      })

      if (!organization) {
        organization = await Organization.create({
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
          createdBy: adminUser._id
        })
      }

      await User.findByIdAndUpdate(adminUser._id, {
        organizationId: organization._id,
        organizationName: organization.name
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully upgraded to super_admin!',
        mode: 'mongodb-patch',
        data: {
          user: {
            id: adminUser._id.toString(),
            email: adminUser.email,
            role: 'super_admin',
          },
          organization: {
            id: organization._id.toString(),
            name: organization.name,
          }
        },
        instructions: [
          '✅ MongoDB user upgraded to super_admin',
          '✅ Logout and login again to apply changes',
          '✅ You will have super_admin access after re-login',
        ]
      })
    }

    // MODE 3: No user exists at all - create from scratch
    console.log('Mode 3: Creating new super admin from scratch')
    
    // Create super admin user in MongoDB
    adminUser = await User.create({
      supabaseId: `admin_${Date.now()}`,
      email: adminEmail,
      fullName: 'Qin Alexander',
      role: 'super_admin',
      accountStatus: 'active',
      emailVerified: true,
      providers: [{ provider: 'email', providerId: adminEmail }]
    })

    // Create organization
    let organization = await Organization.findOne({
      $or: [
        { name: 'iBlood Platform Administration' },
        { email: adminEmail }
      ]
    })

    if (!organization) {
      organization = await Organization.create({
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
        createdBy: adminUser._id
      })
    }

    await User.findByIdAndUpdate(adminUser._id, {
      organizationId: organization._id,
      organizationName: organization.name
    })

    return NextResponse.json({
      success: true,
      message: 'Super admin created! Please login.',
      mode: 'create',
      data: {
        user: {
          id: adminUser._id.toString(),
          email: adminUser.email,
          role: adminUser.role,
        },
        organization: {
          id: organization._id.toString(),
          name: organization.name,
        }
      },
      instructions: [
        '✅ Super admin user created in MongoDB',
        '⚠️ You need to create this user in Supabase manually:',
        '   1. Go to Supabase Dashboard → Authentication → Users',
        '   2. Click "Add User"',
        '   3. Email: qinalexander56@gmail.com',
        '   4. Set a password',
        '   5. Confirm email',
        '   6. Then login with those credentials',
      ]
    })

  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup admin: ' + error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/setup/admin
 * Check if super admin has been setup
 */
export async function GET() {
  try {
    await connectDB()
    
    const superAdmin = await User.findOne({ role: 'super_admin', isActive: true })
    
    return NextResponse.json({
      setup: !!superAdmin,
      data: superAdmin ? {
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        role: superAdmin.role,
        organizationName: superAdmin.organizationName,
        createdAt: superAdmin.createdAt,
      } : null
    })
  } catch (error) {
    console.error('Admin setup check error:', error)
    return NextResponse.json(
      { error: 'Failed to check admin setup' },
      { status: 500 }
    )
  }
}
