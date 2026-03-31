import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'

export async function PUT(req) {
  try {
    await connectDB()

    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return Response.json({ message: 'Current and new password are required' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return Response.json({ message: 'User not found' }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return Response.json({ message: 'Current password is incorrect' }, { status: 401 })
    }

    if (newPassword.length < 8) {
      return Response.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    user.password = hashedPassword
    user.updatedAt = new Date()
    await user.save()

    return Response.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('[API] Change password error:', error)
    return Response.json({ message: error.message }, { status: 500 })
  }
}
