/**
 * Centralized MongoDB connection management.
 */

import { dbConfig } from './db.config.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(dbConfig.uri, {
      dbName: dbConfig.dbName,
    });
    logger.info('Database connected', { dbName: dbConfig.dbName });
  } catch (err) {
    logger.error('Database connection failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('Database disconnected');
}
