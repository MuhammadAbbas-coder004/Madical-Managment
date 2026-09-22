import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  password: string;
  role: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'patient' },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
