import mongoose, { Schema, Document } from 'mongoose';

export interface ILabReportDocument extends Document {
  patientId: string;
  testName: string;
  result: string;
  uploadedAt: Date;
}

const LabReportSchema = new Schema<ILabReportDocument>({
  patientId: { type: String, required: true },
  testName: { type: String, required: true, trim: true },
  result: { type: String, required: true, trim: true },
  uploadedAt: { type: Date, default: Date.now },
});

export const LabReportModel = mongoose.model<ILabReportDocument>('LabReport', LabReportSchema);
