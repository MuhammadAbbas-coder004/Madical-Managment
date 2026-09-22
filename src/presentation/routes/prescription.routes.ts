import { Router } from 'express';
import { PrescriptionRepository } from '../../infrastructure/database/repositories/PrescriptionRepository';
import { PrescriptionApplicationService } from '../../application/prescription/PrescriptionApplicationService';
import { PrescriptionController } from '../controllers/Prescription.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const prescriptionRouter = Router();

// Protect prescription routes with auth middleware
prescriptionRouter.use(authMiddleware as any);

// Dependency Injection
const prescriptionRepository = new PrescriptionRepository();
const prescriptionService = new PrescriptionApplicationService(prescriptionRepository);
const prescriptionController = new PrescriptionController(prescriptionService);

// Route definitions
prescriptionRouter.post('/', prescriptionController.createPrescription);
prescriptionRouter.get('/patient/:patientId', prescriptionController.getPrescriptionsByPatient);
prescriptionRouter.get('/doctor/:doctorId', prescriptionController.getPrescriptionsByDoctor);

export default prescriptionRouter;
