import mongoose, { Schema, Document } from 'mongoose';
import { Medicine } from '../../../domain/prescription/Prescription.entity';

export interface IPrescriptionDocument extends Document {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  medicines: Medicine[];
  diagnosis: string;
  createdAt: Date;
}

const MedicineSchema = new Schema<Medicine>(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String, required: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescriptionDocument>({
  prescriptionId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  medicines: [MedicineSchema],
  diagnosis: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const PrescriptionModel = mongoose.model<IPrescriptionDocument>(
  'Prescription',
  PrescriptionSchema
);
