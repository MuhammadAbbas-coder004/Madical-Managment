import mongoose, { Schema, Document } from 'mongoose';

export interface IVitalsDocument extends Document {
  vitalsId: string;
  patientId: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  sugarLevel: number;
  temperature: number;
  heartRate: number;
  pulseRate: number;
  rbcCount: number;
  wbcCount: number;
  status: string;
  flaggedParams: string[];
  message: string;
  recordedAt: Date;
}

const VitalsSchema = new Schema<IVitalsDocument>({
  vitalsId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  bloodPressureSystolic: { type: Number, required: true },
  bloodPressureDiastolic: { type: Number, required: true },
  sugarLevel: { type: Number, required: true },
  temperature: { type: Number, required: true },
  heartRate: { type: Number, required: true },
  pulseRate: { type: Number, required: true },
  rbcCount: { type: Number, required: true },
  wbcCount: { type: Number, required: true },
  status: { type: String, required: true, enum: ['normal', 'warning', 'critical'] },
  flaggedParams: [{ type: String }],
  message: { type: String, required: true },
  recordedAt: { type: Date, default: Date.now },
});

export const VitalsModel = mongoose.model<IVitalsDocument>('Vitals', VitalsSchema);
