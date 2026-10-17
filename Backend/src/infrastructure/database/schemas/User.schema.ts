import mongoose, { Document } from 'mongoose';

export interface IUserDocument extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
  linkedId?: string;
  authProvider: 'password' | 'google' | 'apple';
  providerSubject?: string;
  faceEnrollmentStatus: 'unavailable' | 'not_enrolled' | 'enrolled';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'nurse', 'patient'],
      default: 'patient',
    },
    linkedId: {
      type: String,
      required: false,
    },
    authProvider: {
      type: String,
      enum: ['password', 'google', 'apple'],
      default: 'password',
      required: true,
    },
    providerSubject: {
      type: String,
      trim: true,
      required: false,
    },
    faceEnrollmentStatus: {
      type: String,
      enum: ['unavailable', 'not_enrolled', 'enrolled'],
      default: 'unavailable',
      required: true,
    },
    lastLoginAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

userSchema.index(
  { authProvider: 1, providerSubject: 1 },
  {
    unique: true,
    partialFilterExpression: { providerSubject: { $type: 'string' } },
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
export { userSchema };
