import mongoose from 'mongoose';
import { env } from './env';
import { UserModel } from '../database/schemas/User.schema';

export const connectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) return;

    await mongoose.connect(env.MONGODB_URI);
    await UserModel.init();

    const indexes = await UserModel.collection.indexes();
    const legacyPasswordIndex = indexes.find(
      (index) =>
        index.unique === true &&
        index.key.password === 1 &&
        Object.keys(index.key).length === 1
    );
    if (legacyPasswordIndex?.name) {
      await UserModel.collection.dropIndex(legacyPasswordIndex.name);
    }

    console.log('MongoDB connected successfully');
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(
      `MongoDB initialization failed (${errorName}). Check MONGODB_URI and database network access.`
    );
    process.exit(1);
  }
};
