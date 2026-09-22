import { Router } from 'express';
import { PatientRepository } from '../../infrastructure/database/repositories/PatientRepository';
import { PatientApplicationService } from '../../application/patient/PatientApplicationService';
import { PatientController } from '../controllers/Patient.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const patientRouter = Router();

// Protect all patient routes with auth middleware
patientRouter.use(authMiddleware as any);

// Dependency Injection
const patientRepository = new PatientRepository();
const patientService = new PatientApplicationService(patientRepository);
const patientController = new PatientController(patientService);

// Route definitions
patientRouter.post('/', patientController.createPatient);
patientRouter.get('/:patientId', patientController.getPatient);
patientRouter.get('/', patientController.getAllPatients);

export default patientRouter;
