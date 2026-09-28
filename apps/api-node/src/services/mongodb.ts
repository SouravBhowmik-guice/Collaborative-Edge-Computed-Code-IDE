/**
 * MongoDB Connection Service
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongoDB(uri: string): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db(); // Uses database from connection string

    // Create indexes
    await createIndexes(db);

    logger.info('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    logger.error(error, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function createIndexes(database: Db): Promise<void> {
  // Users collection
  const users = database.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ supabaseId: 1 }, { unique: true });

  // Projects collection
  const projects = database.collection('projects');
  await projects.createIndex({ ownerId: 1 });
  await projects.createIndex({ createdAt: -1 });

  // Files collection
  const files = database.collection('files');
  await files.createIndex({ projectId: 1, path: 1 }, { unique: true });
  await files.createIndex({ projectId: 1, updatedAt: -1 });

  logger.info('✅ MongoDB indexes created');
}

export function getDb(): Db {
  if (!db) throw new Error('Database not initialized. Call connectMongoDB first.');
  return db;
}

export function getCollection<T>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('✅ MongoDB connection closed');
  }
}

// Collection name constants
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  FILES: 'files',
} as const;