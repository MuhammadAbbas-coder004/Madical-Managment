import { Router } from 'express';
import { PrescriptionRepository } from '../../infrastructure/database/repositories/PrescriptionRepository';
import { PrescriptionApplicationService } from '../../application/prescription/PrescriptionApplicationService';
import { PrescriptionController } from '../controllers/Prescription.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole, requirePatientSelfOrRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPrescriptionSchema } from '../schemas';

const prescriptionRouter = Router();

// Protect prescription routes with auth middleware
prescriptionRouter.use(authMiddleware as any);

// Dependency Injection
const prescriptionRepository = new PrescriptionRepository();
const prescriptionService = new PrescriptionApplicationService(prescriptionRepository);
const prescriptionController = new PrescriptionController(prescriptionService);

// Route definitions
// Doctor & Admin only can create prescriptions
prescriptionRouter.post(
  '/',
  requireRole('admin', 'doctor'),
  requirePatientSelfOrRole('patientId', 'doctor'),
  validate(createPrescriptionSchema),
  prescriptionController.createPrescription
);

// Patients can only view their own prescriptions; staff has access
prescriptionRouter.get(
  '/patient/:patientId',
  requireRole('admin', 'doctor', 'nurse', 'patient'),
  requirePatientSelfOrRole('patientId', 'doctor', 'nurse'),
  prescriptionController.getPrescriptionsByPatient
);

// Prescriptions issued by doctor: Doctor, Nurse, Admin
prescriptionRouter.get('/doctor/:doctorId', requireRole('admin', 'doctor', 'nurse'), prescriptionController.getPrescriptionsByDoctor);

export default prescriptionRouter;
