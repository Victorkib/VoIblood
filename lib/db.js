/**
 * MongoDB Database Connection
 * Uses Mongoose ODM for schema-based data modeling
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.DATABASE_URL

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable')
}

/**
 * Global connection cache to prevent multiple connections in development
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>}
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully')
      return mongoose.connection
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    console.error('❌ MongoDB connection error:', e.message)
    throw e
  }

  return cached.conn
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  if (cached.conn) {
    await cached.conn.close()
    cached.conn = null
    cached.promise = null
    console.log('🔌 MongoDB disconnected')
  }
}
