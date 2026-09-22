import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctorDocument extends Document {
  doctorId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  createdAt: Date;
}

const DoctorSchema = new Schema<IDoctorDocument>({
  doctorId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  specialization: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const DoctorModel = mongoose.model<IDoctorDocument>('Doctor', DoctorSchema);
