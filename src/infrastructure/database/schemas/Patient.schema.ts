import mongoose, { Schema, Document } from 'mongoose';

export interface IPatientDocument extends Document {
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  createdAt: Date;
}

const PatientSchema = new Schema<IPatientDocument>({
  patientId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const PatientModel = mongoose.model<IPatientDocument>('Patient', PatientSchema);
