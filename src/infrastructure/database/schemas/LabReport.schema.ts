import mongoose, { Schema, Document } from 'mongoose';

export interface ILabReportDocument extends Document {
  patientId: string;
  fileName: string;
  filePath: string;
  uploadedAt: Date;
}

const LabReportSchema = new Schema<ILabReportDocument>({
  patientId: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export const LabReportModel = mongoose.model<ILabReportDocument>('LabReport', LabReportSchema);
