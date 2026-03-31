import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(req) {
  try {
    await connectDB()

    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await User.findById(userId).select('-password')

    if (!user) {
      return Response.json({ message: 'User not found' }, { status: 404 })
    }

    return Response.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('[API] Get user settings error:', error)
    return Response.json({ message: error.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    await connectDB()

    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fullName, email, organization } = await req.json()

    const user = await User.findByIdAndUpdate(
      userId,
      {
        name: fullName,
        email,
        organizationName: organization,
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password')

    if (!user) {
      return Response.json({ message: 'User not found' }, { status: 404 })
    }

    return Response.json({
      success: true,
      message: 'User settings updated successfully',
      data: user,
    })
  } catch (error) {
    console.error('[API] Update user settings error:', error)
    return Response.json({ message: error.message }, { status: 500 })
  }
}
