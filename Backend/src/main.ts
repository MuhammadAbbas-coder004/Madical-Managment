import dotenv from 'dotenv';
// Load environment variables immediately before other imports
dotenv.config();

import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './infrastructure/config/database';
import patientRoutes from './presentation/routes/patient.routes';
import doctorRoutes from './presentation/routes/doctor.routes';
import appointmentRoutes from './presentation/routes/appointment.routes';
import vitalsRoutes from './presentation/routes/vitals.routes';
import prescriptionRoutes from './presentation/routes/prescription.routes';
import medicalRecordRoutes from './presentation/routes/medical-record.routes';
import labReportRoutes from './presentation/routes/lab-report.routes';
import authRoutes from './presentation/routes/auth.routes';
import { errorMiddleware } from './presentation/middlewares/error.middleware';
import billingRoutes from './presentation/routes/billing.routes';






const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files as static assets (must match the absolute path in multerConfig.ts)
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/billing', billingRoutes);

// Global error handler (must be registered last after all routes)
app.use(errorMiddleware);

// Connect to database and start server
const startServer = async () => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
