import { Router } from 'express';
import { VitalsRepository } from '../../infrastructure/database/repositories/VitalsRepository';
import { VitalsApplicationService } from '../../application/vitals/VitalsApplicationService';
import { VitalsController } from '../controllers/Vitals.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole, requirePatientSelfOrRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { recordVitalsSchema } from '../schemas';

const vitalsRouter = Router();

// Protect vitals routes with auth middleware
vitalsRouter.use(authMiddleware as any);

// Dependency Injection
const vitalsRepository = new VitalsRepository();
const vitalsService = new VitalsApplicationService(vitalsRepository);
const vitalsController = new VitalsController(vitalsService);

// Route definitions - Doctor/Nurse/Admin can record vitals; Patients can only view their own vitals
vitalsRouter.post(
  '/',
  requireRole('admin', 'doctor', 'nurse'),
  requirePatientSelfOrRole('patientId', 'doctor', 'nurse'),
  validate(recordVitalsSchema),
  vitalsController.recordVitals
);
vitalsRouter.get(
  '/patient/:patientId',
  requireRole('admin', 'doctor', 'nurse', 'patient'),
  requirePatientSelfOrRole('patientId', 'doctor', 'nurse'),
  vitalsController.getVitalsByPatient
);

export default vitalsRouter;
