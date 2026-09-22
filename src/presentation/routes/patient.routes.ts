import { Router } from 'express';
import { PatientRepository } from '../../infrastructure/database/repositories/PatientRepository';
import { PatientApplicationService } from '../../application/patient/PatientApplicationService';
import { PatientController } from '../controllers/Patient.controller';

const patientRouter = Router();

// Dependency Injection
const patientRepository = new PatientRepository();
const patientService = new PatientApplicationService(patientRepository);
const patientController = new PatientController(patientService);

// Route definitions
patientRouter.post('/', patientController.createPatient);
patientRouter.get('/:patientId', patientController.getPatient);
patientRouter.get('/', patientController.getAllPatients);

export default patientRouter;
