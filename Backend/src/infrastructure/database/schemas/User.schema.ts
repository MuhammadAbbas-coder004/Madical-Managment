import mongoose, { Document } from 'mongoose';

export interface IUserDocument extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ["admin", "doctor", "nurse", "patient"],
    default: "patient"
  }
});

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
export { userSchema };
