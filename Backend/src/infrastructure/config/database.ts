import mongoose from 'mongoose';
import dns from 'dns';

export const connectDatabase = async (): Promise<void> => {
  try {
    // Ensure Node uses public DNS resolvers for MongoDB Atlas SRV records
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical_management';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
