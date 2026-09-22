import { Router } from 'express';
import { MedicalRecordRepository } from '../../infrastructure/database/repositories/MedicalRecordRepository';
import { MedicalRecordApplicationService } from '../../application/medical-record/MedicalRecordApplicationService';
import { MedicalRecordController } from '../controllers/MedicalRecord.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const medicalRecordRouter = Router();

// Protect routes with auth middleware
medicalRecordRouter.use(authMiddleware as any);

// Dependency Injection
const medicalRecordRepository = new MedicalRecordRepository();
const medicalRecordService = new MedicalRecordApplicationService(medicalRecordRepository);
const medicalRecordController = new MedicalRecordController(medicalRecordService);

// Route definitions
medicalRecordRouter.post('/', medicalRecordController.createRecord);
medicalRecordRouter.get('/patient/:patientId', medicalRecordController.getRecordsByPatient);

export default medicalRecordRouter;
