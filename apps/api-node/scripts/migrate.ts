#!/usr/bin/env tsx
/**
 * Database Migration Script
 * Usage: tsx migrate.ts up|down|create
 */

import { MongoClient, Db } from 'mongodb';
import { getConfig, resetConfig } from '@collaborative-ide/shared-types/config';
import { logger } from '../src/utils/logger';
import { COLLECTIONS } from '../src/services/mongodb';

async function connect(uri: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  const db = client.db();
  return { client, db };
}

async function createIndexes(database: Db): Promise<void> {
  // Users collection
  const users = database.collection(COLLECTIONS.USERS);
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ supabaseId: 1 }, { unique: true });

  // Projects collection
  const projects = database.collection(COLLECTIONS.PROJECTS);
  await projects.createIndex({ ownerId: 1 });
  await projects.createIndex({ createdAt: -1 });

  // Files collection
  const files = database.collection(COLLECTIONS.FILES);
  await files.createIndex({ projectId: 1, path: 1 }, { unique: true });
  await files.createIndex({ projectId: 1, updatedAt: -1 });

  logger.info('✅ MongoDB indexes created');
}

async function seedAdmin(database: Db): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.info('No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping admin user creation');
    return;
  }

  const bcrypt = await import('bcryptjs');
  const users = database.collection('users');

  const existing = await users.findOne({ email: adminEmail });
  if (existing) {
    logger.info('Admin user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const result = await users.insertOne({
    email: adminEmail,
    passwordHash,
    supabaseId: 'admin-' + crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });

  logger.info({ userId: result.insertedId.toString() }, 'Admin user created');
}

async function migrateUp(uri: string): Promise<void> {
  const { client, db } = await connect(uri);

  try {
    await createIndexes(db);
    await seedAdmin(db);
    logger.info('✅ Migration up complete');
  } finally {
    await client.close();
  }
}

async function migrateDown(uri: string): Promise<void> {
  const { client, db } = await connect(uri);

  try {
    // Drop all collections
    await db.collection(COLLECTIONS.USERS).drop().catch(() => {});
    await db.collection(COLLECTIONS.PROJECTS).drop().catch(() => {});
    await db.collection(COLLECTIONS.FILES).drop().catch(() => {});
    logger.info('✅ Migration down complete (collections dropped)');
  } finally {
    await client.close();
  }
}

async function main(): Promise<void> {
  resetConfig();
  const config = getConfig();
  const command = process.argv[2] || 'up';

  try {
    switch (command) {
      case 'up':
        await migrateUp(config.MONGODB_URI);
        break;
      case 'down':
        await migrateDown(config.MONGODB_URI);
        break;
      case 'create':
        logger.info('Migration file creation not implemented yet');
        break;
      default:
        logger.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    logger.error(error, 'Migration failed');
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error(err, 'Migration script failed');
  process.exit(1);
});