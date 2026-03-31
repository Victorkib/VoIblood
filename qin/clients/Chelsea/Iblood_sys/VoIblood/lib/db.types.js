/**
 * Global type definitions for MongoDB connection caching
 */

/**
 * @typedef {import('mongoose').Connection} MongooseConnection
 */

/**
 * @global
 * @typedef {Object} MongooseCache
 * @property {MongooseConnection | null} conn
 * @property {Promise<mongoose.Mongoose> | null} promise
 */

/**
 * @global
 * @type {MongooseCache | undefined}
 */
global.mongoose = undefined
