import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files as static assets
app.use('/uploads', express.static('uploads'));

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
