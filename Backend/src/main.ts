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
import dashboardRoutes from './presentation/routes/dashboard.routes';
import pharmacyRoutes from './presentation/routes/pharmacy.routes';






const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = new Set(
  [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.CLIENT_URL,
  ].filter((origin): origin is string => Boolean(origin))
);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV !== 'production'
        && typeof origin === 'string'
        && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (!origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

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
