import mongoose from 'mongoose';
import { env } from './env';
import { UserModel } from '../database/schemas/User.schema';

/**
 * Sanitizes MongoDB connection URIs to prevent password or credential exposure in logs.
 */
export const sanitizeMongoUri = (uri: string): string => {
  if (!uri) return '[not configured]';
  try {
    const url = new URL(uri.replace(/^mongodb\+srv:\/\//, 'http://').replace(/^mongodb:\/\//, 'http://'));
    const isSrv = uri.startsWith('mongodb+srv://');
    const scheme = isSrv ? 'mongodb+srv://' : 'mongodb://';
    const authPart = url.username ? `${url.username}:***@` : '';
    const pathname = url.pathname || '';
    return `${scheme}${authPart}${url.host}${pathname}`;
  } catch {
    return uri.replace(/:([^@/]+)@/, ':***@');
  }
};

export const isDatabaseConnected = (): boolean => mongoose.connection.readyState === 1;

let listenersAttached = false;
const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connection established.');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection lost/disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB connection re-established.');
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('❌ MongoDB runtime error:', err.message || err.name);
  });
};

export const connectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;

  attachConnectionListeners();

  const sanitizedTarget = sanitizeMongoUri(env.MONGODB_URI);

  try {
    console.log(`Connecting to MongoDB at ${sanitizedTarget}...`);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
      autoIndex: true,
      family: 4,
    });

    try {
      await UserModel.init();
      const indexes = await UserModel.collection.indexes();
      const legacyPasswordIndex = indexes.find(
        (index) =>
          index.unique === true &&
          index.key?.password === 1 &&
          Object.keys(index.key).length === 1
      );
      if (legacyPasswordIndex?.name) {
        await UserModel.collection.dropIndex(legacyPasswordIndex.name);
      }
    } catch (indexError: unknown) {
      // Do not abort startup if index inspection on a fresh or restricted collection fails
      const msg = indexError instanceof Error ? indexError.message : String(indexError);
      console.warn('⚠️ MongoDB index initialization note:', msg);
    }

    console.log(`MongoDB connected successfully to ${sanitizedTarget}`);
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = errorMessage.replace(/:([^@/]+)@/, ':***@');

    console.error(
      `❌ Failed to connect to MongoDB at ${sanitizedTarget} (${errorName}): ${sanitizedError}`
    );
    throw new Error(`Database connection failed: ${sanitizedError}`);
  }
};

